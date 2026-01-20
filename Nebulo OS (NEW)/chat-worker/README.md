# Nautilus OS Enhanced Chat Worker

This directory contains an **enhanced** Cloudflare Worker for the Global Chat functionality in Nautilus OS with advanced security, rate limiting, and error handling.

## 🚀 Features

- **Rate Limiting**: 30 messages per minute per user
- **Input Sanitization**: HTML tag removal and length limits
- **Error Handling**: Comprehensive error responses
- **Health Monitoring**: `/health` endpoint for monitoring
- **Automatic Cleanup**: Rate limit cleanup on each request
- **Message History**: Stores last 50 messages in KV
- **CORS Support**: Full cross-origin request support

## 📦 Quick Setup

### 1. Install Dependencies
```bash
cd chat-worker
npm install
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Configure KV Namespace
```bash
# Create KV namespace
wrangler kv:namespace create "CHAT_KV"

# Copy the namespace ID to wrangler.jsonc
# Replace "your_kv_namespace_id_here" with the actual ID
```

### 4. Deploy the Worker
```bash
wrangler deploy
```

### 5. Configure Nautilus OS
The worker URL is already configured in `js/main.js` as:
```javascript
window.CHAT_API_BASE = "https://chat-worker.ethan-owsiany.workers.dev";
```

## 🔧 API Endpoints

### GET `/chat/recent?limit=50`
Get recent chat messages
- **Parameters**: `limit` (optional, max 50)
- **Response**: Array of message objects

### POST `/chat/send`
Send a chat message
- **Body**: `{ "name": "username", "text": "message content" }`
- **Response**: `{ "ok": true, "message": {...}, "remaining": 29 }`

### GET `/health`
Health check endpoint
- **Response**: Worker status and statistics

## 📊 Message Format

### Request (Send Message)
```json
{
  "name": "Ethan",
  "text": "Hello everyone!"
}
```

### Response (Message Object)
```json
{
  "id": "uuid-string",
  "t": 1703123456789,
  "name": "Ethan",
  "text": "Hello everyone!"
}
```

## 🛡️ Security Features

- **Rate Limiting**: Prevents spam (30 msg/min per user)
- **Input Sanitization**: Removes HTML, limits length
- **CORS Headers**: Proper cross-origin support
- **Error Handling**: Safe error responses
- **Input Validation**: JSON validation and type checking

## 🔍 Monitoring

Check worker health:
```bash
curl https://chat-worker.ethan-owsiany.workers.dev/health
```

Response:
```json
{
  "status": "healthy",
  "messageCount": 45,
  "rateLimitMapSize": 12,
  "cleanedEntries": 3,
  "timestamp": 1703123456789
}
```

## 🚦 Rate Limiting

- **Window**: 1 minute
- **Limit**: 30 messages per user per minute
- **Cleanup**: Automatic cleanup on each request
- **Response**: HTTP 429 when limit exceeded

## 🐛 Troubleshooting

### Common Issues

**"Rate limit exceeded"**
- Wait 1 minute before sending more messages
- Check `/health` endpoint for rate limit status

**"Failed to save message"**
- KV namespace might not be configured correctly
- Check wrangler.jsonc KV binding

**CORS Errors**
- Ensure the origin is allowed (currently set to "*")
- Check request headers match CORS configuration

### Debug Commands

```bash
# Check worker logs
wrangler tail

# Test endpoints locally
wrangler dev
curl http://localhost:8787/health
```

## 🔄 Updates

To update the worker:
```bash
wrangler deploy
```

The Nautilus OS chat will automatically use the updated worker.

## 📝 Notes

- Messages are stored for **50 message history**
- **No authentication** required (public chat)
- **Real-time polling** every 5 seconds in the client
- **On-demand cleanup** prevents memory leaks (runs on each request)

## 🤝 Support

For issues:
1. Check `/health` endpoint
2. Review worker logs with `wrangler tail`
3. Verify KV namespace configuration
4. Test with local development: `wrangler dev`
