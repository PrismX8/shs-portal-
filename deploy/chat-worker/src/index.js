const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const MAX = 50;
const SNAPSHOT_TOKEN = "0504";
const KV_KEY = "global_chat_messages_v2";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== CORS PREFLIGHT =====
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Load messages from KV
    let messages =
      (await env.CHAT_KV.get(KV_KEY, { type: "json" })) || [];

    // ===== SNAPSHOT (ADMIN) =====
    if (url.pathname === "/snapshot") {
      if (url.searchParams.get("key") !== SNAPSHOT_TOKEN) {
        return new Response("Unauthorized", {
          status: 401,
          headers: CORS_HEADERS,
        });
      }

      return new Response(
        JSON.stringify({
          count: messages.length,
          messages,
        }),
        {
          headers: {
            ...CORS_HEADERS,
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }
      );
    }

    // ===== CLEAR CHAT (ADMIN) =====
    if (url.pathname === "/chat/clear" && request.method === "POST") {
      const token = url.searchParams.get("key");
      if (token !== SNAPSHOT_TOKEN) {
        return new Response("Unauthorized", {
          status: 401,
          headers: CORS_HEADERS,
        });
      }

      // Clear all messages from KV
      await env.CHAT_KV.delete(KV_KEY);

      return new Response(
        JSON.stringify({ ok: true, message: "Chat cleared" }),
        {
          headers: {
            ...CORS_HEADERS,
            "content-type": "application/json",
          },
        }
      );
    }

    // ===== GET CHAT =====
    if (url.pathname === "/chat/recent" && request.method === "GET") {
      const limit = Math.min(
        Number(url.searchParams.get("limit")) || MAX,
        MAX
      );

      return new Response(
        JSON.stringify(messages.slice(-limit)),
        {
          headers: {
            ...CORS_HEADERS,
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }
      );
    }

    // ===== SEND CHAT =====
    if (url.pathname === "/chat/send" && request.method === "POST") {
      let data;
      try {
        data = await request.json();
      } catch {
        return new Response("Bad JSON", {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      const msg = {
        id: crypto.randomUUID(),
        t: Date.now(),
        name: String(data.name || "anon").slice(0, 24),
        text: String(data.text || "").slice(0, 400),
      };

      messages.push(msg);
      if (messages.length > MAX) messages.shift();

      await env.CHAT_KV.put(KV_KEY, JSON.stringify(messages));

      return new Response(
        JSON.stringify({ ok: true, message: msg }),
        {
          headers: {
            ...CORS_HEADERS,
            "content-type": "application/json",
          },
        }
      );
    }

    // ===== FALLBACK =====
    return new Response("Chat worker online", {
      headers: {
        ...CORS_HEADERS,
        "content-type": "text/plain",
      },
    });
  },
};
