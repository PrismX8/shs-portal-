# Complete Chat and Voice Chat Frontend Code Documentation

This document contains **ALL** code related to chat and voice chat functionality from `script.js`. Use this for debugging and reference.

---

## Table of Contents

1. [Chat System](#chat-system)
   - [Chat Initialization](#chat-initialization)
   - [Chat Polling](#chat-polling)
   - [Chat Message Handling](#chat-message-handling)
   - [Chat UI Components](#chat-ui-components)
   - [Chat Moderation](#chat-moderation)
2. [Voice Chat System](#voice-chat-system)
   - [Voice Chat Initialization](#voice-chat-initialization)
   - [Voice Chat Join/Leave](#voice-chat-joinleave)
   - [Voice Chat Discovery](#voice-chat-discovery)
   - [Voice Chat UI](#voice-chat-ui)
   - [Voice Chat Moderation](#voice-chat-moderation)
   - [Voice Activity Notifications](#voice-activity-notifications)

---

## Chat System

### Chat Initialization

#### Global Variables and Constants

```javascript
// Chat page detection
const IS_CHAT_ONLY = window.location.pathname.includes('chat-only.html');
const CHAT_AGE_KEY = 'chatAgeGateStatus';

// Backend API configuration
const BACKEND_API_URL = IS_LOCAL 
    ? 'http://localhost:3000/api' 
    : 'https://shs-portal-backend.vercel.app/api';
const BACKEND_WS_URL = IS_LOCAL 
    ? 'ws://localhost:3000' 
    : 'wss://shs-portal-backend.vercel.app';

// Backend API instance
const backendApiAvailable = typeof BackendAPI !== 'undefined';
let backendApi = backendApiAvailable ? new BackendAPI({ apiUrl: BACKEND_API_URL, wsUrl: BACKEND_WS_URL }) : null;

// Free-tier safe defaults
window.ENABLE_VOICE_WS = false; // Disable WebSockets to prevent Durable Objects burn
let workerHistoryLoaded = false; // Track if worker history loaded (legacy flag)

// Chat state variables
let suppressChatToast = true; // prevent toasts during history bootstrap
let chatHistoryBootstrapped = false;
let globalChatUnread = 0;
let globalChatBadge = null;
let globalChatIsOpen = false;
let lastGlobalChatSeenTs = Number(localStorage.getItem('globalChatLastSeenTs') || 0) || 0;
let lastSupabaseChatTs = 0; // Keep for timestamp tracking

// Polling configuration
const CHAT_POLL_INTERVAL = 20000; // 20 seconds (adjustable: 15-30s recommended)
let chatPollTimer = null;
let chatPollingActive = false;
let lastPolledMessageId = null;

// Cache configuration
const CHAT_CACHE_KEY = 'chat_cache_v1';
const CHAT_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_MESSAGES = 50;

// Rate limiting
const MIN_REALTIME_INTERVAL = 5000; // 5 seconds minimum between realtime messages (deduplication)
```

#### DOM Elements

```javascript
const globalChatToggle = document.getElementById('globalChatToggle');
const globalChatModal = document.getElementById('globalChatModal');
const globalChatPanel = document.getElementById('globalChatPanel');
const closeGlobalChat = document.getElementById('closeGlobalChat');
const globalChatBox = document.getElementById('globalChatBox');
const globalChatInput = document.getElementById('globalChatInput');
const globalChatSendBtn = document.getElementById('globalChatSendBtn');
const globalChatEmojiBtn = document.getElementById('globalChatEmojiBtn');
const globalChatEmojiPicker = document.getElementById('globalChatEmojiPicker');
const globalChatStatus = document.getElementById('globalChatStatus');
const globalChatTypingEl = document.getElementById('globalChatTyping');
const globalChatNameInput = document.getElementById('globalChatNameInput');
const globalChatNameSave = document.getElementById('globalChatNameSave');
const globalChatLocationValue = document.getElementById('globalChatLocationValue');
const globalChatSettingsBtn = document.getElementById('globalChatSettingsBtn');
const globalChatSettingsModal = document.getElementById('globalChatSettingsModal');
const closeGlobalChatSettings = document.getElementById('closeGlobalChatSettings');
const globalChatThemeButtons = document.querySelectorAll('.globalChatThemeBtn');
const globalChatMyBubbleColorInput = document.getElementById('globalChatMyBubbleColor');
```

#### Bootstrap Function

```javascript
function bootstrapChatExperienceForPage() {
    if (chatBootstrapDone) return;
    chatBootstrapDone = true;
    
    // Initialize chat client (polling-based, no WebSockets)
    initGlobalChatClient();
    
    // Initialize voice activity banner on all pages (for join/leave messages)
    ensureVoiceActivityBanner();
    
    // Voice discovery (if enabled) - for notifications only
    if (VOICE_DISCOVERY_ENABLED) {
        try { ensureVoiceDiscoveryObserver(); } catch (_) {}
    }
}
```

### Chat Polling

#### Polling Function

```javascript
// ✅ Polling-based chat (no Durable Objects, no WebSockets)
async function pollChatMessages() {
    // Ensure backendApi is available and connected
    if (!backendApi) {
        // Try to initialize if BackendAPI is available
        if (typeof BackendAPI !== 'undefined') {
            try {
                backendApi = new BackendAPI({ apiUrl: BACKEND_API_URL, wsUrl: BACKEND_WS_URL });
                await backendApi.connect();
            } catch (err) {
                // Silently fail - BackendAPI might not be loaded yet
                return;
            }
        } else {
            // BackendAPI not loaded yet - this is normal during page load
            return;
        }
    }
    
    if (!backendApi.connected) {
        try {
            await backendApi.connect();
        } catch (err) {
            // Silently fail - connection will retry on next poll
            return;
        }
    }
    
    try {
        // Fetch recent messages from backend API (which queries Supabase)
        const messages = await backendApi.getRecentChat(50, true);
        
        if (!Array.isArray(messages)) {
            console.warn('⚠️ Invalid messages format from API');
            return;
        }
        
        // Process new messages (only ones we haven't seen)
        let newCount = 0;
        const seenCutoff = lastGlobalChatSeenTs || 0;
        let unreadCount = 0;
        
        // If this is the first poll, load all messages
        if (!chatHistoryBootstrapped) {
            console.log(`📥 Initial chat poll: ${messages.length} messages`);
            
            // Clear existing messages
            const chatBox = document.getElementById('globalChatBox');
            if (chatBox) {
                chatBox.innerHTML = '';
                messageNodeIndex.clear();
                globalChatSeen.clear();
            }
            
            // Load all messages
            messages.forEach(m => {
                appendGlobalChatMessage(m);
                lastSupabaseChatTs = Math.max(lastSupabaseChatTs, getMessageTimestamp(m));
                newCount++;
            });
            
            saveChatCache(messages);
            chatHistoryBootstrapped = true;
            suppressChatToast = false;
            workerHistoryLoaded = true; // Mark as loaded to prevent duplicate loads
            
            // Calculate unread count
            if (seenCutoff > 0) {
                unreadCount = messages.reduce((acc, m) => {
                    const ts = getMessageTimestamp(m);
                    const isMine = (m.user_id || '') === globalChatUsername;
                    return acc + (!isMine && ts > seenCutoff ? 1 : 0);
                }, 0);
            }
            
            if (unreadCount > 0) {
                globalChatUnread = unreadCount;
                updateChatBadge();
            }
            
            setGlobalChatStatus('Chat loaded', false);
        } else {
            // Subsequent polls: only process new messages
            messages.forEach(m => {
                const msgKey = `id:${m.id}`;
                const msgTs = getMessageTimestamp(m);
                
                // Skip if already seen
                if (globalChatSeen.has(msgKey)) return;
                
                // Only show messages newer than last poll timestamp
                if (msgTs > lastSupabaseChatTs) {
                    appendGlobalChatMessage(m);
                    lastSupabaseChatTs = Math.max(lastSupabaseChatTs, msgTs);
                    updateChatCache(m);
                    newCount++;
                    
                    // Count unread
                    if (seenCutoff > 0) {
                        const isMine = (m.user_id || '') === globalChatUsername;
                        if (!isMine && msgTs > seenCutoff) {
                            unreadCount++;
                        }
                    }
                }
            });
            
            if (newCount > 0) {
                console.log(`📥 Poll: ${newCount} new message(s)`);
            }
            
            if (unreadCount > 0) {
                globalChatUnread += unreadCount;
                updateChatBadge();
            }
        }
        
        // Update last polled message ID for tracking
        if (messages.length > 0) {
            lastPolledMessageId = messages[messages.length - 1].id;
        }
    } catch (err) {
        console.error('❌ Chat poll error:', err);
        setGlobalChatStatus('Polling error - will retry', true);
    }
}
```

#### Start/Stop Polling

```javascript
// Start polling for chat messages
function startChatPolling() {
    if (chatPollingActive) return;
    
    // Ensure backendApi is available before starting
    if (!backendApi && typeof BackendAPI !== 'undefined') {
        try {
            backendApi = new BackendAPI({ apiUrl: BACKEND_API_URL, wsUrl: BACKEND_WS_URL });
            backendApi.connect(); // This sets connected = true immediately
        } catch (err) {
            // Silently fail - will retry on next poll
            chatPollingActive = true;
            return;
        }
    }
    
    chatPollingActive = true;
    console.log('🔄 Starting chat polling (interval: ' + CHAT_POLL_INTERVAL + 'ms)');
    
    // Initial poll immediately (async, won't block)
    pollChatMessages().catch(err => {
        console.warn('⚠️ Initial chat poll failed:', err);
    });
    
    // Then poll at regular intervals
    chatPollTimer = setInterval(() => {
        pollChatMessages().catch(err => {
            console.warn('⚠️ Chat poll error:', err);
        });
    }, CHAT_POLL_INTERVAL);
    
    setGlobalChatStatus('Chat polling active', false);
}

// Stop polling
function stopChatPolling() {
    if (chatPollTimer) {
        clearInterval(chatPollTimer);
        chatPollTimer = null;
    }
    chatPollingActive = false;
    console.log('⏸️ Chat polling stopped');
}
```

#### Chat Initialization

```javascript
async function initGlobalChatClient() {
    // Polling-based chat system (no Durable Objects, no WebSockets)
    try {
        suppressChatToast = true;
        
        // Step 1: Load from local cache (instant)
        let loadedMessages = null;
        const cachedMessages = loadChatCache();
        if (cachedMessages && cachedMessages.length > 0) {
            cachedMessages.forEach(m => {
                appendGlobalChatMessage(m);
                lastSupabaseChatTs = Math.max(lastSupabaseChatTs, getMessageTimestamp(m));
            });
            console.log(`Loaded ${cachedMessages.length} messages from cache`);
            loadedMessages = cachedMessages;
        }
        
        // Step 2: Start polling for new messages
        startChatPolling();
        
        // Step 3: Also fetch initial snapshot from server
        const serverMessages = await requestServerSnapshot();
        
        if (serverMessages && serverMessages.length > 0) {
            // Clear existing messages and replace with server snapshot
            const existingIds = new Set();
            document.querySelectorAll('[data-message-id]').forEach(el => {
                const id = el.getAttribute('data-message-id');
                if (id) existingIds.add(id);
            });
            
            // Only add messages not already rendered
            serverMessages.forEach(m => {
                if (!existingIds.has(m.id)) {
                    appendGlobalChatMessage(m);
                    lastSupabaseChatTs = Math.max(lastSupabaseChatTs, getMessageTimestamp(m));
                }
            });
            
            // Update cache with authoritative server data
            saveChatCache(serverMessages);
            console.log(`Loaded ${serverMessages.length} messages from server snapshot`);
            loadedMessages = serverMessages; // Server snapshot takes precedence over cache
        }
        
        // Check for users with reserved names and compute unread count
        if (loadedMessages) {
            // Check for reserved names
            const uniqueUsers = new Set(loadedMessages.map(m => m.user_id).filter(Boolean));
            uniqueUsers.forEach(userId => {
                if (userId !== '%Owner%' && containsReservedName(userId)) {
                    // If this is the current user, notify them
                    if (userId === globalChatUsername) {
                        setGlobalChatStatus('Your name contains reserved words. Please change it to continue chatting.', true);
                        showChatNotice('Your name contains "Owner", "Admin", "Mod", or similar words. Please change it.', true);
                    }
                }
            });
            
            // Compute unread since last seen from loaded messages
            const seenCutoff = lastGlobalChatSeenTs || 0;
            let unreadCount = 0;
            if (seenCutoff > 0) {
                unreadCount = loadedMessages.reduce((acc, m) => {
                    const ts = getMessageTimestamp(m);
                    const isMine = (m.user_id || '') === globalChatUsername;
                    return acc + (!isMine && ts > seenCutoff ? 1 : 0);
                }, 0);
            }
            
            if (!globalChatIsOpen) {
                globalChatUnread = unreadCount;
                updateChatBadge();
            } else {
                markChatSeen();
            }
        }
        
        chatHistoryBootstrapped = true;
        suppressChatToast = false;
        
        // Reactions are handled via REST API
        reactionListNodes.forEach((node, msgId) => renderReactions(msgId, node));
        
        // Voice discovery (if enabled)
        if (VOICE_DISCOVERY_ENABLED) {
            try { ensureVoiceDiscoveryObserver(); } catch (_) {}
        }
        
    } catch (err) {
        console.error('Failed to load chat history:', err);
        setGlobalChatStatus('Failed to load chat history.', true);
        // Only set flags if Worker history hasn't loaded yet
        if (!workerHistoryLoaded) {
            suppressChatToast = false;
            chatHistoryBootstrapped = true;
        }
    }
    
    // Fallback: If Worker history hasn't loaded after 3 seconds, enable toasts anyway
    setTimeout(() => {
        if (!workerHistoryLoaded) {
            if (suppressChatToast) {
                suppressChatToast = false;
            }
            if (!chatHistoryBootstrapped) {
                chatHistoryBootstrapped = true;
            }
        }
    }, 3000);
    
    return true; // Return success indicator (no client object needed)
}
```

### Chat Message Handling

#### Send Message

```javascript
async function sendGlobalChatMessage() {
    // ✅ HARD GUARD: Prevent duplicate sends
    if (globalChatSending) return;
    globalChatSending = true;
    
    if (!globalChatInput) {
        setTimeout(() => { globalChatSending = false; }, 50);
        return;
    }
    const text = (globalChatInput.value || '').trim();
    if (!text) {
        setTimeout(() => { globalChatSending = false; }, 50);
        return;
    }

    // Check message length limit (750 characters)
    if (text.length > 750) {
        setGlobalChatStatus('Message too long. Maximum 750 characters allowed.', true);
        showChatNotice('Message too long. Maximum 750 characters allowed.', true);
        setTimeout(() => { globalChatSending = false; }, 50);
        return;
    }
    const dedupSig = text.replace(/\s+/g, ' ').toLowerCase();
    if (dedupSig && dedupSig === lastGlobalChatMessageSig) {
        setGlobalChatStatus('Duplicate message blocked.', true);
        showChatNotice('You already sent that message.', true);
        setTimeout(() => { globalChatSending = false; }, 50);
        return;
    }
    
    setChatSendingUi(true);
    try {
        // Validation checks...
        if (!isValidChatName(globalChatUsername)) {
            setGlobalChatStatus('Please set a display name before chatting.', true);
            if (globalChatNameInput) {
                globalChatNameInput.focus();
            }
            showChatNotice('Set a display name first (not the default).', true);
            setTimeout(() => { globalChatSending = false; }, 50);
            return;
        }
        
        // ... more validation ...
        
        // AI moderation check
        const aiCheck = await moderateWithAI(text);
        if (!aiCheck.ok) {
            setGlobalChatStatus('AI moderation unavailable. Please try again shortly.', true);
            showChatNotice('AI moderation is temporarily unavailable. Please try again in a moment.', true);
            setTimeout(() => { globalChatSending = false; }, 50);
            return;
        }
        if (aiCheck.flagged) {
            setGlobalChatStatus('Message blocked by AI moderation.', true);
            showChatNotice('Message blocked by AI moderation.', true);
            setTimeout(() => { globalChatSending = false; }, 50);
            return;
        }
        setGlobalChatStatus('Sending...');
        
        // Generate temporary ID for optimistic message
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();
        
        // Create optimistic message object
        const optimisticMessage = {
            id: tempId,
            user_id: globalChatUsername,
            content: JSON.stringify({ text: text, state: null }),
            created_at: now
        };
        
        // Show message immediately (optimistic UI)
        appendGlobalChatMessage(optimisticMessage);
        if (globalChatBox && globalChatBox.lastElementChild) {
            messageNodeIndex.set(tempId, globalChatBox.lastElementChild);
        }
        lastOptimisticTempId = tempId;
        scrollGlobalChatToBottom();
        
        // Clear input immediately
        globalChatInput.value = '';
        
        // ✅ Send via REST API (polling-based, no WebSockets)
        if (backendApi && backendApi.connected) {
            try {
                console.log('📤 Sending message via REST API...');
                
                const messageData = {
                    user_id: globalChatUsername,
                    content: JSON.stringify({ text: text, state: null }),
                    visitor_id: backendApi.visitorId
                };
                
                const sentMessage = await backendApi.sendChatMessage(messageData);
                
                console.log('✅ Message sent via REST API');
                
                // Replace optimistic message with real one
                if (lastOptimisticTempId && sentMessage && sentMessage.id) {
                    removeMessageById(lastOptimisticTempId);
                    appendGlobalChatMessage(sentMessage);
                    updateChatCache(sentMessage);
                }
                
                setGlobalChatStatus('Sent!');
                lastGlobalChatMessageSig = dedupSig;
                
                setTimeout(() => {
                    globalChatSending = false;
                    setChatSendingUi(false);
                }, 50);
                
                return; // Success
            } catch (err) {
                console.error('❌ Chat send failed:', err);
                setGlobalChatStatus('Failed to send message.', true);
                showChatNotice('Failed to send message. Please try again.', true);
                setTimeout(() => {
                    globalChatSending = false;
                    setChatSendingUi(false);
                }, 50);
                return;
            }
        } else {
            console.warn('⚠️ Backend API not available');
            setGlobalChatStatus('Not connected. Please refresh.', true);
            showChatNotice('Not connected to chat server. Please refresh.', true);
            setTimeout(() => {
                globalChatSending = false;
                setChatSendingUi(false);
            }, 50);
            return;
        }
    } catch (err) {
        console.error('Unexpected error in sendGlobalChatMessage:', err);
        setTimeout(() => {
            globalChatSending = false;
            setChatSendingUi(false);
        }, 50);
    }
}
```

#### Append Message

```javascript
function appendGlobalChatMessage(msg) {
    if (!globalChatBox || !msg) return;
    const key = msg.id ? `id:${msg.id}` : `temp:${msg.user_id || ''}:${msg.content || ''}:${msg.created_at || ''}`;
    if (globalChatSeen.has(key)) return;
    globalChatSeen.add(key);
    let displayText = msg.content || '';
    let stateText = '';
    const parsed = parseChatContentJson(msg.content);
    if (parsed) {
        // Hide legacy moderation/ban event payloads
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
    
    // Create message row element...
    const row = document.createElement('div');
    // ... styling and structure ...
    
    // Insert message in chronological order
    const children = Array.from(globalChatBox.children);
    if (children.length === 0) {
        globalChatBox.appendChild(row);
    } else {
        let insertIndex = children.length;
        for (let i = 0; i < children.length; i++) {
            const childTimestamp = parseFloat(children[i].dataset.timestamp || '0');
            if (msgTime < childTimestamp) {
                insertIndex = i;
                break;
            }
        }
        
        if (insertIndex === children.length) {
            globalChatBox.appendChild(row);
        } else {
            globalChatBox.insertBefore(row, children[insertIndex]);
        }
    }
    
    // Scroll to bottom for new messages
    if (shouldStick) {
        scrollGlobalChatToBottom();
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

### Chat Cache System

```javascript
// Save messages to local cache
function saveChatCache(messages) {
    try {
        if (!Array.isArray(messages)) return;
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

// Load messages from local cache
function loadChatCache() {
    try {
        const cached = localStorage.getItem(CHAT_CACHE_KEY);
        if (!cached) return null;
        const data = JSON.parse(cached);
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

// Update cache when new message arrives
function updateChatCache(newMessage) {
    try {
        const cached = loadChatCache();
        const messages = cached || [];
        messages.push(newMessage);
        const recent = messages.slice(-MAX_CACHED_MESSAGES);
        saveChatCache(recent);
    } catch (err) {
        console.warn('Failed to update chat cache:', err);
    }
}
```

---

## Voice Chat System

### Voice Chat Initialization

#### Global Variables

```javascript
// Voice Chat Constants
const VOICE_ROOM_ID = 'global';
const VOICE_REPORT_TYPE = 'voice_report';
const VOICE_MOD_TYPE = 'voice_mod';

// Voice Discovery (Cloudflare WebSocket - DISABLED by default)
const VOICE_DISCOVERY_WS_URL = String(window.__VOICE_DISCOVERY_WS_URL__ || '').trim();
const VOICE_DISCOVERY_ENABLED = !!VOICE_DISCOVERY_WS_URL;

// Voice State
let voicePeer = null;
let voicePeerId = '';
let voiceJoined = false;
let voiceLocalStream = null;
let voiceMuted = false;
let voiceRtChannel = null;
let voiceRtSubscribed = false;
let voiceObserverChannel = null;
let voiceObserverKey = '';

// Voice Data Structures
const voiceCalls = new Map(); // peerId -> call
const voiceDataConns = new Map(); // peerId -> PeerJS DataConnection
const voiceParticipants = new Map(); // peerId -> { userId, lastSeen, lastSpokeTs, speaking, connected, lastBroadcastTs, level, lastLevelTs, muted }
let voiceParticipantsLoading = false;

// Firebase References
let voiceFirebaseRef = null;
let voiceFirebasePresenceRef = null;
let voiceFirebaseListeners = [];

// Voice Discovery WebSocket (DISABLED)
let voiceDiscoveryWs = null;
let voiceDiscoveryMode = 'off'; // 'observer' | 'joined' | 'off'
let voiceDiscoveryConnectPromise = null;
let voiceDiscoveryPingTimer = null;
let voiceDiscoveryReconnectTimer = null;

// Voice Audio Context
let voiceAudioCtx = null;
let voiceAnalyser = null;
let voiceMeterRaf = null;
let voiceLocalSpeaking = false;
let voiceLocalLastSpeakingSendTs = 0;
let voiceLocalLastLevelSendTs = 0;
let voiceNoiseFloor = 0;
let voiceNoiseFloorInitTs = 0;

// Voice Volume Control
const VOICE_VOLUME_KEY = 'voice_volume_v1';
let voiceVolume = 1.0;
let voiceAudioGainNodes = new Map(); // Map of peerId -> GainNode
let voiceMasterAudioCtx = null;

// Voice Activity Notifications
const VOICE_BROADCAST_ACTIVITY_EVENT = 'activity';
let voiceActivityEl = null;
let voiceActivityTimer = null;
let voiceActivityChannel = null;
const voiceActivityLastTsByUser = new Map();
const VOICE_ACTIVITY_HEARTBEAT_MS = 12000;
const VOICE_ACTIVITY_STALE_MS = 28000;
let voiceActivityHeartbeatTimer = null;
let voiceActivityQueue = [];
```

### Voice Chat Join/Leave

#### Join Voice Chat

```javascript
async function joinVoiceChat() {
    ensureVoiceUi();
    if (voiceJoined) return;
    if (!globalChatUsername) {
        showChatNotice('Set your chat name before joining voice.', true);
        return;
    }
    const gate = getVoiceGateState();
    if (gate !== 'adult_accepted') {
        await openVoiceGateModal({ afterAccept: () => joinVoiceChat() });
        return;
    }
    const block = getVoiceBlockReason(globalChatUsername);
    if (block.blocked) {
        if (block.type === 'ban') {
            showChatNotice('You are banned from voice chat.', true);
            setVoiceStatus('Voice banned.', true);
            return;
        }
        if (block.type === 'timeout') {
            const ms = Math.max(0, (block.until || 0) - Date.now());
            const mins = Math.ceil(ms / 60000);
            showChatNotice(`You are timed out from voice chat (${mins}m).`, true);
            setVoiceStatus('Voice timed out.', true);
            return;
        }
    }

    setVoiceStatus('Requesting microphone permission…');
    const Peer = await ensurePeerJs();
    if (!Peer) {
        showChatNotice('Voice chat failed: PeerJS did not load.', true);
        setVoiceStatus('PeerJS failed to load.', true);
        return;
    }

    try {
        voiceLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (voiceLocalStream) {
            voiceLocalStream.getAudioTracks().forEach(track => {
                track.enabled = true;
            });
        }
    } catch (err) {
        console.warn('getUserMedia failed', err);
        showChatNotice('Mic permission denied/unavailable.', true);
        setVoiceStatus('Mic unavailable.', true);
        return;
    }

    setVoiceStatus('Connecting voice…');
    voicePeer = new Peer();
    
    // Resume AudioContext on user gesture
    if (!voiceMasterAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            try {
                voiceMasterAudioCtx = new AudioCtx();
                window.audioCtx = voiceMasterAudioCtx;
            } catch (err) {
                console.warn('Failed to create AudioContext:', err);
            }
        }
    }
    if (voiceMasterAudioCtx && voiceMasterAudioCtx.state === 'suspended') {
        voiceMasterAudioCtx.resume().then(() => {
            console.log('✅ AudioContext resumed on join (user gesture)');
        }).catch(err => {
            console.warn('Failed to resume AudioContext on join:', err);
        });
    }
    
    // PeerJS data channel setup
    try {
        voicePeer.on('connection', (conn) => {
            try { setupVoiceDataConn(conn); } catch (_) {}
        });
    } catch (_) {}
    
    voicePeer.on('open', async (id) => {
        voicePeerId = String(id || '');
        voiceJoined = true;
        voiceMuted = false;
        
        // Update UI
        if (voiceUi.joinBtn) voiceUi.joinBtn.style.display = 'none';
        if (voiceUi.joinBtnContainer) voiceUi.joinBtnContainer.style.display = 'none';
        if (voiceUi.leaveBtn) voiceUi.leaveBtn.style.display = 'inline-block';
        if (voiceUi.muteBtn) voiceUi.muteBtn.style.display = 'inline-block';
        if (voiceUi.muteBtn) voiceUi.muteBtn.textContent = 'Mute';
        if (voiceUi.reportsBtn) voiceUi.reportsBtn.style.display = (globalChatUsername === '%Owner%') ? 'inline-block' : 'none';
        
        // Make panel full-page
        if (voiceUi.panel) {
            if (voiceUi.panel.parentElement !== document.body) {
                document.body.appendChild(voiceUi.panel);
            }
            voiceUi.panel.style.setProperty('display', 'block', 'important');
            voiceUi.panel.style.setProperty('position', 'fixed', 'important');
            voiceUi.panel.style.setProperty('top', '0', 'important');
            voiceUi.panel.style.setProperty('left', '0', 'important');
            voiceUi.panel.style.setProperty('right', '0', 'important');
            voiceUi.panel.style.setProperty('bottom', '0', 'important');
            voiceUi.panel.style.setProperty('width', '100vw', 'important');
            voiceUi.panel.style.setProperty('height', '100vh', 'important');
            voiceUi.panel.style.setProperty('z-index', '99999', 'important');
            // ... more styles ...
        }

        voiceNoiseFloor = 0;
        voiceNoiseFloorInitTs = Date.now();
        startVoiceMeter(voiceLocalStream);

        voiceParticipants.set(voicePeerId, {
            userId: globalChatUsername || 'User',
            lastSeen: Date.now(),
            lastSpokeTs: 0,
            speaking: false,
            lastBroadcastTs: 0,
            level: 0,
            lastLevelTs: 0,
            muted: false,
            connected: true,
        });
        voiceParticipantsLoading = true;
        renderVoiceParticipants();
        setVoiceStatus('Joined voice.');
        
        setTimeout(() => {
            if (voiceParticipantsLoading) {
                voiceParticipantsLoading = false;
                renderVoiceParticipants();
            }
        }, 5000);

        // Use Firebase Realtime Database as primary for participant discovery
        try {
            ensureVoiceFirebasePresence();
            startVoiceFirebaseListener();
        } catch (err) {
            console.error('Firebase voice chat setup failed:', err);
        }
        
        // Optional: Cloudflare for notifications only (if enabled)
        if (VOICE_DISCOVERY_ENABLED) {
            try {
                ensureVoiceDiscoveryJoined();
                // Send join notification via Cloudflare (optional)
                // ... notification code ...
            } catch (_) {}
        }
    });
    
    // Handle incoming calls
    voicePeer.on('call', (call) => {
        console.log('📞 Incoming call from', call.peer);
        if (!voiceLocalStream) {
            console.warn('📞 Rejecting call - no local stream');
            try { call.close(); } catch (_) {}
            return;
        }
        const remoteId = call.peer;
        // Respect owner moderation
        try {
            const info = voiceParticipants.get(remoteId);
            const uid = String(info?.userId || '');
            const block = getVoiceBlockReason(uid);
            if (block.blocked) {
                console.warn('📞 Rejecting call - peer is blocked');
                try { call.close(); } catch (_) {}
                return;
            }
        } catch (_) {}
        if (!voiceCalls.has(remoteId)) {
            voiceCalls.set(remoteId, call);
            console.log('📞 Stored incoming call for', remoteId);
        } else {
            call = voiceCalls.get(remoteId);
        }
        let streamToAnswer = voiceLocalStream;
        if (!streamToAnswer || streamToAnswer.getTracks().length === 0) {
            console.error('📞 Cannot answer call - no valid local stream');
            try { call.close(); } catch (_) {}
            return;
        }
        try { 
            call.answer(streamToAnswer);
            console.log('📞 Call answered successfully');
            
            // Also initiate a call back to ensure bidirectional audio
            setTimeout(() => {
                if (voiceJoined && voicePeerId && remoteId) {
                    if (!voiceCalls.has(remoteId)) {
                        console.log('📞 Initiating bidirectional call to', remoteId);
                        maybeCallPeer(remoteId);
                    }
                }
            }, 300);
        } catch (err) {
            console.error('📞 Error answering call:', err);
        }
        call.on('stream', (remoteStream) => {
            call.remoteStream = remoteStream;
            console.log('✅ Received incoming call stream for', remoteId);
            attachRemoteAudio(remoteId, remoteStream);
            // ... track event handlers ...
        });
        call.on('close', () => cleanupVoiceCall(remoteId));
        call.on('error', () => cleanupVoiceCall(remoteId));
    });
    
    voicePeer.on('error', (err) => {
        console.warn('Peer error', err);
        setVoiceStatus('Voice connection error.', true);
    });
}
```

#### Leave Voice Chat

```javascript
async function leaveVoiceChat() {
    if (!voiceJoined) return;
    setVoiceStatus('Leaving voice…');
    const leavingPeerId = voicePeerId;
    const leavingUserId = globalChatUsername || 'User';

    // Send leave message BEFORE closing anything
    if (VOICE_DISCOVERY_ENABLED) {
        try { sendVoiceDiscovery({ type: 'leave', peerId: leavingPeerId, userId: leavingUserId, ts: Date.now() }); } catch (_) {}
        await new Promise((r) => setTimeout(r, 150));
    }

    Array.from(voiceCalls.keys()).forEach((pid) => cleanupVoiceCall(pid));
    voiceCalls.clear();
    voiceDataConns.clear();
    stopVoiceActivityHeartbeats();
    voiceParticipants.clear();
    renderVoiceParticipants();
    if (voiceLocalStream) {
        try { voiceLocalStream.getTracks().forEach(t => t.stop()); } catch (_) {}
    }
    voiceLocalStream = null;
    stopVoiceMeter();
    if (voicePeer) {
        try { voicePeer.destroy(); } catch (_) {}
    }
    voicePeer = null;
    voicePeerId = '';
    voiceJoined = false;
    voiceMuted = false;
    
    // Update UI
    if (voiceUi.joinBtn) voiceUi.joinBtn.style.display = 'block';
    if (voiceUi.joinBtnContainer) voiceUi.joinBtnContainer.style.display = 'flex';
    if (voiceUi.leaveBtn) voiceUi.leaveBtn.style.display = 'none';
    if (voiceUi.muteBtn) voiceUi.muteBtn.style.display = 'none';
    if (voiceUi.reportsBtn) voiceUi.reportsBtn.style.display = 'none';
    
    // Restore panel to normal size
    if (voiceUi.panel) {
        const originalParent = globalChatPanel;
        if (originalParent && voiceUi.panel.parentElement === document.body) {
            if (globalChatBox && globalChatBox.parentElement === originalParent) {
                originalParent.insertBefore(voiceUi.panel, globalChatBox);
            } else {
                originalParent.insertBefore(voiceUi.panel, originalParent.firstChild || null);
            }
        }
        voiceUi.panel.style.cssText = `
            display: none;
            position: relative;
            padding: 12px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.04);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
            width: 100%;
            max-width: 100%;
        `;
    }
    setVoiceStatus('Left voice.');

    // Clean up Firebase presence
    if (voiceFirebasePresenceRef) {
        try {
            voiceFirebasePresenceRef.remove();
        } catch (_) {}
        voiceFirebasePresenceRef = null;
    }
    
    // Stop Firebase listeners
    stopVoiceFirebaseListener();
    
    // Background cleanup
    setTimeout(async () => {
        if (VOICE_DISCOVERY_ENABLED && leavingPeerId) {
            try {
                sendVoiceDiscovery({ type: 'leave', peerId: leavingPeerId, userId: leavingUserId, ts: Date.now() });
            } catch (_) {}
        }

        if (voiceRtChannel) {
            const ch = voiceRtChannel;
            voiceRtChannel = null;
            voiceRtSubscribed = false;
            try { await Promise.race([ch.untrack(), new Promise((r) => setTimeout(r, 700))]); } catch (_) {}
            try { await Promise.race([ch.unsubscribe(), new Promise((r) => setTimeout(r, 700))]); } catch (_) {}
        }
    }, 0);

    // Re-enable observer mode
    try {
        if (VOICE_DISCOVERY_ENABLED) {
            stopVoiceDiscoverySocket();
            setTimeout(() => {
                try { ensureVoiceDiscoveryObserver(); } catch (_) {}
            }, 100);
        }
        startVoiceFirebaseListener();
    } catch (_) {}
}
```

### Voice Discovery (WebSocket - DISABLED)

```javascript
function ensureVoiceDiscoverySocket(mode) {
    if (!VOICE_DISCOVERY_ENABLED) return null;
    const desired = (mode === 'joined') ? 'joined' : 'observer';

    if (voiceDiscoveryWs && voiceDiscoveryMode === desired) {
        if (voiceDiscoveryWs.readyState === 0 || voiceDiscoveryWs.readyState === 1) return voiceDiscoveryWs;
    }

    stopVoiceDiscoverySocket();
    voiceDiscoveryMode = desired;

    if (voiceDiscoveryConnectPromise) return voiceDiscoveryWs;
    voiceDiscoveryConnectPromise = Promise.resolve().then(() => {
        // ✅ Free-tier safe: Disable WebSockets to prevent Durable Objects burn
        if (!window.ENABLE_VOICE_WS) {
            console.warn("Voice WebSocket disabled (free-tier safe mode)");
            return;
        }
        
        const url = buildVoiceDiscoveryUrl();
        const ws = new WebSocket(url);
        voiceDiscoveryWs = ws;

        ws.onopen = () => {
            // ... ping timer setup ...
            // Request participants immediately
            sendVoiceDiscovery({ type: 'getParticipants', ts: Date.now() });
        };

        ws.onmessage = (evt) => {
            try {
                const data = JSON.parse(String(evt.data || '{}'));
                const t = String(data?.type || '');
                if (t === 'participants') {
                    applyVoiceDiscoverySnapshot(data?.list, data?.room);
                    return;
                }
                if (t === 'activity') {
                    // Handle join/leave notifications
                    const action = String(data?.action || '');
                    const userId = String(data?.userId || '');
                    const peerId = String(data?.peerId || '');
                    
                    if (action === 'join' && userId && peerId) {
                        showVoiceActivity(`${getDisplayName(userId)} joined voice chat`);
                        // Update participants list
                        // ... update code ...
                    }
                    else if (action === 'leave' && userId && peerId) {
                        showVoiceActivity(`${getDisplayName(userId)} left voice chat`);
                        cleanupVoiceCall(peerId);
                        voiceParticipants.delete(peerId);
                        renderVoiceParticipants();
                    }
                    return;
                }
            } catch (_) {}
        };

        ws.onerror = (error) => {
            console.warn('Cloudflare WebSocket error:', error);
            scheduleVoiceDiscoveryReconnect(desired);
        };

        ws.onclose = (event) => {
            if (event.code !== 1000 && event.code !== 1001) {
                console.warn('WebSocket closed abnormally, might be rate limited:', event.code, event.reason);
            }
            scheduleVoiceDiscoveryReconnect(desired);
        };
    }).finally(() => {
        voiceDiscoveryConnectPromise = null;
    });

    return voiceDiscoveryWs;
}
```

### Voice Activity Notifications

```javascript
function ensureVoiceActivityBanner() {
    if (voiceActivityEl) return voiceActivityEl;
    
    const createBanner = () => {
        if (!document.body) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', createBanner, { once: true });
            } else {
                setTimeout(createBanner, 50);
            }
            return null;
        }
        
        voiceActivityEl = document.createElement('div');
        voiceActivityEl.id = 'voiceActivityBanner';
        voiceActivityEl.style.position = 'fixed';
        voiceActivityEl.style.top = '56px';
        voiceActivityEl.style.left = '50%';
        voiceActivityEl.style.transform = 'translateX(-50%)';
        voiceActivityEl.style.zIndex = '29999';
        voiceActivityEl.style.padding = '10px 14px';
        voiceActivityEl.style.borderRadius = '12px';
        voiceActivityEl.style.background = 'linear-gradient(135deg, rgba(2,132,199,0.95), rgba(37,99,235,0.92))';
        voiceActivityEl.style.border = '1px solid rgba(147,197,253,0.65)';
        voiceActivityEl.style.color = '#eff6ff';
        voiceActivityEl.style.fontSize = '13px';
        voiceActivityEl.style.fontWeight = '850';
        voiceActivityEl.style.boxShadow = '0 18px 46px rgba(0,0,0,0.45)';
        voiceActivityEl.style.display = 'none';
        voiceActivityEl.style.maxWidth = 'min(820px, 92vw)';
        voiceActivityEl.style.textAlign = 'center';
        voiceActivityEl.style.userSelect = 'none';
        document.body.appendChild(voiceActivityEl);
        
        if (voiceActivityQueue.length > 0) {
            const queued = voiceActivityQueue.shift();
            if (queued) showVoiceActivity(queued);
        }
        
        return voiceActivityEl;
    };
    
    return createBanner();
}

function showVoiceActivity(text) {
    if (!text) return;
    
    if (!voiceActivityEl) {
        ensureVoiceActivityBanner();
        if (!voiceActivityEl) {
            voiceActivityQueue.push(text);
            if (voiceActivityQueue.length > 1) {
                voiceActivityQueue.shift();
            }
            return;
        }
    }
    
    voiceActivityEl.textContent = text;
    voiceActivityEl.style.display = 'block';
    if (voiceActivityTimer) clearTimeout(voiceActivityTimer);
    voiceActivityTimer = setTimeout(() => {
        if (voiceActivityEl) voiceActivityEl.style.display = 'none';
    }, 2600);
}
```

### Global Voice Presence Initialization

```javascript
function initGlobalVoicePresence() {
    // Initialize banner immediately
    ensureVoiceActivityBanner();
    
    // ✅ Connect to Cloudflare voice discovery (observer mode - for notifications only)
    if (VOICE_DISCOVERY_ENABLED) {
        try {
            ensureVoiceDiscoveryObserver(); // Observer mode = notifications only, no participation
        } catch (err) {
            console.warn('Failed to initialize Cloudflare voice discovery:', err);
        }
    }
    
    // ✅ Initialize Firebase listeners for voice participants (fallback/legacy)
    const initFirebaseListener = () => {
        try {
            const db = (typeof window !== 'undefined' && window.firebaseDb) || 
                      (typeof getFirebaseDb === 'function' && getFirebaseDb()) ||
                      (typeof window !== 'undefined' && window.db);
            
            if (db && voiceFirebaseListeners.length === 0) {
                startVoiceFirebaseListener();
            }
        } catch (err) {
            console.warn('Failed to initialize Firebase voice listener:', err);
        }
    };
    
    // Try immediately and with retries
    initFirebaseListener();
    setTimeout(initFirebaseListener, 100);
    setTimeout(initFirebaseListener, 500);
    setTimeout(initFirebaseListener, 1000);
    setTimeout(initFirebaseListener, 2000);
    
    // Also listen for firebaseReady event
    if (typeof window !== 'undefined') {
        const onFirebaseReady = () => {
            setTimeout(initFirebaseListener, 100);
        };
        window.addEventListener('firebaseReady', onFirebaseReady, { once: false });
    }
}

// ✅ Initialize voice presence globally (only once, on all pages)
if (!window.__voicePresenceInitialized) {
    window.__voicePresenceInitialized = true;
    initGlobalVoicePresence();
    
    setTimeout(() => {
        if (VOICE_DISCOVERY_ENABLED && !voiceDiscoveryWs) {
            try { ensureVoiceDiscoveryObserver(); } catch (_) {}
        }
    }, 500);
}
```

---

## Key Architecture Points

1. **Chat System**: Uses polling (20s intervals) instead of WebSockets to avoid Durable Objects costs
2. **Voice Chat**: Uses PeerJS (WebRTC) for peer-to-peer audio, Firebase for presence discovery
3. **WebSockets Disabled**: `window.ENABLE_VOICE_WS = false` prevents Cloudflare Durable Objects billing
4. **Optimistic UI**: Messages appear immediately before server confirmation
5. **Local Cache**: Chat messages cached in localStorage for instant loading
6. **Free-Tier Safe**: All expensive operations (WebSockets, Durable Objects) are disabled by default

---

## Debugging Functions

```javascript
// Check chat polling status
window.checkChatPollingStatus = function() {
    console.log('🔍 Chat Polling Status:');
    console.log('   Active:', chatPollingActive);
    console.log('   Interval:', CHAT_POLL_INTERVAL + 'ms');
    console.log('   Last Polled Message ID:', lastPolledMessageId);
    console.log('   History Bootstrapped:', chatHistoryBootstrapped);
    
    return {
        active: chatPollingActive,
        interval: CHAT_POLL_INTERVAL,
        lastMessageId: lastPolledMessageId
    };
};
```

---

**Last Updated**: Complete extraction of all chat and voice chat code from `script.js`
