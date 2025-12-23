// Prevent double-loading: if already defined, just export and exit.
(function() {
  const existingBackendAPI =
    (typeof globalThis !== 'undefined' && globalThis.BackendAPI) ||
    (typeof window !== 'undefined' && window.BackendAPI) ||
    (typeof self !== 'undefined' && self.BackendAPI);

  if (existingBackendAPI) {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = { BackendAPI: existingBackendAPI, initializeBackend: (config) => new existingBackendAPI(config) };
    }
    return;
  }

/**
 * Custom Backend API Client
 * Replaces Firebase SDK with REST API and WebSocket connections
 */

class BackendAPI {
  constructor(config = {}) {
    const defaultApi = 'https://shs-portal-backend.vercel.app/api';
    const defaultWs = 'https://shs-portal-backend.vercel.app';
    this.apiUrl = config.apiUrl || defaultApi;
    this.wsUrl = config.wsUrl || defaultWs;
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.connectionFailed = false; // Track if connection has failed to prevent infinite retries
    this.connectingPromise = null;
    this.listeners = new Map();
    // Generate a unique visitor ID per tab/window (not per browser)
    // Use sessionStorage to ensure each tab gets a unique ID
    // Clear any old localStorage visitorId to prevent conflicts
    if (localStorage.getItem('visitorId')) {
      localStorage.removeItem('visitorId');
      // Cleared old localStorage visitorId
    }
    
    // Generate or reuse visitorId from sessionStorage (unique per tab)
    // Each tab gets its own sessionStorage, so each tab will have a unique ID
    // If no ID exists in sessionStorage, generate a new one
    const storedId = sessionStorage.getItem('visitorId');
    if (storedId) {
      this.visitorId = storedId;
      // Reusing visitorId from sessionStorage
    } else {
      this.visitorId = this.generateVisitorId();
      sessionStorage.setItem('visitorId', this.visitorId);
      // Generated NEW visitorId for this tab
    }
  }

  generateVisitorId() {
    // Generate a truly unique ID with timestamp + high-precision random
    // Add performance.now() for microsecond precision to ensure uniqueness
    const timestamp = Date.now();
    const perf = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000) : Math.floor(Math.random() * 1000000);
    const random = Math.random().toString(36).substring(2, 15);
    // Ensure no Firebase-invalid characters (., #, $, [, ])
    return `visitor_${timestamp}_${perf}_${random}`.replace(/[.#$\\[\\]]/g, '_');
  }

  // Initialize WebSocket connection
  connect(username = 'Anonymous') {
    // Polling-only mode: mark as connected immediately (no websockets)
    if (this.connected) return Promise.resolve();
    this.connected = true;
    this.connectionFailed = false;
    this.connecting = false;
    this.connectingPromise = null;
    if (typeof window !== 'undefined' && typeof window.markBackendReady === 'function') {
      window.markBackendReady();
    }
    return Promise.resolve();
  }

  setupSocketListeners() {
    // Chat messages
    this.socket.on('chat:initial', (messages) => {
      this.emit('chat:initial', messages);
    });

    this.socket.on('chat:message', (message) => {
      // Received chat:message event
      this.emit('chat:message', message);
    });

    this.socket.on('chat:reaction', (data) => {
      this.emit('chat:reaction', data);
    });

    this.socket.on('chat:typing', (users) => {
      this.emit('chat:typing', users);
    });

    this.socket.on('chat:error', (error) => {
      this.emit('chat:error', error);
    });

    // Visitors
    this.socket.on('visitors:online', (users) => {
      // Received visitors:online event
      this.emit('visitors:online', users);
    });

    this.socket.on('visitors:total', (data) => {
      // Received visitors:total event
      this.emit('visitors:total', data);
    });

    // Canvas
    this.socket.on('canvas:stroke', (data) => {
      if (data) {
        // Emit to all registered listeners
        this.emit('canvas:stroke', data);
      } else {
        console.warn('[Canvas] Received null/undefined stroke data from socket');
      }
    });

    this.socket.on('canvas:clear', (data) => {
      this.emit('canvas:clear', data);
    });

    // Canvas cursor updates
    this.socket.on('canvas:cursor', (data) => {
      this.emit('canvas:cursor', data);
    });

    this.socket.on('canvas:cursor:remove', (data) => {
      this.emit('canvas:cursor:remove', data);
    });

    // Private chat
    this.socket.on('private:message', (message) => {
      this.emit('private:message', message);
    });

    // Friends
    this.socket.on('friend:added', (data) => {
      this.emit('friend:added', data);
    });

    this.socket.on('friend:removed', (data) => {
      this.emit('friend:removed', data);
    });

    this.socket.on('friend:request:received', (data) => {
      this.emit('friend:request:received', data);
    });

    this.socket.on('friend:request:sent', (data) => {
      this.emit('friend:request:sent', data);
    });
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    // Only log warnings for missing listeners (not for frequent events like visitors:online/total)
    const quietEvents = ['visitors:online', 'visitors:total', 'canvas:cursor', 'canvas:stroke', 'chat:typing', 'chat:message', 'chat:reaction', 'private:message'];
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      // Emitting event to listeners
      callbacks.forEach((callback, index) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[BackendAPI] Error in listener ${index + 1} for ${event}:`, error);
        }
      });
    } else if (!quietEvents.includes(event)) {
      // Only warn about missing listeners for non-quiet events
      console.warn(`[BackendAPI] No listeners registered for ${event}`);
    }
  }

  // REST API methods
  async request(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const config = {
      method: options.method || 'GET',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Prevent cached responses on GETs (important for chat history)
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Contact Messages
  async saveContactMessage(data) {
    return this.request('/contact', {
      method: 'POST',
      body: data
    });
  }

  // Chat Messages
  sendChatMessage(messageData) {
    return this.request('/chat/send', {
      method: 'POST',
      body: messageData
    }).then((msg) => {
      // Emit locally so listeners can update immediately
      this.emit('chat:message', msg);
      return msg;
    });
  }

  // Upload attachment (data URL payload)
  async uploadAttachment(filename, dataUrl) {
    return this.request('/upload', {
      method: 'POST',
      body: { filename, data: dataUrl }
    });
  }

  async getRecentChat(limit = 50, includeImages = false) {
    const qs = `limit=${encodeURIComponent(limit)}&images=${includeImages ? 1 : 0}`;
    return this.request(`/chat/recent?${qs}`);
  }

  async getChatLeaderboard(limit = 10) {
    const qs = `limit=${encodeURIComponent(limit)}`;
    return this.request(`/chat/leaderboard?${qs}`);
  }

  setTypingIndicator() {
    // Polling mode: no-op
  }

  stopTypingIndicator() {
    // Polling mode: no-op
  }

  addReaction(messageId, emoji) {
    return this.request('/chat/reaction', {
      method: 'POST',
      body: { messageId, emoji }
    }).then((data) => {
      this.emit('chat:reaction', data);
      return data;
    });
  }

  // ✅ STUBBED: Visitors/Presence APIs (removed - no longer using Vercel backend)
  // These methods are stubbed to prevent calls to shs-portal-backend.vercel.app
  async getTotalVisitors() {
    console.debug('⚠️ getTotalVisitors() stubbed - visitor counter disabled');
    return Promise.resolve({ totalVisitors: 0 });
  }

  async incrementVisitors() {
    console.debug('⚠️ incrementVisitors() stubbed - visitor counter disabled');
    return Promise.resolve({ totalVisitors: 0 });
  }

  async getOnlineUsers() {
    console.debug('⚠️ getOnlineUsers() stubbed - online presence disabled');
    return Promise.resolve([]);
  }

  async setOnline(visitorId, username) {
    // Stubbed - no-op to prevent Vercel backend calls
    return Promise.resolve();
  }

  async setOffline(visitorId) {
    // Stubbed - no-op to prevent Vercel backend calls
    return Promise.resolve();
  }

  // Moderation
  async getBannedUsers() {
    return this.request('/moderation/banned');
  }

  async isBanned(uid) {
    const result = await this.request(`/moderation/banned/${uid}`);
    return result.banned;
  }

  async getModerationSettings() {
    return this.request('/moderation/settings');
  }

  async getProfanityWords() {
    return this.request('/moderation/profanity');
  }

  async getModerationStats() {
    return this.request('/moderation/stats');
  }

  async getOnlineUsers() {
    return this.request('/visitors/online');
  }

  // Friends
  async getFriends(userId) {
    return this.request(`/friends/${userId}`);
  }

  async addFriend(userId, friendId) {
    return this.request('/friends', {
      method: 'POST',
      body: { userId, friendId }
    });
  }

  async removeFriend(userId, friendId) {
    return this.request('/friends', {
      method: 'DELETE',
      body: { userId, friendId }
    });
  }

  async getFriendRequests(userId) {
    return this.request(`/friends/requests/${userId}`);
  }

  async sendFriendRequest(fromUserId, toUserId) {
    return this.request('/friends/requests/send', {
      method: 'POST',
      body: { fromUserId, toUserId }
    });
  }

  async acceptFriendRequest(userId, requesterId) {
    return this.request('/friends/requests/accept', {
      method: 'POST',
      body: { userId, requesterId }
    });
  }

  async declineFriendRequest(userId, requesterId) {
    return this.request('/friends/requests/decline', {
      method: 'POST',
      body: { userId, requesterId }
    });
  }

  async deleteFriendRequest(userA, userB) {
    return this.request('/friends/requests/remove', {
      method: 'POST',
      body: { userA, userB }
    });
  }

  async getUserProfile(userId) {
    return this.request(`/friends/profile/${userId}`);
  }

  async setUserProfile(userId, profile) {
    return this.request('/friends/profile', {
      method: 'POST',
      body: { userId, profile }
    });
  }

  async getAllProfiles() {
    return this.request('/friends/profiles/all');
  }

  // Canvas
  sendCanvasStroke(id, strokeData) {
    // Persist stroke via REST; also emit locally for immediate feedback
    return this.request('/canvas/strokes', {
      method: 'POST',
      body: { id, strokeData }
    }).then(() => {
      this.emit('canvas:stroke', { id, strokeData });
    });
  }

  clearCanvas(data) {
    return this.request('/canvas/strokes', { method: 'DELETE' }).then(() => {
      this.emit('canvas:clear', data);
    });
  }

  sendCanvasCursor(userId, cursorData) {
    // Cursor broadcast not supported without websockets; silently ignore
  }

  sendCanvasCursorRemove(userId) {
    // Cursor broadcast not supported without websockets; silently ignore
  }

  async getCanvasStrokes() {
    return this.request('/canvas/strokes');
  }

  // Game ratings/stats
  async getGameRatings() {
    return this.request('/games/ratings');
  }

  async getGameRating(gameId) {
    return this.request(`/games/ratings/${encodeURIComponent(gameId)}`);
  }

  async submitGameRating(gameId, userId, rating) {
    return this.request('/games/ratings', {
      method: 'POST',
      body: { gameId, userId, rating }
    });
  }

  async getGameStats() {
    return this.request('/games/stats');
  }

  async getGameReviews(gameId) {
    return this.request(`/games/reviews/${encodeURIComponent(gameId)}`);
  }

  async addGameReview(gameId, author, rating, text, userId = null) {
    return this.request('/games/reviews', {
      method: 'POST',
      body: { gameId, author, rating, text, userId }
    });
  }

  // Private chat
  async getPrivateChatMessages(chatId) {
    return this.request(`/private-chats/${chatId}/messages`);
  }

  sendPrivateChatMessage(chatId, data) {
    return this.request(`/private-chats/${chatId}/messages`, {
      method: 'POST',
      body: {
        from: data.from,
        to: data.to,
        fromName: data.fromName,
        text: data.text,
        timestamp: data.timestamp
      }
    });
  }

  // Firebase-compatible API (for easy migration)
  database() {
    return {
      ref: (path) => {
        return new FirebaseRef(path, this);
      }
    };
  }
}

// Firebase-compatible ref class
class FirebaseRef {
  constructor(path, api) {
    this.path = path;
    this.api = api;
    this.listeners = [];
  }

  _withExists(snapshot) {
    if (!snapshot) return snapshot;
    snapshot.exists = function() {
      const v = this.val();
      if (v === null || v === undefined) return false;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return true;
    };
    return snapshot;
  }

  push(data) {
    return new Promise((resolve, reject) => {
      if (this.path === 'contactMessages') {
        this.api.saveContactMessage(data).then(result => {
          resolve({ key: result.id });
        }).catch(reject);
      } else if (this.path === 'chat') {
        this.api.sendChatMessage(data);
        resolve({ key: Date.now().toString() });
      } else if (this.path.startsWith('privateChats/')) {
        const parts = this.path.split('/');
        const chatId = parts[1];
        this.api.sendPrivateChatMessage(chatId, data);
        resolve({ key: data.id || Date.now().toString() });
      } else if (this.path === 'canvas/strokes') {
        // Generate a unique ID for the stroke
        const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        // Send stroke via Socket.io
        this.api.sendCanvasStroke(strokeId, data);
        resolve({ key: strokeId });
      } else if (this.path.startsWith('gameReviews/')) {
        const parts = this.path.split('/');
        const gameId = parts[1];
        this.api.addGameReview(gameId, data.author || 'Anonymous', data.rating || 0, data.text || '', data.userId || this.api.visitorId || null)
          .then(review => resolve({ key: review.id, ...review }))
          .catch(reject);
      } else {
        reject(new Error(`Unsupported path: ${this.path}`));
      }
    });
  }

  set(data) {
    return new Promise((resolve, reject) => {
      // Handle different paths
      if (this.path.startsWith('online/')) {
        const visitorId = this.path.split('/')[1];
        // Handled by socket connection
        resolve();
      } else if (this.path.startsWith('chatTyping/')) {
        this.api.setTypingIndicator();
        resolve();
      } else if (this.path.startsWith('friends/')) {
        const parts = this.path.split('/');
        const userId = parts[1];
        const friendId = parts[2];
        if (userId && friendId) {
          this.api.addFriend(userId, friendId).then(resolve).catch(reject);
        } else {
          resolve();
        }
      } else if (this.path.startsWith('friendRequests/')) {
        const parts = this.path.split('/');
        // friendRequests/{target}/{type}/{other}
        const targetId = parts[1];
        const type = parts[2];
        const otherId = parts[3];
        if (type === 'received') {
          this.api.sendFriendRequest(otherId, targetId).then(resolve).catch(reject);
        } else if (type === 'sent') {
          // Sender already handled by received path; just resolve
          resolve();
        } else {
          resolve();
        }
      } else if (this.path.startsWith('profiles/')) {
        const userId = this.path.split('/')[1];
        this.api.setUserProfile(userId, data || {}).then(resolve).catch(reject);
      } else if (this.path === 'totalVisitors') {
        this.api.request('/visitors/set', {
          method: 'POST',
          body: { count: data }
        }).then(resolve).catch(reject);
      } else if (this.path === 'canvas/meta/clear' || this.path.startsWith('canvas/meta/')) {
        // Canvas meta data (like clear flag) - just resolve
        // The actual clear is handled via canvas:clear socket event
        resolve();
      } else if (this.path.startsWith('gameRatings/')) {
        const parts = this.path.split('/');
        const gameId = parts[1];
        const ratingsIndex = parts.indexOf('ratings');
        const userId = ratingsIndex > -1 ? parts[ratingsIndex + 1] : null;
        const ratingValue = typeof data === 'number' ? data : (data?.rating || data?.value);
        if (gameId && userId && typeof ratingValue === 'number') {
          this.api.submitGameRating(gameId, userId, ratingValue).then(resolve).catch(reject);
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }

  update(data) {
    // update() is similar to set() but only updates specified fields
    // For now, we'll treat it the same as set() since we don't have partial update endpoints
    return this.set(data);
  }

  once(event, callback) {
    return new Promise((resolve) => {
      if (event === 'value') {
        if (this.path === 'totalVisitors') {
          this.api.getTotalVisitors().then(result => {
            const snapshot = this._withExists({ val: () => result.totalVisitors });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else if (this.path === '.info/connected') {
          const snapshot = this._withExists({ val: () => this.api.connected });
          if (callback) callback(snapshot);
          resolve(snapshot);
        } else if (this.path.startsWith('online/')) {
          const snapshot = this._withExists({ val: () => ({ online: true, timestamp: Date.now() }) });
          if (callback) callback(snapshot);
          resolve(snapshot);
        } else if (this.path === 'online') {
          // Get online users and convert to snapshot
          this.api.getOnlineUsers().then(users => {
            const onlineObj = {};
            if (Array.isArray(users)) {
              users.forEach(user => {
                const id = user.visitor_id || user.userId || user.visitorId;
                if (id) {
                  onlineObj[id] = {
                    online: true,
                    timestamp: user.timestamp || Date.now(),
                    username: user.username || 'Anonymous'
                  };
                }
              });
            }
            const snapshot = this._withExists({
              val: () => onlineObj,
              numChildren: () => Object.keys(onlineObj).length
            });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else if (this.path.startsWith('friends/')) {
          const userId = this.path.split('/')[1];
          this.api.getFriends(userId).then(list => {
            const friendsObj = {};
            (list || []).forEach(id => friendsObj[id] = true);
            const snapshot = this._withExists({ val: () => friendsObj });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else if (this.path.startsWith('friendRequests/')) {
          const userId = this.path.split('/')[1];
          this.api.getFriendRequests(userId).then(reqs => {
            const data = {
              sent: (reqs?.sent || []).reduce((acc, id) => ({ ...acc, [id]: true }), {}),
              received: (reqs?.received || []).reduce((acc, id) => ({ ...acc, [id]: true }), {})
            };
            const snapshot = this._withExists({ val: () => data });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else if (this.path.startsWith('profiles/')) {
          const userId = this.path.split('/')[1];
          this.api.getUserProfile(userId).then(profile => {
            const snapshot = this._withExists({ val: () => profile || null });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else if (this.path === 'chat') {
          // For chat, use the Socket.io initial event that was already sent
          // Return empty object for now - chat messages come through 'on' listeners
          // The initial messages are sent via 'chat:initial' event on connection
          const snapshot = this._withExists({ val: () => ({}) });
          if (callback) callback(snapshot);
          resolve(snapshot);
        } else if (this.path.startsWith('privateChats/')) {
          const parts = this.path.split('/');
          const chatId = parts[1];
          this.api.getPrivateChatMessages(chatId).then(messages => {
            const obj = {};
            (messages || []).forEach(msg => {
              obj[msg.id] = msg;
            });
            const snapshot = this._withExists({ val: () => obj });
            if (callback) callback(snapshot);
            resolve(snapshot);
          }).catch(err => {
            console.error('Error fetching private chat messages:', err);
            const snapshot = this._withExists({ val: () => ({}) });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else if (this.path === 'canvas/strokes' || this.path === 'canvas/meta') {
          // For canvas, fetch strokes from API
          if (this.path === 'canvas/strokes') {
            this.api.getCanvasStrokes().then(strokes => {
              // Convert array to object format { id: strokeData }
              const strokesObj = {};
              if (Array.isArray(strokes)) {
                strokes.forEach(stroke => {
                  if (stroke.id) {
                    strokesObj[stroke.id] = stroke;
                  }
                });
              }
              const snapshot = this._withExists({ val: () => strokesObj });
              if (callback) callback(snapshot);
              resolve(snapshot);
            }).catch(err => {
              console.error('Error fetching canvas strokes:', err);
              const snapshot = this._withExists({ val: () => ({}) });
              if (callback) callback(snapshot);
              resolve(snapshot);
            });
          } else {
            // For meta, return empty
            const snapshot = this._withExists({ val: () => ({}) });
            if (callback) callback(snapshot);
            resolve(snapshot);
          }
        } else if (this.path.startsWith('gameRatings/')) {
          const gameId = this.path.split('/')[1];
          this.api.getGameRating(gameId).then(data => {
            const snapshot = this._withExists({ val: () => data || {} });
            if (callback) callback(snapshot);
            resolve(snapshot);
          }).catch(err => {
            console.error('Error fetching game rating:', err);
            const snapshot = this._withExists({ val: () => ({}) });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else if (this.path.startsWith('gameReviews/')) {
          const gameId = this.path.split('/')[1];
          this.api.getGameReviews(gameId).then(reviews => {
            const obj = {};
            (reviews || []).forEach(r => { obj[r.id] = r; });
            const snapshot = this._withExists({ val: () => obj });
            if (callback) callback(snapshot);
            resolve(snapshot);
          }).catch(err => {
            console.error('Error fetching game reviews:', err);
            const snapshot = this._withExists({ val: () => ({}) });
            if (callback) callback(snapshot);
            resolve(snapshot);
          });
        } else {
          const snapshot = this._withExists({ val: () => null });
          if (callback) callback(snapshot);
          resolve(snapshot);
        }
      } else {
        const snapshot = this._withExists({ val: () => null });
        if (callback) callback(snapshot);
        resolve(snapshot);
      }
    });
  }

  on(event, callback) {
    this.listeners.push({ event, callback });
    
    if (event === 'value') {
      if (this.path === 'moderationSettings') {
        this.api.getModerationSettings().then(settings => {
          callback(this._withExists({ val: () => settings }));
        });
      } else if (this.path === 'profanityWords') {
        this.api.getProfanityWords().then(words => {
          callback(this._withExists({ val: () => words }));
        });
      } else if (this.path === 'moderationStats') {
        this.api.getModerationStats().then(stats => {
          callback(this._withExists({ val: () => stats }));
        });
      } else if (this.path === 'bannedUsers') {
        this.api.getBannedUsers().then(banned => {
          const bannedObj = {};
          banned.forEach(user => {
            bannedObj[user.uid] = user;
          });
          callback(this._withExists({ val: () => bannedObj }));
        });
      } else if (this.path === 'chat') {
        this.api.on('chat:initial', (messages) => {
          const messagesObj = {};
          messages.forEach(msg => {
            messagesObj[msg.id] = msg;
          });
          callback(this._withExists({ val: () => messagesObj }));
        });
      } else if (this.path === 'totalVisitors') {
        // Listen for real-time visitor count updates
        this.api.on('visitors:total', (data) => {
          callback(this._withExists({ val: () => data.totalVisitors }));
        });
        // Also get initial value
        this.api.getTotalVisitors().then(result => {
          callback(this._withExists({ val: () => result.totalVisitors }));
        });
      } else if (this.path === 'online') {
        // Listen for real-time online users updates
        this.api.on('visitors:online', (users) => {
          // Convert array to object format { userId: { online: true, username: ... } }
          const onlineObj = {};
          if (Array.isArray(users)) {
            users.forEach(user => {
              // Database returns visitor_id, but also check for userId/visitorId
              const id = user.visitor_id || user.userId || user.visitorId;
              if (id) {
                onlineObj[id] = {
                  online: true,
                  timestamp: user.timestamp || Date.now(),
                  username: user.username || 'Anonymous'
                };
              }
            });
          }
          const snapshot = this._withExists({ val: () => onlineObj, numChildren: () => Object.keys(onlineObj).length });
          callback(snapshot);
        });
        // Also get initial value
        this.api.getOnlineUsers().then(users => {
          const onlineObj = {};
          if (Array.isArray(users)) {
            users.forEach(user => {
              // Database returns visitor_id, but also check for userId/visitorId
              const id = user.visitor_id || user.userId || user.visitorId;
              if (id) {
                onlineObj[id] = {
                  online: true,
                  timestamp: user.timestamp || Date.now(),
                  username: user.username || 'Anonymous'
                };
              }
            });
          }
          callback(this._withExists({ val: () => onlineObj, numChildren: () => Object.keys(onlineObj).length }));
        });
      } else if (this.path.startsWith('friends/')) {
        const userId = this.path.split('/')[1];
        const updateSnapshot = (list) => {
          const obj = {};
          (list || []).forEach(id => obj[id] = true);
          callback(this._withExists({ val: () => obj }));
        };
        this.api.getFriends(userId).then(updateSnapshot);
        // Listen for live updates
        this.api.on('friend:added', (data) => {
          if (!data) return;
          if (data.userId === userId) {
            this.api.getFriends(userId).then(updateSnapshot);
          } else if (data.friendId === userId) {
            this.api.getFriends(userId).then(updateSnapshot);
          }
        });
        this.api.on('friend:removed', (data) => {
          if (!data) return;
          if (data.userId === userId || data.friendId === userId) {
            this.api.getFriends(userId).then(updateSnapshot);
          }
        });
      } else if (this.path.startsWith('friendRequests/')) {
        const userId = this.path.split('/')[1];
        const updateSnapshot = (reqs) => {
          const data = {
            sent: (reqs?.sent || []).reduce((acc, id) => { acc[id] = true; return acc; }, {}),
            received: (reqs?.received || []).reduce((acc, id) => { acc[id] = true; return acc; }, {})
          };
          callback(this._withExists({ val: () => data }));
        };
        this.api.getFriendRequests(userId).then(updateSnapshot);
        this.api.on('friend:request:received', (data) => {
          if (data && data.toUserId === userId) {
            this.api.getFriendRequests(userId).then(updateSnapshot);
          }
        });
        this.api.on('friend:request:sent', (data) => {
          if (data && data.fromUserId === userId) {
            this.api.getFriendRequests(userId).then(updateSnapshot);
          }
        });
      } else if (this.path.startsWith('profiles/')) {
        const userId = this.path.split('/')[1];
        this.api.getUserProfile(userId).then(profile => {
          callback(this._withExists({ val: () => profile || null }));
        });
      } else if (this.path.startsWith('chatTyping')) {
        // Listen to typing updates
        this.api.on('chat:typing', (users) => {
          const typingObj = {};
          (users || []).forEach(u => typingObj[u] = true);
          callback(this._withExists({ val: () => typingObj }));
        });
      } else if (this.path.startsWith('privateChats/')) {
        const parts = this.path.split('/');
        const chatId = parts[1];
        let cache = {};
        const emitCache = () => callback(this._withExists({ val: () => cache }));
        this.api.getPrivateChatMessages(chatId).then(messages => {
          cache = {};
          (messages || []).forEach(msg => {
            cache[msg.id] = msg;
          });
          emitCache();
        });
        this.api.on('private:message', (message) => {
          if (message && message.chat_id === chatId) {
            cache[message.id] = message;
            emitCache();
          }
        });
      } else if (this.path.startsWith('online/')) {
        // Single user online status
        const userId = this.path.split('/')[1];
        this.api.on('visitors:online', (users) => {
          const user = Array.isArray(users) ? users.find(u => {
            const id = u.visitor_id || u.userId || u.visitorId;
            return id === userId;
          }) : null;
          callback({ val: () => user ? { online: true, timestamp: Date.now() } : null });
        });
      } else if (this.path === 'canvas/meta/clear' || this.path.startsWith('canvas/meta/')) {
        // Listen for canvas clear events
        this.api.on('canvas:clear', (data) => {
          if (this.path === 'canvas/meta/clear') {
            callback({ val: () => data || { by: 'anon', time: Date.now() } });
          } else {
            callback({ val: () => null });
          }
        });
      } else if (this.path === 'canvas/cursors') {
        // Listen for canvas cursor updates via Socket.io
        const cursorsData = {};
        this.api.on('canvas:cursor', (data) => {
          if (data && data.userId && data.cursorData) {
            cursorsData[data.userId] = { ...data.cursorData, ...data };
            callback({ val: () => cursorsData });
          }
        });
        this.api.on('canvas:cursor:remove', (data) => {
          if (data && data.userId && cursorsData[data.userId]) {
            delete cursorsData[data.userId];
            callback({ val: () => cursorsData });
          }
        });
      } else if (this.path.startsWith('canvas/cursors/')) {
        // Single cursor update
        const userId = this.path.split('/')[2];
        this.api.on('canvas:cursor', (data) => {
          if (data && data.userId === userId) {
            callback({ val: () => ({ ...data.cursorData, ...data }) });
          }
        });
      } else if (this.path.startsWith('gameRatings/')) {
        const gameId = this.path.split('/')[1];
        const pollRating = () => {
          this.api.getGameRating(gameId).then(data => {
            callback(this._withExists({ val: () => data || {} }));
          }).catch(() => {});
        };
        pollRating();
        setInterval(pollRating, 4000);
      } else if (this.path.startsWith('gameReviews/')) {
        const gameId = this.path.split('/')[1];
        const pollReviews = () => {
          this.api.getGameReviews(gameId).then(list => {
            const obj = {};
            (list || []).forEach(r => { obj[r.id] = r; });
            callback(this._withExists({ val: () => obj }));
          }).catch(() => {});
        };
        pollReviews();
        setInterval(pollReviews, 4000);
      }
      } else if (event === 'child_added') {
        if (this.path === 'chat') {
          // Listen for new chat messages (not initial - those come from once('value'))
      this.api.on('chat:message', (message) => {
        callback(this._withExists({ val: () => message, key: message.id }));
      });
        // Also handle initial messages from chat:initial event
        let initialMessagesHandled = false;
      this.api.on('chat:initial', (messages) => {
        if (!initialMessagesHandled && Array.isArray(messages)) {
          initialMessagesHandled = true;
          messages.forEach(message => {
            callback(this._withExists({ val: () => message, key: message.id }));
          });
        }
      });
        } else if (this.path === 'canvas/strokes') {
        // Listen for new canvas strokes via Socket.io
        // Set up listener immediately when on() is called
        const strokeListener = (data) => {
          console.log('[Canvas] child_added listener received stroke event:', data);
          if (data && data.id && data.strokeData) {
            const snapshot = this._withExists({ val: () => data.strokeData, key: data.id });
            console.log('[Canvas] Calling child_added callback with stroke:', data.id);
            callback(snapshot);
          } else {
            console.warn('[Canvas] Invalid stroke data in child_added callback - missing id or strokeData:', { hasId: !!data?.id, hasStrokeData: !!data?.strokeData, data });
          }
        };
        
        // Register the listener
        console.log('[Canvas] Registering canvas:stroke listener for child_added');
        this.api.on('canvas:stroke', strokeListener);
      } else if (this.path === 'chatTyping') {
        let previous = new Set();
        this.api.on('chat:typing', (users) => {
          const current = new Set(users || []);
          current.forEach(u => {
            if (!previous.has(u)) {
              callback(this._withExists({ val: () => u, key: u }));
            }
          });
          previous = current;
        });
      } else if (this.path === 'online') {
        // Listen for new users coming online
        this.api.on('visitors:online', (users) => {
          if (Array.isArray(users)) {
            users.forEach(user => {
              // Database returns visitor_id, but also check for userId/visitorId
              const id = user.visitor_id || user.userId || user.visitorId;
              if (id) {
                callback(this._withExists({ val: () => ({ online: true, timestamp: Date.now() }), key: id }));
              }
            });
          }
        });
      }
      } else if (event === 'child_removed') {
        if (this.path === 'canvas/strokes') {
          // Listen for removed canvas strokes (clear events)
          this.api.on('canvas:clear', (data) => {
            // When canvas is cleared, call the callback for each existing stroke
            // This is a simplified approach - in a real scenario, we'd need to track individual stroke removals
            callback(this._withExists({ val: () => null, key: null }));
          });
        } else if (this.path === 'chatTyping') {
          let previous = new Set();
          this.api.on('chat:typing', (users) => {
            const current = new Set(users || []);
            previous.forEach(u => {
              if (!current.has(u)) {
                callback(this._withExists({ val: () => u, key: u }));
              }
            });
            previous = current;
          });
        }
    } else if (event === 'child_changed') {
      if (this.path === 'chat') {
        this.api.on('chat:reaction', (data) => {
          callback({ val: () => ({ reactions: data.reactions }), key: data.messageId });
        });
      }
    }
  }

  off(event, callback) {
    this.listeners = this.listeners.filter(l => l.event !== event && l.callback !== callback);
  }

  child(path) {
    // Return a new FirebaseRef with the child path
    const childPath = this.path ? `${this.path}/${path}` : path;
    return new FirebaseRef(childPath, this.api);
  }

  remove() {
    return new Promise((resolve, reject) => {
      if (this.path === 'canvas/strokes') {
        // Clear all canvas strokes
        this.api.clearCanvas({ by: this.api.visitorId || 'anon', time: Date.now() });
        resolve();
      } else if (this.path.startsWith('chatTyping/')) {
        this.api.stopTypingIndicator();
        resolve();
      } else if (this.path.startsWith('friends/')) {
        const parts = this.path.split('/');
        const userId = parts[1];
        const friendId = parts[2];
        if (userId && friendId) {
          this.api.removeFriend(userId, friendId).then(resolve).catch(reject);
        } else {
          resolve();
        }
      } else if (this.path.startsWith('friendRequests/')) {
        const parts = this.path.split('/');
        const targetId = parts[1];
        const type = parts[2];
        const otherId = parts[3];
        if (type && otherId) {
          // Remove pending request in either direction
          this.api.deleteFriendRequest(targetId, otherId).then(resolve).catch(reject);
        } else {
          resolve();
        }
      } else if (this.path.startsWith('canvas/strokes/')) {
        // Remove a specific stroke (undo functionality)
        // For now, we'd need backend support for this
        // The stroke will be removed from other clients via child_removed if needed
        resolve();
      } else if (this.path === 'canvas/meta/clear' || this.path.startsWith('canvas/meta/')) {
        // Remove canvas meta (like clearing the clear flag)
        resolve();
      } else {
        resolve();
      }
    });
  }

  transaction(updateFn) {
    return new Promise((resolve) => {
      if (this.path.includes('reactions')) {
        // Handle reaction updates
        resolve({ committed: true, snapshot: { val: () => null } });
      } else if (this.path === 'totalVisitors') {
        this.api.incrementVisitors().then(result => {
          resolve({ committed: true, snapshot: { val: () => result.totalVisitors } });
        });
      } else if (this.path.startsWith('gameRatings/')) {
        const gameId = this.path.split('/')[1];
        let current = null;
        this.api.getGameRating(gameId).then(data => { current = data || {}; }).catch(() => { current = {}; }).finally(() => {
          let updated = current;
          if (typeof updateFn === 'function') {
            try { updated = updateFn(current); } catch (e) { updated = current; }
          }
          const ratings = updated?.ratings || {};
          const userId = Object.keys(ratings)[0] || this.api.visitorId || 'anon';
          const ratingValue = ratings[userId] || updated?.rating || updated?.value;
          if (gameId && userId && typeof ratingValue === 'number') {
            this.api.submitGameRating(gameId, userId, ratingValue).then(result => {
              resolve({ committed: true, snapshot: { val: () => result } });
            }).catch(() => resolve({ committed: true, snapshot: { val: () => updated } }));
          } else {
            resolve({ committed: true, snapshot: { val: () => updated } });
          }
        });
      } else {
        resolve({ committed: true, snapshot: { val: () => null } });
      }
    });
  }

  orderByChild() {
    return this;
  }

  limitToLast(limit) {
    // Return self for chaining
    return this;
  }
}

// Create global instance
let backendAPI = null;

// Initialize function
function initializeBackend(config) {
  backendAPI = new BackendAPI(config);
  return backendAPI;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BackendAPI, initializeBackend };
}

// Expose to window for browser usage
if (typeof window !== 'undefined') {
  window.BackendAPI = BackendAPI;
  window.initializeBackend = initializeBackend;
}

})(); // end guard IIFE

