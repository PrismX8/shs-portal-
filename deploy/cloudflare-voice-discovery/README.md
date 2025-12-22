# Cloudflare Voice Discovery (Durable Objects + WebSockets)

This tiny Cloudflare Worker acts as the **voice room discovery server**:

- Keeps a **live list of who is in voice**
- Broadcasts **join/leave** events (for the blue banner)
- Lets clients fetch the current list immediately on connect

Your actual voice audio + meters/speaking remain **PeerJS/WebRTC P2P**.

## 1) Prereqs

- A Cloudflare account
- Node.js installed
- Wrangler (we vend it as a local dev dependency in this folder)

```bash
npm install
npx wrangler login
```

## 2) Deploy

From this folder:

```bash
npm install
npx wrangler deploy
```

If you see an error about `new_sqlite_classes`, ensure you're using Wrangler v4 (this repo pins it in `package.json`).

Wrangler will print a URL like:

`https://<your-worker>.workers.dev`

Your WebSocket endpoint will be:

`wss://<your-worker>.workers.dev/voice`

## 3) Configure the website

In your site, set:

- `window.__VOICE_DISCOVERY_WS_URL__ = "wss://<your-worker>.workers.dev/voice"`

This project reads it from `script.js` at runtime.

## Protocol (FYI)

Client → server messages (JSON):

- `{"type":"join","peerId":"...","userId":"...","muted":false}`
- `{"type":"leave","peerId":"..."}`
- `{"type":"update","peerId":"...","muted":true}`
- `{"type":"ping"}`

Server → client messages (JSON):

- `{"type":"participants","room":"global","list":[{"peerId":"...","userId":"...","muted":false,"ts":123}]}`
- `{"type":"activity","action":"join|leave","peerId":"...","userId":"...","ts":123}`


