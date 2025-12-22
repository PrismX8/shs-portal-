export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    this.clients = new Set();
    this.MAX = 50;
    this.RATE_LIMIT_MS = 800; // anti-spam per connection
    this.SNAPSHOT_TOKEN = "0504";
    
    // ✅ Auto-close idle WebSockets
    this.IDLE_TIMEOUT_MS = 60_000; // 1 minute
    this.idleTimer = null;

    // Load messages from SQLite-backed storage
    this.state.blockConcurrencyWhile(async () => {
      this.messages = (await this.state.storage.get("messages")) || [];
    });
  }

  resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);

    this.idleTimer = setTimeout(() => {
      for (const c of this.clients) {
        try { c.close(); } catch {}
      }
      this.clients.clear();
    }, this.IDLE_TIMEOUT_MS);
  }

  async fetch(request) {
    const url = new URL(request.url);

    // 🔐 Protected snapshot endpoint
    if (url.pathname === "/snapshot") {
      const token = url.searchParams.get("key");

      if (token !== this.SNAPSHOT_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }

      return new Response(
        JSON.stringify(
          {
            count: this.messages.length,
            messages: this.messages,
          },
          null,
          2
        ),
        {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }
      );
    }

    // 🔁 WebSocket upgrade (live chat)
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      server.accept();

      // Per-connection state
      server.lastSend = 0;

      this.clients.add(server);
      
      // ✅ Reset idle timer after accepting socket
      this.resetIdleTimer();

      // Send history to late joiner
      server.send(
        JSON.stringify({
          type: "history",
          messages: this.messages,
        })
      );

      server.addEventListener("message", async (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type !== "chat") return;

        // ⏱ Rate limiting
        const now = Date.now();
        if (now - server.lastSend < this.RATE_LIMIT_MS) return;
        server.lastSend = now;

        const msg = {
          id: crypto.randomUUID(),
          t: now,
          name: String(data.name || "anon").slice(0, 24),
          text: String(data.text || "").slice(0, 400),
        };

        // Update rolling buffer
        this.messages.push(msg);
        if (this.messages.length > this.MAX) {
          this.messages.shift();
        }

        // Persist snapshot (SQLite, free-plan safe)
        await this.state.storage.put("messages", this.messages);

        const payload = JSON.stringify({
          type: "chat",
          message: msg,
        });

        // Broadcast to all clients
        for (const c of this.clients) {
          try {
            c.send(payload);
          } catch {
            this.clients.delete(c);
          }
        }
        
        // ✅ Reset idle timer after receiving message
        this.resetIdleTimer();
      });

      server.addEventListener("close", () => {
        this.clients.delete(server);
      });

      server.addEventListener("error", () => {
        this.clients.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // ✅ Default health check
    return new Response("Chat room online", {
      headers: { "content-type": "text/plain" },
    });
  }
}

export default {
  fetch(request, env) {
    // Single global room
    const id = env.CHAT_ROOM.idFromName("global");
    const room = env.CHAT_ROOM.get(id);
    return room.fetch(request);
  },
};
