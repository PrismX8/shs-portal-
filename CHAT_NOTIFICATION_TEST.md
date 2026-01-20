# Chat Notification System Test Instructions

## What was fixed:
1. **Red dot badge**: Now properly shows unread message count on the global chat button
2. **Notification system**: Shows toast notifications when chat window is closed
3. **Initialization**: Improved chat iframe initialization timing and error handling

## How to test:

### 1. Open the application
- Start a local server: `python -m http.server 8000`
- Open `http://localhost:8000` in your browser

### 2. Manual Badge Test
Open browser console and run:
```javascript
// Test badge with count 3
testChatBadge(3);

// Test notification toast
testChatNotification('TestUser', 'Hello world!');
```

### 3. Chat Window Test
1. Click the "Global Chat" button to open chat
2. Open browser console in the chat iframe (inspect element on chat content)
3. Run: `window.testNotificationSystem()`
4. This should:
   - Add test messages to chat
   - Update the red badge on the chat button
   - Show notification toasts (if chat window is closed)

### 4. Real Chat Test
- Connect to the chat API (configure CHAT_API_BASE in main.js)
- Send messages from another browser/tab
- Verify badge updates and notifications appear

## Debug Functions Available:

### Main Window (F12 Console):
- `testChatBadge(count)` - Manually set badge count
- `testChatNotification(username, message)` - Test notification toast
- `updateGlobalChatBadge(count)` - Direct badge update

### Chat Iframe Console:
- `testNewMessage()` - Add a test message
- `testBadgeReset()` - Reset unread count
- `testNotificationSystem()` - Full system test
- `getChatStatus()` - Get current chat state

## Troubleshooting:
- Check browser console for error messages
- Look for "updateChatBadge" and "showChatNotification" messages in console
- Ensure CHAT_API_BASE is properly configured
- Verify iframe can communicate with parent window
