# Voice Call Join/Leave Notifications

This document contains all code related to notifications when someone joins or leaves a voice call.
dy
---

## Variables and Constants

```javascript
// Voice activity banner for join/leave notifications
let voiceActivityEl = null;
let voiceActivityTimer = null;
let voiceActivityChannel = null;
const voiceActivityQueue = [];
const VOICE_BROADCAST_ACTIVITY_EVENT = 'activity';
const voiceActivityLastTsByUser = new Map();
const VOICE_ACTIVITY_HEARTBEAT_MS = 12000;
const VOICE_ACTIVITY_STALE_MS = 28000;
let voiceActivityHeartbeatTimer = null;
```

---

## Voice Activity Banner Functions

### ensureVoiceActivityBanner

Creates the banner element that displays join/leave notifications. This banner appears at the top of the page.

```javascript
function ensureVoiceActivityBanner() {
    if (voiceActivityEl) return voiceActivityEl;
    
    // Wait for body to exist if it doesn't yet
    const createBanner = () => {
        if (!document.body) {
            // Retry when body is available
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
        
        // Show any queued notifications
        if (voiceActivityQueue.length > 0) {
            const queued = voiceActivityQueue.shift();
            if (queued) showVoiceActivity(queued);
        }
        
        return voiceActivityEl;
    };
    
    return createBanner();
}
```

### showVoiceActivity

Displays a notification message in the banner. The banner automatically hides after 2.6 seconds.

```javascript
function showVoiceActivity(text) {
    if (!text) return;
    
    // Ensure banner exists
    if (!voiceActivityEl) {
        ensureVoiceActivityBanner();
        // If banner still doesn't exist (body not ready), queue the notification
        if (!voiceActivityEl) {
            voiceActivityQueue.push(text);
            // Keep only the most recent notification in queue
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

---

## Cloudflare WebSocket Join/Leave Handler

This handles join/leave events from the Cloudflare Worker WebSocket for voice discovery.

```javascript
// Inside ensureVoiceDiscoverySocket function - WebSocket message handler
ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        
        if (data.type === VOICE_BROADCAST_ACTIVITY_EVENT) {
            const action = String(data.action || '');
            const userId = String(data.userId || '');
            const peerId = String(data.peerId || '');
            const muted = !!data.muted;
            const ts = Number(data?.ts || Date.now()) || Date.now();
            
            if (action === 'join' && userId && peerId) {
                // Show notification
                showVoiceActivity(`${getDisplayName(userId)} joined voice chat`);
                
                // Update participants list immediately when someone joins
                const now = Date.now();
                const prev = voiceParticipants.get(peerId) || { 
                    userId: '', 
                    lastSeen: now, 
                    lastSpokeTs: 0, 
                    speaking: false, 
                    connected: false, 
                    lastBroadcastTs: 0, 
                    level: 0, 
                    lastLevelTs: 0, 
                    muted: false 
                };
                voiceParticipants.set(peerId, {
                    ...prev,
                    userId,
                    lastSeen: ts || now,
                    muted: muted,
                    connected: true
                });
                
                // Clear loading state when someone joins
                if (voiceParticipantsLoading) {
                    voiceParticipantsLoading = false;
                }
                renderVoiceParticipants();
                
                // If we're joined, try to call the new participant
                if (voiceJoined && peerId !== voicePeerId) {
                    maybeCallPeer(peerId);
                    maybeEnsureVoiceDataConn(peerId);
                }
            }
            else if (action === 'leave' && userId && peerId) {
                // Show notification
                showVoiceActivity(`${getDisplayName(userId)} left voice chat`);
                
                // Remove from participants list immediately
                cleanupVoiceCall(peerId);
                voiceParticipants.delete(peerId);
                renderVoiceParticipants();
            }
            return;
        }
    } catch (_) {}
};
```

---

## Firebase Realtime Join/Leave Handlers

These handle join/leave events from Firebase Realtime Database (fallback/legacy support).

### Child Added Listener (Join Events)

```javascript
// Listen for join events (for notifications)
const onChildAddedListener = participantsRef.on('child_added', (snapshot) => {
    try {
        const data = snapshot.val();
        const peerId = snapshot.key;
        if (!data || !data.peerId) {
            console.warn('🔥 Skipping participant - missing data or peerId:', { data, peerId });
            return;
        }
        
        // Show notification if not self
        if (peerId !== voicePeerId && data.userId) {
            showVoiceActivity(`${getDisplayName(data.userId)} joined voice chat`);
        }
        
        // Ensure participant is in the map (child_added may fire before value listener)
        if (!voiceParticipants.has(peerId)) {
            const now = Date.now();
            voiceParticipants.set(peerId, {
                userId: String(data.userId || ''),
                lastSeen: Number(data.lastSeen || now) || now,
                muted: !!data.muted,
                connected: true,
                lastSpokeTs: 0,
                speaking: false,
                lastBroadcastTs: 0,
                level: 0,
                lastLevelTs: 0
            });
        }
        
        // Clear loading state
        voiceParticipantsLoading = false;
        
        // Always render to show participants
        renderVoiceParticipants();
        
        // If we're joined, try to call the new participant
        if (voiceJoined && peerId !== voicePeerId) {
            maybeCallPeer(peerId);
            maybeEnsureVoiceDataConn(peerId);
        }
    } catch (err) {
        console.error('Error processing Firebase join:', err);
    }
});
```

### Child Removed Listener (Leave Events)

```javascript
// Listen for leave events
const onChildRemovedListener = participantsRef.on('child_removed', (snapshot) => {
    try {
        const data = snapshot.val();
        if (!data || !data.peerId) return;
        const peerId = snapshot.key;
        
        // Show notification if not self
        if (peerId !== voicePeerId && data.userId) {
            showVoiceActivity(`${getDisplayName(data.userId)} left voice chat`);
        }
        
        cleanupVoiceCall(peerId);
        voiceParticipants.delete(peerId);
        renderVoiceParticipants();
    } catch (err) {
        console.error('Error processing Firebase leave:', err);
    }
});
```

### Value Listener (Initial Sync with Join Detection)

```javascript
// Listen for value changes (initial sync + updates)
const onValueListener = participantsRef.on('value', (snapshot) => {
    try {
        const data = snapshot.val() || {};
        const seen = new Set();
        const previouslyKnown = new Set(voiceParticipants.keys());
        
        Object.keys(data).forEach((peerId) => {
            if (!peerId) return;
            const participantData = data[peerId];
            if (!participantData || !participantData.peerId) return;
            
            seen.add(peerId);
            
            const now = Date.now();
            const prev = voiceParticipants.get(peerId);
            const isNew = !prev;
            const wasConnected = prev?.connected || false;
            
            // Show notification if this is a truly new participant (not in map and wasn't known before)
            // This handles the case where listener starts after someone already joined
            if (isNew && !previouslyKnown.has(peerId) && peerId !== voicePeerId && data.userId && !voiceParticipantsLoading) {
                showVoiceActivity(`${getDisplayName(data.userId)} joined voice chat`);
            }
            
            const updatedInfo = {
                ...(prev || { userId: '', lastSeen: now, lastSpokeTs: 0, speaking: false, connected: false, lastBroadcastTs: 0, level: 0, lastLevelTs: 0, muted: false }),
                userId: String(participantData.userId || ''),
                lastSeen: Number(participantData.lastSeen || now) || now,
                muted: !!participantData.muted,
                connected: true // Always true when participant exists in Firebase
            };
            
            // Only update if something actually changed (to prevent unnecessary re-renders)
            const needsUpdate = isNew || 
                prev.userId !== updatedInfo.userId ||
                prev.muted !== updatedInfo.muted ||
                prev.connected !== updatedInfo.connected ||
                Math.abs(prev.lastSeen - updatedInfo.lastSeen) > 5000; // Only update if lastSeen changed significantly
            
            if (needsUpdate) {
                voiceParticipants.set(peerId, updatedInfo);
                
                // Only update UI if connection status actually changed
                if (wasConnected !== updatedInfo.connected && voiceUi.listEl) {
                    setParticipantConnected(peerId, updatedInfo.connected);
                }
            }
        });
        
        // Remove participants not in Firebase (except self if joined)
        Array.from(voiceParticipants.keys()).forEach((pid) => {
            if (voiceJoined && pid === voicePeerId) return;
            if (!seen.has(pid)) {
                cleanupVoiceCall(pid);
                voiceParticipants.delete(pid);
            }
        });
        
        // Clear loading state after processing
        const wasLoading = voiceParticipantsLoading;
        voiceParticipantsLoading = false;
        
        // Only render if we were loading (initial load) or if participant count changed
        // This prevents flickering from periodic lastSeen updates
        if (wasLoading || seen.size !== (voiceParticipants.size - (voiceJoined && voicePeerId ? 1 : 0))) {
            renderVoiceParticipants();
        }
        
        // Try to call new participants - be aggressive about connecting
        if (voiceJoined) {
            voiceParticipants.forEach((_info, pid) => {
                if (pid !== voicePeerId && !voiceCalls.has(pid)) {
                    maybeCallPeer(pid);
                    maybeEnsureVoiceDataConn(pid);
                }
            });
        }
    } catch (err) {
        console.error('Error processing Firebase participants:', err);
    }
});
```

---

## Global Initialization

The voice activity banner and discovery connections are initialized on ALL pages immediately (not just chat pages) to ensure join/leave notifications work everywhere.

**Key Architecture Point**: Voice discovery (seeing who's in voice) is separate from voice participation (joining voice). Discovery should be global, participation is page-specific.

```javascript
// ✅ GLOBAL VOICE PRESENCE INITIALIZATION
// This ensures voice discovery (notifications) work on ALL pages, not just VC page
// Discovery is separate from participation - you can see who's in voice without joining
function initGlobalVoicePresence() {
    // Initialize banner immediately
    ensureVoiceActivityBanner();
    
    // ✅ Connect to Cloudflare voice discovery (observer mode - for notifications only)
    // This works on ALL pages and doesn't require joining voice
    if (VOICE_DISCOVERY_ENABLED) {
        try {
            ensureVoiceDiscoveryObserver(); // Observer mode = notifications only, no participation
        } catch (err) {
            console.warn('Failed to initialize Cloudflare voice discovery:', err);
        }
    }
    
    // ✅ Initialize Firebase listeners for voice participants (fallback/legacy)
    // This also works on ALL pages and doesn't require joining voice
    const initFirebaseListener = () => {
        try {
            // Check if Firebase is available via multiple methods
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
    
    // Try immediately and with retries (Firebase may not be ready yet)
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
// This ensures notifications work everywhere, not just on VC page
if (!window.__voicePresenceInitialized) {
    window.__voicePresenceInitialized = true;
    // Run immediately - don't wait for DOMContentLoaded
    initGlobalVoicePresence();
    
    // Also retry after a short delay in case dependencies aren't ready
    setTimeout(() => {
        if (VOICE_DISCOVERY_ENABLED && !voiceDiscoveryWs) {
            try { ensureVoiceDiscoveryObserver(); } catch (_) {}
        }
    }, 500);
}
```

**Important Notes**:
- Uses `window.__voicePresenceInitialized` guard to ensure it only runs once across the entire site
- Runs immediately, not waiting for DOMContentLoaded
- Observer mode doesn't require joining voice - it's just for receiving notifications
- Firebase listeners work globally and don't require being on the VC page

---

## Key Points

1. **Banner Display**: The notification banner appears at the top center of the page (56px from top, centered horizontally)

2. **Auto-Hide**: Notifications automatically hide after 2.6 seconds

3. **Queue System**: If the banner isn't ready yet, notifications are queued and shown when the banner is created

4. **Dual Sources**: Notifications come from both:
   - Cloudflare Worker WebSocket (primary)
   - Firebase Realtime Database (fallback/legacy)

5. **Display Name**: Uses `getDisplayName()` function to show user-friendly names (e.g., "Owner" instead of "%Owner%")

6. **Self-Exclusion**: Doesn't show notifications for your own join/leave events

7. **Global Scope**: Works on all pages, not just chat pages

8. **Participant Updates**: When someone joins/leaves, the participants list is immediately updated and re-rendered
