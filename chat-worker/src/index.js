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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

      // Get recent messages endpoint
      if (url.pathname === "/chat/recent" && request.method === "GET") {
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
      if (url.pathname === "/chat/send" && request.method === "POST") {
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
      if (url.pathname === "/health" && request.method === "GET") {
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
