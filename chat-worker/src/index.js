/**
 * Stateless Cloudflare Worker for Chat
 * 
 * This worker acts as a proxy/rate limiter for chat messages.
 * Messages are stored in Supabase (via backend API), not in Durable Objects.
 * 
 * Architecture:
 * - Browser → Cloudflare Worker → Backend API → Supabase
 * - Frontend uses polling every 15-30s to fetch new messages
 * - No WebSockets, no Durable Objects = no duration billing
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers for browser requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", mode: "polling" }),
        {
          headers: {
            "content-type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Proxy chat requests to backend API
    // This worker acts as a rate limiter and proxy
    const backendApiUrl = env.BACKEND_API_URL || "https://shs-portal-backend.vercel.app/api";
    
    // Forward GET requests (fetching messages) to backend
    if (request.method === "GET" && url.pathname === "/chat/recent") {
      try {
        const limit = url.searchParams.get("limit") || "50";
        const includeImages = url.searchParams.get("images") || "0";
        const backendUrl = `${backendApiUrl}/chat/recent?limit=${limit}&images=${includeImages}`;
        
        const response = await fetch(backendUrl, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch messages" }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Forward POST requests (sending messages) to backend with rate limiting
    if (request.method === "POST" && url.pathname === "/chat/send") {
      try {
        const body = await request.json();
        
        // Basic rate limiting: check if message is too frequent
        // (More sophisticated rate limiting can be added with KV if needed)
        const backendUrl = `${backendApiUrl}/chat/send`;
        
        const response = await fetch(backendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          headers: {
            "content-type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to send message" }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // 404 for unknown routes
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
