// Enhanced Chat Worker for Nautilus OS
// Features: Rate limiting, input sanitization, better security, error handling

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type, Cache-Control, Pragma, X-Requested-With, Authorization",
  "Access-Control-Max-Age": "86400"
};

const MAX_MESSAGES = 50;
const KV_KEY = "global_chat_messages_v2";
const BAN_KV_KEY = "global_chat_bans_v1";
const OWNER_USERNAME = "shs12lord";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 30; // 30 messages per minute per user
const rateLimitMap = new Map();

// Input sanitization
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';

  // Remove HTML tags and trim
  const sanitized = text.replace(/<[^>]*>/g, '').trim();

  // Limit length
  return sanitized.substring(0, 400);
}

// Rate limiting check
function checkRateLimit(identifier) {
  const now = Date.now();
  const key = `${identifier}`;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  const userData = rateLimitMap.get(key);

  // Reset if window has passed
  if (now > userData.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  // Check if under limit
  if (userData.count < MAX_MESSAGES_PER_WINDOW) {
    userData.count++;
    return true;
  }

  return false;
}

// Cleanup old rate limit entries (called on each request)
function cleanupRateLimit() {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, data] of rateLimitMap.entries()) {
    if (now > data.resetTime) {
      rateLimitMap.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

function normalizeBanName(name) {
  if (!name) return "";
  return String(name).trim().toLowerCase();
}

function clampHours(hours) {
  if (!Number.isFinite(hours)) return 1;
  return Math.max(0.25, hours);
}

function formatHoursLabel(hours) {
  const safe = clampHours(hours);
  const rounded = Number.isInteger(safe) ? safe : Number(safe.toFixed(1));
  return `${rounded} hour${Math.abs(rounded) === 1 ? "" : "s"}`;
}

async function loadBanList(env) {
  if (!env?.CHAT_KV) return [];
  try {
    const stored = await env.CHAT_KV.get(BAN_KV_KEY, { type: "json" });
    if (!Array.isArray(stored)) return [];
    const now = Date.now();
    const filtered = stored
      .map((entry) => {
        const username = normalizeBanName(entry.username || entry.name || entry.target);
        const expiresAt = Number(entry.expiresAt || 0);
        return { username, expiresAt };
      })
      .filter((entry) => entry.username && entry.expiresAt > now);
    return filtered;
  } catch (error) {
    console.warn("Failed to load ban list:", error);
    return [];
  }
}

async function persistBanList(env, list) {
  if (!env?.CHAT_KV) return;
  try {
    await env.CHAT_KV.put(BAN_KV_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("Failed to persist ban list:", error);
  }
}

function createJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // Cleanup old rate limit entries on each request
    const cleanedEntries = cleanupRateLimit();

    try {
      // Load messages from KV with error handling
      let messages = [];
      try {
        const stored = await env.CHAT_KV.get(KV_KEY, { type: "json" });
        messages = Array.isArray(stored) ? stored : [];
      } catch (error) {
        console.error('Failed to load messages from KV:', error);
        // Continue with empty messages array
      }

      const banList = await loadBanList(env);
      const banMap = new Map(banList.map((entry) => [entry.username, entry]));

      if (pathname === "/chat/bans" && method === "GET") {
        return createJsonResponse({ bans: banList });
      }

      if (pathname === "/chat/ban" && method === "POST") {
        let payload;
        try {
          payload = await request.json();
        } catch (parseError) {
          return createJsonResponse({ error: "Invalid JSON" }, 400);
        }

        const owner = normalizeBanName(payload?.owner);
        if (owner !== OWNER_USERNAME) {
          return createJsonResponse({ error: "Forbidden" }, 403);
        }

        const targetRaw = String(payload?.target || "").trim();
        const targetNormalized = normalizeBanName(targetRaw);
        if (!targetNormalized) {
          return createJsonResponse({ error: "Target username required" }, 400);
        }

        if (banMap.has(targetNormalized)) {
          return createJsonResponse({ error: `${targetRaw || targetNormalized} is already banned.` }, 409);
        }

        const requestedHours = clampHours(Number(payload?.hours));
        const expiresAt = Date.now() + requestedHours * 3600000;
        const banRecord = {
          username: targetNormalized,
          expiresAt
        };

        const updatedBans = [...banList, banRecord];
        await persistBanList(env, updatedBans);

        const displayTarget = targetRaw || targetNormalized;
        const banMessage = {
          id: `ban_${Date.now()}_${targetNormalized}`,
          t: Date.now(),
          name: "Moderation",
          text: `🟠 Owner banned ${displayTarget} for ${formatHoursLabel(requestedHours)}.`,
          type: "system",
          variant: "ban"
        };

        messages.push(banMessage);
        if (messages.length > MAX_MESSAGES) {
          messages = messages.slice(-MAX_MESSAGES);
        }
        try {
          await env.CHAT_KV.put(KV_KEY, JSON.stringify(messages));
        } catch (kvError) {
          console.error('Failed to save ban message:', kvError);
        }

        return createJsonResponse({ ok: true, bans: updatedBans, message: banMessage, expiresAt, hours: requestedHours });
      }

      // Get recent messages endpoint
      if (pathname === "/chat/recent" && method === "GET") {
        const limit = Math.min(
          Number(url.searchParams.get("limit")) || MAX_MESSAGES,
          MAX_MESSAGES
        );

        const recentMessages = messages.slice(-limit);

        return new Response(
          JSON.stringify(recentMessages),
          {
            headers: {
              ...CORS_HEADERS,
              "content-type": "application/json",
              "cache-control": "no-store"
            }
          }
        );
      }

      // Send message endpoint
      if (pathname === "/chat/send" && method === "POST") {
        let data;

        // Parse JSON with error handling
        try {
          data = await request.json();
        } catch (parseError) {
          return new Response(
            JSON.stringify({ error: "Invalid JSON" }),
            {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                "content-type": "application/json"
              }
            }
          );
        }

        const rawName = data.name || data.username || "Anonymous";
        const rawText = data.text || data.content || "";

        // Sanitize inputs
        const name = sanitizeInput(rawName).substring(0, 24) || "Anonymous";
        const text = sanitizeInput(rawText);
        const normalizedName = normalizeBanName(name);
        const banEntry = banMap.get(normalizedName);
        if (banEntry && banEntry.expiresAt > Date.now()) {
          const remainingHours = Math.max(1, Math.ceil((banEntry.expiresAt - Date.now()) / 3600000));
          const response = {
            error: "You are banned from chat.",
            hoursRemaining: remainingHours
          };
          return createJsonResponse(response, 403);
        }

        // Validate message content
        if (!text.trim()) {
          return new Response(
            JSON.stringify({ error: "Message cannot be empty" }),
            {
              status: 400,
              headers: {
                ...CORS_HEADERS,
                "content-type": "application/json"
              }
            }
          );
        }

        // Check rate limit
        if (!checkRateLimit(name)) {
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded. Please wait before sending another message."
            }),
            {
              status: 429,
              headers: {
                ...CORS_HEADERS,
                "content-type": "application/json"
              }
            }
          );
        }

        // Create message object
        const msg = {
          id: crypto.randomUUID(),
          t: Date.now(),
          name: name,
          text: text
        };

        // Add to messages array
        messages.push(msg);

        // Keep only the most recent messages
        if (messages.length > MAX_MESSAGES) {
          messages = messages.slice(-MAX_MESSAGES);
        }

        // Save to KV with error handling
        try {
          await env.CHAT_KV.put(KV_KEY, JSON.stringify(messages));
        } catch (kvError) {
          console.error('Failed to save messages to KV:', kvError);
          return new Response(
            JSON.stringify({ error: "Failed to save message" }),
            {
              status: 500,
              headers: {
                ...CORS_HEADERS,
                "content-type": "application/json"
              }
            }
          );
        }

        // Return success response
        return new Response(
          JSON.stringify({
            ok: true,
            message: msg,
            remaining: MAX_MESSAGES_PER_WINDOW - (rateLimitMap.get(name)?.count || 0)
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "content-type": "application/json"
            }
          }
        );
      }

      // Health check endpoint
      if (pathname === "/health" && method === "GET") {
        return new Response(
          JSON.stringify({
            status: "healthy",
            messageCount: messages.length,
            rateLimitMapSize: rateLimitMap.size,
            cleanedEntries: cleanedEntries,
            timestamp: Date.now()
          }),
          {
            headers: {
              ...CORS_HEADERS,
              "content-type": "application/json"
            }
          }
        );
      }

      // Default response for root endpoint
      return new Response(
        JSON.stringify({
          status: "Chat worker online",
          endpoints: [
            "GET /chat/recent?limit=50",
            "POST /chat/send (body: {name, text})",
            "GET /health"
          ],
          version: "2.0.0"
        }),
        {
          headers: {
            ...CORS_HEADERS,
            "content-type": "application/json"
          }
        }
      );

    } catch (error) {
      console.error('Chat worker error:', error);

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          timestamp: Date.now()
        }),
        {
          status: 500,
          headers: {
            ...CORS_HEADERS,
            "content-type": "application/json"
          }
        }
      );
    }
  }
};
