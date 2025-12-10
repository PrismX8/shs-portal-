# Movies Proxy Server - Bypass DNS Blocking

This solution creates a local proxy server that fetches content from fmoviesto.ru and serves it locally, bypassing DNS blocking by your internet provider.

## How It Works

1. **Proxy Server**: A Node.js server runs locally on port 3002
2. **DNS Bypass**: The server makes requests to fmoviesto.ru from the server-side, avoiding browser DNS restrictions
3. **Local Serving**: The content is served locally to your browser, eliminating CORS issues

## Setup Instructions

### 1. Install Node.js (if not already installed)
- Download and install Node.js from https://nodejs.org/
- Make sure you can run `node --version` in your terminal

### 2. Start the Proxy Server
Open a new terminal and run:
```bash
node simple-movies-proxy.js
```

You should see output like:
```
Simple Movies Proxy Server running on http://localhost:3002
Access the movies page: http://localhost:3002/movies
Direct proxy access: http://localhost:3002/proxy/home
```

### 3. Access the Movies
You have two options:

**Option A: Use the existing movies.html page**
- Keep your current Python server running (`python -m http.server 8000`)
- Visit: http://localhost:8000/pages/movies.html
- The page will automatically use the proxy

**Option B: Use the proxy's built-in movies page**
- Visit: http://localhost:3002/movies
- This serves the same content but through the proxy server

## Troubleshooting

### If you see "Proxy Connection Required" message:
1. Make sure the proxy server is running (`node simple-movies-proxy.js`)
2. Check that no other service is using port 3002
3. Refresh the page after starting the proxy

### If the proxy server has connection issues:
1. Check your internet connection
2. Try accessing fmoviesto.ru directly in your browser to see if it's available
3. The proxy might take a few seconds to establish the first connection

### To change the proxy port:
1. Edit `simple-movies-proxy.js`
2. Change the `PORT` constant (line 4)
3. Update the iframe src in `pages/movies.html` to match

## Technical Details

### How DNS Blocking Works
Your ISP blocks access to fmoviesto.ru by:
- Blocking DNS resolution (so fmoviesto.ru doesn't resolve to an IP)
- Filtering network traffic to the site's IP addresses

### How This Proxy Bypasses It
1. **Server-side requests**: Node.js makes the request, not your browser
2. **Direct IP access**: The server can sometimes access blocked sites directly
3. **No CORS restrictions**: Server-to-server requests don't have CORS limitations
4. **Local serving**: Content is served from localhost, which is never blocked

### Security Notes
- This proxy only works for fmoviesto.ru content
- All requests are logged to the console
- The proxy doesn't store or cache content permanently
- You're still subject to the original site's terms of service

## Alternative Solutions

If this proxy doesn't work, you could try:

1. **Using a VPN**: Connect to a VPN to bypass ISP restrictions
2. **Changing DNS**: Use Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)
3. **Browser extensions**: Some proxy extensions can bypass blocking
4. **Mobile hotspot**: Use your phone's mobile data instead of ISP internet

## Files Created
- `simple-movies-proxy.js` - The proxy server
- `MOVIES_PROXY_README.md` - This documentation
- Modified `pages/movies.html` - Updated to use the proxy