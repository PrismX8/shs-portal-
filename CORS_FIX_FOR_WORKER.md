# CORS Fix for Cloudflare Worker

## Problem

The Cloudflare Worker is missing CORS headers, causing this error:
```
Access to fetch at 'https://chat-worker.ethan-owsiany.workers.dev/chat/recent?limit=50&images=1' 
from origin 'http://127.0.0.1:5502' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution: Add CORS Headers to Worker

Your Cloudflare Worker (`chat-worker`) needs to return proper CORS headers for all requests.

### Required CORS Headers

For **all responses** (including OPTIONS preflight), return:

```javascript
{
  'Access-Control-Allow-Origin': '*',  // Or specific origin: 'https://shsportal.vercel.app'
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',  // 24 hours
}
```

### Example Worker Code

```javascript
// In your chat-worker/src/index.js

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight (OPTIONS request)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Handle actual requests
    const url = new URL(request.url);
    
    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (url.pathname === '/chat/recent') {
      // Your chat/recent logic here
      const messages = await getRecentChat(/* ... */);
      
      return new Response(JSON.stringify(messages), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    if (url.pathname === '/chat/send') {
      // Your chat/send logic here
      const result = await sendChatMessage(/* ... */);
      
      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // 404 or other responses
    return new Response('Not Found', { 
      status: 404,
      headers: corsHeaders,
    });
  },
};
```

### For Production (Specific Origins)

If you want to restrict to specific origins (more secure):

```javascript
const allowedOrigins = [
  'https://shsportal.vercel.app',
  'https://shsportal.vercel.app',
  'http://localhost:5502',  // For local dev
  'http://127.0.0.1:5502',  // For local dev
];

const origin = request.headers.get('Origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
```

### Helper Function (Recommended)

```javascript
function addCORSHeaders(response, request) {
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    'https://shsportal.vercel.app',
    'http://localhost:5502',
    'http://127.0.0.1:5502',
  ];
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  // Clone response and add headers
  const newResponse = new Response(response.body, response);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  
  return newResponse;
}

// Use it:
return addCORSHeaders(new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' },
}), request);
```

## Testing

After updating your Worker:

1. Deploy the Worker: `wrangler deploy`
2. Test from browser console:
   ```javascript
   fetch('https://chat-worker.ethan-owsiany.workers.dev/chat/recent?limit=50&images=1')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```
3. Check Network tab - should see CORS headers in response

## Current Status

- ✅ Frontend configured to use Cloudflare Worker
- ❌ Worker missing CORS headers (needs fix)
- ⏳ Waiting for Worker update

Once the Worker returns proper CORS headers, the chat will work correctly.



