/**
 * Cloudflare Worker + Durable Object for "voice discovery":
 * - tracks who is currently in voice for a room
 * - broadcasts join/leave
 * - serves websocket endpoint at /voice?room=global
 *
 * This is NOT audio; audio stays P2P via WebRTC/PeerJS.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/voice") {
      return new Response("OK", { status: 200 });
    }

    const upgrade = request.headers.get("Upgrade") || "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const room = (url.searchParams.get("room") || "global").slice(0, 64);
    const id = env.VOICE_ROOMS.idFromName(room);
    const stub = env.VOICE_ROOMS.get(id);
    return stub.fetch(request);
  },
};

export class VoiceRoom {
  constructor(state) {
    this.state = state;
    /** @type {Map<string, { ws: WebSocket, joined: boolean, peerId: string, userId: string, muted: boolean, lastSeen: number }>} */
    this.clients = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const room = (url.searchParams.get("room") || "global").slice(0, 64);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const clientId = crypto.randomUUID();
    this.clients.set(clientId, {
      ws: server,
      joined: false,
      peerId: "",
      userId: "",
      muted: false,
      lastSeen: Date.now(),
    });

    const send = (ws, obj) => {
      try {
        const type = obj?.type || "unknown";
        console.log("OUT:", type);
        ws.send(JSON.stringify(obj));
      } catch (_) {}
    };

    const broadcast = (obj) => {
      const type = obj?.type || "unknown";
      console.log("OUT:", type);
      const payload = JSON.stringify(obj);
      for (const c of this.clients.values()) {
        try {
          c.ws.send(payload);
        } catch (_) {}
      }
    };

    const snapshot = () => {
      const list = [];
      for (const c of this.clients.values()) {
        if (!c.joined) continue;
        if (!c.peerId || !c.userId) continue;
        list.push({ peerId: c.peerId, userId: c.userId, muted: !!c.muted, ts: c.lastSeen });
      }
      return { type: "participants", room, list };
    };

    // Send initial snapshot immediately
    send(server, snapshot());

    const cleanupClient = (reason) => {
      const c = this.clients.get(clientId);
      if (!c) return;
      this.clients.delete(clientId);
      if (c.joined && c.peerId && c.userId) {
        const ts = Date.now();
        broadcast({ type: "activity", action: "leave", room, peerId: c.peerId, userId: c.userId, ts, reason: reason || "disconnect" });
        broadcast(snapshot());
      } else {
        broadcast(snapshot());
      }
    };

    server.addEventListener("message", (evt) => {
      const c = this.clients.get(clientId);
      if (!c) return;
      c.lastSeen = Date.now();

      let msg = null;
      try {
        msg = JSON.parse(String(evt.data || ""));
      } catch (_) {
        return;
      }
      if (!msg || typeof msg !== "object") return;

      const type = String(msg.type || "");
      if (type === "ping") {
        send(server, { type: "pong", ts: Date.now() });
        return;
      }

      if (type === "join") {
        const peerId = String(msg.peerId || "").slice(0, 128);
        const userId = String(msg.userId || "").slice(0, 80);
        const muted = !!msg.muted;
        if (!peerId || !userId) return;

        const wasJoined = c.joined;
        const prevPeer = c.peerId;
        c.joined = true;
        c.peerId = peerId;
        c.userId = userId;
        c.muted = muted;

        const ts = Date.now();
        if (!wasJoined || prevPeer !== peerId) {
          broadcast({ type: "activity", action: "join", room, peerId, userId, ts });
        }
        broadcast(snapshot());
        return;
      }

      if (type === "leave") {
        const peerId = String(msg.peerId || "").slice(0, 128);
        if (peerId && c.peerId && peerId !== c.peerId) {
          // ignore mismatched leave
        }
        if (c.joined && c.peerId && c.userId) {
          const ts = Date.now();
          broadcast({ type: "activity", action: "leave", room, peerId: c.peerId, userId: c.userId, ts, reason: "leave" });
        }
        c.joined = false;
        c.peerId = "";
        c.userId = "";
        c.muted = false;
        broadcast(snapshot());
        return;
      }

      if (type === "update") {
        const peerId = String(msg.peerId || "").slice(0, 128);
        if (!c.joined || !c.peerId || !c.userId) return;
        if (peerId && peerId !== c.peerId) return;
        if ("muted" in msg) c.muted = !!msg.muted;
        broadcast(snapshot());
        return;
      }
    });

    server.addEventListener("close", () => cleanupClient("close"));
    server.addEventListener("error", () => cleanupClient("error"));

    return new Response(null, { status: 101, webSocket: client });
  }
}


