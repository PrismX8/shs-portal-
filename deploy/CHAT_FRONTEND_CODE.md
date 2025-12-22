# Chat Frontend Code - Notifications, Badge, and Message Handling

This document contains all code related to:
- Toast notifications for new messages
- Unread badge counter
- Message sending with optimistic UI
- Worker WebSocket message handling
- Duplicate message prevention

---

## Variables and Constants

```javascript
// Chat state variables
const messageNodeIndex = new Map();
let chatToastTimer = null;
let chatToastEl = null;
let chatToastStyleInjected = false;
let suppressChatToast = true; // prevent toasts during history bootstrap
let chatHistoryBootstrapped = false;
let globalChatUnread = 0;
let globalChatBadge = null;
let globalChatIsOpen = false;
let lastGlobalChatSeenTs = Number(localStorage.getItem('globalChatLastSeenTs') || 0) || 0;
let lastSupabaseChatTs = 0; // Keep for timestamp tracking

// Cloudflare Worker WebSocket for chat
const CHAT_WS_URL = "wss://chat-worker.ethan-owsiany.workers.dev";
let chatWorkerWs = null;
let chatWorkerWsReconnectTimer = null;
let chatWorkerConnected = false;
let workerHistoryLoaded = false;

// Hybrid snapshot model: Local cache for instant loading
const CHAT_CACHE_KEY = 'chat_cache_v1';
const CHAT_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_MESSAGES = 50;

// Message deduplication
const globalChatSeen = new Set();
let globalChatSending = false;
let lastGlobalChatMessageSig = '';
```

---

## Helper Functions

### formatChatTime
```javascript
function formatChatTime(ts) {
    try {
        const d = new Date(ts || Date.now());
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
        return '';
    }
}
```

### getMessageTimestamp
```javascript
function getMessageTimestamp(msg) {
    try {
        const raw = msg.created_at || msg.createdAt || msg.timestamp;
        if (!raw) return Date.now();
        return new Date(raw).getTime();
    } catch (_) {
        return Date.now();
    }
}
```

### getDisplayName
```javascript
function getDisplayName(name) {
    if (!name) return 'User';
    // If name is %Owner%, display as Owner
    if (name.trim() === '%Owner%') return 'Owner';
    // Otherwise return the name as-is
    return name;
}
```

### parseChatContentJson
```javascript
function parseChatContentJson(rawContent) {
    try {
        const parsed = JSON.parse(rawContent);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {}
    return null;
}
```

### removeMessageById
```javascript
function removeMessageById(id) {
    const node = messageNodeIndex.get(id);
    if (node && node.parentNode) {
        node.parentNode.removeChild(node);
    }
    messageNodeIndex.delete(id);
    delete reactionsById[id];
    reactionListNodes.delete(id);
    globalChatSeen.delete(`id:${id}`);
}
```

### scrollGlobalChatToBottom
```javascript
function scrollGlobalChatToBottom() {
    if (!globalChatBox) return;
    globalChatBox.style.userSelect = 'text';
    globalChatBox.style.webkitUserSelect = 'text';
    globalChatBox.style.MozUserSelect = 'text';
    requestAnimationFrame(() => {
        if (!globalChatBox) return;
        globalChatBox.scrollTop = globalChatBox.scrollHeight;
    });
    setTimeout(() => {
        if (!globalChatBox) return;
        globalChatBox.scrollTop = globalChatBox.scrollHeight;
    }, 75);
}
```

### Cache Functions
```javascript
function saveChatCache(messages) {
    try {
        if (!Array.isArray(messages)) return;
        // Keep only the most recent messages
        const recent = messages.slice(-MAX_CACHED_MESSAGES);
        const cacheData = {
            messages: recent,
            timestamp: Date.now(),
            lastMessageTs: recent.length > 0 ? getMessageTimestamp(recent[recent.length - 1]) : 0
        };
        localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
        console.warn('Failed to save chat cache:', err);
    }
}

function loadChatCache() {
    try {
        const cached = localStorage.getItem(CHAT_CACHE_KEY);
        if (!cached) return null;
        const data = JSON.parse(cached);
        // Check if cache is still valid (not older than 5 minutes)
        const age = Date.now() - (data.timestamp || 0);
        if (age > CHAT_CACHE_MAX_AGE) {
            localStorage.removeItem(CHAT_CACHE_KEY);
            return null;
        }
        return data.messages || [];
    } catch (err) {
        console.warn('Failed to load chat cache:', err);
        try {
            localStorage.removeItem(CHAT_CACHE_KEY);
        } catch (_) {}
        return null;
    }
}

function updateChatCache(newMessage) {
    try {
        const cached = loadChatCache();
        const messages = cached || [];
        // Add new message and keep only recent ones
        messages.push(newMessage);
        const recent = messages.slice(-MAX_CACHED_MESSAGES);
        saveChatCache(recent);
    } catch (err) {
        console.warn('Failed to update chat cache:', err);
    }
}
```

---

## Toast Notification Functions

### ensureChatToast
```javascript
function ensureChatToast() {
    if (!chatToastStyleInjected) {
        const style = document.createElement('style');
        style.textContent = `
            .chat-toast {
                position: fixed;
                top: 16px;
                left: 16px;
                z-index: 1000000;
                background: rgba(16, 18, 30, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #f8fafc;
                padding: 10px 14px;
                border-radius: 10px;
                box-shadow: 0 16px 40px rgba(0,0,0,0.55), 0 0 0 2px rgba(99,102,241,0.35);
                font-size: 13px;
                font-weight: 700;
                max-width: min(320px, 90vw);
                display: none;
            }
            .chat-toast .toast-user { color: #a5b4fc; margin-right: 6px; }
            .chat-toast .toast-text { color: #e2e8f0; }
            .chat-unread-badge {
                position: absolute;
                top: -6px;
                left: -6px;
                background: #ef4444;
                color: #fff;
                border-radius: 999px;
                min-width: 22px;
                height: 22px;
                padding: 0 6px;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 800;
                box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                z-index: 9999;
            }
        `;
        document.head.appendChild(style);
        chatToastStyleInjected = true;
    }
    if (!chatToastEl) {
        chatToastEl = document.createElement('div');
        chatToastEl.className = 'chat-toast';
        chatToastEl.innerHTML = `<span class="toast-user"></span><span class="toast-text"></span>`;
        document.body.appendChild(chatToastEl);
    }
}
```

### showChatToast
```javascript
function showChatToast(user, text) {
    ensureChatToast();
    const userEl = chatToastEl.querySelector('.toast-user');
    const textEl = chatToastEl.querySelector('.toast-text');
    userEl.textContent = user ? `${user}:` : 'Message:';
    textEl.textContent = text || '';
    chatToastEl.style.display = 'inline-flex';
    if (chatToastTimer) clearTimeout(chatToastTimer);
    chatToastTimer = setTimeout(() => {
        if (chatToastEl) chatToastEl.style.display = 'none';
    }, 3000);
}
```

---

## Badge Functions

### ensureChatBadge
```javascript
function ensureChatBadge() {
    if (!globalChatBadge) {
        ensureChatToast();
        globalChatBadge = document.createElement('div');
        globalChatBadge.className = 'chat-unread-badge';
        globalChatBadge.textContent = ' ';
    }
    const target = document.getElementById('globalChatToggle') || globalChatToggle;
    if (!target) return;
    if (globalChatBadge.parentElement !== target) {
        globalChatBadge.remove();
        if (getComputedStyle(target).position === 'static') {
            target.style.position = 'relative';
        }
        target.appendChild(globalChatBadge);
    }
    // Seed empty badge (hidden until count > 0)
    globalChatBadge.style.visibility = 'visible';
    globalChatBadge.style.opacity = '1';
    globalChatBadge.style.transform = 'scale(1)';
    globalChatBadge.style.color = '#fff';
    globalChatBadge.style.fontWeight = '800';
    globalChatBadge.style.fontSize = '12px';
}
```

### updateChatBadge
```javascript
function updateChatBadge() {
    ensureChatBadge();
    if (!globalChatBadge) return;
    const count = Number(globalChatUnread || 0);
    const text = count > 0 ? String(count) : ' ';
    globalChatBadge.textContent = text;
    globalChatBadge.style.display = count > 0 ? 'flex' : 'none';
    // Auto-fit big numbers without capping them
    const len = text.trim().length;
    globalChatBadge.style.fontSize = len >= 6 ? '9px' : len >= 4 ? '10px' : '12px';
    globalChatBadge.style.visibility = 'visible';
    globalChatBadge.style.opacity = '1';
    globalChatBadge.style.transform = 'scale(1)';
}
```

### markChatSeen
```javascript
function markChatSeen() {
    lastGlobalChatSeenTs = Date.now();
    try {
        localStorage.setItem('globalChatLastSeenTs', String(lastGlobalChatSeenTs));
    } catch (_) {}
    globalChatUnread = 0;
    updateChatBadge();
}
```

---

## Message Display Function (appendGlobalChatMessage)

This function handles:
- Rendering messages in the chat UI
- Showing toast notifications for new messages
- Incrementing unread badge count
- Updating last seen timestamp

```javascript
function appendGlobalChatMessage(msg) {
    if (!globalChatBox || !msg) return;
    const key = msg.id ? `id:${msg.id}` : `temp:${msg.user_id || ''}:${msg.content || ''}:${msg.created_at || ''}`;
    // Check if we've already seen this message (prevents duplicates)
    if (globalChatSeen.has(key)) {
        console.log('⏭️ Skipping duplicate message:', key);
        return;
    }
    globalChatSeen.add(key);
    
    let displayText = msg.content || '';
    let stateText = '';
    const parsed = parseChatContentJson(msg.content);
    if (parsed) {
        // Hide legacy moderation/ban event payloads (they are not user chat messages)
        if (parsed.type === 'ban') return;
        // Voice reports/mod events should not render in chat
        if (parsed.type === VOICE_REPORT_TYPE) {
            handleVoiceReportEvent(msg.user_id || '', parsed);
            return;
        }
        if (parsed.type === VOICE_MOD_TYPE) {
            handleVoiceModEvent(msg.user_id || '', parsed);
            return;
        }
        if (typeof parsed.text === 'string') displayText = parsed.text;
        if (typeof parsed.state === 'string') stateText = parsed.state;
    }
    
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'flex-start';
    row.style.alignItems = 'flex-start';
    row.style.userSelect = 'text';
    row.style.webkitUserSelect = 'text';
    row.style.MozUserSelect = 'text';
    
    // Add golden ring for %Owner% messages
    const isOwner = (msg.user_id === '%Owner%');
    if (isOwner) {
        row.style.border = '2px solid #FFD700';
        row.style.borderRadius = '12px';
        row.style.padding = '8px';
        row.style.marginBottom = '8px';
        row.style.boxShadow = '0 0 0 2px rgba(255, 215, 0, 0.3), 0 0 10px rgba(255, 215, 0, 0.2)';
        row.style.background = 'rgba(255, 215, 0, 0.05)';
    }
    
    const bubble = document.createElement('div');
    const isMine = (msg.user_id || '') === globalChatUsername;
    // Always scroll to bottom for new messages if chat is open and user is near bottom
    const shouldStick = globalChatIsOpen && (isChatNearBottom(200) || isMine);
    
    if (isMine && customMyBubbleColor) {
        const personal = buildPersonalBubbleStyle();
        bubble.style.background = personal.bg;
        bubble.style.border = `1px solid ${personal.border}`;
        bubble.style.boxShadow = personal.shadow;
    } else {
        bubble.style.background = currentBubbleStyle.bubbleBg;
        bubble.style.border = `1px solid ${currentBubbleStyle.bubbleBorder}`;
        bubble.style.boxShadow = currentBubbleStyle.bubbleShadow || '0 8px 22px rgba(0,0,0,0.25)';
    }
    
    bubble.style.borderRadius = '16px';
    bubble.style.padding = '12px 14px';
    bubble.style.backdropFilter = 'blur(6px)';
    bubble.style.transition = 'transform 0.15s ease';
    bubble.style.width = '100%';
    bubble.style.userSelect = 'text';
    bubble.style.webkitUserSelect = 'text';
    bubble.style.MozUserSelect = 'text';
    bubble.dataset.msgId = msg.id || '';
    
    if (stateText) {
        const stateLine = document.createElement('div');
        stateLine.textContent = stateText;
        stateLine.style.fontSize = '11px';
        stateLine.style.color = 'rgba(255,255,255,0.55)';
        stateLine.style.marginBottom = '2px';
        bubble.appendChild(stateLine);
    }
    
    const user = document.createElement('strong');
    const userName = msg.user_id || 'User';
    const displayName = getDisplayName(userName);
    user.textContent = `${displayName}: `;
    const text = document.createElement('span');
    text.textContent = displayText;
    const time = document.createElement('span');
    time.textContent = formatChatTime(msg.created_at || msg.createdAt || msg.timestamp || Date.now());
    time.style.fontSize = '11px';
    time.style.color = 'rgba(255,255,255,0.55)';
    time.style.marginLeft = '8px';

    bubble.appendChild(user);
    bubble.appendChild(text);
    bubble.appendChild(time);

    // ========== NOTIFICATION AND BADGE LOGIC ==========
    
    // Show lightweight toast in upper-left for any new message
    const toastSnippet = (displayText || '').slice(0, 80);
    const msgTime = getMessageTimestamp(msg);
    lastSupabaseChatTs = Math.max(lastSupabaseChatTs, msgTime);
    // Update local cache when new message arrives
    updateChatCache(msg);
    const isRecent = Date.now() - msgTime < 5 * 60 * 1000; // 5 minutes freshness window
    
    // Show toast notification if:
    // - Toasts are not suppressed (suppressChatToast = false)
    // - Message is recent (within 5 minutes)
    if (!suppressChatToast && isRecent) {
        showChatToast(displayName, toastSnippet);
    }

    // Increment unread count for new incoming messages when chat is closed
    // ONLY count messages that are newer than the last seen timestamp
    if (!globalChatIsOpen && chatHistoryBootstrapped && !isMine) {
        // Only increment if this message is newer than when we last saw the chat
        if (msgTime > lastGlobalChatSeenTs) {
            globalChatUnread += 1;
            updateChatBadge();
        }
    } else if (globalChatIsOpen) {
        // If chat is open, treat this message as seen
        lastGlobalChatSeenTs = Math.max(lastGlobalChatSeenTs, msgTime);
        try {
            localStorage.setItem('globalChatLastSeenTs', String(lastGlobalChatSeenTs));
        } catch (_) {}
    }
    
    // ========== END NOTIFICATION AND BADGE LOGIC ==========

    // ... rest of message rendering code (reactions, delete button, etc.) ...
    // (See full implementation in script.js for complete DOM structure)
    
    row.appendChild(bubble);
    
    // Store timestamp in row for ordering
    row.dataset.timestamp = String(msgTime);
    
    // Insert message in chronological order instead of just appending
    const children = Array.from(globalChatBox.children);
    
    // If no messages exist, just append
    if (children.length === 0) {
        globalChatBox.appendChild(row);
    } else {
        // Find the correct position by comparing timestamps
        let insertIndex = children.length;
        for (let i = 0; i < children.length; i++) {
            const childTimestamp = parseFloat(children[i].dataset.timestamp || '0');
            if (msgTime < childTimestamp) {
                insertIndex = i;
                break;
            }
        }
        
        // Insert at the correct position
        if (insertIndex === children.length) {
            globalChatBox.appendChild(row);
        } else {
            globalChatBox.insertBefore(row, children[insertIndex]);
        }
    }
    
    // Scroll to bottom for new messages (especially from others)
    if (shouldStick) {
        scrollGlobalChatToBottom();
        // Also scroll after a brief delay to ensure DOM is updated
        setTimeout(() => {
            if (globalChatIsOpen && isChatNearBottom(200)) {
                scrollGlobalChatToBottom();
            }
        }, 50);
    }
    
    if (msg.id) {
        messageNodeIndex.set(msg.id, row);
    }

    // Render existing reactions for this message
    renderReactions(msg.id, reactList);
}
```

---

## Message Sending Function (sendGlobalChatMessage)

This function handles:
- Message validation and moderation
- Optimistic UI (showing message immediately)
- Sending to Worker WebSocket
- Preventing duplicate sends

```javascript
async function sendGlobalChatMessage() {
    if (!globalChatInput) return;
    const text = (globalChatInput.value || '').trim();
    if (!text) return;
    if (globalChatSending) return;

    // Check message length limit (750 characters)
    if (text.length > 750) {
        setGlobalChatStatus('Message too long. Maximum 750 characters allowed.', true);
        showChatNotice('Message too long. Maximum 750 characters allowed.', true);
        return;
    }
    
    const dedupSig = text.replace(/\s+/g, ' ').toLowerCase();
    if (dedupSig && dedupSig === lastGlobalChatMessageSig) {
        setGlobalChatStatus('Duplicate message blocked.', true);
        showChatNotice('You already sent that message.', true);
        return;
    }
    
    globalChatSending = true;
    setChatSendingUi(true);
    
    try {
        // Validation checks (name, blocked content, etc.)
        if (!isValidChatName(globalChatUsername)) {
            setGlobalChatStatus('Please set a display name before chatting.', true);
            if (globalChatNameInput) {
                globalChatNameInput.focus();
            }
            showChatNotice('Set a display name first (not the default).', true);
            return;
        }
        
        if (isNameBlocked(globalChatUsername)) {
            setGlobalChatStatus('Display name blocked. Please change it before chatting.', true);
            showChatNotice('Display name blocked. Please change it before chatting.', true);
            if (globalChatNameInput) globalChatNameInput.focus();
            return;
        }
        
        // Check for reserved names (but allow %Owner% as special case)
        if (globalChatUsername !== '%Owner%' && containsReservedName(globalChatUsername)) {
            setGlobalChatStatus('You cannot use "Owner", "Admin", "Mod", or similar words in your name. Please change it.', true);
            showChatNotice('You cannot use "Owner", "Admin", "Mod", or similar words in your name. Please change it.', true);
            if (globalChatNameInput) globalChatNameInput.focus();
            return;
        }
        
        if (isBlockedMessage(text)) {
            showChatNotice('Message blocked for inappropriate content.', true);
            setGlobalChatStatus('Message blocked for inappropriate content.', true);
            return;
        }
        
        // Check for phone numbers
        if (containsPhoneNumber(text)) {
            showChatNotice('Phone numbers are not allowed in chat messages.', true);
            setGlobalChatStatus('Phone numbers are not allowed in chat messages.', true);
            return;
        }
        
        // Check for addresses
        if (containsAddress(text)) {
            showChatNotice('Addresses are not allowed in chat messages.', true);
            setGlobalChatStatus('Addresses are not allowed in chat messages.', true);
            return;
        }
        
        const aiCheck = await moderateWithAI(text);
        if (!aiCheck.ok) {
            setGlobalChatStatus('AI moderation unavailable. Please try again shortly.', true);
            showChatNotice('AI moderation is temporarily unavailable. Please try again in a moment.', true);
            return;
        }
        
        if (aiCheck.flagged) {
            setGlobalChatStatus('Message blocked by AI moderation.', true);
            showChatNotice('Message blocked by AI moderation.', true);
            return;
        }
        
        setGlobalChatStatus('Sending...');
        
        // ========== OPTIMISTIC UI ==========
        // Generate temporary ID for optimistic message (will be replaced by Worker's real ID)
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        // Create optimistic message object
        const optimisticMessage = {
            id: tempId,
            user_id: globalChatUsername,
            content: JSON.stringify({ text: text, state: null }),
            created_at: now
        };
        
        // Show message immediately (optimistic UI) - deduplication will prevent duplicates when Worker echoes back
        appendGlobalChatMessage(optimisticMessage);
        scrollGlobalChatToBottom();
        
        // Clear input immediately for better UX
        globalChatInput.value = '';
        // ========== END OPTIMISTIC UI ==========
        
        // ✅ PRIMARY: Send to Cloudflare Worker WebSocket (no Supabase cost)
        if (chatWorkerWs && chatWorkerWs.readyState === WebSocket.OPEN) {
            try {
                console.log('📤 Sending message via Chat Worker WebSocket...');
                
                // Send in the format Worker expects: { type: "chat", name: username, text }
                chatWorkerWs.send(JSON.stringify({
                    type: 'chat',
                    name: globalChatUsername,
                    text: text
                }));
                
                console.log('✅ Message sent via Worker WebSocket');
                
                setGlobalChatStatus('Sent!');
                lastGlobalChatMessageSig = dedupSig;
                
                // Note: When Worker echoes back the message with real ID, the handler will
                // replace the optimistic message with the real one
                
                return; // Success via Worker WebSocket
            } catch (err) {
                console.error('❌ Chat Worker send failed:', err);
                setGlobalChatStatus('Failed to send message.', true);
                return; // Don't fallback to Supabase - Worker is primary
            }
        } else {
            console.warn('⚠️ Chat Worker WebSocket not connected (state:', chatWorkerWs?.readyState, ')');
            setGlobalChatStatus('Not connected to chat server. Please refresh.', true);
            
            // Try to reconnect
            if (!chatWorkerConnected) {
                connectChatWorker();
            }
            return; // Don't send via Supabase - Worker is required
        }
    } finally {
        globalChatSending = false;
        setChatSendingUi(false);
    }
}
```

---

## Worker WebSocket Message Handler

This handles incoming messages from the Worker and prevents duplicates:

```javascript
chatWorkerWs.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if ((data.type === 'snapshot' || data.type === 'history') && Array.isArray(data.messages)) {
            // Received snapshot or history - update cache and display
            workerHistoryLoaded = true; // ✅ THIS IS KEY - Worker history is authoritative
            console.log(`📥 Received ${data.type} from Worker: ${data.messages.length} messages`);
            
            // Suppress toasts while loading history
            const wasSuppressed = suppressChatToast;
            suppressChatToast = true;
            
            // Convert Worker format to our format if needed
            const convertedMessages = data.messages.map(m => {
                // If message is in Worker format { id, t, name, text }, convert it
                if (m.name && m.text && !m.user_id) {
                    return {
                        id: m.id,
                        user_id: m.name,
                        content: JSON.stringify({ text: m.text, state: null }),
                        created_at: m.t ? new Date(m.t).toISOString() : new Date().toISOString()
                    };
                }
                // Already in our format
                return m;
            });
            
            // Clear existing messages from Supabase fallback if Worker snapshot is available
            const chatBox = document.getElementById('globalChatBox');
            if (chatBox) {
                // Clear all messages - Worker snapshot/history is authoritative
                chatBox.innerHTML = '';
                messageNodeIndex.clear(); // Clear message index
                globalChatSeen.clear(); // Clear seen set so messages can be re-rendered
                console.log('🧹 Cleared Supabase fallback messages - replacing with Worker ' + data.type);
            }
            
            let newCount = 0;
            convertedMessages.forEach(m => {
                appendGlobalChatMessage(m);
                lastSupabaseChatTs = Math.max(lastSupabaseChatTs, getMessageTimestamp(m));
                newCount++;
            });
            
            saveChatCache(convertedMessages);
            console.log(`✅ Loaded ${newCount} messages from Worker ${data.type} (${convertedMessages.length} total) - REPLACED Supabase fallback`);
            console.log('✅ Chat Worker is WORKING! Messages loaded successfully.');
            
            // Calculate unread count based on lastGlobalChatSeenTs
            // Only count messages newer than when we last saw the chat
            const seenCutoff = lastGlobalChatSeenTs || 0;
            let unreadCount = 0;
            if (seenCutoff > 0) {
                unreadCount = convertedMessages.reduce((acc, m) => {
                    const ts = getMessageTimestamp(m);
                    const isMine = (m.user_id || '') === globalChatUsername;
                    return acc + (!isMine && ts > seenCutoff ? 1 : 0);
                }, 0);
            }
            
            // Update unread badge only if chat is closed
            if (!globalChatIsOpen) {
                globalChatUnread = unreadCount;
                updateChatBadge();
                console.log(`📊 Calculated ${unreadCount} unread messages (seen cutoff: ${new Date(seenCutoff).toISOString()})`);
            } else {
                // Chat is open, mark as seen
                markChatSeen();
            }
            
            // Re-enable toasts after Worker history is loaded (wait a bit to ensure all messages are rendered)
            setTimeout(() => {
                suppressChatToast = false;
            }, 1000);
            
        } else if (data.type === 'message' || data.type === 'chat') {
            // New message received from Worker
            console.log('📦 Raw Worker message data:', JSON.stringify(data, null, 2));
            
            let message = null;
            
            // Handle different Worker response formats
            if (data.message) {
                // Worker sent: { type: 'chat', message: { id, t, name, text } }
                const msg = data.message;
                message = {
                    id: msg.id || `worker_${Date.now()}_${Math.random()}`,
                    user_id: msg.name || msg.user_id || 'User',
                    content: JSON.stringify({ 
                        text: msg.text || '', 
                        state: null 
                    }),
                    created_at: msg.t ? new Date(msg.t).toISOString() : 
                               msg.created_at || new Date().toISOString()
                };
            } else if (data.name || data.user_id) {
                // Worker sent: { type: 'chat', name: '...', text: '...' }
                message = {
                    id: data.id || `worker_${Date.now()}_${Math.random()}`,
                    user_id: data.name || data.user_id || 'User',
                    content: JSON.stringify({ 
                        text: data.text || '', 
                        state: data.state || null 
                    }),
                    created_at: data.timestamp ? new Date(data.timestamp).toISOString() : 
                               data.t ? new Date(data.t).toISOString() :
                               data.created_at || new Date().toISOString()
                };
            }
            
            if (message && message.user_id && message.content) {
                // Skip if message is empty
                try {
                    const contentObj = JSON.parse(message.content);
                    if (!contentObj.text || contentObj.text.trim() === '') {
                        console.warn('⚠️ Skipping empty message from Worker');
                        return;
                    }
                } catch (_) {
                    // If content is not JSON, check if it's a plain string
                    if (!message.content || message.content.trim() === '') {
                        console.warn('⚠️ Skipping empty message from Worker');
                        return;
                    }
                }
                
                console.log('📨 Received new message from Worker:', message.user_id);
                const msgTs = getMessageTimestamp(message);
                
                // ========== DUPLICATE PREVENTION FOR OPTIMISTIC UI ==========
                // Check if this is our own message echoing back (optimistic UI replacement)
                const isMyMessage = (message.user_id || '') === globalChatUsername;
                let replacedOptimistic = false;
                
                if (isMyMessage && message.content && globalChatBox) {
                    try {
                        const contentObj = JSON.parse(message.content);
                        const messageText = contentObj.text || '';
                        
                        // Find optimistic message with same text from same user (within last 3 seconds)
                        if (messageText && Math.abs(Date.now() - msgTs) < 3000) {
                            // Look for messages with temp IDs
                            const allRows = Array.from(globalChatBox.children);
                            for (const row of allRows) {
                                const bubble = row.querySelector('[data-msg-id]');
                                if (!bubble) continue;
                                
                                const tempId = bubble.getAttribute('data-msg-id');
                                if (tempId && tempId.startsWith('temp_')) {
                                    // Check if text matches
                                    const textSpan = bubble.querySelector('span:last-child');
                                    if (textSpan && textSpan.textContent.trim() === messageText.trim()) {
                                        // This is our optimistic message - replace it with real one
                                        removeMessageById(tempId);
                                        replacedOptimistic = true;
                                        console.log('🔄 Replaced optimistic message with real Worker message');
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (_) {}
                }
                
                // If we replaced an optimistic message, the DOM was cleared
                // Now append the real message with the real ID
                if (replacedOptimistic) {
                    // Mark the real message ID as seen to prevent duplicate
                    if (message.id) {
                        const realKey = `id:${message.id}`;
                        globalChatSeen.add(realKey);
                    }
                    // Append the real message
                    appendGlobalChatMessage(message);
                    lastSupabaseChatTs = Math.max(lastSupabaseChatTs, msgTs);
                    updateChatCache(message);
                } else if (!chatHistoryBootstrapped || msgTs > lastSupabaseChatTs) {
                    // Normal message (not replacing optimistic)
                    appendGlobalChatMessage(message);
                    lastSupabaseChatTs = Math.max(lastSupabaseChatTs, msgTs);
                    
                    // Update cache with new message
                    updateChatCache(message);
                }
                // ========== END DUPLICATE PREVENTION ==========
            } else {
                console.warn('⚠️ Received invalid message from Worker (missing user_id or content):', JSON.stringify(data, null, 2));
            }
        } else {
            console.log('📦 Received data from Worker:', data.type, data);
        }
    } catch (err) {
        console.warn('Chat Worker message parse error:', err);
    }
};
```

---

## Key Points

1. **Toast Notifications**: Shown when `suppressChatToast = false` and message is recent (< 5 minutes old)
2. **Unread Badge**: Only increments for messages newer than `lastGlobalChatSeenTs` when chat is closed
3. **Optimistic UI**: Messages appear immediately when sent, then replaced with real ID when Worker confirms
4. **Duplicate Prevention**: Uses `globalChatSeen` Set to track seen messages and prevent duplicates
5. **Worker History**: Calculates unread count based on `lastGlobalChatSeenTs` when history loads
