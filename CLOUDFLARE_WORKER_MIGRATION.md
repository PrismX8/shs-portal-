# Cloudflare Worker Migration - Complete Removal of Vercel Backend

## Summary

All chat polling has been migrated from `shs-portal-backend.vercel.app` to Cloudflare Workers. The Vercel backend is **completely removed** from the chat path with **no fallback logic**.

---

## Why the Old Backend Was Still Used

### Root Cause
1. **Hardcoded Defaults**: `BACKEND_API_URL` defaulted to `https://shs-portal-backend.vercel.app/api`
2. **BackendAPI Class**: The `BackendAPI` class had hardcoded defaults pointing to Vercel
3. **Implicit Fallbacks**: Code paths checked `backendApi.connected` and silently fell back
4. **Mixed Architecture**: Chat was using `backendApi.getRecentChat()` which always hit Vercel

### Problem Points
- `pollChatMessages()` used `backendApi.getRecentChat()` → Vercel
- `requestServerSnapshot()` used `backendApi.getRecentChat()` → Vercel  
- `sendGlobalChatMessage()` used `backendApi.sendChatMessage()` → Vercel
- All calls went through `BackendAPI` class which defaulted to Vercel URL

---

## Changes Made

### 1. New Explicit Configuration (Lines 152-162)

```javascript
// ✅ CHAT API: Explicit Cloudflare Worker URL (NO fallback to Vercel)
const CHAT_API_BASE = window.CHAT_API_BASE || (IS_LOCAL
  ? "http://localhost:8787"  // Local Cloudflare Worker
  : null);  // ⚠️ MUST be set - no default fallback

if (!CHAT_API_BASE) {
    console.error('❌ CHAT_API_BASE not configured!');
}
```

**Key Points:**
- No default production URL (prevents accidental Vercel usage)
- Must be explicitly set via `window.CHAT_API_BASE`
- Fails visibly if not configured (no silent fallback)

### 2. Replaced `pollChatMessages()` (Lines 5187-5217)

**Before:**
```javascript
const messages = await backendApi.getRecentChat(50, true);
```

**After:**
```javascript
const response = await fetch(`${CHAT_API_BASE}/chat/recent?limit=50&images=1`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
});
const messages = await response.json();
```

**Removed:**
- All `backendApi` connection checks
- Fallback logic to Vercel
- Silent error handling

### 3. Replaced `requestServerSnapshot()` (Lines 5430-5442)

**Before:**
```javascript
if (backendApi && backendApi.connected) {
    const messages = await backendApi.getRecentChat(50, true);
}
```

**After:**
```javascript
const response = await fetch(`${CHAT_API_BASE}/chat/recent?limit=50&images=1`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
});
const messages = await response.json();
```

**Added:**
- Explicit error logging (no silent failures)
- NO fallback to Vercel

### 4. Replaced `sendGlobalChatMessage()` (Lines 6081-6095)

**Before:**
```javascript
if (backendApi && backendApi.connected) {
    const sentMessage = await backendApi.sendChatMessage(messageData);
}
```

**After:**
```javascript
if (!CHAT_API_BASE) {
    throw new Error('CHAT_API_BASE not configured');
}

const response = await fetch(`${CHAT_API_BASE}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messageData)
});
const sentMessage = await response.json();
```

**Removed:**
- `backendApi.connected` checks
- Fallback to Vercel
- Silent error handling

### 5. Updated `initGlobalChatClient()` (Lines 5677-5685)

**Added:**
```javascript
// Log which backend is active (for debugging)
if (CHAT_API_BASE) {
    console.log(`✅ Chat initialized with Cloudflare Worker: ${CHAT_API_BASE}`);
} else {
    console.error('❌ Chat initialization FAILED - CHAT_API_BASE not configured');
    return false;
}
```

**Benefits:**
- Clear logging of which backend is active
- Fails early if not configured
- Easy debugging

---

## Configuration Required

### Set Cloudflare Worker URL

Add this **before** `script.js` loads in your HTML:

```html
<script>
  // Set your Cloudflare Worker URL
  window.CHAT_API_BASE = "https://your-worker.your-subdomain.workers.dev";
</script>
<script src="script.js"></script>
```

### Example Worker URLs
- Production: `https://chat-worker.your-subdomain.workers.dev`
- Custom Domain: `https://chat.yourdomain.com`
- Local Dev: `http://localhost:8787` (if using `wrangler dev`)

---

## API Endpoints Expected

Your Cloudflare Worker must implement:

### 1. GET `/chat/recent`
**Query Params:**
- `limit` (number): Max messages to return (default: 50)
- `images` (0 or 1): Include image data (default: 0)

**Response:**
```json
[
  {
    "id": "msg_123",
    "user_id": "username",
    "content": "{\"text\":\"Hello\",\"state\":null}",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### 2. POST `/chat/send`
**Body:**
```json
{
  "user_id": "username",
  "content": "{\"text\":\"Hello\",\"state\":null}",
  "visitor_id": "visitor_123"
}
```

**Response:**
```json
{
  "id": "msg_123",
  "user_id": "username",
  "content": "{\"text\":\"Hello\",\"state\":null}",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## Error Handling

### If Cloudflare Worker is Unavailable

**Behavior:**
- ✅ Fails visibly with console errors
- ✅ Shows user-facing error messages
- ✅ NO silent fallback to Vercel
- ✅ Polling continues (will retry on next interval)

**Error Messages:**
- `❌ CHAT_API_BASE not configured!` - Configuration missing
- `❌ Server snapshot failed (Cloudflare Worker): ...` - Snapshot fetch failed
- `❌ Chat send failed (Cloudflare Worker): ...` - Send failed
- `⚠️ Backend server error (500) - will retry on next poll` - Server error

---

## Legacy Backend URLs (Non-Chat Only)

The following are **kept for non-chat features only** and **NOT used for chat**:

```javascript
const BACKEND_API_URL = "https://shs-portal-backend.vercel.app/api";  // Legacy - NOT for chat
const BACKEND_WS_URL = "wss://shs-portal-backend.vercel.app";  // Legacy - NOT for chat
```

**Still Used For:**
- Admin endpoints (if needed)
- Non-chat features
- Legacy compatibility

**NOT Used For:**
- Chat polling
- Chat sending
- Chat history
- Chat snapshots

---

## Verification Checklist

- [ ] Set `window.CHAT_API_BASE` before `script.js` loads
- [ ] Check console for: `✅ Chat initialized with Cloudflare Worker: <url>`
- [ ] Verify NO requests to `shs-portal-backend.vercel.app/api/chat/*` in Network tab
- [ ] Test sending a message - should hit Cloudflare Worker
- [ ] Test polling - should hit Cloudflare Worker
- [ ] Test error handling - should fail visibly (no silent fallback)

---

## Debugging

### Check Active Backend
```javascript
// In DevTools Console
console.log({
    chatApiBase: window.CHAT_API_BASE,
    chatApiBaseConst: CHAT_API_BASE  // If accessible
});
```

### Monitor Network Requests
1. Open DevTools → Network tab
2. Filter by "chat" or your Worker domain
3. Verify all chat requests go to Cloudflare Worker
4. Verify NO requests to `shs-portal-backend.vercel.app/api/chat/*`

### Check Logs
Look for:
- `✅ Chat initialized with Cloudflare Worker: <url>` - Success
- `❌ CHAT_API_BASE not configured!` - Configuration missing
- `❌ Chat initialization FAILED` - Initialization failed

---

## Files Modified

- `script.js`:
  - Lines 152-162: New `CHAT_API_BASE` configuration
  - Lines 5187-5217: `pollChatMessages()` uses Cloudflare Worker
  - Lines 5430-5442: `requestServerSnapshot()` uses Cloudflare Worker
  - Lines 5677-5685: `initGlobalChatClient()` logs active backend
  - Lines 6081-6095: `sendGlobalChatMessage()` uses Cloudflare Worker

---

## Migration Complete ✅

- ✅ All chat polling uses Cloudflare Worker
- ✅ All chat sending uses Cloudflare Worker
- ✅ No fallback to Vercel backend
- ✅ Fails visibly if Worker unavailable
- ✅ Explicit configuration required
- ✅ Clear logging for debugging

**Next Steps:**
1. Set `window.CHAT_API_BASE` in your HTML
2. Deploy your Cloudflare Worker with `/chat/recent` and `/chat/send` endpoints
3. Test and verify all chat traffic goes to Cloudflare Worker
4. Monitor for any remaining Vercel backend calls (should be zero)



