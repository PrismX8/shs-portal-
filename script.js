
(function() {
  let progress = 0;
  const progressFill = document.querySelector('.premium-progress-fill');
  const progressPercentage = document.querySelector('.premium-percentage');
  
  function updateProgress(targetProgress) {
      const startProgress = progress;
      const duration = 600;
      const startTime = performance.now();
      
      function animate(currentTime) {
          const elapsed = currentTime - startTime;
          const progressRatio = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progressRatio, 3); // Ease out cubic
          
          progress = startProgress + (targetProgress - startProgress) * easeProgress;
          
          if (progressFill) {
              progressFill.style.width = progress + '%';
          }
          if (progressPercentage) {
              progressPercentage.textContent = Math.round(progress) + '%';
          }
          
          if (progressRatio < 1) {
              requestAnimationFrame(animate);
          }
      }
      
      requestAnimationFrame(animate);
  }
  
  function removeLoadingScreen() {
      const introScreen = document.getElementById('introScreen');
      if (introScreen) {
          introScreen.style.transition = 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
          introScreen.style.opacity = '0';
          setTimeout(function() {
              if (introScreen && introScreen.parentNode) {
                  introScreen.remove();
              }
          }, 800);
      }
  }
  
  // Animate progress smoothly
  setTimeout(() => updateProgress(25), 300);
  setTimeout(() => updateProgress(50), 800);
  setTimeout(() => updateProgress(75), 1400);
  setTimeout(() => updateProgress(95), 2000);
  setTimeout(() => updateProgress(100), 2400);
  
  // Skip loading screen only when returning from other pages (like all-games.html)
  // Always show loading animation on initial website load
  const isReturningFromOtherPage = document.referrer && 
      document.referrer.includes(window.location.hostname) && 
      (document.referrer.includes('pages/') || document.referrer.includes('games/'));
  
  if (isReturningFromOtherPage) {
      // Skip loading animation when returning from other pages
      removeLoadingScreen();
  } else {
      // Show loading animation on initial load
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
          setTimeout(removeLoadingScreen, 3000);
      } else {
          window.addEventListener('load', function() {
              setTimeout(removeLoadingScreen, 3000);
          });
      }
      setTimeout(removeLoadingScreen, 3500);
  }
})();
const firebaseConfig = {
  apiKey: "AIzaSyBn1apVsFafY2-2a2QPeslX17XR0gWE9qs",
  authDomain: "shsproject-d60d0.firebaseapp.com",
  databaseURL: "https://shsproject-d60d0-default-rtdb.firebaseio.com",
  projectId: "shsproject-d60d0",
};

let db = null;

// Initialize Firebase when SDK is ready
let firebaseInitAttempts = 0;
const MAX_FIREBASE_INIT_ATTEMPTS = 50; // 5 seconds max (50 * 100ms)

function initializeFirebase() {
  firebaseInitAttempts++;
  
  // Check if Firebase SDK is loaded
  if (typeof firebase === 'undefined') {
    if (firebaseInitAttempts < MAX_FIREBASE_INIT_ATTEMPTS) {
      setTimeout(initializeFirebase, 100);
    } else {
      console.warn('Firebase SDK failed to load after multiple attempts. Running in offline mode.');
      db = null;
    }
    return;
  }

  try {
    // Check if Firebase is already initialized
    if (firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    console.log('Firebase initialized successfully');
    
    // Test connection (only if db is available)
    if (db) {
      try {
        db.ref('.info/connected').once('value', (snapshot) => {
          if (snapshot.val() === true) {
            console.log('Firebase connected');
          } else {
            console.warn('Firebase not connected, using offline mode');
          }
        }).catch(err => {
          console.warn('Firebase connection test failed:', err);
          console.warn('Running in offline mode - some features may be limited');
        });
      } catch (err) {
        console.warn('Firebase connection test error:', err);
      }
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    console.warn('Running in offline mode - some features may be limited');
    db = null;
  }
}

// Start initialization
initializeFirebase();

// Cookie Consent System
let cookieConsent = {
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    consented: false
};

// Load cookie consent preferences
const savedConsent = localStorage.getItem('cookieConsent');
if (savedConsent) {
    try {
        cookieConsent = JSON.parse(savedConsent);
    } catch (e) {
        console.error('Error parsing cookie consent:', e);
    }
}

// Check if user has consented
if (!cookieConsent.consented) {
    // Show cookie banner after a short delay
    setTimeout(() => {
        const banner = document.getElementById('cookieConsentBanner');
        if (banner) {
            banner.style.display = 'block';
            banner.style.animation = 'slideUp 0.5s ease-out';
        }
    }, 1000);
}

// Generate a unique visitor ID (persistent across sessions)
let visitorId;
if (cookieConsent.analytics || cookieConsent.essential) {
    visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        localStorage.setItem('visitorId', visitorId);
    }
    console.log('Visitor ID:', visitorId);
} else {
    // Use session-only ID if analytics not consented
    visitorId = sessionStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        sessionStorage.setItem('visitorId', visitorId);
    }
}
if (db && visitorId) {
  const onlineRef = db.ref('online/' + visitorId);
  onlineRef.set({online:true, timestamp: Date.now()}).catch(error => {
    console.error('Error setting online status:', error);
  });
  onlineRef.onDisconnect().remove();
}
const visitorCounter = document.getElementById('visitorCounter');
const INITIAL_VISITOR_COUNT = 127349;

// Initialize visitor count to 127,349 if it doesn't exist or is less
if (db) {
  db.ref('totalVisitors').once('value').then(snap => {
      const currentCount = snap.val() || 0;
      if (currentCount < INITIAL_VISITOR_COUNT) {
          db.ref('totalVisitors').set(INITIAL_VISITOR_COUNT).catch(error => {
              console.error('Error setting initial visitor count:', error);
          });
      }
  }).catch(error => {
      console.error('Error checking visitor count:', error);
  });
}

// Increment visitor count on every page load (including refreshes)
if (db) {
  db.ref('totalVisitors').transaction(val => {
      const currentVal = val || INITIAL_VISITOR_COUNT;
      // If count is less than initial, set to initial first
      if (currentVal < INITIAL_VISITOR_COUNT) {
          return INITIAL_VISITOR_COUNT + 1;
      }
      return currentVal + 1;
  }).catch(error => {
      console.error('Error updating visitor count:', error);
    });
}

const totalRef = db ? db.ref('totalVisitors') : null;
const onlineDbRef = db ? db.ref('online') : null;

// Initialize games arrays early to avoid temporal dead zone issues
let gameSites = [];
let allGamesFromJSON = [];
let categorizedGames = {};
let gameStats = {};
let gameStatsListener = null;
let gameRatings = {};
let gameRatingsListener = null;

// Chat Moderation System
let bannedUsers = {};
let userMessageCounts = {}; // Track message frequency for spam detection
let lastMessageTime = {}; // Track last message time per user
const MAX_MESSAGES_PER_MINUTE = 5; // Rate limit
const MIN_TIME_BETWEEN_MESSAGES = 2000; // 2 seconds minimum between messages
const SPAM_DETECTION_WINDOW = 60000; // 1 minute window

// Profanity filter - common words (you can expand this list)
let PROFANITY_WORDS = [];
let moderationSettings = {
    profanityFilterEnabled: true,
    spamDetectionEnabled: true,
    rateLimitEnabled: true,
    maxCapsRatio: 0.7,
    maxLinksPerMessage: 2,
    maxRepeatedChars: 4,
    maxMessagesPerMinute: 5,
    minTimeBetweenMessages: 2000
};
let moderationStats = {
    blockedMessages: 0,
    totalBans: 0,
    spamDetected: 0,
    activeUsers: 0
};

// Load moderation settings from Firebase
if (db) {
    db.ref('moderationSettings').on('value', (snapshot) => {
        if (snapshot.exists()) {
            moderationSettings = { ...moderationSettings, ...snapshot.val() };
            updateModerationUI();
        }
    });
    
    db.ref('profanityWords').on('value', (snapshot) => {
        PROFANITY_WORDS = snapshot.val() || [];
        updateProfanityWordsList();
    });
    
    db.ref('moderationStats').on('value', (snapshot) => {
        if (snapshot.exists()) {
            moderationStats = { ...moderationStats, ...snapshot.val() };
            updateModerationStats();
        }
    });
}

// Check if message contains profanity (case-insensitive)
function containsProfanity(text) {
    if (!moderationSettings.profanityFilterEnabled) return false;
    const lowerText = text.toLowerCase().trim();
    return PROFANITY_WORDS.some(word => {
        const lowerWord = word.toLowerCase().trim();
        if (!lowerWord) return false;
        // Check for whole word or as part of the text (case-insensitive)
        return lowerText.includes(lowerWord);
    });
}

// Check for spam patterns
function isSpam(text) {
    if (!moderationSettings.spamDetectionEnabled) return false;
    
    // Check for repeated characters
    const repeatPattern = new RegExp(`(.)\\1{${moderationSettings.maxRepeatedChars},}`);
    if (repeatPattern.test(text)) return true;
    
    // Check for excessive caps
    if (text.length > 10) {
        const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
        if (capsRatio > moderationSettings.maxCapsRatio) return true;
    }
    
    // Check for excessive links
    const linkCount = (text.match(/https?:\/\//g) || []).length;
    if (linkCount > moderationSettings.maxLinksPerMessage) return true;
    
    return false;
}

// Check rate limiting
function checkRateLimit(uid) {
    if (!moderationSettings.rateLimitEnabled) return { allowed: true };
    
    const now = Date.now();
    const userMessages = userMessageCounts[uid] || [];
    
    // Remove messages outside the time window
    const recentMessages = userMessages.filter(time => now - time < SPAM_DETECTION_WINDOW);
    userMessageCounts[uid] = recentMessages;
    
    // Check if user is sending too many messages
    if (recentMessages.length >= moderationSettings.maxMessagesPerMinute) {
        return { allowed: false, reason: 'Too many messages. Please wait a moment.' };
    }
    
    // Check minimum time between messages
    const lastTime = lastMessageTime[uid] || 0;
    if (now - lastTime < moderationSettings.minTimeBetweenMessages) {
        return { allowed: false, reason: 'Please wait before sending another message.' };
    }
    
    return { allowed: true };
}

// Check if user is banned
function isUserBanned(uid) {
    if (!bannedUsers[uid]) return false;
    const banData = bannedUsers[uid];
    
    // Check if ban has expired
    if (banData.expiresAt && Date.now() > banData.expiresAt) {
        delete bannedUsers[uid];
        if (db) {
            db.ref(`bannedUsers/${uid}`).remove();
        }
        return false;
    }
    
    return true;
}

// Load banned users from Firebase
if (db) {
    db.ref('bannedUsers').on('value', (snapshot) => {
        bannedUsers = snapshot.val() || {};
    });
}

// Utils object - must be defined before background effects and other features
const Utils = {
  debounce: function(func, wait) {
      let timeout;
      return function executedFunction(...args) {
          const later = () => {
              clearTimeout(timeout);
              func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
      };
  },
  throttle: function(func, limit) {
      let inThrottle;
      return function(...args) {
          if (!inThrottle) {
              func.apply(this, args);
              inThrottle = true;
              setTimeout(() => inThrottle = false, limit);
          }
      };
  }
};

function updateCounter() {
    if (!onlineDbRef || !totalRef) return;
    onlineDbRef.once('value').then(snap => {
        const online = snap.numChildren();
        totalRef.once('value').then(snap2 => {
          const total = snap2.val() || INITIAL_VISITOR_COUNT;
          const onlineCountEl = document.getElementById('onlineCount');
          const totalCountEl = document.getElementById('totalCount');
          if (onlineCountEl) onlineCountEl.textContent = online;
          if (totalCountEl) totalCountEl.textContent = total.toLocaleString();
          if (!onlineCountEl && !totalCountEl) {
              visitorCounter.innerText = `${online} Online | ${total.toLocaleString()} Total Visitors`;
          }
        });
    }).catch(error => {
        console.error('Error updating counter:', error);
    });
}

// Format number with commas for display
function formatNumber(num) {
  return num.toLocaleString();
}

// Update counter live when online users change
if (onlineDbRef && totalRef) {
  onlineDbRef.on('value', updateCounter);
  totalRef.on('value', updateCounter);
}

let userProfileData = JSON.parse(localStorage.getItem('userProfile')) || { profileCreated: false };
let username = (userProfileData.profileCreated && userProfileData.username) ? userProfileData.username : ('Guest' + Math.floor(Math.random()*1000));
let userColor = ['#007bff','#ff4500','#32cd32','#ffa500','#9932cc'][Math.floor(Math.random()*5)];

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const typingIndicator = document.getElementById('typingIndicator');
let typing = false;
if (chatInput) {
    chatInput.addEventListener('input', () => {
        if (!db) return;
        if(!typing){
            typing = true;
            db.ref('chatTyping/'+visitorId).set(username).catch(error => console.error('Error setting typing:', error));
            setTimeout(stopTyping, 2000);
        } else {
            clearTimeout(stopTyping.timeout);
            stopTyping.timeout = setTimeout(stopTyping, 2000);
        }
    });
}
function stopTyping(){
    if (!db) return;
    typing = false;
    db.ref('chatTyping/'+visitorId).remove().catch(error => console.error('Error removing typing:', error));
}

// Send message with moderation
if (chatInput) {
    chatInput.addEventListener('keypress', e => {
        if (!db) return;
        if(e.key === 'Enter' && chatInput.value.trim() !== ''){
            const messageText = chatInput.value.trim();
            
            // Check if user is banned
            if (isUserBanned(visitorId)) {
                if (typeof notifications !== 'undefined' && notifications.show) {
                    notifications.show('You are banned from chatting', 'error', 3000);
                } else {
                    alert('You are banned from chatting');
                }
                chatInput.value = '';
                return;
            }
            
            // Check rate limiting
            const rateLimitCheck = checkRateLimit(visitorId);
            if (!rateLimitCheck.allowed) {
                if (typeof notifications !== 'undefined' && notifications.show) {
                    notifications.show(rateLimitCheck.reason, 'warning', 2000);
                } else {
                    alert(rateLimitCheck.reason);
                }
                return;
            }
            
            // Check for profanity
            if (containsProfanity(messageText)) {
                trackBlockedMessage('profanity');
                if (typeof notifications !== 'undefined' && notifications.show) {
                    notifications.show('Message contains inappropriate content', 'error', 2000);
                } else {
                    alert('Message contains inappropriate content');
                }
                chatInput.value = '';
                return;
            }
            
            // Check for spam
            if (isSpam(messageText)) {
                trackBlockedMessage('spam');
                if (typeof notifications !== 'undefined' && notifications.show) {
                    notifications.show('Message detected as spam', 'error', 2000);
                } else {
                    alert('Message detected as spam');
                }
                chatInput.value = '';
                return;
            }
            
            // Update rate limiting tracking
            const now = Date.now();
            if (!userMessageCounts[visitorId]) {
                userMessageCounts[visitorId] = [];
            }
            userMessageCounts[visitorId].push(now);
            lastMessageTime[visitorId] = now;
            
            const msgData = {
                user: username,
                text: messageText,
                color: userColor,
                time: now,
                uid: visitorId,
                avatar: userProfile.avatar || '👤',
                avatarImage: userProfile.avatarImage || null
            };
            db.ref('chat').push(msgData).catch(error => console.error('Error sending message:', error));
            trackActivity('chat', 1);
            addActivity('Sent a chat message');
            chatInput.value='';
        }
    });
}
function renderChatMessage(msg, msgId, snapshot) {
    const msgDiv = document.createElement('div');
    msgDiv.setAttribute('data-msg-id', msgId);
    msgDiv.style.marginBottom='6px';
    msgDiv.style.display='flex';
    msgDiv.style.gap='10px';
    msgDiv.style.alignItems='flex-start';
    const avatarDiv = document.createElement('div');
    avatarDiv.style.width='32px';
    avatarDiv.style.height='32px';
    avatarDiv.style.borderRadius='50%';
    avatarDiv.style.flexShrink='0';
    avatarDiv.style.overflow='hidden';
    avatarDiv.style.display='flex';
    avatarDiv.style.alignItems='center';
    avatarDiv.style.justifyContent='center';
    avatarDiv.style.fontSize='20px';
    avatarDiv.style.background='linear-gradient(135deg, #FFD700, #FFA500)';
    if(msg.avatarImage) {
        avatarDiv.style.backgroundImage = `url(${msg.avatarImage})`;
        avatarDiv.style.backgroundSize = 'cover';
        avatarDiv.style.backgroundPosition = 'center';
        avatarDiv.textContent = '';
    } else {
        avatarDiv.textContent = msg.avatar || '👤';
    }
    msgDiv.appendChild(avatarDiv);
    
    const leftDiv = document.createElement('div');
    leftDiv.style.flex='1';
    let content = msg.text;
    if(msg.file) {
        if(msg.file.type && msg.file.type.startsWith('image/')) {
            content = `<img src="${msg.file.data}" style="max-width:200px; max-height:200px; border-radius:8px; margin-top:5px;" /><br>${msg.text}`;
        } else {
            content = `${msg.text} <a href="${msg.file.data}" download="${msg.file.name}" style="color:#FFD700;">Download</a>`;
        }
    }
    if(msg.link) {
        content = `${content}<br><a href="${msg.link}" target="_blank" rel="noopener noreferrer" style="color:#FFD700; text-decoration:underline;">${msg.link}</a>`;
    }
    
    leftDiv.innerHTML = `<span style="color:${msg.color}; font-weight:bold;">${msg.user}</span>: ${content} 
                         <small style="color:rgba(255,255,255,0.5); font-size:11px;">${new Date(msg.time).toLocaleTimeString()}</small>`;
    leftDiv.style.maxWidth='none';
    leftDiv.style.width='auto';
    leftDiv.style.minWidth='0';
    leftDiv.style.flex='1 1 auto';
    leftDiv.style.wordWrap='break-word';
    leftDiv.style.whiteSpace='pre-wrap';
    leftDiv.style.overflowWrap='break-word';
    if(msg.uid === visitorId && snapshot){
        const delBtn = document.createElement('button');
        delBtn.innerHTML='✖';
      delBtn.className = 'chat-delete-btn';
      delBtn.style.cssText = 'border:none; background:rgba(255,0,0,0.2); color:#ff4444; cursor:pointer; padding:4px 8px; border-radius:4px; font-size:14px; margin-left:8px; transition:all 0.2s;';
      delBtn.title='Delete message';
      delBtn.onclick = (e) => {
          e.stopPropagation();
          if(confirm('Delete this message?')) {
              snapshot.ref.remove().catch(err => {
                  console.error('Error deleting message:', err);
                  if (typeof notifications !== 'undefined' && notifications.show) {
                      notifications.show('Error deleting message', 'error', 2000);
                  }
              });
          }
      };
      delBtn.onmouseenter = () => {
          delBtn.style.background = 'rgba(255,0,0,0.4)';
          delBtn.style.transform = 'scale(1.1)';
      };
      delBtn.onmouseleave = () => {
          delBtn.style.background = 'rgba(255,0,0,0.2)';
          delBtn.style.transform = 'scale(1)';
      };
        leftDiv.appendChild(delBtn);
    }

    msgDiv.appendChild(leftDiv);
    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'emoji-reactions';
    reactionsDiv.style.cssText = 'display:flex; gap:5px; margin-top:5px; flex-wrap:wrap; width:100%;';
    msgDiv.appendChild(reactionsDiv);
    
    chatMessages.appendChild(msgDiv);
    if(chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50){
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    if(msg.reactions) {
        updateMessageReactions(msgId, msg.reactions);
    }
}
if (db) {
  db.ref('chat').limitToLast(50).once('value').then(snap => {
      const initialMessages = snap.val() || {};
      const messageArray = Object.entries(initialMessages)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => (a.time || 0) - (b.time || 0));
      messageArray.forEach(({id, ...msg}) => {
          renderChatMessage(msg, id, null);
      });
      const lastMessageTime = messageArray.length > 0 ? messageArray[messageArray.length - 1].time : 0;
      db.ref('chat').limitToLast(100).on('child_added', snapshot => {
          const msg = snapshot.val();
          if(msg && msg.time > lastMessageTime) {
              renderChatMessage(msg, snapshot.key, snapshot);
          }
      });
  }).catch(err => {
      console.error('Error loading initial chat:', err);
      db.ref('chat').limitToLast(100).on('child_added', snapshot => {
          const msg = snapshot.val();
          renderChatMessage(msg, snapshot.key, snapshot);
      });
  });
  db.ref('chat').on('child_changed', snapshot => {
      const msg = snapshot.val();
      if(msg.reactions) {
          updateMessageReactions(snapshot.key, msg.reactions);
      }
  });
  db.ref('chatTyping').on('value', snap => {
      const typingUsers = Object.values(snap.val()||{}).filter(u => u!==username);
      if(typingUsers.length>0){
          typingIndicator.innerText = typingUsers.join(', ') + ' is typing...';
      } else {
          typingIndicator.innerText = '';
      }
  });
}

function updateMessageReactions(msgId, reactions) {
    const msgDiv = document.querySelector(`[data-msg-id="${msgId}"]`);
    if(!msgDiv) return;
    let reactionsDiv = msgDiv.querySelector('.emoji-reactions');
    if(!reactionsDiv) {
        reactionsDiv = document.createElement('div');
        reactionsDiv.className = 'emoji-reactions';
        reactionsDiv.style.cssText = 'display:flex; gap:5px; margin-top:5px; flex-wrap:wrap; width:100%;';
        msgDiv.appendChild(reactionsDiv);
    }
    reactionsDiv.innerHTML = Object.entries(reactions).map(([emoji, count]) => 
        `<button class="reactBtn" data-msg="${msgId}" data-emoji="${emoji}" style="padding:4px 8px; background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.3); border-radius:4px; color:#FFD700; cursor:pointer; font-size:12px;">${emoji} ${count}</button>`
    ).join('') + `<button class="addReactionBtn" data-msg="${msgId}" style="padding:4px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,215,0,0.2); border-radius:4px; color:rgba(255,255,255,0.7); cursor:pointer; font-size:12px;">+ React</button>`;
    
    reactionsDiv.querySelectorAll('.reactBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            if(db) {
                db.ref(`chat/${btn.dataset.msg}/reactions/${btn.dataset.emoji}`).transaction(count => (count || 0) + 1);
            }
        });
    });
    
    reactionsDiv.querySelector('.addReactionBtn')?.addEventListener('click', () => {
        const emoji = prompt('Enter emoji:');
        if(emoji && db) {
            db.ref(`chat/${msgId}/reactions/${emoji}`).transaction(count => (count || 0) + 1);
        }
    });
}

// Change Name/Color popup
// Change name button (works for both regular and fullscreen)
function openNameColorPopup() {
  const popup = document.getElementById('chatNameColorPopup');
  if (popup) {
      const usernameInput = document.getElementById('chatPopupUsername');
      const colorInput = document.getElementById('chatPopupColor');
      if (usernameInput) usernameInput.value = username;
      if (colorInput) colorInput.value = userColor;
      popup.style.display = 'block';
  } else {
      notifications.show('Name/Color popup not found', 'error', 2000);
  }
}

// Get popup elements
const chatNameColorPopup = document.getElementById('chatNameColorPopup');
const chatPopupUsername = document.getElementById('chatPopupUsername');
const chatPopupColor = document.getElementById('chatPopupColor');
const chatSaveNameColor = document.getElementById('chatSaveNameColor');
const changeNameBtn = document.getElementById('changeNameBtn');

// Update openNameColorPopup function to use actual elements
if (chatNameColorPopup && chatPopupUsername && chatPopupColor) {
  openNameColorPopup = function() {
    chatPopupUsername.value = username;
    chatPopupColor.value = userColor;
    chatNameColorPopup.style.display = 'block';
  };
}

// Connect change name button (only once, remove duplicates)
if (changeNameBtn) {
  // Remove any existing listeners by cloning
  const newBtn = changeNameBtn.cloneNode(true);
  changeNameBtn.parentNode.replaceChild(newBtn, changeNameBtn);
  const updatedBtn = document.getElementById('changeNameBtn');
  if (updatedBtn) {
      updatedBtn.addEventListener('click', openNameColorPopup);
  }
}
// fullscreenNameBtn will be connected after it's declared (see line ~1244)
if (chatSaveNameColor) {
    chatSaveNameColor.addEventListener('click', () => {
        if(chatPopupUsername.value.trim() !== '') username = chatPopupUsername.value.trim();
        userColor = chatPopupColor.value;
        chatNameColorPopup.style.display = 'none';
    });
}
document.querySelectorAll('.control-section-header').forEach(header => {
  header.addEventListener('click', () => {
    const section = header.parentElement;
    section.classList.toggle('active');
  });
});
const iframe = document.getElementById('embeddedSite');
let zoomLevel = 1;
let originalSrc = iframe ? iframe.src : '';
const extraBtn = document.getElementById('extraSiteBtn');
const privacyBtn = document.getElementById('privacyBtn');
let onExtra = false;
let onPrivacy = false;

document.getElementById('reloadBtn').addEventListener('click', ()=>iframe.src = iframe.src);

document.getElementById("fullscreenBtn").addEventListener("click", () => {
    const frame = document.getElementById("embeddedSite");
    frame.requestFullscreen?.();
});

document.getElementById('zoomInBtn').addEventListener('click', ()=>{ zoomLevel += 0.1; iframe.style.transform = `scale(${zoomLevel})`; iframe.style.transformOrigin='top left'; });
document.getElementById('zoomOutBtn').addEventListener('click', ()=>{ zoomLevel = Math.max(0.5, zoomLevel - 0.1); iframe.style.transform = `scale(${zoomLevel})`; iframe.style.transformOrigin='top left'; });
document.getElementById('hideIframeBtn').addEventListener('click', ()=>iframe.style.display='none');
document.getElementById('showIframeBtn').addEventListener('click', ()=>iframe.style.display='block');

extraBtn.addEventListener('click', ()=>{
    const iframeContainer = document.getElementById('iframeContainer');
    const gamesGridContainer = document.getElementById('gamesGridContainer');
    const currentSiteTitle = document.getElementById('currentSiteTitle');
    
    if(!onExtra){
        // Show iframe container
        if (iframeContainer) iframeContainer.style.display = 'block';
        if (gamesGridContainer) gamesGridContainer.style.display = 'none';
        if (currentSiteTitle) currentSiteTitle.textContent = 'Extra Site';
        
        // Load the site
        iframe.src = 'about:blank';
        setTimeout(() => {
            iframe.src = 'https://funfrinew.neocities.org/';
        }, 50);
        
        extraBtn.innerHTML='<i class="fas fa-arrow-left"></i> Go Back';
        onExtra=true;
        
        // Scroll to iframe
        setTimeout(() => {
            if (iframeContainer) iframeContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } else {
        // Go back to games
        if (iframeContainer) iframeContainer.style.display = 'none';
        if (gamesGridContainer) gamesGridContainer.style.display = 'block';
        iframe.src = originalSrc;
        extraBtn.innerHTML='<i class="fas fa-gamepad"></i> Extra Site';
        onExtra=false;
    }
});

privacyBtn.addEventListener('click', ()=>{
    const iframeContainer = document.getElementById('iframeContainer');
    const gamesGridContainer = document.getElementById('gamesGridContainer');
    const currentSiteTitle = document.getElementById('currentSiteTitle');
    
    if(!onPrivacy){
        // Show iframe container
        if (iframeContainer) iframeContainer.style.display = 'block';
        if (gamesGridContainer) gamesGridContainer.style.display = 'none';
        if (currentSiteTitle) currentSiteTitle.textContent = 'Browser';
        
        // Load the browser
        iframe.src = 'about:blank';
        setTimeout(() => {
            iframe.src = "https://webtoppings.bar/browse?url=https://wikipedia.org&region=us-west&mode=privacy";
        }, 50);
        
        privacyBtn.innerHTML='<i class="fas fa-arrow-left"></i> Go Back';
        onPrivacy=true;
        
        // Scroll to iframe
        setTimeout(() => {
            if (iframeContainer) iframeContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    } else {
        // Go back to games
        if (iframeContainer) iframeContainer.style.display = 'none';
        if (gamesGridContainer) gamesGridContainer.style.display = 'block';
        iframe.src = originalSrc;
        privacyBtn.innerHTML='<i class="fas fa-shield-alt"></i> Browser';
        onPrivacy=false;
    }
});
const steps = [
    {text:"Welcome! This tutorial guides you through the buttons.", target:null},
    {text:"Reload: Reloads the embedded site.", target:document.getElementById('reloadBtn')},
    {text:"Fullscreen: Make the site fullscreen.", target:document.getElementById('fullscreenBtn')},
    {text:"Zoom: Scale the site for better view.", target:document.getElementById('zoomInBtn')},
    {text:"Hide/Show: Hide or show the embedded site.", target:document.getElementById('hideIframeBtn')},
    {text:"Extra Site: Open a fun game site.", target:extraBtn},
    {text:"Browser: Browse Privately!", target:privacyBtn}
];
let currentStep = 0;
const overlay = document.getElementById('tutorialOverlay');
const bubble = document.getElementById('tutorialBubble');
const arrow = document.getElementById('tutorialArrow');

function showStep(step){
    overlay.style.display='block';
    const s = steps[step];
    bubble.innerHTML = s.text + '<br>' +
        '<button id="nextTutorialBtn">Next</button> ' +
        '<button id="skipTutorialBtn">Skip</button>';

    // Next button
    document.getElementById('nextTutorialBtn').addEventListener('click', ()=>{
        currentStep++;
        if(currentStep >= steps.length){
            overlay.style.display='none';
            arrow.style.display='none';
            showPopup();
        } else showStep(currentStep);
    });

    // Skip button
    document.getElementById('skipTutorialBtn').addEventListener('click', ()=>{
        overlay.style.display='none';
        arrow.style.display='none';
        localStorage.setItem('tutorialShown','true'); // mark tutorial as seen
        showPopup();
    });

    if(s.target){
        const rect = s.target.getBoundingClientRect();
        bubble.style.top = (rect.bottom + 20 + window.scrollY) + 'px';
        bubble.style.left = (rect.left + rect.width/2) + 'px';
        arrow.style.display='block';
        arrow.style.top = (rect.bottom + window.scrollY) + 'px';
        arrow.style.left = (rect.left + rect.width/2 - 12) + 'px';
    } else {
        bubble.style.top='30%';
        bubble.style.left='50%';
        arrow.style.display='none';
    }

    setTimeout(()=>bubble.classList.add('show'),50);
}

function startTutorial(){ currentStep=0; showStep(currentStep); localStorage.setItem('tutorialShown','true'); }
document.getElementById('replayTutorialBtn').addEventListener('click', startTutorial);

// YouTube Video Watcher
const youtubeWatcherBtn = document.getElementById('youtubeWatcherBtn');
const youtubeWatcherModal = document.getElementById('youtubeWatcherModal');
const closeYoutubeWatcherBtn = document.getElementById('closeYoutubeWatcherBtn');
const youtubeUrlInput = document.getElementById('youtubeUrlInput');
const watchYoutubeBtn = document.getElementById('watchYoutubeBtn');

// Open YouTube Watcher Modal
youtubeWatcherBtn?.addEventListener('click', () => {
  youtubeWatcherModal.style.display = 'flex';
  youtubeUrlInput.focus();
});

// Close YouTube Watcher Modal
closeYoutubeWatcherBtn?.addEventListener('click', () => {
  youtubeWatcherModal.style.display = 'none';
  youtubeUrlInput.value = '';
});

youtubeWatcherModal?.addEventListener('click', (e) => {
  if (e.target === youtubeWatcherModal) {
      youtubeWatcherModal.style.display = 'none';
      youtubeUrlInput.value = '';
  }
});

// Watch YouTube Video
watchYoutubeBtn?.addEventListener('click', () => {
  let url = youtubeUrlInput.value.trim();
  
  if (!url) {
      youtubeUrlInput.style.borderColor = '#ff0000';
      youtubeUrlInput.placeholder = 'Please enter a YouTube URL';
      setTimeout(() => {
          youtubeUrlInput.style.borderColor = 'rgba(255, 0, 0, 0.3)';
          youtubeUrlInput.placeholder = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      }, 2000);
      return;
  }
  
  // Extract video ID from various YouTube URL formats
  let videoId = '';
  const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
          videoId = match[1];
          break;
      }
  }
  
  if (!videoId) {
      youtubeUrlInput.style.borderColor = '#ff0000';
      youtubeUrlInput.value = '';
      youtubeUrlInput.placeholder = 'Invalid YouTube URL. Please try again.';
      setTimeout(() => {
          youtubeUrlInput.style.borderColor = 'rgba(255, 0, 0, 0.3)';
          youtubeUrlInput.placeholder = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      }, 2000);
      return;
  }
  
  // Transform URL: yout-ube.com instead of youtube.com
  const unblockedUrl = `https://www.yout-ube.com/watch?v=${videoId}`;
  
  // Open in new tab
  window.open(unblockedUrl, '_blank');
  
  // Close modal and reset
  youtubeWatcherModal.style.display = 'none';
  youtubeUrlInput.value = '';
  
  // Show success feedback
  watchYoutubeBtn.innerHTML = '<i class="fas fa-check" style="margin-right:10px;"></i>Opening...';
  watchYoutubeBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
  setTimeout(() => {
      watchYoutubeBtn.innerHTML = '<i class="fas fa-play" style="margin-right:10px;"></i>Watch Video';
      watchYoutubeBtn.style.background = 'linear-gradient(135deg, #ff0000, #cc0000)';
  }, 1500);
});

// Allow Enter key to submit
youtubeUrlInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
      watchYoutubeBtn.click();
  }
});

// ---------------- Popup ----------------
const popup = document.getElementById('fullscreenPopup');
// Close when clicking the X button
if (popup) {
  const closeBtn = popup.querySelector('.closeBtn');
  if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
    popup.classList.remove('show');
          } catch (err) {
              console.warn('Error closing popup:', err);
          }
});
  }

// Close when clicking anywhere on the popup (including the content)
popup.addEventListener('click', (e) => {
    // Don't close if clicking the close button (it has its own handler)
    if (!e.target.closest('.closeBtn')) {
        try {
            popup.classList.remove('show');
        } catch (err) {
            console.warn('Error closing popup:', err);
        }
    }
});
}

function showPopup(){
  if (popup) {
      try {
    popup.classList.add('show');
      } catch (err) {
          console.warn('Error showing popup:', err);
      }
  }
}

const adminBtn = document.getElementById('adminBtn');
const adminModal = document.getElementById('adminModal');
const creditsBtn = document.getElementById('creditsBtn');
const creditsModal = document.getElementById('creditsModal');
const closeCreditsBtn = document.getElementById('closeCreditsBtn');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminContent = document.getElementById('adminContent');
const adminPassword = document.getElementById('adminPassword');
const deleteChatHistoryBtn = document.getElementById('deleteChatHistoryBtn');
const clearCanvasAdminBtn = document.getElementById('clearCanvasAdminBtn');
const resetVisitorsBtn = document.getElementById('resetVisitorsBtn');
const logoutAdminBtn = document.getElementById('logoutAdminBtn');

const ADMIN_PASSWORD = '12344321';
let isAdminAuthenticated = false;

// Credits Modal
creditsBtn?.addEventListener('click', () => {
    if (creditsModal) {
        creditsModal.style.display = 'flex';
    }
});

closeCreditsBtn?.addEventListener('click', () => {
    if (creditsModal) {
        creditsModal.style.display = 'none';
    }
});

creditsModal?.addEventListener('click', (e) => {
    if (e.target === creditsModal) {
        creditsModal.style.display = 'none';
    }
});

adminBtn.addEventListener('click', () => {
  adminModal.style.display = 'flex';
  adminPasswordInput.focus();
});

closeAdminBtn.addEventListener('click', () => {
  adminModal.style.display = 'none';
  isAdminAuthenticated = false;
  adminContent.style.display = 'none';
  adminPassword.style.display = '';
  adminPasswordInput.value = '';
});

adminModal.addEventListener('click', (e) => {
  if(e.target === adminModal) {
    adminModal.style.display = 'none';
    isAdminAuthenticated = false;
    adminContent.style.display = 'none';
    adminPassword.style.display = '';
    adminPasswordInput.value = '';
  }
});

adminLoginBtn.addEventListener('click', () => {
  if(adminPasswordInput.value === ADMIN_PASSWORD) {
    isAdminAuthenticated = true;
    adminPassword.style.display = 'none';
    adminContent.style.display = 'block';
    loadAdminChatMessages(); // Load chat messages when admin logs in
  } else {
    alert('Incorrect password');
    adminPasswordInput.value = '';
  }
});

adminPasswordInput.addEventListener('keypress', (e) => {
  if(e.key === 'Enter') {
    adminLoginBtn.click();
  }
});

deleteChatHistoryBtn.addEventListener('click', () => {
  if(confirm('Delete all chat history? This cannot be undone.')) {
    db.ref('chat').remove().then(() => {
      alert('Chat history deleted');
      const chatMessages = document.getElementById('chatMessages');
      chatMessages.innerHTML = '';
    }).catch(err => alert('Error: ' + err.message));
  }
});

clearCanvasAdminBtn.addEventListener('click', () => {
  if(confirm('Clear the drawing canvas? This cannot be undone.')) {
    db.ref('canvas/strokes').remove().then(() => {
      db.ref('canvas/meta/clear').set({ by: 'admin', time: Date.now() });
      setTimeout(() => { db.ref('canvas/meta/clear').remove(); }, 1500);
      alert('Canvas cleared');
    }).catch(err => alert('Error: ' + err.message));
  }
});

resetVisitorsBtn.addEventListener('click', () => {
if(confirm('Reset total visitors count to 127,349?')) {
  db.ref('totalVisitors').set(INITIAL_VISITOR_COUNT).then(() => {
    alert('Visitors count reset to 127,349');
    updateCounter(); // Refresh the display
    }).catch(err => alert('Error: ' + err.message));
  }
});

// Refresh button for chat list
const refreshChatListBtn = document.getElementById('refreshChatListBtn');
refreshChatListBtn?.addEventListener('click', () => {
  loadAdminChatMessages();
});

// Load chat messages for admin panel (including voice messages)
function loadAdminChatMessages() {
  const adminChatList = document.getElementById('adminChatList');
  if(!db || !adminChatList) return;
  
  adminChatList.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">Loading chat messages...</p>';
  
  // Load both regular chat messages and voice messages
  Promise.all([
    db.ref('chat').limitToLast(50).once('value'),
    db.ref('voiceMessages').limitToLast(50).once('value')
  ]).then(([chatSnap, voiceSnap]) => {
    const chatMessages = chatSnap.val() || {};
    const voiceMessages = voiceSnap.val() || {};
    
    // Combine all messages into one array
    const allMessages = [];
    
    // Add regular chat messages
    Object.entries(chatMessages).forEach(([id, msg]) => {
      if(msg) {
        allMessages.push({
          id,
          type: 'chat',
          user: msg.user || 'Unknown',
          text: msg.text || '(no text)',
          time: msg.time || Date.now(),
          data: msg
        });
      }
    });
    
    // Add voice messages
    Object.entries(voiceMessages).forEach(([id, msg]) => {
      if(msg && msg.audio) {
        allMessages.push({
          id,
          type: 'voice',
          user: msg.user || 'Unknown',
          text: '🎤 Voice Message',
          time: msg.time || Date.now(),
          data: msg
        });
      }
    });
    
    // Sort by time (newest first)
    allMessages.sort((a, b) => b.time - a.time);
    
    if(allMessages.length === 0) {
      adminChatList.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">No messages found.</p>';
      return;
    }
    
    adminChatList.innerHTML = allMessages.map((item) => {
      const time = new Date(item.time).toLocaleString();
      const user = item.user;
      const uid = item.data?.uid || 'unknown';
      const isVoice = item.type === 'voice';
      const preview = isVoice ? '🎤 Voice Message' : (item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text);
      const borderColor = isVoice ? 'rgba(0,150,255,0.5)' : 'rgba(255,215,0,0.5)';
      const refPath = isVoice ? 'voiceMessages' : 'chat';
      const isBanned = bannedUsers[uid] ? ' (BANNED)' : '';
      
      return `
        <div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; margin-bottom:8px; border-left:3px solid ${borderColor};">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:600; color:#FFD700; margin-bottom:4px; font-size:13px;">
              ${user}${isBanned} ${isVoice ? '<i class="fas fa-microphone" style="color:rgba(0,150,255,0.8);"></i>' : ''}
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.8); margin-bottom:4px; word-break:break-word;">${preview}</div>
            <div style="font-size:10px; color:rgba(255,255,255,0.5);">${time} • ${isVoice ? 'Voice Message' : 'Text Message'} • UID: ${uid.substring(0, 8)}...</div>
          </div>
          <div style="display:flex; gap:5px; flex-shrink:0;">
            <button class="adminBanUserBtn" data-uid="${uid}" data-username="${user}" style="padding:6px 12px; background:#ff6b00; border:1px solid #ff6b00; color:#ffffff; border-radius:4px; cursor:pointer; font-size:12px; white-space:nowrap;">${bannedUsers[uid] ? 'Unban' : 'Ban'}</button>
            <button class="adminDeleteChatBtn" data-msg-id="${item.id}" data-msg-type="${item.type}" data-ref-path="${refPath}" style="padding:6px 12px; background:#dc3545; border:1px solid #dc3545; color:#ffffff; border-radius:4px; cursor:pointer; font-size:12px; white-space:nowrap;">Delete</button>
          </div>
        </div>
      `;
    }).join('');
    
    // Attach event listeners to ban buttons
    adminChatList.querySelectorAll('.adminBanUserBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-uid');
        const username = btn.getAttribute('data-username');
        const isCurrentlyBanned = bannedUsers[uid];
        
        if (isCurrentlyBanned) {
          // Unban user
          if (confirm(`Unban ${username}?`)) {
            delete bannedUsers[uid];
            if (db) {
              db.ref(`bannedUsers/${uid}`).remove().then(() => {
                loadAdminChatMessages();
                if (typeof notifications !== 'undefined' && notifications.show) {
                  notifications.show(`User ${username} has been unbanned`, 'success', 2000);
                }
              }).catch(err => {
                console.error('Error unbanning user:', err);
                alert('Error unbanning user');
              });
            } else {
              loadAdminChatMessages();
            }
          }
        } else {
          // Ban user
          const banDuration = prompt(`Ban ${username}?\n\nEnter ban duration:\n- Leave empty for permanent ban\n- Enter number of hours (e.g., 24 for 24 hours)\n- Enter number of days (e.g., 7d for 7 days)`);
          
          if (banDuration !== null) {
            let expiresAt = null;
            if (banDuration.trim() !== '') {
              const hours = banDuration.toLowerCase().endsWith('d') 
                ? parseFloat(banDuration) * 24 
                : parseFloat(banDuration);
              if (!isNaN(hours) && hours > 0) {
                expiresAt = Date.now() + (hours * 60 * 60 * 1000);
              }
            }
            
            const banData = {
              username: username,
              bannedAt: Date.now(),
              expiresAt: expiresAt,
              bannedBy: 'admin'
            };
            
            bannedUsers[uid] = banData;
            moderationStats.totalBans = (moderationStats.totalBans || 0) + 1;
            
            if (db) {
              db.ref(`bannedUsers/${uid}`).set(banData).then(() => {
                db.ref('moderationStats').set(moderationStats);
                loadAdminChatMessages();
                updateBannedUsersList();
                updateModerationStats();
                if (typeof notifications !== 'undefined' && notifications.show) {
                  const durationText = expiresAt ? ` for ${banDuration}${banDuration.toLowerCase().endsWith('d') ? ' days' : ' hours'}` : ' permanently';
                  notifications.show(`User ${username} has been banned${durationText}`, 'success', 3000);
                }
              }).catch(err => {
                console.error('Error banning user:', err);
                alert('Error banning user');
              });
            } else {
              loadAdminChatMessages();
              updateBannedUsersList();
              updateModerationStats();
            }
          }
        }
      });
    });
    
    // Attach event listeners to delete buttons
    adminChatList.querySelectorAll('.adminDeleteChatBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msgId = btn.dataset.msgId;
        const msgType = btn.dataset.msgType;
        const refPath = btn.dataset.refPath;
        const msgTypeName = msgType === 'voice' ? 'voice message' : 'chat message';
        
        if(msgId && refPath && confirm(`Delete this ${msgTypeName}?`)) {
          db.ref(`${refPath}/${msgId}`).remove().then(() => {
            // Remove from UI
            btn.closest('div').remove();
            // Reload to refresh the list
            loadAdminChatMessages();
          }).catch(err => {
            alert('Error deleting message: ' + err.message);
          });
        }
      });
    });
  }).catch(err => {
    console.error('Error loading messages:', err);
    adminChatList.innerHTML = '<p style="text-align:center; color:rgba(255,0,0,0.7);">Error loading messages.</p>';
  });
}

logoutAdminBtn.addEventListener('click', () => {
  isAdminAuthenticated = false;
  adminContent.style.display = 'none';
  adminPassword.style.display = '';
  adminPasswordInput.value = '';
  alert('Logged out');
});

// Moderation Panel Functions
const openModerationPanelBtn = document.getElementById('openModerationPanelBtn');
const moderationPanelModal = document.getElementById('moderationPanelModal');
const closeModerationPanelBtn = document.getElementById('closeModerationPanelBtn');

openModerationPanelBtn?.addEventListener('click', () => {
  if (!isAdminAuthenticated) {
    alert('Please login as admin first');
    return;
  }
  moderationPanelModal.style.display = 'flex';
  loadModerationPanel();
});

closeModerationPanelBtn?.addEventListener('click', () => {
  moderationPanelModal.style.display = 'none';
});

moderationPanelModal?.addEventListener('click', (e) => {
  if (e.target === moderationPanelModal) {
    moderationPanelModal.style.display = 'none';
  }
});

// Update moderation UI with current settings
function updateModerationUI() {
  const profanityToggle = document.getElementById('profanityFilterToggle');
  const spamToggle = document.getElementById('spamDetectionToggle');
  const rateLimitToggle = document.getElementById('rateLimitToggle');
  const capsRatioSlider = document.getElementById('capsRatioSlider');
  const maxLinksSlider = document.getElementById('maxLinksSlider');
  const maxRepeatsSlider = document.getElementById('maxRepeatsSlider');
  const messagesPerMinSlider = document.getElementById('messagesPerMinSlider');
  const minTimeSlider = document.getElementById('minTimeSlider');
  
  if (profanityToggle) profanityToggle.checked = moderationSettings.profanityFilterEnabled;
  if (spamToggle) spamToggle.checked = moderationSettings.spamDetectionEnabled;
  if (rateLimitToggle) rateLimitToggle.checked = moderationSettings.rateLimitEnabled;
  if (capsRatioSlider) {
    capsRatioSlider.value = moderationSettings.maxCapsRatio * 100;
    updateSliderValue('capsRatioValue', capsRatioSlider.value);
  }
  if (maxLinksSlider) {
    maxLinksSlider.value = moderationSettings.maxLinksPerMessage;
    updateSliderValue('maxLinksValue', maxLinksSlider.value);
  }
  if (maxRepeatsSlider) {
    maxRepeatsSlider.value = moderationSettings.maxRepeatedChars;
    updateSliderValue('maxRepeatsValue', maxRepeatsSlider.value);
  }
  if (messagesPerMinSlider) {
    messagesPerMinSlider.value = moderationSettings.maxMessagesPerMinute;
    updateSliderValue('messagesPerMinValue', messagesPerMinSlider.value);
  }
  if (minTimeSlider) {
    minTimeSlider.value = moderationSettings.minTimeBetweenMessages / 1000;
    updateSliderValue('minTimeValue', minTimeSlider.value);
  }
}

function updateSliderValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

// Update profanity words list display
function updateProfanityWordsList() {
  const list = document.getElementById('profanityWordsList');
  if (!list) return;
  
  if (PROFANITY_WORDS.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5); margin:0; padding:20px;">No words added yet</p>';
    return;
  }
  
  list.innerHTML = PROFANITY_WORDS.map(word => `
    <div style="background:rgba(156,39,176,0.2); border:1px solid rgba(156,39,176,0.4); padding:8px 12px; border-radius:8px; display:flex; align-items:center; gap:10px;">
      <span style="color:#ffffff; font-size:13px;">${word}</span>
      <button class="removeProfanityWordBtn" data-word="${word}" style="background:#dc3545; border:none; color:#ffffff; width:24px; height:24px; border-radius:5px; cursor:pointer; font-size:12px; padding:0;">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
  
  // Add remove listeners
  list.querySelectorAll('.removeProfanityWordBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const word = btn.getAttribute('data-word');
      removeProfanityWord(word);
    });
  });
}

// Add profanity word
const addProfanityWordBtn = document.getElementById('addProfanityWordBtn');
const addProfanityWordInput = document.getElementById('addProfanityWordInput');

addProfanityWordBtn?.addEventListener('click', () => {
  const word = addProfanityWordInput?.value.trim().toLowerCase();
  if (!word) return;
  
  if (PROFANITY_WORDS.includes(word)) {
    alert('Word already in list');
    return;
  }
  
  PROFANITY_WORDS.push(word);
  if (db) {
    db.ref('profanityWords').set(PROFANITY_WORDS).then(() => {
      addProfanityWordInput.value = '';
      updateProfanityWordsList();
    });
  } else {
    updateProfanityWordsList();
  }
});

addProfanityWordInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addProfanityWordBtn?.click();
  }
});

// Remove profanity word
function removeProfanityWord(word) {
  PROFANITY_WORDS = PROFANITY_WORDS.filter(w => w !== word);
  if (db) {
    db.ref('profanityWords').set(PROFANITY_WORDS);
  }
  updateProfanityWordsList();
}

// Settings toggles
document.getElementById('profanityFilterToggle')?.addEventListener('change', (e) => {
  moderationSettings.profanityFilterEnabled = e.target.checked;
  saveModerationSettings();
});

document.getElementById('spamDetectionToggle')?.addEventListener('change', (e) => {
  moderationSettings.spamDetectionEnabled = e.target.checked;
  saveModerationSettings();
});

document.getElementById('rateLimitToggle')?.addEventListener('change', (e) => {
  moderationSettings.rateLimitEnabled = e.target.checked;
  saveModerationSettings();
});

// Sliders
document.getElementById('capsRatioSlider')?.addEventListener('input', (e) => {
  moderationSettings.maxCapsRatio = e.target.value / 100;
  updateSliderValue('capsRatioValue', e.target.value);
  saveModerationSettings();
});

document.getElementById('maxLinksSlider')?.addEventListener('input', (e) => {
  moderationSettings.maxLinksPerMessage = parseInt(e.target.value);
  updateSliderValue('maxLinksValue', e.target.value);
  saveModerationSettings();
});

document.getElementById('maxRepeatsSlider')?.addEventListener('input', (e) => {
  moderationSettings.maxRepeatedChars = parseInt(e.target.value);
  updateSliderValue('maxRepeatsValue', e.target.value);
  saveModerationSettings();
});

document.getElementById('messagesPerMinSlider')?.addEventListener('input', (e) => {
  moderationSettings.maxMessagesPerMinute = parseInt(e.target.value);
  updateSliderValue('messagesPerMinValue', e.target.value);
  saveModerationSettings();
});

document.getElementById('minTimeSlider')?.addEventListener('input', (e) => {
  moderationSettings.minTimeBetweenMessages = parseInt(e.target.value) * 1000;
  updateSliderValue('minTimeValue', e.target.value);
  saveModerationSettings();
});

// Save moderation settings to Firebase
function saveModerationSettings() {
  if (db) {
    db.ref('moderationSettings').set(moderationSettings);
  }
}

// Update banned users list
function updateBannedUsersList() {
  const list = document.getElementById('bannedUsersList');
  const count = document.getElementById('bannedUsersCount');
  if (!list) return;
  
  const bannedList = Object.entries(bannedUsers);
  if (count) count.textContent = bannedList.length;
  
  if (bannedList.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5); margin:0; padding:20px;">No banned users</p>';
    return;
  }
  
  list.innerHTML = bannedList.map(([uid, banData]) => {
    const expiresAt = banData.expiresAt ? new Date(banData.expiresAt).toLocaleString() : 'Permanent';
    const bannedAt = new Date(banData.bannedAt).toLocaleString();
    
    return `
      <div style="background:rgba(220,53,69,0.1); border:1px solid rgba(220,53,69,0.3); padding:12px; border-radius:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div>
            <div style="color:#ff6b6b; font-weight:600; font-size:14px;">${banData.username || 'Unknown'}</div>
            <div style="color:rgba(255,255,255,0.6); font-size:11px; margin-top:4px;">UID: ${uid.substring(0, 12)}...</div>
          </div>
          <button class="unbanUserBtn" data-uid="${uid}" style="background:#28a745; border:none; color:#ffffff; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">
            Unban
          </button>
        </div>
        <div style="color:rgba(255,255,255,0.7); font-size:11px;">
          Banned: ${bannedAt} | Expires: ${expiresAt}
        </div>
      </div>
    `;
  }).join('');
  
  // Add unban listeners
  list.querySelectorAll('.unbanUserBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.getAttribute('data-uid');
      if (confirm('Unban this user?')) {
        delete bannedUsers[uid];
        if (db) {
          db.ref(`bannedUsers/${uid}`).remove();
        }
        updateBannedUsersList();
      }
    });
  });
}

// Update moderation statistics
function updateModerationStats() {
  const blockedCount = document.getElementById('blockedMessagesCount');
  const totalBans = document.getElementById('totalBansCount');
  const spamDetected = document.getElementById('spamDetectedCount');
  const activeUsers = document.getElementById('activeUsersCount');
  
  if (blockedCount) blockedCount.textContent = moderationStats.blockedMessages || 0;
  if (totalBans) totalBans.textContent = moderationStats.totalBans || Object.keys(bannedUsers).length;
  if (spamDetected) spamDetected.textContent = moderationStats.spamDetected || 0;
  if (activeUsers) {
    // Count unique users who sent messages recently
    const recentUsers = new Set();
    Object.values(userMessageCounts).forEach(messages => {
      messages.forEach(time => {
        if (Date.now() - time < 300000) { // Last 5 minutes
          recentUsers.add(time);
        }
      });
    });
    activeUsers.textContent = recentUsers.size || 0;
  }
}

// Live chat monitor
let liveChatMonitorListener = null;
function startLiveChatMonitor() {
  const monitor = document.getElementById('liveChatMonitor');
  if (!monitor || !db) return;
  
  // Clear existing listener
  if (liveChatMonitorListener) {
    db.ref('chat').off('child_added', liveChatMonitorListener);
  }
  
  liveChatMonitorListener = db.ref('chat').limitToLast(10).on('child_added', (snapshot) => {
    const msg = snapshot.val();
    if (!msg) return;
    
    const time = new Date(msg.time).toLocaleTimeString();
    const isBlocked = containsProfanity(msg.text) || isSpam(msg.text);
    const status = isBlocked ? '<span style="color:#dc3545;">⚠️ BLOCKED</span>' : '<span style="color:#28a745;">✓ Allowed</span>';
    
    const entry = document.createElement('div');
    entry.style.cssText = 'padding:8px 12px; background:rgba(0,0,0,0.3); border-radius:8px; margin-bottom:6px; font-size:12px; border-left:3px solid ' + (isBlocked ? '#dc3545' : '#28a745') + ';';
    entry.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="color:#FFD700; font-weight:600;">${msg.user || 'Unknown'}</span>
        ${status}
      </div>
      <div style="color:rgba(255,255,255,0.8); word-break:break-word;">${msg.text.substring(0, 60)}${msg.text.length > 60 ? '...' : ''}</div>
      <div style="color:rgba(255,255,255,0.5); font-size:10px; margin-top:4px;">${time}</div>
    `;
    
    monitor.insertBefore(entry, monitor.firstChild);
    
    // Keep only last 10 entries
    while (monitor.children.length > 10) {
      monitor.removeChild(monitor.lastChild);
    }
  });
}

// Load moderation panel
function loadModerationPanel() {
  updateModerationUI();
  updateProfanityWordsList();
  updateBannedUsersList();
  updateModerationStats();
  startLiveChatMonitor();
  
  // Update banned users when they change
  if (db) {
    db.ref('bannedUsers').on('value', () => {
      updateBannedUsersList();
    });
  }
}

// Track blocked messages
function trackBlockedMessage(reason) {
  moderationStats.blockedMessages = (moderationStats.blockedMessages || 0) + 1;
  if (reason === 'spam') {
    moderationStats.spamDetected = (moderationStats.spamDetected || 0) + 1;
  }
  if (db) {
    db.ref('moderationStats').set(moderationStats);
  }
  updateModerationStats();
}

// ---------------- Enhanced Sparkles ----------------
function initSparkles() {
    const canvas = document.getElementById('sparkleCanvas');
    if (!canvas) return; // Sparkle canvas is in popup, may not exist yet
    
    const ctx = canvas.getContext('2d');
    let sparkles = [];
    let ripples = [];

    function resizeCanvas() { 
        canvas.width = canvas.offsetWidth; 
        canvas.height = canvas.offsetHeight; 
    }
  window.addEventListener('resize', Utils.debounce(resizeCanvas, 250)); 
    resizeCanvas();

function createSparkle() { 
    return { 
        x: Math.random() * canvas.width, 
        y: Math.random() * canvas.height, 
        r: Math.random() * 2 + 0.5, 
        vx: (Math.random() - 0.5) * 0.8, 
        vy: (Math.random() - 0.5) * 0.8, 
        alpha: Math.random() * 0.5 + 0.3,
        baseAlpha: Math.random() * 0.5 + 0.3,
        color: ['#FFD700', '#FFFFFF', '#FFD700', '#FFFF99'][Math.floor(Math.random() * 4)],
        twinkle: Math.random() * 0.05 + 0.01
    }; 
}

// Reduced particle count for better performance
for(let i = 0; i < 50; i++) {
    sparkles.push(createSparkle());
}

// Add ripple effect on mouse move (throttled and limited)
let lastRippleTime = 0;
document.addEventListener('mousemove', (e) => {
  const now = Date.now();
  // Throttle ripples to max 1 per second
  if (now - lastRippleTime > 1000 && Math.random() > 0.98 && ripples.length < 3) {
      lastRippleTime = now;
        ripples.push({
            x: e.clientX,
            y: e.clientY,
            radius: 0,
            maxRadius: 100 + Math.random() * 50,
            alpha: 0.6,
            speed: 2 + Math.random()
        });
    }
}, { passive: true });

// Performance optimization: frame throttling
let lastSparkleFrame = 0;
let sparkleFrameSkip = 0;

function animateSparkles() {
  const now = performance.now();
  const deltaTime = now - lastSparkleFrame;
  
  // Throttle to ~30fps for sparkles (less critical animation)
  if (deltaTime < 33) {
      requestAnimationFrame(animateSparkles);
      return;
  }
  lastSparkleFrame = now;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
  // Draw sparkles (optimized)
  const time = Date.now();
    for(let s of sparkles) {
      // Twinkle effect (cached calculation)
      s.alpha = s.baseAlpha + Math.sin(time * s.twinkle) * 0.3;
        s.alpha = Math.max(0.1, Math.min(0.8, s.alpha));
        
      // Mouse attraction (only calculate if close)
        const dx = mouseX - s.x;
        const dy = mouseY - s.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 40000) { // 200^2, avoid sqrt
          const dist = Math.sqrt(distSq);
            s.vx += dx * 0.0001;
            s.vy += dy * 0.0001;
        }
        
        // Update position
        s.x += s.vx;
        s.y += s.vy;
        
        // Bounce off edges
        if(s.x < 0 || s.x > canvas.width) s.vx *= -1;
        if(s.y < 0 || s.y > canvas.height) s.vy *= -1;
        
        // Keep in bounds
        s.x = Math.max(0, Math.min(canvas.width, s.x));
        s.y = Math.max(0, Math.min(canvas.height, s.y));
        
      // Optimized drawing (reuse color strings)
      const rgb = s.color === '#FFD700' ? '255, 215, 0' : 
                  s.color === '#FFFF99' ? '255, 255, 153' : '255, 255, 255';
      
      // Simple fill instead of gradient for better performance
        ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${s.alpha * 0.5})`;
        ctx.fill();
        
        // Core sparkle
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${s.alpha})`;
        ctx.fill();
    }
    
  // Draw and update ripples (limit to 5 max)
  if (ripples.length > 5) ripples = ripples.slice(-5);
    for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += ripple.speed;
        ripple.alpha -= 0.02;
        
        if (ripple.radius > ripple.maxRadius || ripple.alpha <= 0) {
            ripples.splice(i, 1);
            continue;
        }
        
        ctx.strokeStyle = `rgba(255, 215, 0, ${ripple.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    requestAnimationFrame(animateSparkles);
    }
    animateSparkles();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSparkles);
} else {
    setTimeout(initSparkles, 100);
}
let mouseX = 0, mouseY = 0;
let mouseTrail = [];
let clickRipples = [];
const maxTrailLength = 20;

function initInteractiveBackground() {
    const interactiveBg = document.getElementById('interactiveBackground');
    if (!interactiveBg) return;
    
    const bgCtx = interactiveBg.getContext('2d');
    
    function resizeInteractiveBg() {
        interactiveBg.width = window.innerWidth;
        interactiveBg.height = window.innerHeight;
    }
  window.addEventListener('resize', Utils.debounce(resizeInteractiveBg, 250));
    resizeInteractiveBg();
  let mouseMoved = false;
  let lastBgFrame = 0;
  let animationRunning = true;

  const handleMouseMove = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      mouseMoved = true;
        mouseTrail.push({ x: mouseX, y: mouseY, time: Date.now() });
        if (mouseTrail.length > maxTrailLength) {
            mouseTrail.shift();
        }
  };
  document.addEventListener('mousemove', handleMouseMove, { passive: true, capture: true });
  
  const handleClick = (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('input')) {
          return;
      }
      if (clickRipples.length < 3) { // Limit ripples
        clickRipples.push({
            x: e.clientX,
            y: e.clientY,
            radius: 0,
            maxRadius: 300,
            alpha: 0.8,
            speed: 5
        });
      }
  };
  document.addEventListener('click', handleClick, { passive: true, capture: true });

    function animateInteractiveBg() {
      if (!animationRunning) return;
      
      const now = performance.now();
      // Throttle to ~30fps for background
      if (now - lastBgFrame < 33) {
          requestAnimationFrame(animateInteractiveBg);
          return;
      }
      lastBgFrame = now;
      
      try {
        bgCtx.clearRect(0, 0, interactiveBg.width, interactiveBg.height);
        
          // Only draw mouse glow if mouse has moved recently
          if (mouseMoved) {
        const gradient = bgCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 500);
              gradient.addColorStop(0, 'rgba(255, 215, 0, 0.08)');
              gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.03)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, interactiveBg.width, interactiveBg.height);
              mouseMoved = false;
          }
        
          // Limit trail length and optimize drawing
          const trailLimit = Math.min(mouseTrail.length, 15);
          for (let i = 0; i < trailLimit; i++) {
            const point = mouseTrail[i];
            const age = Date.now() - point.time;
              if (age > 800) continue;
            const alpha = Math.max(0, 1 - age / 800);
              const size = 3 * alpha;
            
            bgCtx.beginPath();
            bgCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
              bgCtx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.4})`;
            bgCtx.fill();
        }
        
          // Limit ripples to 3 max
          if (clickRipples.length > 3) clickRipples = clickRipples.slice(-3);
        for (let i = clickRipples.length - 1; i >= 0; i--) {
            const ripple = clickRipples[i];
            ripple.radius += ripple.speed;
            ripple.alpha -= 0.015;
            
            if (ripple.radius > ripple.maxRadius || ripple.alpha <= 0) {
                clickRipples.splice(i, 1);
                continue;
            }
            
              // Simplified ripple drawing
            bgCtx.strokeStyle = `rgba(255, 215, 0, ${ripple.alpha})`;
              bgCtx.lineWidth = 2;
            bgCtx.beginPath();
            bgCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            bgCtx.stroke();
          }
          
          // Clean up old trail points
        mouseTrail = mouseTrail.filter(p => Date.now() - p.time < 800);
      } catch (err) {
          console.warn('Error in interactive background animation:', err);
      }
        
        requestAnimationFrame(animateInteractiveBg);
    }
  
    animateInteractiveBg();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveBackground);
} else {
    initInteractiveBackground();
}

function initStars() {
    const starCanvas = document.getElementById('starCanvas');
    if (!starCanvas) return;
    
    const starCtx = starCanvas.getContext('2d');
  let particles = [];
  let connectionFrame = 0; // Frame counter for connection updates
  const maxConnectionDistance = 150;
  const mouseRepelRadius = 150;
  const mouseRepelStrength = 2.5;
            const particleCount = 60; // Reduced for better performance

    function resizeStarCanvas() {
      const oldWidth = starCanvas.width;
      const oldHeight = starCanvas.height;
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
      
      // Scale existing particles to new canvas size
      const scaleX = starCanvas.width / oldWidth;
      const scaleY = starCanvas.height / oldHeight;
      
      for (let i = 0; i < particles.length; i++) {
          particles[i].x *= scaleX;
          particles[i].y *= scaleY;
      }
      
      // Add more particles if canvas got bigger
      const currentCount = particles.length;
      if (currentCount < particleCount) {
          for (let i = currentCount; i < particleCount; i++) {
              particles.push(createParticle());
          }
      }
  }
  window.addEventListener('resize', Utils.debounce(resizeStarCanvas, 250));
    resizeStarCanvas();

  function createParticle() {
        return {
            x: Math.random() * starCanvas.width,
            y: Math.random() * starCanvas.height,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          radius: Math.random() * 1.5 + 0.5,
          connections: [] // Array of particle indices this particle is connected to
      };
  }

  function updateParticles() {
      if (!starCanvas || !particles || particles.length === 0) return;
      
      const canvasWidth = starCanvas.width;
      const canvasHeight = starCanvas.height;
      
      for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
          
          // Mouse repulsion - stronger and more noticeable
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          
          if (dist < mouseRepelRadius && dist > 0 && isFinite(dist)) {
              const force = Math.pow((mouseRepelRadius - dist) / mouseRepelRadius, 1.5);
              const angle = Math.atan2(dy, dx);
              if (isFinite(angle) && isFinite(force)) {
                  p.vx -= Math.cos(angle) * force * mouseRepelStrength;
                  p.vy -= Math.sin(angle) * force * mouseRepelStrength;
              }
          }
          
          // Update position
          p.x += p.vx;
          p.y += p.vy;
          
          // Clamp to valid bounds first (prevent out of bounds)
          const minX = p.radius;
          const maxX = canvasWidth - p.radius;
          const minY = p.radius;
          const maxY = canvasHeight - p.radius;
          
          // Boundary bouncing with validation
          if (p.x < minX || !isFinite(p.x)) {
              p.x = Math.max(minX, 0);
              p.vx = -p.vx * 0.8;
          }
          if (p.x > maxX || !isFinite(p.x)) {
              p.x = Math.min(maxX, canvasWidth);
              p.vx = -p.vx * 0.8;
          }
          if (p.y < minY || !isFinite(p.y)) {
              p.y = Math.max(minY, 0);
              p.vy = -p.vy * 0.8;
          }
          if (p.y > maxY || !isFinite(p.y)) {
              p.y = Math.min(maxY, canvasHeight);
              p.vy = -p.vy * 0.8;
          }
          
          // Ensure values are finite
          if (!isFinite(p.x)) p.x = canvasWidth / 2;
          if (!isFinite(p.y)) p.y = canvasHeight / 2;
          if (!isFinite(p.vx)) p.vx = 0;
          if (!isFinite(p.vy)) p.vy = 0;
          
          // Friction
          p.vx *= 0.99;
          p.vy *= 0.99;
          
          // Limit velocity
          const maxVel = 4;
          const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (isFinite(vel) && vel > maxVel) {
              p.vx = (p.vx / vel) * maxVel;
              p.vy = (p.vy / vel) * maxVel;
          }
      }
      
      // Update connections - only check every other frame for performance
      connectionFrame++;
      if (connectionFrame % 2 === 0) {
          for (let i = 0; i < particles.length; i++) {
              const p1 = particles[i];
              p1.connections = [];
              
              for (let j = i + 1; j < particles.length; j++) {
                  const p2 = particles[j];
                  const dx = p2.x - p1.x;
                  const dy = p2.y - p1.y;
                  const distSq = dx * dx + dy * dy;
                  
                  // Skip sqrt calculation, compare squared distances
                  if (distSq < maxConnectionDistance * maxConnectionDistance) {
                      p1.connections.push(j);
                  }
              }
          }
      }
  }

  let lastStarFrame = 0;
  let animationRunning = true;

    function animateStars() {
      if (!animationRunning || !starCanvas || !starCtx) return;
      
      const now = performance.now();
      // Throttle to ~20fps for better performance
      if (now - lastStarFrame < 50) {
          requestAnimationFrame(animateStars);
          return;
      }
      lastStarFrame = now;
      
      try {
          // Validate canvas and context
          if (!starCanvas || !starCtx || !starCanvas.parentNode) {
              animationRunning = false;
              return;
          }
          
          // Ensure canvas size matches window
          const newWidth = window.innerWidth;
          const newHeight = window.innerHeight;
          if (starCanvas.width !== newWidth || starCanvas.height !== newHeight) {
              if (newWidth > 0 && newHeight > 0) {
                  resizeStarCanvas();
              } else {
                  requestAnimationFrame(animateStars);
                  return;
              }
          }
          
          // Clear canvas with proper bounds checking
          if (starCanvas.width > 0 && starCanvas.height > 0) {
        starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
          } else {
              requestAnimationFrame(animateStars);
              return;
          }
          
          // Update particles
          updateParticles();
      
      // Draw connections with validation
      starCtx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      starCtx.lineWidth = 1;
      
      for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];
          if (!p1 || !isFinite(p1.x) || !isFinite(p1.y)) continue;
          
          for (let j of p1.connections) {
              if (j >= particles.length || j < 0) continue;
              const p2 = particles[j];
              if (!p2 || !isFinite(p2.x) || !isFinite(p2.y)) continue;
              
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (!isFinite(dist) || dist > maxConnectionDistance) continue;
              
              // Opacity based on distance
              const opacity = Math.max(0, Math.min(1, 1 - (dist / maxConnectionDistance)));
              starCtx.strokeStyle = `rgba(255, 215, 0, ${opacity * 0.3})`;
            
            starCtx.beginPath();
              starCtx.moveTo(p1.x, p1.y);
              starCtx.lineTo(p2.x, p2.y);
              starCtx.stroke();
          }
      }
      
      // Draw particles with validation
      for (let p of particles) {
          if (!p || !isFinite(p.x) || !isFinite(p.y) || !isFinite(p.radius)) continue;
          
          // Clamp position to canvas bounds
          const clampedX = Math.max(p.radius, Math.min(starCanvas.width - p.radius, p.x));
          const clampedY = Math.max(p.radius, Math.min(starCanvas.height - p.radius, p.y));
          
          // Mouse proximity glow
          const dx = mouseX - clampedX;
          const dy = mouseY - clampedY;
          const distSq = dx * dx + dy * dy;
          const mouseEffect = distSq < mouseRepelRadius * mouseRepelRadius 
              ? Math.max(0, 1 - Math.sqrt(distSq) / mouseRepelRadius) 
              : 0;
          
          const glowSize = Math.max(0, Math.min(50, p.radius * (1 + mouseEffect * 0.5)));
          const brightness = Math.max(0, Math.min(1, 0.6 + mouseEffect * 0.4));
          
          // Glow
          starCtx.beginPath();
          starCtx.arc(clampedX, clampedY, glowSize * 2, 0, Math.PI * 2);
          starCtx.fillStyle = `rgba(255, 215, 0, ${brightness * 0.2})`;
            starCtx.fill();
            
          // Core particle
            starCtx.beginPath();
          starCtx.arc(clampedX, clampedY, p.radius, 0, Math.PI * 2);
          starCtx.fillStyle = `rgba(255, 215, 0, ${brightness})`;
            starCtx.fill();
        }
      } catch (err) {
          console.warn('Error in star animation:', err);
      }
      
      if (animationRunning) {
        requestAnimationFrame(animateStars);
      }
    }
    animateStars();
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStars);
} else {
  initStars();
}

// ================= Christmas Snow Animation =================
function initSnow() {
    const snowCanvas = document.getElementById('snowCanvas');
    if (!snowCanvas) return;
    
    const ctx = snowCanvas.getContext('2d');
    let snowflakes = [];
    const snowflakeCount = 40; // Reduced for better performance
    
    function resizeSnowCanvas() {
        snowCanvas.width = window.innerWidth;
        snowCanvas.height = window.innerHeight;
        snowflakes = [];
        for (let i = 0; i < snowflakeCount; i++) {
            snowflakes.push(createSnowflake());
        }
    }
    
    function createSnowflake() {
        return {
            x: Math.random() * snowCanvas.width,
            y: Math.random() * snowCanvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.5,
            angle: Math.random() * Math.PI * 2,
            spinSpeed: (Math.random() - 0.5) * 0.1
        };
    }
    
    let lastSnowFrame = 0;
    function animateSnow() {
        if (!snowCanvas || !ctx) return;
        
        const now = performance.now();
        // Throttle to ~20fps for better performance
        if (now - lastSnowFrame < 50) {
            requestAnimationFrame(animateSnow);
            return;
        }
        lastSnowFrame = now;
        
        ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
        
        // Batch drawing operations - set shadow once
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        
        for (let flake of snowflakes) {
            flake.y += flake.speed;
            flake.x += Math.sin(flake.angle) * 0.5;
            flake.angle += flake.spinSpeed;
            
            if (flake.y > snowCanvas.height) {
                flake.y = -10;
                flake.x = Math.random() * snowCanvas.width;
            }
            
            if (flake.x < 0) flake.x = snowCanvas.width;
            if (flake.x > snowCanvas.width) flake.x = 0;
            
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
        requestAnimationFrame(animateSnow);
    }
    
    window.addEventListener('resize', Utils.debounce(resizeSnowCanvas, 250));
    resizeSnowCanvas();
    animateSnow();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSnow);
} else {
    initSnow();
}


const contextMenu = document.createElement('div');
contextMenu.id = 'customContextMenu';
contextMenu.innerHTML = `
    <button class="menu-item" id="menuHome">🏠 Home</button>
    <button class="menu-item" id="menuRefresh">🔄 Refresh</button>
    <button class="menu-item" id="menuBack">⬅️ Back</button>
    <button class="menu-item" id="menuForward">➡️ Forward</button>
`;
document.body.appendChild(contextMenu);

// Context menu event listeners
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    contextMenu.style.left = e.clientX + 'px';
    contextMenu.style.top = e.clientY + 'px';
    contextMenu.style.display = 'block';
});

document.addEventListener('click', () => {
    contextMenu.style.display = 'none';
});

// Menu actions
document.getElementById('menuHome').addEventListener('click', () => {
    window.location.href = window.location.origin + window.location.pathname;
});

document.getElementById('menuRefresh').addEventListener('click', () => {
    window.location.reload();
});

document.getElementById('menuBack').addEventListener('click', () => {
    window.history.back();
});

document.getElementById('menuForward').addEventListener('click', () => {
    window.history.forward();
});

const chatContainer = document.getElementById('chatContainer');
const toggleChatBtn = document.getElementById('toggleChatBtn');

toggleChatBtn.addEventListener('click', () => {
    if(chatContainer.style.display === 'none' || chatContainer.style.display === '') {
      chatContainer.style.display = 'flex';
        // Auto-scroll to bottom when opening
        setTimeout(() => {
            const chatMessages = document.getElementById('chatMessages');
          if(chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    } else {
        chatContainer.style.display = 'none';
    }
});

// ================= Expandable Chat System =================
const expandChatBtn = document.getElementById('expandChatBtn');
const minimizeChatBtn = document.getElementById('minimizeChatBtn');
const fullScreenChatModal = document.getElementById('fullScreenChatModal');
const closeFullscreenChatBtn = document.getElementById('closeFullscreenChatBtn');
const fullscreenChatMessages = document.getElementById('fullscreenChatMessages');
const fullscreenChatInput = document.getElementById('fullscreenChatInput');
const fullscreenSendBtn = document.getElementById('fullscreenSendBtn');
const fullscreenChatSidebar = document.getElementById('fullscreenChatSidebar');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const fullscreenChatSearchBar = document.getElementById('fullscreenChatSearchBar');
const fullscreenChatSearchBtn = document.getElementById('fullscreenChatSearchBtn');
const closeSearchBtn = document.getElementById('closeSearchBtn');
const fullscreenChatSearchInput = document.getElementById('fullscreenChatSearchInput');
const fullscreenChatUsersBtn = document.getElementById('fullscreenChatUsersBtn');
const fullscreenChatOnlineUsers = document.getElementById('fullscreenChatOnlineUsers');
const onlineUsersCount = document.getElementById('onlineUsersCount');

// Fullscreen chat buttons
const fullscreenEmojiBtn = document.getElementById('fullscreenEmojiBtn');
const fullscreenVoiceBtn = document.getElementById('fullscreenVoiceBtn');
const fullscreenLinkBtn = document.getElementById('fullscreenLinkBtn');
const fullscreenFileBtn = document.getElementById('fullscreenFileBtn');
const fullscreenNameBtn = document.getElementById('fullscreenNameBtn');

// Connect fullscreen name button now that it's declared
fullscreenNameBtn?.addEventListener('click', openNameColorPopup);

// Chat Settings Button
const chatSettingsBtn = document.getElementById('chatSettingsBtn');
const fullscreenChatSettingsBtn = document.getElementById('fullscreenChatSettingsBtn');

function openChatSettings() {
  // Create or show settings modal
  let settingsModal = document.getElementById('chatSettingsModal');
  if (!settingsModal) {
      settingsModal = document.createElement('div');
      settingsModal.id = 'chatSettingsModal';
      settingsModal.className = 'chat-settings-modal';
      settingsModal.innerHTML = `
          <div class="chat-settings-content">
              <div class="chat-settings-header">
                  <h2><i class="fas fa-cog"></i> Chat Settings</h2>
                  <button class="chat-settings-close" id="closeChatSettingsBtn">
                      <i class="fas fa-times"></i>
                  </button>
              </div>
              <div class="chat-settings-body">
                  <div class="chat-setting-item">
                      <label>
                          <input type="checkbox" id="chatSoundEnabled" checked>
                          <span>Enable notification sounds</span>
                      </label>
                  </div>
                  <div class="chat-setting-item">
                      <label>
                          <input type="checkbox" id="chatAutoScroll" checked>
                          <span>Auto-scroll to new messages</span>
                      </label>
                  </div>
                  <div class="chat-setting-item">
                      <label>
                          <input type="checkbox" id="chatShowTimestamps">
                          <span>Show message timestamps</span>
                      </label>
                  </div>
                  <div class="chat-setting-item">
                      <label>
                          <span>Messages per page:</span>
                          <select id="chatMessagesPerPage" class="chat-setting-select">
                              <option value="50">50</option>
                              <option value="100" selected>100</option>
                              <option value="200">200</option>
                          </select>
                      </label>
                  </div>
              </div>
          </div>
      `;
      document.body.appendChild(settingsModal);
      
      // Close button
      document.getElementById('closeChatSettingsBtn')?.addEventListener('click', () => {
          settingsModal.style.display = 'none';
      });
      
      // Close on backdrop click
      settingsModal.addEventListener('click', (e) => {
          if (e.target === settingsModal) {
              settingsModal.style.display = 'none';
          }
      });
      
      // Load saved settings
      const soundEnabled = localStorage.getItem('chatSoundEnabled') !== 'false';
      const autoScroll = localStorage.getItem('chatAutoScroll') !== 'false';
      const showTimestamps = localStorage.getItem('chatShowTimestamps') === 'true';
      const messagesPerPage = localStorage.getItem('chatMessagesPerPage') || '100';
      
      const soundCheckbox = document.getElementById('chatSoundEnabled');
      const autoScrollCheckbox = document.getElementById('chatAutoScroll');
      const timestampsCheckbox = document.getElementById('chatShowTimestamps');
      const messagesSelect = document.getElementById('chatMessagesPerPage');
      
      if (soundCheckbox) soundCheckbox.checked = soundEnabled;
      if (autoScrollCheckbox) autoScrollCheckbox.checked = autoScroll;
      if (timestampsCheckbox) timestampsCheckbox.checked = showTimestamps;
      if (messagesSelect) messagesSelect.value = messagesPerPage;
      
      // Save settings on change
      soundCheckbox?.addEventListener('change', (e) => {
          localStorage.setItem('chatSoundEnabled', e.target.checked);
      });
      autoScrollCheckbox?.addEventListener('change', (e) => {
          localStorage.setItem('chatAutoScroll', e.target.checked);
      });
      timestampsCheckbox?.addEventListener('change', (e) => {
          localStorage.setItem('chatShowTimestamps', e.target.checked);
      });
      messagesSelect?.addEventListener('change', (e) => {
          localStorage.setItem('chatMessagesPerPage', e.target.value);
      });
  }
  
  settingsModal.style.display = 'flex';
}

chatSettingsBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  openChatSettings();
});

fullscreenChatSettingsBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  openChatSettings();
});

// Expand chat to full screen
expandChatBtn?.addEventListener('click', () => {
  if (!fullScreenChatModal) {
      console.error('Fullscreen chat modal not found');
      return;
  }
  
  try {
      fullScreenChatModal.style.display = 'block';
      // Sync messages
      syncChatMessages();
      // Load online users
      loadOnlineUsers();
      // Auto-scroll
      setTimeout(() => {
          if (fullscreenChatMessages) {
              fullscreenChatMessages.scrollTop = fullscreenChatMessages.scrollHeight;
          }
      }, 100);
  } catch (error) {
      console.error('Error expanding chat:', error);
      notifications.show('Error opening fullscreen chat', 'error', 2000);
  }
});

// Minimize from full screen
minimizeChatBtn?.addEventListener('click', () => {
  try {
      if (fullScreenChatModal) {
          fullScreenChatModal.style.display = 'none';
      }
  } catch (error) {
      console.error('Error minimizing chat:', error);
  }
});

// Close full screen chat
closeFullscreenChatBtn?.addEventListener('click', () => {
  try {
      if (fullScreenChatModal) {
          fullScreenChatModal.style.display = 'none';
      }
  } catch (error) {
      console.error('Error closing fullscreen chat:', error);
  }
});

fullScreenChatModal?.addEventListener('click', (e) => {
  if (e.target === fullScreenChatModal) {
      try {
          fullScreenChatModal.style.display = 'none';
      } catch (error) {
          console.error('Error closing chat on backdrop click:', error);
      }
  }
});

// Escape key to close fullscreen chat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && fullScreenChatModal && fullScreenChatModal.style.display !== 'none') {
      try {
          fullScreenChatModal.style.display = 'none';
      } catch (error) {
          console.error('Error closing chat with Escape:', error);
      }
  }
});

// Toggle sidebar
toggleSidebarBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (fullscreenChatSidebar) {
      const isOpen = fullscreenChatSidebar.classList.contains('open');
      if (isOpen) {
          fullscreenChatSidebar.classList.remove('open');
      } else {
          fullscreenChatSidebar.classList.add('open');
          loadOnlineUsers(); // Load users when opening
      }
      const icon = toggleSidebarBtn.querySelector('i');
      if (icon) {
          if (isOpen) {
              icon.classList.remove('fa-chevron-right');
              icon.classList.add('fa-chevron-left');
          } else {
              icon.classList.remove('fa-chevron-left');
              icon.classList.add('fa-chevron-right');
          }
      }
  }
});

// Initialize sidebar state - open by default on desktop
if (fullscreenChatSidebar && window.innerWidth > 768) {
  fullscreenChatSidebar.classList.add('open');
  const icon = toggleSidebarBtn?.querySelector('i');
  if (icon) {
      icon.classList.remove('fa-chevron-left');
      icon.classList.add('fa-chevron-right');
  }
}

// Toggle search bar
fullscreenChatSearchBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (fullscreenChatSearchBar) {
      const isVisible = fullscreenChatSearchBar.style.display !== 'none' && fullscreenChatSearchBar.style.display !== '';
      if (isVisible) {
          fullscreenChatSearchBar.style.display = 'none';
          if (fullscreenChatSearchInput) {
              fullscreenChatSearchInput.value = '';
              syncChatMessages(); // Restore all messages
          }
      } else {
          fullscreenChatSearchBar.style.display = 'flex';
          setTimeout(() => {
              fullscreenChatSearchInput?.focus();
          }, 100);
      }
  }
});

closeSearchBtn?.addEventListener('click', () => {
  if (fullscreenChatSearchBar) {
      fullscreenChatSearchBar.style.display = 'none';
      if (fullscreenChatSearchInput) {
          fullscreenChatSearchInput.value = '';
      }
  }
});

// Search functionality
fullscreenChatSearchInput?.addEventListener('input', Utils.debounce((e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
      syncChatMessages();
      return;
  }
  
  // Filter messages
  const messages = fullscreenChatMessages?.querySelectorAll('.chat-message');
  if (messages) {
      messages.forEach(msg => {
          const text = msg.textContent.toLowerCase();
          if (text.includes(query)) {
              msg.style.display = '';
              msg.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
          } else {
              msg.style.display = 'none';
          }
      });
  }
}, 300));

// Toggle online users sidebar
fullscreenChatUsersBtn?.addEventListener('click', () => {
  if (fullscreenChatSidebar) {
      fullscreenChatSidebar.classList.toggle('open');
      loadOnlineUsers();
  }
});

// Send message function (works for both regular and fullscreen) with moderation
function sendChatMessage(inputElement) {
  if (!inputElement || !inputElement.value.trim()) return;
  if (!db) {
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show('Database not available', 'error', 2000);
      }
      return;
  }
  
  const messageText = inputElement.value.trim();
  
  // Check if user is banned
  if (isUserBanned(visitorId)) {
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show('You are banned from chatting', 'error', 3000);
      } else {
          alert('You are banned from chatting');
      }
      inputElement.value = '';
      return;
  }
  
  // Check rate limiting
  const rateLimitCheck = checkRateLimit(visitorId);
  if (!rateLimitCheck.allowed) {
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show(rateLimitCheck.reason, 'warning', 2000);
      } else {
          alert(rateLimitCheck.reason);
      }
      return;
  }
  
  // Check for profanity
  if (containsProfanity(messageText)) {
      trackBlockedMessage('profanity');
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show('Message contains inappropriate content', 'error', 2000);
      } else {
          alert('Message contains inappropriate content');
      }
      inputElement.value = '';
      return;
  }
  
  // Check for spam
  if (isSpam(messageText)) {
      trackBlockedMessage('spam');
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show('Message detected as spam', 'error', 2000);
      } else {
          alert('Message detected as spam');
      }
      inputElement.value = '';
      return;
  }
  
  inputElement.value = '';
  
  // Stop typing indicator
  if (db) {
      db.ref('chatTyping/' + visitorId).remove().catch(err => console.error('Error removing typing:', err));
  }
  
  // Update rate limiting tracking
  const now = Date.now();
  if (!userMessageCounts[visitorId]) {
      userMessageCounts[visitorId] = [];
  }
  userMessageCounts[visitorId].push(now);
  lastMessageTime[visitorId] = now;
  
  // Send message
  const msgData = {
      user: username,
      text: messageText,
      color: userColor,
      time: now,
      uid: visitorId,
      avatar: userProfile.avatar || '👤',
      avatarImage: userProfile.avatarImage || null
  };
  
  db.ref('chat').push(msgData).catch(error => {
      console.error('Error sending message:', error);
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show('Error sending message', 'error', 2000);
      }
  });
  
  // Track activity
  if (typeof trackActivity === 'function') {
      trackActivity('chat', 1);
  }
  if (typeof addActivity === 'function') {
      addActivity('Sent a chat message');
  }
}

// Regular chat send
const sendChatBtn = document.getElementById('sendChatBtn');
sendChatBtn?.addEventListener('click', () => {
  const input = document.getElementById('chatInput');
  if (input) sendChatMessage(input);
});

// Fullscreen chat send
fullscreenSendBtn?.addEventListener('click', () => {
  if (fullscreenChatInput) sendChatMessage(fullscreenChatInput);
});

// Enter key for both inputs
fullscreenChatInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
      sendChatMessage(fullscreenChatInput);
  }
});

// Sync messages between regular and fullscreen chat
function syncChatMessages() {
  const regularMessages = document.getElementById('chatMessages');
  const fullscreenMessages = fullscreenChatMessages;
  
  if (!regularMessages || !fullscreenMessages) return;
  
  // Copy messages from regular to fullscreen
  fullscreenMessages.innerHTML = regularMessages.innerHTML;
  
  // Re-attach delete button handlers for fullscreen messages
  fullscreenMessages.querySelectorAll('[data-msg-id]').forEach(msgDiv => {
      const msgId = msgDiv.getAttribute('data-msg-id');
      const delBtn = msgDiv.querySelector('.chat-delete-btn');
      if (delBtn && msgId && db) {
          // Recreate delete functionality
          delBtn.onclick = (e) => {
              e.stopPropagation();
              if(confirm('Delete this message?')) {
                  db.ref(`chat/${msgId}`).remove().catch(err => {
                      console.error('Error deleting message:', err);
                      if (typeof notifications !== 'undefined' && notifications.show) {
                          notifications.show('Error deleting message', 'error', 2000);
                      }
                  });
              }
          };
      }
  });
  
  // Auto-scroll
  setTimeout(() => {
      fullscreenMessages.scrollTop = fullscreenMessages.scrollHeight;
  }, 50);
}

// Load online users
function loadOnlineUsers() {
  if (!fullscreenChatOnlineUsers || !db) return;
  
  db.ref('online').once('value').then(snap => {
      const online = snap.val() || {};
      const onlineIds = Object.keys(online);
      
      if (onlineUsersCount) {
          onlineUsersCount.textContent = onlineIds.length;
      }
      
      // Load profiles
      db.ref('profiles').once('value').then(profilesSnap => {
          const profiles = profilesSnap.val() || {};
          const users = onlineIds.map(id => ({
              id,
              profile: profiles[id] || {},
              timestamp: online[id]?.timestamp || Date.now()
          })).sort((a, b) => b.timestamp - a.timestamp);
          
          if (users.length === 0) {
              fullscreenChatOnlineUsers.innerHTML = '<div class="empty-state">No users online</div>';
              return;
          }
          
          fullscreenChatOnlineUsers.innerHTML = users.map(({id, profile}) => {
              const avatarStyle = profile.avatarImage 
                  ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                  : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
              const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
              
              return `
                  <div class="online-user-item">
                      <div class="online-user-avatar" style="${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:24px;">
                          ${avatarContent}
                          <div class="online-user-status-dot"></div>
                      </div>
                      <div class="online-user-info">
                          <div class="online-user-name">${profile.username || 'User'}</div>
                          <div class="online-user-status">🟢 Online</div>
                      </div>
                  </div>
              `;
          }).join('');
      });
  }).catch(err => {
      console.error('Error loading online users:', err);
  });
}

// Sync messages when regular chat updates
const chatMessagesObserver = new MutationObserver(() => {
  if (fullScreenChatModal && fullScreenChatModal.style.display !== 'none') {
      syncChatMessages();
  }
});

const regularChatMessages = document.getElementById('chatMessages');
if (regularChatMessages) {
  chatMessagesObserver.observe(regularChatMessages, { childList: true, subtree: true });
}

// Update online users count periodically
if (db) {
  setInterval(loadOnlineUsers, 10000); // Every 10 seconds
}

const themeBtn = document.getElementById('themeBtn');
const themeModal = document.getElementById('themeModal');
const closeThemeBtn = document.getElementById('closeThemeBtn');
const themeOptions = document.querySelectorAll('.theme-option');
const seasonalThemes = document.querySelectorAll('.seasonal-theme');

let currentTheme = localStorage.getItem('selectedTheme') || 'default';
let currentSeasonal = localStorage.getItem('selectedSeasonal') || '';

function applyTheme(theme) {
  // Remove all theme classes
  document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
  document.body.className = document.body.className.replace(/seasonal-\w+/g, '').trim();

  // Apply new theme
  if (theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
  }

  // Apply seasonal theme if exists
  if (currentSeasonal) {
    document.body.classList.add(`seasonal-${currentSeasonal}`);
  }

  localStorage.setItem('selectedTheme', theme);
}

function applySeasonal(season) {
  // Remove existing seasonal classes
  document.body.className = document.body.className.replace(/seasonal-\w+/g, '').trim();

  // Apply new seasonal theme
  if (season) {
    document.body.classList.add(`seasonal-${season}`);
  }

  currentSeasonal = season;
  localStorage.setItem('selectedSeasonal', season);
}

// Theme button click
themeBtn.addEventListener('click', () => {
  themeModal.style.display = 'flex';
  themeModal.setAttribute('aria-hidden', 'false');
});

// Close theme modal
closeThemeBtn.addEventListener('click', () => {
  themeModal.style.display = 'none';
  themeModal.setAttribute('aria-hidden', 'true');
});

// Theme selection
themeOptions.forEach(option => {
  option.addEventListener('click', () => {
    const theme = option.dataset.theme;
    applyTheme(theme);

    themeOptions.forEach(opt => opt.style.borderColor = opt.dataset.theme === theme ? '#28a745' : '');
  });
});

// Seasonal theme selection
seasonalThemes.forEach(theme => {
  theme.addEventListener('click', () => {
    const season = theme.dataset.season;
    applySeasonal(season === currentSeasonal ? '' : season);
    seasonalThemes.forEach(t => t.style.opacity = t.dataset.season === currentSeasonal ? '1' : '0.6');
  });
});

applyTheme(currentTheme);
applySeasonal(currentSeasonal);

const achievementsBtn = document.getElementById('achievementsBtn');
const achievementsModal = document.getElementById('achievementsModal');
const closeAchievementsBtn = document.getElementById('closeAchievementsBtn');

let userStats = JSON.parse(localStorage.getItem('userStats')) || {
  chatMessages: 0,
  drawTime: 0,
  gameTime: 0,
  onlineTime: 0,
  sitesVisited: [],
  themesTried: [],
  dailyMessages: 0,
  lastDailyReset: Date.now()
};
const now = Date.now();
const lastReset = userStats.lastDailyReset;
const oneDay = 24 * 60 * 60 * 1000;
if (now - lastReset > oneDay) {
  userStats.dailyMessages = 0;
  userStats.lastDailyReset = now;
}

function updateAchievements() {
  const chatProgress = Math.min((userStats.chatMessages / 10) * 100, 100);
  document.getElementById('chatProgress').style.width = chatProgress + '%';
  document.getElementById('chatCount').textContent = userStats.chatMessages + '/10';
  if (userStats.chatMessages >= 10) {
    document.getElementById('chatBadge').style.borderColor = '#28a745';
    document.getElementById('chatBadge').style.background = '#d4edda';
  }
  const drawProgress = Math.min((userStats.drawTime / 30) * 100, 100);
  document.getElementById('drawProgress').style.width = drawProgress + '%';
  document.getElementById('drawCount').textContent = Math.floor(userStats.drawTime) + '/30 min';
  if (userStats.drawTime >= 30) {
    document.getElementById('drawBadge').style.borderColor = '#28a745';
    document.getElementById('drawBadge').style.background = '#d4edda';
  }
  const gameProgress = Math.min((userStats.gameTime / 60) * 100, 100);
  document.getElementById('gameProgress').style.width = gameProgress + '%';
  document.getElementById('gameCount').textContent = Math.floor(userStats.gameTime) + '/60 min';
  if (userStats.gameTime >= 60) {
    document.getElementById('gameBadge').style.borderColor = '#28a745';
    document.getElementById('gameBadge').style.background = '#d4edda';
  }
  const socialProgress = Math.min((userStats.onlineTime / 120) * 100, 100);
  document.getElementById('socialProgress').style.width = socialProgress + '%';
  document.getElementById('socialCount').textContent = Math.floor(userStats.onlineTime) + '/120 min';
  if (userStats.onlineTime >= 120) {
    document.getElementById('socialBadge').style.borderColor = '#28a745';
    document.getElementById('socialBadge').style.background = '#d4edda';
  }
  const explorerProgress = Math.min((userStats.sitesVisited.length / 2) * 100, 100);
  document.getElementById('explorerProgress').style.width = explorerProgress + '%';
  document.getElementById('explorerCount').textContent = userStats.sitesVisited.length + '/2';
  if (userStats.sitesVisited.length >= 2) {
    document.getElementById('explorerBadge').style.borderColor = '#28a745';
    document.getElementById('explorerBadge').style.background = '#d4edda';
  }
  const themeProgress = Math.min((userStats.themesTried.length / 3) * 100, 100);
  document.getElementById('themeProgress').style.width = themeProgress + '%';
  document.getElementById('themeCount').textContent = userStats.themesTried.length + '/3';
  if (userStats.themesTried.length >= 3) {
    document.getElementById('themeBadge').style.borderColor = '#28a745';
    document.getElementById('themeBadge').style.background = '#d4edda';
  }
  const dailyProgress = Math.min((userStats.dailyMessages / 5) * 100, 100);
  document.getElementById('dailyProgress').style.width = dailyProgress + '%';
  document.getElementById('dailyCount').textContent = userStats.dailyMessages + '/5';

  localStorage.setItem('userStats', JSON.stringify(userStats));
}
function trackActivity(type, value = 1) {
  switch(type) {
    case 'chat':
      userStats.chatMessages += value;
      userStats.dailyMessages += value;
      break;
    case 'draw':
      userStats.drawTime += value; // value in minutes
      break;
    case 'game':
      userStats.gameTime += value; // value in minutes
      break;
    case 'online':
      userStats.onlineTime += value; // value in minutes
      break;
    case 'site':
      if (!userStats.sitesVisited.includes(value)) {
        userStats.sitesVisited.push(value);
      }
      break;
    case 'theme':
      if (!userStats.themesTried.includes(value)) {
        userStats.themesTried.push(value);
      }
      break;
  }
  updateAchievements();
}
achievementsBtn.addEventListener('click', () => {
  updateAchievements();
  achievementsModal.style.display = 'flex';
  achievementsModal.setAttribute('aria-hidden', 'false');
});

// Close achievements modal
closeAchievementsBtn.addEventListener('click', () => {
  achievementsModal.style.display = 'none';
  achievementsModal.setAttribute('aria-hidden', 'true');
});
let onlineStartTime = Date.now();
setInterval(() => {
  const minutes = (Date.now() - onlineStartTime) / (1000 * 60);
  trackActivity('online', minutes - userStats.onlineTime);
  onlineStartTime = Date.now();
}, 60000);
let drawingStartTime = null;
document.getElementById('openDrawingBtn').addEventListener('click', () => {
  drawingStartTime = Date.now();
});
document.getElementById('closeDrawingBtn').addEventListener('click', () => {
  if (drawingStartTime) {
    const minutes = (Date.now() - drawingStartTime) / (1000 * 60);
    trackActivity('draw', minutes);
    drawingStartTime = null;
  }
});
let gameStartTime = Date.now();
setInterval(() => {
  const minutes = (Date.now() - gameStartTime) / (1000 * 60);
  trackActivity('game', minutes - userStats.gameTime);
  gameStartTime = Date.now();
}, 60000);
document.getElementById('extraSiteBtn').addEventListener('click', () => {
  trackActivity('site', 'extra');
});
document.getElementById('privacyBtn').addEventListener('click', () => {
  trackActivity('site', 'privacy');
});
themeOptions.forEach(option => {
  option.addEventListener('click', () => {
    trackActivity('theme', option.dataset.theme);
  });
});
updateAchievements();
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch(e.key.toLowerCase()) {
    case 'r':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('reloadBtn').click();
      }
      break;
    case 'f':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('fullscreenBtn').click();
      }
      break;
    case '+':
    case '=':
      e.preventDefault();
      document.getElementById('zoomInBtn').click();
      break;
    case '-':
      e.preventDefault();
      document.getElementById('zoomOutBtn').click();
      break;
    case 'h':
      e.preventDefault();
      document.getElementById('hideIframeBtn').click();
      break;
    case 's':
      e.preventDefault();
      document.getElementById('showIframeBtn').click();
      break;
    case 'c':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('toggleChatBtn').click();
      }
      break;
    case 'd':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('openDrawingBtn').click();
      }
      break;
    case 't':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('themeBtn').click();
      }
      break;
    case 'a':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('achievementsBtn').click();
      }
      break;
    case 'escape':
      document.getElementById('themeModal').style.display = 'none';
      document.getElementById('achievementsModal').style.display = 'none';
      document.getElementById('drawingModal').style.display = 'none';
      break;
  }
});
const shortcutsHint = document.createElement('div');
shortcutsHint.innerHTML = `
  <div style="position:fixed; bottom:10px; left:10px; background:rgba(0,0,0,0.8); color:#fff; padding:10px; border-radius:8px; font-size:12px; max-width:200px; display:none;" id="shortcutsHint">
    <strong>Keyboard Shortcuts:</strong><br>
    Ctrl+R: Reload<br>
    Ctrl+F: Fullscreen<br>
    +/-: Zoom<br>
    H/S: Hide/Show<br>
    Ctrl+C: Chat<br>
    Ctrl+D: Drawing<br>
    Ctrl+T: Themes<br>
    Ctrl+A: Achievements<br>
    Esc: Close modals
  </div>
`;
document.body.appendChild(shortcutsHint);
document.addEventListener('keydown', (e) => {
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const hint = document.getElementById('shortcutsHint');
    hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
  }
});
setInterval(() => {
  localStorage.setItem('userStats', JSON.stringify(userStats));
  localStorage.setItem('selectedTheme', currentTheme);
  localStorage.setItem('selectedSeasonal', currentSeasonal);
}, 30000);
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const closeStatsBtn = document.getElementById('closeStatsBtn');

function updateStatsDisplay() {
  document.getElementById('onlineTimeStat').textContent = Math.floor(userStats.onlineTime) + ' min';
  document.getElementById('chatMessagesStat').textContent = userStats.chatMessages;
  document.getElementById('gamingTimeStat').textContent = Math.floor(userStats.gameTime) + ' min';
  document.getElementById('drawingTimeStat').textContent = Math.floor(userStats.drawTime) + ' min';

  // Achievement progress bars
  const chatProgress = Math.min((userStats.chatMessages / 10) * 100, 100);
  document.getElementById('chatProgressBar').style.width = chatProgress + '%';
  document.getElementById('chatProgressText').textContent = userStats.chatMessages + '/10';

  const drawProgress = Math.min((userStats.drawTime / 30) * 100, 100);
  document.getElementById('drawProgressBar').style.width = drawProgress + '%';
  document.getElementById('drawProgressText').textContent = Math.floor(userStats.drawTime) + '/30 min';

  const gameProgress = Math.min((userStats.gameTime / 60) * 100, 100);
  document.getElementById('gameProgressBar').style.width = gameProgress + '%';
  document.getElementById('gameProgressText').textContent = Math.floor(userStats.gameTime) + '/60 min';

  // Daily stats
  document.getElementById('dailyMessagesStat').textContent = userStats.dailyMessages;
  document.getElementById('dailyOnlineStat').textContent = Math.floor(userStats.onlineTime) + ' min';
  document.getElementById('sitesVisitedStat').textContent = userStats.sitesVisited.length;
  document.getElementById('themesTriedStat').textContent = userStats.themesTried.length;
}

// Stats button
statsBtn.addEventListener('click', () => {
  updateStatsDisplay();
  statsModal.style.display = 'flex';
  statsModal.setAttribute('aria-hidden', 'false');
});

// Close stats modal
closeStatsBtn.addEventListener('click', () => {
  statsModal.style.display = 'none';
  statsModal.setAttribute('aria-hidden', 'true');
});

// ================= Drawing Modal =================
const drawingModal = document.getElementById('drawingModal');
const openDrawingBtn = document.getElementById('openDrawingBtn');
const closeDrawingBtn = document.getElementById('closeDrawingBtn');
openDrawingBtn.addEventListener('click', () => {
  drawingModal.style.display = 'flex';
  drawingModal.setAttribute('aria-hidden','false');
});
closeDrawingBtn.addEventListener('click', () => {
  drawingModal.style.display = 'none';
  drawingModal.setAttribute('aria-hidden','true');
});
// click outside to close
drawingModal.addEventListener('click', (e) => {
  if(e.target === drawingModal) {
    drawingModal.style.display = 'none';
    drawingModal.setAttribute('aria-hidden','true');
  }
});

// ================= Shared Drawing Canvas Script =================
(function(){
  const container = document.getElementById('sharedCanvasContainer');
  const toggleBtn = document.getElementById('toggleCanvasBtn');
  const canvasWrapper = document.getElementById('canvasArea');
  const canvasEl = document.getElementById('sharedCanvas');
  const ctx2 = canvasEl.getContext('2d');
  const colorPicker = document.getElementById('colorPicker');
  const sizeSlider = document.getElementById('sizeSlider');
  const sizeLabel = document.getElementById('sizeLabel');
  const clearBtn = document.getElementById('clearCanvasBtn');
  const brushToolBtn = document.getElementById('brushToolBtn');
  const eraserToolBtn = document.getElementById('eraserToolBtn');

  // Tool state
  let currentTool = 'brush'; // 'brush' or 'eraser' or 'rectangle' etc
  let drawing = false;
  let currentStroke = [];
  let brushColor = colorPicker.value;
  let brushSize = parseInt(sizeSlider.value,10);
  let brushOpacity = 1;
  let fillShapes = false;
  let shapeStart = null;
  let undoHistory = [];
  let zoomLevel = 1;
  let panX = 0, panY = 0;
  let pushedStrokes = [];
  const drawnIds = new Set(); // stroke IDs already rendered
  const strokesRef = db.ref('canvas/strokes');
  const metaRef = db.ref('canvas/meta');
  const strokesCache = {}; // local cache of strokes by id to allow redraw on resize
  let initialLoadComplete = false; // Flag to prevent duplicate rendering during initial load

  // Tool switching
  function resetToolStyles() {
    const tools = ['brushToolBtn', 'eraserToolBtn', 'rectangleToolBtn', 'circleToolBtn', 'lineToolBtn', 'textToolBtn', 'eyedropperBtn'];
    tools.forEach(id => {
      const btn = document.getElementById(id);
      btn.style.background = '#ffffff';
      btn.style.border = '1px solid #ccc';
      btn.style.color = '#333';
    });
  }

  function selectTool(tool) {
    currentTool = tool;
    resetToolStyles();
    if(tool === 'brush') {
      brushToolBtn.style.background = '#007bff';
      brushToolBtn.style.border = '1px solid #007bff';
      brushToolBtn.style.color = '#ffffff';
      canvasEl.style.cursor = 'crosshair';
    } else if(tool === 'eraser') {
      eraserToolBtn.style.background = '#ffc107';
      eraserToolBtn.style.border = '1px solid #ffc107';
      eraserToolBtn.style.color = '#000';
      canvasEl.style.cursor = 'cell';
    } else if(tool === 'rectangle') {
      document.getElementById('rectangleToolBtn').style.background = '#28a745';
      document.getElementById('rectangleToolBtn').style.border = '1px solid #28a745';
      document.getElementById('rectangleToolBtn').style.color = '#ffffff';
      canvasEl.style.cursor = 'crosshair';
    } else if(tool === 'circle') {
      document.getElementById('circleToolBtn').style.background = '#17a2b8';
      document.getElementById('circleToolBtn').style.border = '1px solid #17a2b8';
      document.getElementById('circleToolBtn').style.color = '#ffffff';
      canvasEl.style.cursor = 'crosshair';
    } else if(tool === 'line') {
      document.getElementById('lineToolBtn').style.background = '#6c757d';
      document.getElementById('lineToolBtn').style.border = '1px solid #6c757d';
      document.getElementById('lineToolBtn').style.color = '#ffffff';
      canvasEl.style.cursor = 'crosshair';
    } else if(tool === 'text') {
      document.getElementById('textToolBtn').style.background = '#dc3545';
      document.getElementById('textToolBtn').style.border = '1px solid #dc3545';
      document.getElementById('textToolBtn').style.color = '#ffffff';
      canvasEl.style.cursor = 'text';
    } else if(tool === 'eyedropper') {
      document.getElementById('eyedropperBtn').style.background = '#e83e8c';
      document.getElementById('eyedropperBtn').style.border = '1px solid #e83e8c';
      document.getElementById('eyedropperBtn').style.color = '#ffffff';
      canvasEl.style.cursor = 'copy';
    }
  }

  function undoLast() {
    if(pushedStrokes.length > 0) {
      const lastKey = pushedStrokes.pop();
      strokesRef.child(lastKey).remove();
    }
  }

  function saveDrawing() {
    const dataURL = canvasEl.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'drawing.png';
    a.click();
  }

  function loadDrawing() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if(file) {
        const img = new Image();
        img.onload = () => {
          ctx2.clearRect(0,0,canvasEl.width,canvasEl.height);
          ctx2.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
        };
        img.src = URL.createObjectURL(file);
      }
    };
    input.click();
  }

  function applyZoom() {
    ctx2.setTransform(zoomLevel, 0, 0, zoomLevel, panX, panY);
    redrawAllStrokes();
  }

  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  brushToolBtn.addEventListener('click', () => selectTool('brush'));
  eraserToolBtn.addEventListener('click', () => selectTool('eraser'));
  document.getElementById('rectangleToolBtn').addEventListener('click', () => selectTool('rectangle'));
  document.getElementById('circleToolBtn').addEventListener('click', () => selectTool('circle'));
  document.getElementById('lineToolBtn').addEventListener('click', () => selectTool('line'));
  document.getElementById('textToolBtn').addEventListener('click', () => selectTool('text'));
  document.getElementById('fillCheckbox').addEventListener('change', (e) => fillShapes = e.target.checked);
  document.getElementById('opacitySlider').addEventListener('input', (e) => { brushOpacity = parseFloat(e.target.value); document.getElementById('opacityLabel').textContent = brushOpacity; });
  document.getElementById('undoBtn').addEventListener('click', undoLast);
  document.getElementById('eyedropperBtn').addEventListener('click', () => selectTool('eyedropper'));
  document.getElementById('saveBtn').addEventListener('click', saveDrawing);
  document.getElementById('loadBtn').addEventListener('click', loadDrawing);
  document.getElementById('zoomInBtn').addEventListener('click', () => { zoomLevel *= 1.2; applyZoom(); });
  document.getElementById('zoomOutBtn').addEventListener('click', () => { zoomLevel /= 1.2; applyZoom(); });
  selectTool('brush');

  // Resize helper
  function resizeCanvasToDisplay() {
    const ratio = window.devicePixelRatio || 1;
    const styleW = Math.min(window.innerWidth - 60, 1000);
    const styleH = Math.min(window.innerHeight * 0.7, 700);
    canvasEl.width = styleW * ratio;
    canvasEl.height = styleH * ratio;
    canvasEl.style.width = styleW + 'px';
    canvasEl.style.height = styleH + 'px';
    ctx2.setTransform(ratio, 0, 0, ratio, 0, 0);
    // After resizing the canvas (which clears its bitmap), redraw cached strokes
    redrawAllStrokes();
  }
  window.addEventListener('resize', resizeCanvasToDisplay);
  resizeCanvasToDisplay();

  // Show/hide canvas area toggle
  toggleBtn.addEventListener('click', () => {
    if (canvasWrapper.style.display === 'none' || canvasWrapper.style.display === '') {
      canvasWrapper.style.display = 'block';
      toggleBtn.textContent = 'Close Canvas';
      resizeCanvasToDisplay();
    } else {
      canvasWrapper.style.display = 'none';
      toggleBtn.textContent = 'Open Canvas';
    }
  });

  // UI bindings
  colorPicker.addEventListener('input', (e) => brushColor = e.target.value);
  sizeSlider.addEventListener('input', (e) => { brushSize = parseInt(e.target.value,10); sizeLabel.textContent = brushSize; });

  // Convert screen coords to canvas coords
  function getCanvasPoint(e) {
    const rect = canvasEl.getBoundingClientRect();
    const clientX = (e.clientX !== undefined) ? e.clientX : (e.touches && e.touches[0].clientX);
    const clientY = (e.clientY !== undefined) ? e.clientY : (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function drawStrokeLocally(stroke, opts={}) {
    if(!stroke || !stroke.points || stroke.points.length===0) return;
    
    if(stroke.type === 'erase') {
      ctx2.save();
      ctx2.globalCompositeOperation = 'destination-out';
      ctx2.strokeStyle = 'rgba(0,0,0,1)';
      ctx2.lineJoin = 'round';
      ctx2.lineCap = 'round';
      ctx2.lineWidth = stroke.size;
      ctx2.beginPath();
      const pts = stroke.points;
      ctx2.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++){
        ctx2.lineTo(pts[i].x, pts[i].y);
      }
      ctx2.stroke();
      ctx2.restore();
    } else if(stroke.type === 'rectangle') {
      ctx2.globalAlpha = stroke.opacity || 1;
      ctx2.strokeStyle = stroke.color;
      ctx2.lineWidth = stroke.size || 1;
      const x = Math.min(stroke.points[0].x, stroke.points[1].x);
      const y = Math.min(stroke.points[0].y, stroke.points[1].y);
      const width = Math.abs(stroke.points[1].x - stroke.points[0].x);
      const height = Math.abs(stroke.points[1].y - stroke.points[0].y);
      if(stroke.fill) {
        ctx2.fillStyle = stroke.color;
        ctx2.fillRect(x, y, width, height);
      } else {
        ctx2.strokeRect(x, y, width, height);
      }
    } else if(stroke.type === 'circle') {
      ctx2.globalAlpha = stroke.opacity || 1;
      ctx2.strokeStyle = stroke.color;
      ctx2.lineWidth = stroke.size || 1;
      const centerX = stroke.points[0].x;
      const centerY = stroke.points[0].y;
      const radius = Math.sqrt((stroke.points[1].x - centerX)**2 + (stroke.points[1].y - centerY)**2);
      ctx2.beginPath();
      ctx2.arc(centerX, centerY, radius, 0, Math.PI * 2);
      if(stroke.fill) {
        ctx2.fillStyle = stroke.color;
        ctx2.fill();
      } else {
        ctx2.stroke();
      }
    } else if(stroke.type === 'line') {
      ctx2.globalAlpha = stroke.opacity || 1;
      ctx2.strokeStyle = stroke.color;
      ctx2.lineWidth = stroke.size || 1;
      ctx2.beginPath();
      ctx2.moveTo(stroke.points[0].x, stroke.points[0].y);
      ctx2.lineTo(stroke.points[1].x, stroke.points[1].y);
      ctx2.stroke();
    } else if(stroke.type === 'text') {
      ctx2.globalAlpha = stroke.opacity || 1;
      ctx2.fillStyle = stroke.color;
      ctx2.font = `${stroke.fontSize || 16}px Arial`;
      ctx2.fillText(stroke.text, stroke.x, stroke.y);
    } else {
      // default brush
      ctx2.globalAlpha = stroke.opacity || 1;
      ctx2.lineJoin = 'round';
      ctx2.lineCap = 'round';
      ctx2.strokeStyle = stroke.color;
      ctx2.lineWidth = stroke.size;
      ctx2.beginPath();
      const pts = stroke.points;
      ctx2.moveTo(pts[0].x, pts[0].y);
      for(let i=1;i<pts.length;i++){
        ctx2.lineTo(pts[i].x, pts[i].y);
      }
      ctx2.stroke();
    }
  }

  // Redraw all strokes from the in-memory cache (sorted by time)
  function redrawAllStrokes() {
    try {
      ctx2.clearRect(0,0,canvasEl.width,canvasEl.height);
      drawnIds.clear();
      // Sort strokes by timestamp so order is preserved
      const strokes = Object.keys(strokesCache).map(k => ({ id: k, s: strokesCache[k] }));
      strokes.sort((a,b) => (a.s.time || 0) - (b.s.time || 0));
      for(const item of strokes) {
        drawStrokeLocally(item.s);
        drawnIds.add(item.id);
      }
    } catch (err) {
      console.warn('redrawAllStrokes failed', err);
    }
  }

  // Pointer events
  canvasEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvasEl.setPointerCapture?.(e.pointerId);
    const p = getCanvasPoint(e);
    if(currentTool === 'brush' || currentTool === 'eraser') {
      drawing = true;
      currentStroke = [];
      currentStroke.push(p);
      if(currentTool === 'brush') {
        ctx2.globalAlpha = brushOpacity;
        ctx2.fillStyle = brushColor;
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, Math.max(1, brushSize/2), 0, Math.PI*2);
        ctx2.fill();
      } else if(currentTool === 'eraser') {
        ctx2.save();
        ctx2.globalCompositeOperation = 'destination-out';
        ctx2.fillStyle = 'rgba(0,0,0,1)';
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, Math.max(1, brushSize/2), 0, Math.PI*2);
        ctx2.fill();
        ctx2.restore();
      }
    } else if(currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line') {
      shapeStart = p;
    } else if(currentTool === 'text') {
      const text = prompt('Enter text:');
      if(text) {
        const strokeObj = {
          user: visitorId || ('anon_'+Date.now()),
          type: 'text',
          text: text,
          x: p.x,
          y: p.y,
          color: brushColor,
          fontSize: brushSize,
          opacity: brushOpacity,
          time: Date.now()
        };
        strokesRef.push(strokeObj).then(pushRef => pushedStrokes.push(pushRef.key));
      }
    } else if(currentTool === 'eyedropper') {
      const imageData = ctx2.getImageData(p.x, p.y, 1, 1);
      const data = imageData.data;
      const hex = rgbToHex(data[0], data[1], data[2]);
      colorPicker.value = hex;
      brushColor = hex;
    }
  });

  canvasEl.addEventListener('pointermove', (e) => {
    if(!drawing && !shapeStart) return;
    e.preventDefault();
    const p = getCanvasPoint(e);
    if(currentTool === 'brush' || currentTool === 'eraser') {
      const last = currentStroke[currentStroke.length-1];
      if(!last || last.x !== p.x || last.y !== p.y) {
        currentStroke.push(p);

        if(currentTool === 'brush') {
          ctx2.globalAlpha = brushOpacity;
          ctx2.lineJoin = 'round';
          ctx2.lineCap = 'round';
          ctx2.strokeStyle = brushColor;
          ctx2.lineWidth = brushSize;
          ctx2.beginPath();
          ctx2.moveTo(last.x, last.y);
          ctx2.lineTo(p.x, p.y);
          ctx2.stroke();
        } else if(currentTool === 'eraser') {
          ctx2.save();
          ctx2.globalCompositeOperation = 'destination-out';
          ctx2.strokeStyle = 'rgba(0,0,0,1)';
          ctx2.lineJoin = 'round';
          ctx2.lineCap = 'round';
          ctx2.lineWidth = brushSize;
          ctx2.beginPath();
          ctx2.moveTo(last.x, last.y);
          ctx2.lineTo(p.x, p.y);
          ctx2.stroke();
          ctx2.restore();
        }
      }
    }
    // For shapes, preview
    if(shapeStart && (currentTool === 'rectangle' || currentTool === 'circle' || currentTool === 'line')) {
      redrawAllStrokes(); // clear and redraw all
      // then draw preview
      ctx2.globalAlpha = brushOpacity;
      if(currentTool === 'rectangle') {
        const x = Math.min(shapeStart.x, p.x);
        const y = Math.min(shapeStart.y, p.y);
        const width = Math.abs(p.x - shapeStart.x);
        const height = Math.abs(p.y - shapeStart.y);
        ctx2.strokeStyle = brushColor;
        ctx2.lineWidth = 1;
        if(fillShapes) {
          ctx2.fillStyle = brushColor;
          ctx2.fillRect(x, y, width, height);
        } else {
          ctx2.strokeRect(x, y, width, height);
        }
      } else if(currentTool === 'circle') {
        const centerX = shapeStart.x;
        const centerY = shapeStart.y;
        const radius = Math.sqrt((p.x - centerX)**2 + (p.y - centerY)**2);
        ctx2.strokeStyle = brushColor;
        ctx2.lineWidth = 1;
        ctx2.beginPath();
        ctx2.arc(centerX, centerY, radius, 0, Math.PI * 2);
        if(fillShapes) {
          ctx2.fillStyle = brushColor;
          ctx2.fill();
        } else {
          ctx2.stroke();
        }
      } else if(currentTool === 'line') {
        ctx2.strokeStyle = brushColor;
        ctx2.lineWidth = brushSize;
        ctx2.beginPath();
        ctx2.moveTo(shapeStart.x, shapeStart.y);
        ctx2.lineTo(p.x, p.y);
        ctx2.stroke();
      }
    }
  });

  canvasEl.addEventListener('pointerup', async (e) => {
    if(!drawing && !shapeStart) return;
    drawing = false;
    if(currentTool === 'brush' || currentTool === 'eraser') {
      if(currentStroke.length > 0) {
        const strokeObj = {
          user: visitorId || ('anon_'+Date.now()),
          size: brushSize,
          points: currentStroke,
          time: Date.now()
        };

        if(currentTool === 'brush') {
          strokeObj.color = brushColor;
          strokeObj.type = 'brush';
          strokeObj.opacity = brushOpacity;
        } else if(currentTool === 'eraser') {
          strokeObj.type = 'erase';
        }

        try {
          const pushRef = await strokesRef.push(strokeObj);
          pushedStrokes.push(pushRef.key);
        } catch (err) {
          console.error('Failed to push stroke', err);
        }
      }
    } else if(shapeStart) {
      const p = getCanvasPoint(e);
      const strokeObj = {
        user: visitorId || ('anon_'+Date.now()),
        size: brushSize,
        points: [shapeStart, p],
        color: brushColor,
        opacity: brushOpacity,
        fill: fillShapes,
        time: Date.now()
      };
      if(currentTool === 'rectangle') {
        strokeObj.type = 'rectangle';
      } else if(currentTool === 'circle') {
        strokeObj.type = 'circle';
      } else if(currentTool === 'line') {
        strokeObj.type = 'line';
      }
      try {
        const pushRef = await strokesRef.push(strokeObj);
        pushedStrokes.push(pushRef.key);
      } catch (err) {
        console.error('Failed to push shape', err);
      }
      shapeStart = null;
      redrawAllStrokes(); // to remove preview
    }
    currentStroke = [];
  });

  canvasEl.addEventListener('pointercancel', () => { drawing=false; currentStroke=[]; });

  // Listen for strokes added by anyone (only new strokes after initial load)
  strokesRef.on('child_added', snapshot => {
    const strokeId = snapshot.key;
    const stroke = snapshot.val();
    if(!stroke) return;
    // Cache the stroke
    strokesCache[strokeId] = stroke;
    // Only draw if it's a new stroke (not from initial load) and initial load is complete
    if(initialLoadComplete && !drawnIds.has(strokeId)){
      drawStrokeLocally(stroke);
      drawnIds.add(strokeId);
    }
  });

  // When a stroke is removed (e.g., clear), update cache and redraw
  strokesRef.on('child_removed', snapshot => {
    const id = snapshot.key;
    if(id && strokesCache[id]) delete strokesCache[id];
    redrawAllStrokes();
  });

  // Listen for clear events
  metaRef.child('clear').on('value', snap => {
    const v = snap.val();
    if(v) {
      // Clear visible canvas and local caches so redraw won't restore cleared strokes
      ctx2.clearRect(0,0,canvasEl.width,canvasEl.height);
      drawnIds.clear();
      for(const k in strokesCache) delete strokesCache[k];
    }
  });

  // Clear button
  clearBtn.addEventListener('click', async () => {
    try {
      // Remove all strokes from DB so the clear persists across reloads
      await strokesRef.remove();
      // Notify other clients with a transient clear flag
      await metaRef.child('clear').set({ by: visitorId || 'anon', time: Date.now() });
      // Remove transient clear flag shortly after so new clients don't auto-clear forever
      setTimeout(() => { metaRef.child('clear').remove().catch(()=>{}); }, 1500);
    } catch (err) {
      console.warn('Failed to clear strokes', err);
    }
  });

  // Presence
  const userId = visitorId || ('anon_'+Date.now());
  const presenceRef = db.ref('canvas/presence/' + userId);
  presenceRef.set({online:true, color: colorPicker.value, lastSeen: Date.now()});
  presenceRef.onDisconnect().remove();

  // ================= Cursor Tracking =================
  const cursorOverlay = document.getElementById('cursorOverlay');
  const ctxCursor = cursorOverlay.getContext('2d');
  const cursorsRef = db.ref('canvas/cursors');
  let activeCursors = {}; // { userId: { x, y, color, username, timestamp } }
  const avatarImageCache = {}; // Cache for loaded avatar images
  
  // Sync cursor overlay to main canvas size
  function syncCursorOverlay() {
    // Match the overlay to the main canvas device pixel dimensions
    // canvasEl.width/height are in device pixels (after resize helper sets them)
    const ratio = window.devicePixelRatio || 1;
    cursorOverlay.width = canvasEl.width;    // device pixels
    cursorOverlay.height = canvasEl.height;  // device pixels
    // Keep CSS size the same as the visible canvas so boundingClientRect coords match
    cursorOverlay.style.width = canvasEl.style.width;
    cursorOverlay.style.height = canvasEl.style.height;
    // Reset transform and scale so we can draw using CSS pixel coordinates (same units as getCanvasPoint)
    ctxCursor.setTransform(1, 0, 0, 1, 0, 0);
    ctxCursor.scale(ratio, ratio);
    // Ensure overlay doesn't block pointer events on the main canvas
    cursorOverlay.style.pointerEvents = 'none';
  }
  window.addEventListener('resize', syncCursorOverlay);
  syncCursorOverlay();

  // Track mouse movement and broadcast cursor
  let lastCursorUpdate = 0;
  canvasEl.addEventListener('pointermove', (e) => {
    const now = Date.now();
    if(now - lastCursorUpdate > 100) { // Throttle to 100ms
      const p = getCanvasPoint(e);
      cursorsRef.child(userId).set({
        x: p.x,
        y: p.y,
        color: brushColor,
        username: username,
        avatar: userProfile.avatar || '👤',
        avatarImage: userProfile.avatarImage || null,
        timestamp: Date.now()
      }).catch(err => console.warn('Cursor update failed', err));
      lastCursorUpdate = now;
    }
  });

  // Listen for other users' cursors
  cursorsRef.on('value', snap => {
    const data = snap.val() || {};
    activeCursors = data;
  });

  // Draw cursors on overlay
  function drawCursorsFrame() {
    // Clear using device pixel dimensions — ctx transform is already scaled to device pixels
    ctxCursor.clearRect(0, 0, cursorOverlay.width, cursorOverlay.height);

    for(const uid in activeCursors) {
      if(uid === userId) continue; // Don't draw own cursor
      const cursor = activeCursors[uid];
      if(!cursor || (typeof cursor.x !== 'number') || (typeof cursor.y !== 'number')) continue;

      // Don't show stale cursors (older than 2 seconds)
      if(Date.now() - cursor.timestamp > 2000) continue;

      // cursor.x/y are stored in CSS pixels (getCanvasPoint uses boundingClientRect)
      // ctxCursor is scaled so drawing with CSS coordinates works correctly
      const x = cursor.x;
      const y = cursor.y;
      const color = cursor.color || '#00ffff';

      ctxCursor.save();
      
      // Draw profile picture (small avatar)
      const avatarSize = 20;
      if(cursor.avatarImage) {
          // Load and cache image
          if(!avatarImageCache[cursor.avatarImage]) {
              const img = new Image();
              img.src = cursor.avatarImage;
              avatarImageCache[cursor.avatarImage] = img;
          }
          const img = avatarImageCache[cursor.avatarImage];
          
          if(img.complete && img.naturalWidth > 0) {
              // Draw circular avatar
              ctxCursor.beginPath();
              ctxCursor.arc(x, y, avatarSize/2, 0, Math.PI * 2);
              ctxCursor.save();
              ctxCursor.clip();
              ctxCursor.drawImage(img, x - avatarSize/2, y - avatarSize/2, avatarSize, avatarSize);
              ctxCursor.restore();
          } else {
              // Image still loading, show emoji fallback
              ctxCursor.fillStyle = 'rgba(255,255,255,0.9)';
              ctxCursor.beginPath();
              ctxCursor.arc(x, y, avatarSize/2, 0, Math.PI * 2);
              ctxCursor.fill();
              ctxCursor.font = '14px Arial';
              ctxCursor.textAlign = 'center';
              ctxCursor.textBaseline = 'middle';
              ctxCursor.fillStyle = '#000';
              ctxCursor.fillText(cursor.avatar || '👤', x, y);
          }
          // Draw border around avatar
          ctxCursor.strokeStyle = color;
          ctxCursor.lineWidth = 2;
          ctxCursor.beginPath();
          ctxCursor.arc(x, y, avatarSize/2 + 1, 0, Math.PI * 2);
          ctxCursor.stroke();
      } else {
          // Draw emoji avatar
          ctxCursor.fillStyle = 'rgba(255,255,255,0.9)';
          ctxCursor.beginPath();
          ctxCursor.arc(x, y, avatarSize/2, 0, Math.PI * 2);
          ctxCursor.fill();
          ctxCursor.strokeStyle = color;
          ctxCursor.lineWidth = 2;
          ctxCursor.stroke();
          ctxCursor.font = '14px Arial';
          ctxCursor.textAlign = 'center';
          ctxCursor.textBaseline = 'middle';
          ctxCursor.fillStyle = '#000';
          ctxCursor.fillText(cursor.avatar || '👤', x, y);
      }

      // Draw cursor glow
      ctxCursor.strokeStyle = color;
      ctxCursor.lineWidth = 2;
      ctxCursor.globalAlpha = 0.5;
      ctxCursor.beginPath();
      ctxCursor.arc(x, y, avatarSize/2 + 3, 0, Math.PI * 2);
      ctxCursor.stroke();
      ctxCursor.globalAlpha = 1;

      // Draw username label
      ctxCursor.fillStyle = color;
      ctxCursor.font = 'bold 11px Arial';
      ctxCursor.textAlign = 'left';
      ctxCursor.textBaseline = 'top';
      ctxCursor.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctxCursor.shadowBlur = 3;
      ctxCursor.fillText(cursor.username, x + avatarSize/2 + 5, y + 2);
      ctxCursor.restore();
    }

    requestAnimationFrame(drawCursorsFrame);
  }
  drawCursorsFrame();

  // Clean up own cursor on canvas exit
  canvasEl.addEventListener('pointerleave', () => {
    cursorsRef.child(userId).remove().catch(err => console.warn('Cursor cleanup failed', err));
  });

  canvasEl.addEventListener('pointerenter', () => {
    presenceRef.update({lastSeen: Date.now()});
  });

  // Ensure presence and cursor entries are removed when the connection disconnects
  try {
    presenceRef.onDisconnect().remove();
    cursorsRef.child(userId).onDisconnect().remove();
  } catch (err) {
    console.warn('onDisconnect setup failed', err);
  }

  // Update presence color when user changes brush color
  colorPicker.addEventListener('input', (e) => {
    brushColor = e.target.value;
    try { presenceRef.update({ color: brushColor }); } catch (err) { /* ignore */ }
  });

  // Initial load of existing strokes - load ALL strokes to ensure persistence across sessions
  strokesRef.once('value').then(snap => {
    const data = snap.val();
    if(!data) {
      console.log('No existing strokes found');
      initialLoadComplete = true;
      return;
    }
    try {
      // Load all strokes into cache
      Object.keys(data).forEach(k => {
        strokesCache[k] = data[k];
      });
      // Sort and draw all strokes in order
      const strokes = Object.keys(strokesCache).map(k => ({ id: k, s: strokesCache[k] }));
      strokes.sort((a,b) => (a.s.time || 0) - (b.s.time || 0));
      strokes.forEach(item => {
        drawStrokeLocally(item.s);
        drawnIds.add(item.id);
      });
      console.log(`Loaded ${strokes.length} strokes from Firebase - canvas restored`);
      initialLoadComplete = true;
    } catch (err) {
      console.warn('initial strokes processing failed', err);
      initialLoadComplete = true;
    }
  }).catch(err => {
    console.warn('initial strokes load failed', err);
    initialLoadComplete = true;
  });
})();

// Loading screen removal is now handled at the top of the script

// ================= Page Initialization =================
// Initialize tutorial/popup when page loads
window.addEventListener('load', function() {
    console.log('Page fully loaded');
    
    // Skip popup only when returning from other pages (like all-games.html)
    // Always show popup on initial website load
    const isReturningFromOtherPage = document.referrer && 
        document.referrer.includes(window.location.hostname) && 
        (document.referrer.includes('pages/') || document.referrer.includes('games/'));
    const skipPopup = isReturningFromOtherPage;
    
    if (skipPopup) {
        // Don't show popup when returning from other pages
        return;
    }
    
    if(!localStorage.getItem('tutorialShown')) {
        startTutorial();
    } else {
        showPopup();
    }
});

// ================= Intro Screen Particles =================
// Only initialize if the loading screen element exists
const loadingParticlesContainer = document.querySelector('.loading-particles');
if (loadingParticlesContainer) {
const particleCanvas = document.createElement('canvas');
particleCanvas.width = window.innerWidth;
particleCanvas.height = window.innerHeight;
    loadingParticlesContainer.appendChild(particleCanvas);
const particleCtx = particleCanvas.getContext('2d');

let particles = [];
for(let i=0;i<100;i++){
    particles.push({
        x:Math.random()*particleCanvas.width,
        y:Math.random()*particleCanvas.height,
        r:Math.random()*3+1,
        vx:(Math.random()-0.5)*0.5,
        vy:(Math.random()-0.5)*0.5,
        color:['#ffffff','#FFD700','#000000'][Math.floor(Math.random()*3)]
    });
}

function animateParticles(){
    particleCtx.clearRect(0,0,particleCanvas.width,particleCanvas.height);
    for(let p of particles){
        particleCtx.beginPath();
        particleCtx.arc(p.x,p.y,p.r,0,Math.PI*2);
        particleCtx.fillStyle=p.color;
        particleCtx.fill();
        p.x += p.vx; p.y += p.vy;
        if(p.x<0||p.x>particleCanvas.width)p.vx*=-1;
        if(p.y<0||p.y>particleCanvas.height)p.vy*=-1;
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

    // Handle window resize
    window.addEventListener('resize', () => {
        // Check if canvas still exists (loading screen might have been removed)
        if (particleCanvas && particleCanvas.parentNode) {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
        }
});
}

// ================= NEW FEATURES =================

// ---------------- User Profiles ----------------
let userProfile = JSON.parse(localStorage.getItem('userProfile')) || {
    avatar: '👤',
    avatarImage: null, // base64 or data URL for uploaded image
    username: '',
    status: '',
    activity: [],
    profileCreated: false
};

const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileAvatarEmoji = document.getElementById('profileAvatarEmoji');
const profileUsername = document.getElementById('profileUsername');
const profileStatus = document.getElementById('profileStatus');
const activityList = document.getElementById('activityList');
const profilePictureInput = document.getElementById('profilePictureInput');
const uploadPfpBtn = document.getElementById('uploadPfpBtn');
const removePfpBtn = document.getElementById('removePfpBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profileModalTitle = document.getElementById('profileModalTitle');

let isFirstVisit = !userProfile.profileCreated;
let isProfileModalLocked = false; // Lock modal on first visit

// Check if profile is created on first visit
if (isFirstVisit) {
    // Lock the modal - user must create profile
    isProfileModalLocked = true;
    profileModalTitle.textContent = 'Create Your Profile';
    if (closeProfileBtn) {
        closeProfileBtn.style.display = 'none';
    }
    // Auto-open profile modal on first visit
    setTimeout(() => {
        if (profileModal) {
            profileModal.style.display = 'flex';
            updateProfileDisplay();
        }
    }, 500);
}

profileBtn?.addEventListener('click', () => {
    isProfileModalLocked = false;
    profileModalTitle.textContent = 'My Profile';
    if (closeProfileBtn) {
        closeProfileBtn.style.display = 'block';
    }
    profileModal.style.display = 'flex';
    updateProfileDisplay();
});

closeProfileBtn?.addEventListener('click', () => {
    if (!isProfileModalLocked) {
        profileModal.style.display = 'none';
    }
});

profileModal?.addEventListener('click', (e) => {
    if(e.target === profileModal && !isProfileModalLocked) {
        profileModal.style.display = 'none';
    }
});

// Handle profile picture upload
uploadPfpBtn?.addEventListener('click', () => {
    profilePictureInput?.click();
});

profilePictureInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Image size must be less than 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            userProfile.avatarImage = event.target.result;
            userProfile.avatar = '👤'; // Set default emoji
            updateProfileDisplay();
        };
        reader.readAsDataURL(file);
    }
});

// Handle remove profile picture
removePfpBtn?.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering avatar click
    userProfile.avatarImage = null;
    userProfile.avatar = '👤';
    updateProfileDisplay();
});

// Allow clicking avatar to upload
profileAvatar?.addEventListener('click', () => {
    profilePictureInput?.click();
});

saveProfileBtn?.addEventListener('click', () => {
    const usernameValue = profileUsername?.value.trim();
    if (!usernameValue) {
        alert('Please enter a username');
        return;
    }
    
    userProfile.username = usernameValue;
    userProfile.status = profileStatus?.value || '';
    userProfile.profileCreated = true;
    
    // Update global username everywhere
    username = usernameValue;
    const chatPopupUsername = document.getElementById('chatPopupUsername');
    if (chatPopupUsername) {
        chatPopupUsername.value = usernameValue;
    }
    
    // Save to Firebase
    if(db) {
        const profileData = {
            username: userProfile.username,
            status: userProfile.status,
            avatar: userProfile.avatar,
            avatarImage: userProfile.avatarImage,
            lastSeen: Date.now()
        };
        db.ref('profiles/' + visitorId).update(profileData);
    }
    
    saveProfile();
    addActivity('Profile created');
    
    // Unlock modal after profile is created
    isProfileModalLocked = false;
    profileModalTitle.textContent = 'My Profile';
    if (closeProfileBtn) {
        closeProfileBtn.style.display = 'block';
    }
    
    alert('Profile saved successfully!');
});

profileStatus?.addEventListener('change', () => {
    userProfile.status = profileStatus.value;
    if(db && userProfile.profileCreated) {
        db.ref('profiles/' + visitorId).update({
            status: userProfile.status,
            avatar: userProfile.avatar,
            avatarImage: userProfile.avatarImage,
            username: userProfile.username,
            lastSeen: Date.now()
        });
    }
    saveProfile();
});

profileUsername?.addEventListener('change', () => {
    if (userProfile.profileCreated && profileUsername.value.trim()) {
        userProfile.username = profileUsername.value.trim();
        username = userProfile.username;
        const chatPopupUsername = document.getElementById('chatPopupUsername');
        if (chatPopupUsername) {
            chatPopupUsername.value = userProfile.username;
        }
        if(db) {
            db.ref('profiles/' + visitorId).update({
                username: userProfile.username,
                lastSeen: Date.now()
            });
        }
        saveProfile();
    }
});

function updateProfileDisplay() {
    if (profileAvatar) {
        if (userProfile.avatarImage) {
            profileAvatar.style.backgroundImage = `url(${userProfile.avatarImage})`;
            profileAvatar.style.backgroundSize = 'cover';
            profileAvatar.style.backgroundPosition = 'center';
            if (profileAvatarEmoji) profileAvatarEmoji.style.display = 'none';
            if (removePfpBtn) removePfpBtn.style.display = 'block';
        } else {
            profileAvatar.style.backgroundImage = 'none';
            if (profileAvatarEmoji) {
                profileAvatarEmoji.style.display = 'block';
                profileAvatarEmoji.textContent = userProfile.avatar || '👤';
            }
            if (removePfpBtn) removePfpBtn.style.display = 'none';
        }
    }
    if (profileUsername) {
        profileUsername.value = userProfile.username || '';
    }
    if (profileStatus) {
        profileStatus.value = userProfile.status || '';
    }
    if (activityList) {
        activityList.innerHTML = userProfile.activity.slice(-10).reverse().map(a => 
            `<div style="padding:8px; background:rgba(255,255,255,0.05); border-radius:6px; margin-bottom:8px; font-size:13px;">
                <strong>${a.action}</strong> - ${new Date(a.time).toLocaleString()}
            </div>`
        ).join('') || '<p style="color:rgba(255,255,255,0.5);">No activity yet</p>';
    }
}

function saveProfile() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    updateProfileDisplay();
}

function addActivity(action) {
    userProfile.activity.push({ action, time: Date.now() });
    if(userProfile.activity.length > 50) userProfile.activity.shift();
    saveProfile();
    updateProfileDisplay();
}

// ---------------- Leaderboard ----------------
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const leaderboardContent = document.getElementById('leaderboardContent');
const leaderboardTabs = document.querySelectorAll('.leaderboardTab');
let currentLeaderboardTab = 'chatters';

leaderboardBtn?.addEventListener('click', () => {
    leaderboardModal.style.display = 'flex';
    loadLeaderboard('chatters');
});

closeLeaderboardBtn?.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
});

leaderboardModal?.addEventListener('click', (e) => {
    if(e.target === leaderboardModal) leaderboardModal.style.display = 'none';
});

leaderboardTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        currentLeaderboardTab = tab.dataset.tab;
        leaderboardTabs.forEach(t => {
            t.style.background = 'rgba(255,255,255,0.05)';
            t.style.color = 'rgba(255,255,255,0.7)';
        });
        tab.style.background = 'rgba(255,215,0,0.1)';
        tab.style.color = '#FFD700';
        loadLeaderboard(currentLeaderboardTab);
    });
});

function loadLeaderboard(type) {
    if(!db || !leaderboardContent) return;
    
    leaderboardContent.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">Loading...</p>';
    
    if(type === 'chatters') {
        // Load only recent messages (last 500) instead of all for better performance
        Promise.all([
            db.ref('chat').limitToLast(500).once('value'),
            db.ref('profiles').once('value')
        ]).then(([chatSnap, profilesSnap]) => {
            const messages = chatSnap.val() || {};
            const profiles = profilesSnap.val() || {};
            const userCounts = {};
            const userProfiles = {}; // Store profile data for each user
            
            // Count messages and get profiles from messages
            Object.values(messages).forEach(msg => {
                if(msg && msg.user) {
                    userCounts[msg.user] = (userCounts[msg.user] || 0) + 1;
                    if(msg.avatar || msg.avatarImage) {
                        userProfiles[msg.user] = {
                            avatar: msg.avatar || '👤',
                            avatarImage: msg.avatarImage || null
                        };
                    }
                }
            });
            
            // Get profiles from profiles collection
            Object.values(profiles).forEach(profile => {
                if(profile && profile.username && !userProfiles[profile.username]) {
                    userProfiles[profile.username] = {
                        avatar: profile.avatar || '👤',
                        avatarImage: profile.avatarImage || null
                    };
                }
            });
            
            const sorted = Object.entries(userCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);
            displayLeaderboard(sorted.map(([user, count], i) => ({
                rank: i + 1,
                name: user,
                value: count,
                label: 'messages',
                avatar: userProfiles[user]?.avatar || '👤',
                avatarImage: userProfiles[user]?.avatarImage || null
            })));
        }).catch(err => {
            console.error('Error loading leaderboard:', err);
            leaderboardContent.innerHTML = '<p style="text-align:center; color:rgba(255,0,0,0.7);">Error loading leaderboard.</p>';
        });
    } else if(type === 'active') {
        // Load both in parallel for faster loading
        Promise.all([
            db.ref('online').once('value'),
            db.ref('profiles').once('value')
        ]).then(([onlineSnap, profilesSnap]) => {
            const online = onlineSnap.val() || {};
            const profiles = profilesSnap.val() || {};
            const sorted = Object.entries(online).sort((a,b) => (b[1].timestamp || 0) - (a[1].timestamp || 0)).slice(0, 10);
            
            displayLeaderboard(sorted.map(([id, data], i) => {
                const profile = profiles[id] || Object.values(profiles).find(p => p.username === (data.username || 'User')) || {};
                return {
                    rank: i + 1,
                    name: data.username || profile.username || 'User',
                    value: Math.floor((Date.now() - (data.timestamp || Date.now())) / 60000),
                    label: 'min online',
                    avatar: profile.avatar || '👤',
                    avatarImage: profile.avatarImage || null
                };
            }));
        }).catch(err => {
            console.error('Error loading active leaderboard:', err);
            leaderboardContent.innerHTML = '<p style="text-align:center; color:rgba(255,0,0,0.7);">Error loading leaderboard.</p>';
        });
    } else if(type === 'achievements') {
        // Get achievement data from localStorage of all users (simplified)
        const stats = JSON.parse(localStorage.getItem('userStats')) || {};
        const achievements = [
            { name: 'Chat Master', value: Math.floor((stats.chatMessages || 0) / 10) },
            { name: 'Artist', value: Math.floor((stats.drawTime || 0) / 30) },
            { name: 'Gamer', value: Math.floor((stats.gameTime || 0) / 60) }
        ];
        displayLeaderboard(achievements.map((a, i) => ({
            rank: i + 1,
            name: a.name,
            value: a.value,
            label: 'completed',
            avatar: '🏆',
            avatarImage: null
        })));
    } else {
        leaderboardContent.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">Daily/Weekly stats coming soon!</p>';
    }
}

function displayLeaderboard(data) {
    if(!leaderboardContent) return;
    leaderboardContent.innerHTML = data.map(item => {
        const avatarStyle = item.avatarImage 
            ? `background-image: url(${item.avatarImage}); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
        const avatarContent = item.avatarImage ? '' : item.avatar || '👤';
        return `
        <div style="display:flex; align-items:center; padding:15px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:10px;">
            <div style="width:40px; height:40px; border-radius:50%; ${avatarStyle} display:flex; align-items:center; justify-content:center; font-weight:bold; margin-right:15px; font-size:20px; flex-shrink:0;">
                ${avatarContent}
            </div>
            <div style="width:35px; height:35px; border-radius:50%; background:rgba(255,215,0,0.2); display:flex; align-items:center; justify-content:center; font-weight:bold; margin-right:15px; flex-shrink:0;">
                ${item.rank}
            </div>
            <div style="flex:1;">
                <div style="font-weight:600; color:#FFD700;">${item.name}</div>
                <div style="font-size:12px; color:rgba(255,255,255,0.6);">${item.value} ${item.label}</div>
            </div>
        </div>
    `;
    }).join('');
}

// ================= Modern Friends System =================
const friendsBtn = document.getElementById('friendsBtn');
const friendsModal = document.getElementById('friendsModal');
const closeFriendsBtn = document.getElementById('closeFriendsBtn');

// Friends data storage
let friendsData = {
  friends: JSON.parse(localStorage.getItem('friends')) || [],
  requests: {
      sent: JSON.parse(localStorage.getItem('friendRequestsSent')) || [],
      received: JSON.parse(localStorage.getItem('friendRequestsReceived')) || []
  },
  blocked: JSON.parse(localStorage.getItem('blockedUsers')) || []
};

// Cache for performance
let profilesCache = {};
let onlineCache = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 10000; // 10 seconds

// Initialize friends system
function initFriendsSystem() {
  if (!db) return;
  
  // Load friends data from Firebase if available
  loadFriendsFromFirebase();
  
  // Set up real-time listeners
  setupFriendsRealtimeListeners();
  
  // Initialize notification system
  initNotificationSystem();
}

// Load friends from Firebase (with localStorage fallback)
function loadFriendsFromFirebase() {
  if (!db) {
      updateAllDisplays();
      return;
  }
  
    Promise.all([
      db.ref(`friends/${visitorId}`).once('value'),
      db.ref(`friendRequests/${visitorId}`).once('value'),
      db.ref(`blocked/${visitorId}`).once('value'),
        db.ref('profiles').once('value'),
        db.ref('online').once('value')
  ]).then(([friendsSnap, requestsSnap, blockedSnap, profilesSnap, onlineSnap]) => {
      // Load friends
      const firebaseFriends = friendsSnap.val();
      if (firebaseFriends) {
          friendsData.friends = Object.keys(firebaseFriends);
          localStorage.setItem('friends', JSON.stringify(friendsData.friends));
      }
      
      // Load requests
      const requests = requestsSnap.val() || {};
      friendsData.requests = {
          sent: Object.keys(requests.sent || {}),
          received: Object.keys(requests.received || {})
      };
      localStorage.setItem('friendRequestsSent', JSON.stringify(friendsData.requests.sent));
      localStorage.setItem('friendRequestsReceived', JSON.stringify(friendsData.requests.received));
      
      // Update notification badge
      updateNotificationBadge();
      
      // Load blocked
      const blocked = blockedSnap.val();
      if (blocked) {
          friendsData.blocked = Object.keys(blocked);
          localStorage.setItem('blockedUsers', JSON.stringify(friendsData.blocked));
      }
      
      // Cache profiles and online status
      profilesCache = profilesSnap.val() || {};
      onlineCache = onlineSnap.val() || {};
      cacheTimestamp = Date.now();
      
      updateAllDisplays();
  }).catch(err => {
      console.error('Error loading friends from Firebase:', err);
      updateAllDisplays();
  });
}

// Setup real-time listeners
function setupFriendsRealtimeListeners() {
  if (!db) return;
  
  // Friends listener
  db.ref(`friends/${visitorId}`).on('value', (snap) => {
      const friends = snap.val();
      if (friends) {
          friendsData.friends = Object.keys(friends);
          localStorage.setItem('friends', JSON.stringify(friendsData.friends));
          updateCountBadges();
          if (document.querySelector('.friends-tab-btn[data-tab="friends"]')?.classList.contains('active')) {
              renderFriendsTab();
          }
      }
  });
  
  // Requests listener
  db.ref(`friendRequests/${visitorId}`).on('value', (snap) => {
      const requests = snap.val() || {};
      friendsData.requests = {
          sent: Object.keys(requests.sent || {}),
          received: Object.keys(requests.received || {})
      };
      localStorage.setItem('friendRequestsSent', JSON.stringify(friendsData.requests.sent));
      localStorage.setItem('friendRequestsReceived', JSON.stringify(friendsData.requests.received));
      updateCountBadges();
      updateNotificationBadge();
      if (document.querySelector('.friends-tab-btn[data-tab="requests"]')?.classList.contains('active')) {
          renderRequestsTab();
      }
  });
  
  // Online status listener
  db.ref('online').on('value', (snap) => {
      onlineCache = snap.val() || {};
      if (document.querySelector('.friends-tab-btn[data-tab="friends"]')?.classList.contains('active')) {
          renderFriendsTab();
      }
  });
}

// Update count badges
function updateCountBadges() {
  const friendsBadge = document.getElementById('friendsCountBadge');
  const requestsBadge = document.getElementById('requestsCountBadge');
  const blockedBadge = document.getElementById('blockedCountBadge');
  
  if (friendsBadge) {
      friendsBadge.textContent = friendsData.friends.length;
      friendsBadge.style.display = friendsData.friends.length > 0 ? 'inline-block' : 'none';
  }
  
  if (requestsBadge) {
      const count = friendsData.requests.received.length;
      requestsBadge.textContent = count;
      requestsBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }
  
  if (blockedBadge) {
      const count = friendsData.blocked.length;
      blockedBadge.textContent = count;
      blockedBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}

// Update notification badge
function updateNotificationBadge() {
  const notificationBadge = document.getElementById('notificationBadge');
  if (!notificationBadge) return;
  
  const count = (friendsData && friendsData.requests && friendsData.requests.received) 
      ? friendsData.requests.received.length 
      : 0;
  notificationBadge.textContent = count > 99 ? '99+' : count;
  notificationBadge.style.display = count > 0 ? 'flex' : 'none';
  
  // Update notification list
  updateNotificationList();
}

// Update notification list
function updateNotificationList() {
  const notificationList = document.getElementById('notificationList');
  if (!notificationList) return;
  
  const receivedRequests = (friendsData && friendsData.requests && friendsData.requests.received) 
      ? friendsData.requests.received 
      : [];
  
  if (receivedRequests.length === 0) {
      notificationList.innerHTML = `
          <div class="notification-empty">
              <i class="fas fa-bell-slash"></i>
              <p>No notifications</p>
          </div>
      `;
      return;
  }
  
  // Load user profiles for notifications
  if (typeof loadUserProfiles === 'function') {
      loadUserProfiles(receivedRequests).then(users => {
          notificationList.innerHTML = users.map(({id, profile}) => {
              const avatarStyle = profile.avatarImage 
                  ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                  : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
              const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
              const username = profile.username || 'Unknown User';
              
              return `
                  <div class="notification-item" data-user-id="${id}">
                      <div class="notification-avatar" style="${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:24px;">
                          ${avatarContent}
                      </div>
                      <div class="notification-content">
                          <p class="notification-text"><strong>${username}</strong> sent you a friend request</p>
                          <div class="notification-actions">
                              <button class="notification-action-btn accept" onclick="acceptFriendRequest('${id}'); closeNotificationDropdown();">
                                  <i class="fas fa-check"></i> Accept
                              </button>
                              <button class="notification-action-btn decline" onclick="declineFriendRequest('${id}'); closeNotificationDropdown();">
                                  <i class="fas fa-times"></i> Decline
                              </button>
                          </div>
                      </div>
                  </div>
              `;
          }).join('');
      }).catch(() => {
          // Fallback if loadUserProfiles fails
          notificationList.innerHTML = `
              <div class="notification-empty">
                  <i class="fas fa-bell-slash"></i>
                  <p>No notifications</p>
              </div>
          `;
      });
  } else {
      // Fallback if loadUserProfiles is not available
      notificationList.innerHTML = `
          <div class="notification-empty">
              <i class="fas fa-bell-slash"></i>
              <p>No notifications</p>
          </div>
      `;
  }
}

// Toggle notification dropdown
function toggleNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  if (!dropdown) return;
  
  dropdown.classList.toggle('active');
  
  // Close when clicking outside
  if (dropdown.classList.contains('active')) {
      setTimeout(() => {
          document.addEventListener('click', function closeOnOutsideClick(e) {
              if (!dropdown.contains(e.target) && !e.target.closest('#notificationBellBtn')) {
                  dropdown.classList.remove('active');
                  document.removeEventListener('click', closeOnOutsideClick);
              }
          });
      }, 100);
  }
}

// Close notification dropdown
function closeNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  if (dropdown) {
      dropdown.classList.remove('active');
  }
}

// Initialize notification system
function initNotificationSystem() {
  const notificationBellBtn = document.getElementById('notificationBellBtn');
  const clearAllBtn = document.getElementById('clearAllNotificationsBtn');
  
  if (notificationBellBtn) {
      notificationBellBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleNotificationDropdown();
      });
  }
  
  if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
          // Decline all friend requests
          if (friendsData && friendsData.requests && friendsData.requests.received) {
              friendsData.requests.received.forEach(userId => {
                  if (typeof declineFriendRequest === 'function') {
                      declineFriendRequest(userId);
                  }
              });
          }
          closeNotificationDropdown();
      });
  }
  
  // Initial update
  updateNotificationBadge();
}

// Tab navigation
document.querySelectorAll('.friends-tab-btn').forEach(tab => {
  tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active state
      document.querySelectorAll('.friends-tab-btn').forEach(t => {
          t.classList.remove('active');
      });
      tab.classList.add('active');
      
      // Show/hide panels
      document.querySelectorAll('.friends-tab-panel').forEach(panel => {
          panel.classList.remove('active');
      });
      
      const targetPanel = document.getElementById(`${targetTab}TabContent`);
      if (targetPanel) {
          targetPanel.classList.add('active');
          
          // Load data for active tab
          switch(targetTab) {
              case 'friends':
                  renderFriendsTab();
                  break;
              case 'requests':
                  renderRequestsTab();
                  break;
              case 'search':
                  // Search loads on input
                  break;
              case 'blocked':
                  renderBlockedTab();
                  break;
          }
      }
  });
});

// Render friends tab
function renderFriendsTab() {
  const friendsList = document.getElementById('friendsList');
  if (!friendsList) return;
  
  if (friendsData.friends.length === 0) {
      friendsList.innerHTML = `
          <div class="friends-empty-state">
              <i class="fas fa-user-friends"></i>
              <h3>No Friends Yet</h3>
              <p>Start by searching for users or accepting friend requests!</p>
          </div>
      `;
      updateCountBadges();
      return;
  }
  
  // Get friend data
  const friendsWithData = friendsData.friends.map(id => {
      const profile = profilesCache[id] || {};
      const isOnline = !!onlineCache[id];
      return { id, profile, isOnline };
  });
  
  // Apply sorting
  const sortValue = document.getElementById('friendsSortSelect')?.value || 'online';
  friendsWithData.sort((a, b) => {
      if (sortValue === 'online') {
          if (a.isOnline !== b.isOnline) return b.isOnline - a.isOnline;
          return (a.profile.username || '').localeCompare(b.profile.username || '');
      } else if (sortValue === 'name') {
          return (a.profile.username || '').localeCompare(b.profile.username || '');
      }
      return 0;
  });
  
  // Apply filter
  const filterValue = document.getElementById('filterFriendsInput')?.value.toLowerCase() || '';
  const filtered = filterValue 
      ? friendsWithData.filter(f => (f.profile.username || '').toLowerCase().includes(filterValue))
      : friendsWithData;
  
  // Render friend cards
  friendsList.innerHTML = filtered.map(({id, profile, isOnline}) => {
                const avatarStyle = profile.avatarImage 
                    ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                    : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
                const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
      const status = profile.status || '';
      
      return `
          <div class="friend-card-modern ${isOnline ? 'online' : ''}">
              <div class="friend-card-header">
                  <div class="friend-avatar-modern" style="${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:36px;">
                      ${avatarContent}
                      <div class="friend-status-dot ${isOnline ? 'online' : ''}"></div>
                  </div>
                  <div class="friend-info-modern">
                      <div class="friend-name-modern">${profile.username || 'User'}</div>
                      <div class="friend-status-text">
                          ${isOnline ? '<span style="color:#28a745;">🟢 Online</span>' : '<span style="color:#6c757d;">⚫ Offline</span>'}
                      </div>
                      ${status ? `<div class="friend-status-message">"${status}"</div>` : ''}
                  </div>
              </div>
              <div class="friend-actions-modern">
                  <button class="friend-action-btn-modern primary" onclick="viewFriendProfile('${id}')" title="View Profile">
                      <i class="fas fa-user"></i> Profile
                  </button>
                  <button class="friend-action-btn-modern danger" onclick="removeFriend('${id}')" title="Remove Friend">
                      <i class="fas fa-user-minus"></i> Remove
                  </button>
                  <button class="friend-action-btn-modern secondary" onclick="blockUser('${id}')" title="Block User">
                      <i class="fas fa-ban"></i> Block
                  </button>
              </div>
          </div>
      `;
  }).join('');
  
  updateCountBadges();
}

// Render requests tab
function renderRequestsTab() {
  const sentList = document.getElementById('sentRequestsList');
  const receivedList = document.getElementById('receivedRequestsList');
  
  // Render sent requests
  if (sentList) {
      if (friendsData.requests.sent.length === 0) {
          sentList.innerHTML = '<div class="friends-empty-state" style="padding:40px 20px;"><i class="fas fa-paper-plane"></i><h3>No Sent Requests</h3><p>Friend requests you send will appear here</p></div>';
      } else {
          loadUserProfiles(friendsData.requests.sent).then(users => {
              sentList.innerHTML = users.map(({id, profile}) => {
                  const avatarStyle = profile.avatarImage 
                      ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                      : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
                  const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
                  
                  return `
                      <div class="request-card-modern">
                          <div class="request-card-header">
                              <div class="request-avatar" style="${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:28px;">
                                  ${avatarContent}
                              </div>
                              <div class="request-info">
                                  <h4>${profile.username || 'User'}</h4>
                                  <p>Pending request</p>
                              </div>
                          </div>
                          <div class="request-actions">
                              <button class="friend-action-btn-modern secondary" onclick="cancelFriendRequest('${id}')">
                                  <i class="fas fa-times"></i> Cancel
                              </button>
                          </div>
                      </div>
                  `;
              }).join('');
          });
      }
  }
  
  // Render received requests
  if (receivedList) {
      if (friendsData.requests.received.length === 0) {
          receivedList.innerHTML = '<div class="friends-empty-state" style="padding:40px 20px;"><i class="fas fa-inbox"></i><h3>No Pending Requests</h3><p>Friend requests you receive will appear here</p></div>';
      } else {
          loadUserProfiles(friendsData.requests.received).then(users => {
              receivedList.innerHTML = users.map(({id, profile}) => {
                  const avatarStyle = profile.avatarImage 
                      ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                      : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
                  const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
                  
                  return `
                      <div class="request-card-modern">
                          <div class="request-card-header">
                              <div class="request-avatar" style="${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:32px;">
                ${avatarContent}
            </div>
                              <div class="request-info">
                                  <h4>${profile.username || 'User'}</h4>
                                  <p>wants to be your friend</p>
            </div>
                          </div>
                          <div class="request-actions">
                              <button class="friend-action-btn-modern success" onclick="acceptFriendRequest('${id}')">
                                  <i class="fas fa-check"></i> Accept
                              </button>
                              <button class="friend-action-btn-modern danger" onclick="declineFriendRequest('${id}')">
                                  <i class="fas fa-times"></i> Decline
            </button>
        </div>
                      </div>
                  `;
              }).join('');
          });
      }
  }
  
  updateCountBadges();
}

// Render blocked tab
function renderBlockedTab() {
  const blockedList = document.getElementById('blockedList');
  if (!blockedList) return;
  
  if (friendsData.blocked.length === 0) {
      blockedList.innerHTML = `
          <div class="friends-empty-state">
              <i class="fas fa-ban"></i>
              <h3>No Blocked Users</h3>
              <p>Users you block will appear here</p>
          </div>
      `;
      updateCountBadges();
      return;
  }
  
  loadUserProfiles(friendsData.blocked).then(users => {
      blockedList.innerHTML = users.map(({id, profile}) => {
          const avatarStyle = profile.avatarImage 
              ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
              : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
          const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
          
          return `
              <div class="friend-card-modern" style="opacity:0.6;">
                  <div class="friend-card-header">
                      <div class="friend-avatar-modern" style="${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:36px;">
                          ${avatarContent}
                      </div>
                      <div class="friend-info-modern">
                          <div class="friend-name-modern">${profile.username || 'User'}</div>
                          <div class="friend-status-text" style="color:rgba(255,255,255,0.4);">Blocked</div>
                      </div>
                  </div>
                  <div class="friend-actions-modern">
                      <button class="friend-action-btn-modern success" onclick="unblockUser('${id}')">
                          <i class="fas fa-unlock"></i> Unblock
                      </button>
                  </div>
              </div>
          `;
      }).join('');
  });
  
  updateCountBadges();
}

// Helper function to load user profiles
function loadUserProfiles(userIds) {
  if (!db) {
      return Promise.resolve(userIds.map(id => ({
          id,
          profile: profilesCache[id] || {}
      })));
  }
  
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_DURATION && Object.keys(profilesCache).length > 0) {
      return Promise.resolve(userIds.map(id => ({
          id,
          profile: profilesCache[id] || {}
      })));
  }
  
  return db.ref('profiles').once('value').then(snap => {
      profilesCache = snap.val() || {};
      cacheTimestamp = now;
      return userIds.map(id => ({
          id,
          profile: profilesCache[id] || {}
      }));
  });
}

// Friend actions (global functions)
window.viewFriendProfile = function(friendId) {
  const profile = profilesCache[friendId] || {};
  notifications.show(`Viewing ${profile.username || 'friend'}'s profile`, 'info', 2000);
};

window.removeFriend = function(friendId) {
  const profile = profilesCache[friendId] || {};
  if (!confirm(`Remove ${profile.username || 'this user'} from your friends?`)) return;
  
  // Remove from friends
  friendsData.friends = friendsData.friends.filter(id => id !== friendId);
  localStorage.setItem('friends', JSON.stringify(friendsData.friends));
  
  // Remove from Firebase if db exists
  if (db) {
      db.ref(`friends/${visitorId}/${friendId}`).remove();
      db.ref(`friends/${friendId}/${visitorId}`).remove();
  }
  
  notifications.show('Friend removed', 'success', 2000);
  renderFriendsTab();
  updateCountBadges();
};

window.blockUser = function(userId) {
  const profile = profilesCache[userId] || {};
  if (!confirm(`Block ${profile.username || 'this user'}? They won't be able to see you or send you requests.`)) return;
  
  // Remove from friends if they are friends
  if (friendsData.friends.includes(userId)) {
      friendsData.friends = friendsData.friends.filter(id => id !== userId);
      localStorage.setItem('friends', JSON.stringify(friendsData.friends));
      if (db) {
          db.ref(`friends/${visitorId}/${userId}`).remove();
          db.ref(`friends/${userId}/${visitorId}`).remove();
      }
  }
  
  // Add to blocked
  if (!friendsData.blocked.includes(userId)) {
      friendsData.blocked.push(userId);
      localStorage.setItem('blockedUsers', JSON.stringify(friendsData.blocked));
  }
  
  if (db) {
      db.ref(`blocked/${visitorId}/${userId}`).set(true);
  }
  
  notifications.show('User blocked', 'success', 2000);
  renderFriendsTab();
  renderBlockedTab();
  updateCountBadges();
};

window.unblockUser = function(userId) {
  friendsData.blocked = friendsData.blocked.filter(id => id !== userId);
  localStorage.setItem('blockedUsers', JSON.stringify(friendsData.blocked));
  
  if (db) {
      db.ref(`blocked/${visitorId}/${userId}`).remove();
  }
  
  notifications.show('User removed from block list', 'success', 2000);
  renderBlockedTab();
  updateCountBadges();
};

window.sendFriendRequest = function(userId) {
  if (!db) {
      notifications.show('Database not available', 'error', 2000);
      return;
  }
  
  // Check if already friends
  if (friendsData.friends.includes(userId)) {
      notifications.show('Already friends!', 'info', 2000);
      return;
  }
  
  // Check if already sent
  if (friendsData.requests.sent.includes(userId)) {
      notifications.show('Request already sent', 'info', 2000);
      return;
  }
  
  // Check if blocked
  if (friendsData.blocked.includes(userId)) {
      notifications.show('Cannot send request to blocked user', 'error', 2000);
      return;
  }
  
  // Send request
  db.ref(`friendRequests/${userId}/received/${visitorId}`).set({
      from: visitorId,
      timestamp: Date.now()
  });
  db.ref(`friendRequests/${visitorId}/sent/${userId}`).set({
      to: userId,
      timestamp: Date.now()
  });
  
  friendsData.requests.sent.push(userId);
  localStorage.setItem('friendRequestsSent', JSON.stringify(friendsData.requests.sent));
  
  notifications.show('Friend request sent!', 'success', 2000);
  renderRequestsTab();
  updateCountBadges();
};

window.acceptFriendRequest = function(userId) {
  if (!db) {
      notifications.show('Database not available', 'error', 2000);
      return;
  }
  
  // Add to friends
  db.ref(`friends/${visitorId}/${userId}`).set(true);
  db.ref(`friends/${userId}/${visitorId}`).set(true);
  
  // Remove from requests
  db.ref(`friendRequests/${visitorId}/received/${userId}`).remove();
  db.ref(`friendRequests/${userId}/sent/${visitorId}`).remove();
  
  friendsData.friends.push(userId);
  friendsData.requests.received = friendsData.requests.received.filter(id => id !== userId);
  localStorage.setItem('friends', JSON.stringify(friendsData.friends));
  localStorage.setItem('friendRequestsReceived', JSON.stringify(friendsData.requests.received));
  
  const profile = profilesCache[userId] || {};
  notifications.show(`You are now friends with ${profile.username || 'this user'}!`, 'success', 3000);
  renderFriendsTab();
  renderRequestsTab();
  updateCountBadges();
};

window.declineFriendRequest = function(userId) {
  if (!db) {
      notifications.show('Database not available', 'error', 2000);
      return;
  }
  
  // Remove from requests
  db.ref(`friendRequests/${visitorId}/received/${userId}`).remove();
  db.ref(`friendRequests/${userId}/sent/${visitorId}`).remove();
  
  friendsData.requests.received = friendsData.requests.received.filter(id => id !== userId);
  localStorage.setItem('friendRequestsReceived', JSON.stringify(friendsData.requests.received));
  
  notifications.show('Friend request declined', 'info', 2000);
  renderRequestsTab();
  updateCountBadges();
};

window.cancelFriendRequest = function(userId) {
  if (!db) {
      notifications.show('Database not available', 'error', 2000);
      return;
  }
  
  // Remove from requests
  db.ref(`friendRequests/${visitorId}/sent/${userId}`).remove();
  db.ref(`friendRequests/${userId}/received/${visitorId}`).remove();
  
  friendsData.requests.sent = friendsData.requests.sent.filter(id => id !== userId);
  localStorage.setItem('friendRequestsSent', JSON.stringify(friendsData.requests.sent));
  
  notifications.show('Friend request cancelled', 'info', 2000);
  renderRequestsTab();
  updateCountBadges();
};

// Search functionality
const searchFriendsInput = document.getElementById('searchFriendsInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchResults = document.getElementById('searchResults');

searchFriendsInput?.addEventListener('input', Utils.debounce((e) => {
    const query = e.target.value.toLowerCase().trim();
  
  if (clearSearchBtn) {
      clearSearchBtn.style.display = query.length > 0 ? 'flex' : 'none';
  }
  
  if (!searchResults || !db) return;
  
  if (query.length === 0) {
      searchResults.innerHTML = '<div class="friends-empty-state"><i class="fas fa-search"></i><h3>Start Searching</h3><p>Type a username to find friends</p></div>';
        return;
    }
    
  // Load profiles if cache is stale
  const now = Date.now();
  if (now - cacheTimestamp > CACHE_DURATION || Object.keys(profilesCache).length === 0) {
        Promise.all([
            db.ref('profiles').once('value'),
            db.ref('online').once('value')
        ]).then(([profilesSnap, onlineSnap]) => {
          profilesCache = profilesSnap.val() || {};
          onlineCache = onlineSnap.val() || {};
          cacheTimestamp = now;
          performSearch(query);
      });
  } else {
      performSearch(query);
  }
}, 400));

clearSearchBtn?.addEventListener('click', () => {
  if (searchFriendsInput) {
      searchFriendsInput.value = '';
      clearSearchBtn.style.display = 'none';
      if (searchResults) {
          searchResults.innerHTML = '<div class="friends-empty-state"><i class="fas fa-search"></i><h3>Start Searching</h3><p>Type a username to find friends</p></div>';
      }
  }
});

function performSearch(query) {
  if (!searchResults) return;
  
  const matches = Object.entries(profilesCache)
            .filter(([id, profile]) => 
                id !== visitorId && 
          !friendsData.blocked.includes(id) &&
                profile.username && 
                profile.username.toLowerCase().includes(query)
            )
      .slice(0, 30)
            .map(([id, profile]) => {
          const isOnline = !!onlineCache[id];
          const isFriend = friendsData.friends.includes(id);
          const hasSentRequest = friendsData.requests.sent.includes(id);
          const hasReceivedRequest = friendsData.requests.received.includes(id);
          
                const avatarStyle = profile.avatarImage 
                    ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                    : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
                const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
          const status = profile.status || '';
          
          let actionButton = '';
          if (isFriend) {
              actionButton = '<button class="friend-action-btn-modern secondary" disabled><i class="fas fa-check"></i> Friends</button>';
          } else if (hasSentRequest) {
              actionButton = '<button class="friend-action-btn-modern secondary" onclick="cancelFriendRequest(\'' + id + '\')"><i class="fas fa-clock"></i> Pending</button>';
          } else if (hasReceivedRequest) {
              actionButton = '<div class="request-actions"><button class="friend-action-btn-modern success" onclick="acceptFriendRequest(\'' + id + '\')"><i class="fas fa-check"></i> Accept</button><button class="friend-action-btn-modern danger" onclick="declineFriendRequest(\'' + id + '\')"><i class="fas fa-times"></i> Decline</button></div>';
          } else {
              actionButton = '<button class="friend-action-btn-modern primary" onclick="sendFriendRequest(\'' + id + '\')"><i class="fas fa-user-plus"></i> Add Friend</button>';
          }
          
                return `
              <div class="friend-card-modern ${isOnline ? 'online' : ''}">
                  <div class="friend-card-header">
                      <div class="friend-avatar-modern" style="${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:36px;">
                            ${avatarContent}
                          <div class="friend-status-dot ${isOnline ? 'online' : ''}"></div>
                        </div>
                      <div class="friend-info-modern">
                          <div class="friend-name-modern">${profile.username || 'User'}</div>
                          <div class="friend-status-text">
                              ${isOnline ? '<span style="color:#28a745;">🟢 Online</span>' : '<span style="color:#6c757d;">⚫ Offline</span>'}
                            </div>
                          ${status ? `<div class="friend-status-message">"${status}"</div>` : ''}
                        </div>
                  </div>
                  <div class="friend-actions-modern">
                      ${actionButton}
                      <button class="friend-action-btn-modern secondary" onclick="viewFriendProfile('${id}')">
                          <i class="fas fa-user"></i> View
                      </button>
                  </div>
                    </div>
                `;
      });
  
  if (matches.length === 0) {
      searchResults.innerHTML = '<div class="friends-empty-state"><i class="fas fa-search"></i><h3>No Users Found</h3><p>Try a different search term</p></div>';
  } else {
      searchResults.innerHTML = matches.join('');
  }
}

// Filter and sort handlers
const filterFriendsInput = document.getElementById('filterFriendsInput');
filterFriendsInput?.addEventListener('input', Utils.debounce(() => {
  renderFriendsTab();
}, 300));

const friendsSortSelect = document.getElementById('friendsSortSelect');
friendsSortSelect?.addEventListener('change', () => {
  renderFriendsTab();
});

// Update all displays
function updateAllDisplays() {
  updateCountBadges();
  if (document.querySelector('.friends-tab-btn.active')) {
      const activeTab = document.querySelector('.friends-tab-btn.active').dataset.tab;
      switch(activeTab) {
          case 'friends':
              renderFriendsTab();
              break;
          case 'requests':
              renderRequestsTab();
              break;
          case 'blocked':
              renderBlockedTab();
              break;
      }
  }
}

// Modal open/close
closeFriendsBtn?.addEventListener('click', () => {
  friendsModal.style.display = 'none';
});

friendsModal?.addEventListener('click', (e) => {
  if (e.target === friendsModal) {
      friendsModal.style.display = 'none';
  }
});

friendsBtn?.addEventListener('click', () => {
  if (!friendsModal) {
      console.error('Friends modal not found');
      return;
  }
  
  friendsModal.style.display = 'block';
  friendsModal.style.visibility = 'visible';
  friendsModal.style.opacity = '1';
  
  // Load fresh data
  if (db) {
      Promise.all([
          db.ref('profiles').once('value'),
          db.ref('online').once('value')
      ]).then(([profilesSnap, onlineSnap]) => {
          profilesCache = profilesSnap.val() || {};
          onlineCache = onlineSnap.val() || {};
          cacheTimestamp = Date.now();
      }).catch(err => {
          console.error('Error loading friends data:', err);
      });
  }
  
  // Activate friends tab by default
  setTimeout(() => {
      const friendsTab = document.querySelector('.friends-tab-btn[data-tab="friends"]');
      if (friendsTab) {
          friendsTab.click();
      } else {
          // Fallback: manually activate
          renderFriendsTab();
      }
  }, 100);
});

// Initialize on page load
if (db) {
  initFriendsSystem();
} else {
  // Initialize even without db for UI
  updateAllDisplays();
  // Initialize notification system even without db
  initNotificationSystem();
}

// Ensure friends modal is accessible and background effects are running
document.addEventListener('DOMContentLoaded', () => {
  // Verify friends modal exists
  const modal = document.getElementById('friendsModal');
  if (!modal) {
      console.error('Friends modal not found in DOM');
  }
  
  // Ensure background effects are initialized
  setTimeout(() => {
      const starCanvas = document.getElementById('starCanvas');
      const interactiveBg = document.getElementById('interactiveBackground');
      const sparkleCanvas = document.getElementById('sparkleCanvas');
      
      if (!starCanvas) {
          console.warn('starCanvas not found - stars may not work');
      } else {
          // Re-initialize if not working
          try {
              initStars();
          } catch(e) {
              console.error('Error initializing stars:', e);
          }
      }
      
      if (!interactiveBg) {
          console.warn('interactiveBackground not found - interactive effects may not work');
      } else {
          // Re-initialize if not working
          try {
              initInteractiveBackground();
          } catch(e) {
              console.error('Error initializing interactive background:', e);
          }
      }
      
      if (!sparkleCanvas) {
          // Sparkle canvas is in popup, may not exist yet - that's ok
      }
  }, 500);
});


// ---------------- Polls/Voting ----------------
const pollsBtn = document.getElementById('pollsBtn');
const pollsModal = document.getElementById('pollsModal');
const pollsList = document.getElementById('pollsList');
const createPollBtn = document.getElementById('createPollBtn');
const createPollForm = document.getElementById('createPollForm');
const pollQuestion = document.getElementById('pollQuestion');
const pollOptions = document.getElementById('pollOptions');
const addPollOptionBtn = document.getElementById('addPollOptionBtn');
const submitPollBtn = document.getElementById('submitPollBtn');
const cancelPollBtn = document.getElementById('cancelPollBtn');

pollsBtn?.addEventListener('click', () => {
    pollsModal.style.display = 'flex';
    loadPolls();
});

closePollsBtn?.addEventListener('click', () => {
    pollsModal.style.display = 'none';
});

pollsModal?.addEventListener('click', (e) => {
    if(e.target === pollsModal) pollsModal.style.display = 'none';
});

createPollBtn?.addEventListener('click', () => {
    createPollForm.style.display = createPollForm.style.display === 'none' ? 'block' : 'none';
});

addPollOptionBtn?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'pollOption';
    input.placeholder = `Option ${pollOptions.children.length + 1}`;
    input.style.cssText = 'width:100%; padding:8px; border-radius:6px; border:1px solid rgba(255,215,0,0.2); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); margin-bottom:8px;';
    pollOptions.appendChild(input);
});

cancelPollBtn?.addEventListener('click', () => {
    createPollForm.style.display = 'none';
    pollQuestion.value = '';
    pollOptions.innerHTML = `
        <input type="text" class="pollOption" placeholder="Option 1" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(255,215,0,0.2); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); margin-bottom:8px;">
        <input type="text" class="pollOption" placeholder="Option 2" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(255,215,0,0.2); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.9); margin-bottom:8px;">
    `;
});

submitPollBtn?.addEventListener('click', () => {
    const question = pollQuestion.value.trim();
    const options = Array.from(pollOptions.querySelectorAll('.pollOption')).map(inp => inp.value.trim()).filter(v => v);
    if(question && options.length >= 2) {
        if(db) {
            const poll = {
                question,
                options: options.map(opt => ({ text: opt, votes: 0, voters: {} })),
                createdBy: username,
                createdAt: Date.now()
            };
            db.ref('polls').push(poll);
            cancelPollBtn.click();
            loadPolls();
        }
    }
});

function loadPolls() {
    if(!db || !pollsList) {
        if(pollsList) pollsList.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">Loading polls...</p>';
        return;
    }
    pollsList.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">Loading polls...</p>';
    db.ref('polls').limitToLast(10).once('value').then(snap => {
        const polls = snap.val() || {};
        if(Object.keys(polls).length === 0) {
            pollsList.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">No polls yet. Create one to get started!</p>';
            return;
        }
        pollsList.innerHTML = Object.entries(polls).reverse().map(([id, poll]) => {
            if(!poll || !poll.options) return '';
            const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
            return `
                <div style="padding:20px; background:rgba(255,255,255,0.05); border-radius:12px; margin-bottom:15px;">
                    <div style="font-weight:600; margin-bottom:15px; color:#FFD700;">${poll.question || 'Untitled Poll'}</div>
                    ${poll.options.map((opt, i) => {
                        if(!opt) return '';
                        const percent = totalVotes > 0 ? (opt.votes || 0) / totalVotes * 100 : 0;
                        const hasVoted = opt.voters && opt.voters[visitorId];
                        return `
                            <div style="margin-bottom:10px;">
                                <button class="voteBtn" data-poll="${id}" data-option="${i}" style="width:100%; padding:10px; text-align:left; background:rgba(255,255,255,0.05); border:1px solid rgba(255,215,0,0.2); border-radius:6px; color:rgba(255,255,255,0.9); cursor:pointer; margin-bottom:5px;">
                                    ${opt.text || 'Option ' + (i + 1)} ${hasVoted ? '✓' : ''}
                                </button>
                                <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                                    <div style="height:100%; background:#FFD700; width:${percent}%; transition:width 0.3s;"></div>
                                </div>
                                <div style="font-size:12px; color:rgba(255,255,255,0.6); margin-top:4px;">${opt.votes || 0} votes (${percent.toFixed(1)}%)</div>
                            </div>
                        `;
                    }).join('')}
                    <div style="font-size:11px; color:rgba(255,255,255,0.5); margin-top:10px;">By ${poll.createdBy || 'Unknown'} • ${new Date(poll.createdAt || Date.now()).toLocaleString()}</div>
                </div>
            `;
        }).join('');
        
        // Re-attach event listeners
        document.querySelectorAll('.voteBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pollId = btn.dataset.poll;
                const optionIndex = parseInt(btn.dataset.option);
                if(db && pollId && !isNaN(optionIndex)) {
                    db.ref(`polls/${pollId}/options/${optionIndex}`).transaction(opt => {
                        if(!opt) return opt;
                        if(!opt.voters) opt.voters = {};
                        if(opt.voters[visitorId]) return opt; // Already voted
                        opt.voters[visitorId] = true;
                        opt.votes = (opt.votes || 0) + 1;
                        return opt;
                    }).then(() => {
                        loadPolls(); // Reload to show updated votes
                    });
                }
            });
        });
    }).catch(err => {
        console.error('Error loading polls:', err);
        if(pollsList) pollsList.innerHTML = '<p style="text-align:center; color:rgba(255,0,0,0.7);">Error loading polls. Please try again.</p>';
    });
}

// ---------------- File Sharing ----------------
const filesBtn = document.getElementById('filesBtn');
const filesModal = document.getElementById('filesModal');
const closeFilesBtn = document.getElementById('closeFilesBtn');
const filesList = document.getElementById('filesList');
const fileUploadInput = document.getElementById('fileUploadInput');
const uploadFileBtn = document.getElementById('uploadFileBtn');

filesBtn?.addEventListener('click', () => {
    filesModal.style.display = 'flex';
    loadFiles();
});

closeFilesBtn?.addEventListener('click', () => {
    filesModal.style.display = 'none';
});

filesModal?.addEventListener('click', (e) => {
    if(e.target === filesModal) filesModal.style.display = 'none';
});

uploadFileBtn?.addEventListener('click', () => {
    fileUploadInput.click();
});

fileUploadInput?.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if(db) {
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: event.target.result,
                    uploadedBy: username,
                    uploadedAt: Date.now()
                };
                db.ref('files').push(fileData);
                loadFiles();
            }
        };
        if(file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    });
});

function loadFiles() {
    if(!db || !filesList) return;
    db.ref('files').limitToLast(20).once('value').then(snap => {
        const files = snap.val() || {};
        filesList.innerHTML = Object.entries(files).reverse().map(([id, file]) => {
            const isImage = file.type && file.type.startsWith('image/');
            return `
                <div style="padding:15px; background:rgba(255,255,255,0.05); border-radius:12px; text-align:center;">
                    ${isImage ? `<img src="${file.data}" style="max-width:100%; max-height:150px; border-radius:8px; margin-bottom:10px;" />` : '<div style="font-size:48px; margin-bottom:10px;">📄</div>'}
                    <div style="font-size:12px; color:rgba(255,255,255,0.9); margin-bottom:5px; word-break:break-word;">${file.name}</div>
                    <div style="font-size:11px; color:rgba(255,255,255,0.5); margin-bottom:10px;">${(file.size / 1024).toFixed(1)} KB</div>
                    <button class="downloadFileBtn" data-id="${id}" style="padding:6px 12px; background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.3); border-radius:6px; color:#FFD700; cursor:pointer; font-size:12px;">Download</button>
                </div>
            `;
        }).join('');
        document.querySelectorAll('.downloadFileBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fileId = btn.dataset.id;
                db.ref(`files/${fileId}`).once('value').then(snap => {
                    const file = snap.val();
                    const a = document.createElement('a');
                    a.href = file.data;
                    a.download = file.name;
                    a.click();
                });
            });
        });
    });
}

// ---------------- Emoji Reactions ----------------
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiOptions = document.querySelectorAll('.emoji-option');

// Ensure emoji picker is hidden by default
if (emojiPicker) {
    emojiPicker.style.display = 'none';
}

emojiBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
  if (emojiPicker) {
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
  }
});

document.addEventListener('click', (e) => {
  if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
    }
});

// Emoji selection handler (works for both regular and fullscreen)
function handleEmojiClick(emoji) {
  const regularInput = document.getElementById('chatInput');
  const fullscreenInput = document.getElementById('fullscreenChatInput');
  
  // Determine which input is active
  const activeInput = document.activeElement === fullscreenInput ? fullscreenInput : regularInput;
  
  if (activeInput) {
      activeInput.value += emoji.textContent;
      activeInput.focus();
  } else if (regularInput) {
      regularInput.value += emoji.textContent;
      regularInput.focus();
  }
  
  // Hide both emoji pickers
  const regularPicker = document.getElementById('emojiPicker');
  const fullscreenPicker = document.getElementById('fullscreenEmojiPicker');
  if (regularPicker) regularPicker.style.display = 'none';
  if (fullscreenPicker) fullscreenPicker.style.display = 'none';
}

emojiOptions.forEach(emoji => {
  emoji.addEventListener('click', () => handleEmojiClick(emoji));
    emoji.addEventListener('mouseenter', () => {
        emoji.style.background = 'rgba(255,215,0,0.2)';
    });
    emoji.addEventListener('mouseleave', () => {
        emoji.style.background = 'transparent';
    });
});

// Fullscreen emoji button
fullscreenEmojiBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const fullscreenPicker = document.getElementById('fullscreenEmojiPicker') || emojiPicker;
  if (fullscreenPicker) {
      fullscreenPicker.style.display = fullscreenPicker.style.display === 'none' ? 'block' : 'none';
  }
});


// File send button (works for both regular and fullscreen)
const sendFileBtn = document.getElementById('sendFileBtn');
const chatFileInput = document.createElement('input');
chatFileInput.type = 'file';
chatFileInput.style.display = 'none';
document.body.appendChild(chatFileInput);

sendFileBtn?.addEventListener('click', () => {
    chatFileInput.click();
});

fullscreenFileBtn?.addEventListener('click', () => {
  chatFileInput.click();
});

chatFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file && db) {
        const reader = new FileReader();
        reader.onload = (event) => {
            db.ref('chat').push({
                user: username,
                text: `📎 ${file.name}`,
                color: userColor,
                time: Date.now(),
                uid: visitorId,
                avatar: userProfile.avatar || '👤',
                avatarImage: userProfile.avatarImage || null,
                file: {
                    name: file.name,
                    type: file.type,
                    data: event.target.result
                }
            });
        };
        if(file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
        chatFileInput.value = ''; // Reset input
    }
});

// ---------------- Attach Link (works for both regular and fullscreen) ----------------
function attachLink() {
    const url = prompt('Enter a URL to share:');
    if(url && url.trim()) {
        let linkUrl = url.trim();
        // Add http:// if no protocol
        if(!linkUrl.match(/^https?:\/\//i)) {
            linkUrl = 'http://' + linkUrl;
        }
        // Validate URL
        try {
            new URL(linkUrl);
            if(db) {
                db.ref('chat').push({
                    user: username,
                    text: `🔗 Shared a link: ${linkUrl}`,
                    color: userColor,
                    time: Date.now(),
                    uid: visitorId,
                    avatar: userProfile.avatar || '👤',
                    avatarImage: userProfile.avatarImage || null,
                    link: linkUrl
                });
              notifications.show('Link shared!', 'success', 2000);
          } else {
              notifications.show('Database not available', 'error', 2000);
            }
        } catch(e) {
          notifications.show('Invalid URL. Please enter a valid web address.', 'error', 3000);
        }
    }
}

attachLinkBtn?.addEventListener('click', attachLink);
fullscreenLinkBtn?.addEventListener('click', attachLink);

// ---------------- Voice Chat ----------------
const voiceChatBtn = document.getElementById('voiceChatBtn');
const voiceIndicator = document.getElementById('voiceIndicator');
let mediaRecorder = null;
let audioChunks = [];

let isRecording = false;
let recordingStream = null;

async function startRecording(indicatorId = 'voiceIndicator') {
    if(isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordingStream = stream;
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        isRecording = true;
        
        mediaRecorder.ondataavailable = (e) => {
            if(e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            if(audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    if(db) {
                        db.ref('voiceMessages').push({
                            audio: reader.result,
                            user: username,
                            time: Date.now(),
                            uid: visitorId,
                            avatar: userProfile.avatar || '👤',
                            avatarImage: userProfile.avatarImage || null
                        });
                    }
                };
                reader.readAsDataURL(audioBlob);
            }
          stopRecording(); // Use the centralized stop function
        };
        
        mediaRecorder.onerror = (e) => {
            console.error('MediaRecorder error:', e);
          stopRecording(); // Use the centralized stop function
        };
        
        mediaRecorder.start();
      
      // Show indicator (check both regular and fullscreen)
      const indicator = document.getElementById(indicatorId);
      const fullscreenIndicator = document.getElementById('fullscreenVoiceIndicator');
      if (indicator) indicator.style.display = 'flex';
      if (fullscreenIndicator && fullScreenChatModal && fullScreenChatModal.style.display !== 'none') {
          fullscreenIndicator.style.display = 'flex';
      }
    } catch(err) {
        console.error('Microphone access error:', err);
      notifications.show('Microphone access denied. Please allow microphone access to use voice chat.', 'error', 3000);
      stopRecording(); // Ensure state is reset
    }
}

function stopRecording() {
    if(mediaRecorder && mediaRecorder.state !== 'inactive' && isRecording) {
        mediaRecorder.stop();
  }
  // Always ensure recording state is reset and indicator is hidden
        isRecording = false;
  if(recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      recordingStream = null;
  }
  // Hide indicator in both regular and fullscreen modes
  const regularIndicator = document.getElementById('voiceIndicator');
  const fullscreenIndicator = document.getElementById('fullscreenVoiceIndicator');
  if(regularIndicator) regularIndicator.style.display = 'none';
  if(fullscreenIndicator) fullscreenIndicator.style.display = 'none';
  // Reset media recorder
  if(mediaRecorder) {
      mediaRecorder = null;
  }
  audioChunks = [];
}

// Voice recording handlers (works for both regular and fullscreen)
function setupVoiceButton(button, indicatorId) {
  if (!button) return;
  
  button.addEventListener('mousedown', (e) => {
    e.preventDefault();
      startRecording(indicatorId);
});

  button.addEventListener('mouseup', (e) => {
    e.preventDefault();
    stopRecording();
});

  button.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    stopRecording();
});

  button.addEventListener('touchstart', (e) => {
    e.preventDefault();
      startRecording(indicatorId);
});

  button.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
});

  button.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    stopRecording();
});
}

// Setup both voice buttons
setupVoiceButton(voiceChatBtn, 'voiceIndicator');
setupVoiceButton(fullscreenVoiceBtn, 'fullscreenVoiceIndicator');

// Listen for voice messages
if(db) {
    db.ref('voiceMessages').limitToLast(10).on('child_added', snapshot => {
        const voiceMsg = snapshot.val();
        if(!voiceMsg || !voiceMsg.audio) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.setAttribute('data-voice-msg-id', snapshot.key);
        msgDiv.style.cssText = 'display:flex; gap:10px; align-items:flex-start; padding:10px; background:rgba(255,215,0,0.1); border-radius:8px; margin-bottom:10px; position:relative;';
        
        // Profile picture
        const avatarDiv = document.createElement('div');
        avatarDiv.style.width='32px';
        avatarDiv.style.height='32px';
        avatarDiv.style.borderRadius='50%';
        avatarDiv.style.flexShrink='0';
        avatarDiv.style.overflow='hidden';
        avatarDiv.style.display='flex';
        avatarDiv.style.alignItems='center';
        avatarDiv.style.justifyContent='center';
        avatarDiv.style.fontSize='20px';
        avatarDiv.style.background='linear-gradient(135deg, #FFD700, #FFA500)';
        if(voiceMsg.avatarImage) {
            avatarDiv.style.backgroundImage = `url(${voiceMsg.avatarImage})`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            avatarDiv.textContent = '';
        } else {
            avatarDiv.textContent = voiceMsg.avatar || '👤';
        }
        msgDiv.appendChild(avatarDiv);
        
        const contentDiv = document.createElement('div');
        contentDiv.style.flex='1';
        contentDiv.innerHTML = `
            <div style="font-weight:600; color:#FFD700; margin-bottom:5px;">${voiceMsg.user || 'User'} <i class="fas fa-microphone"></i></div>
            <audio controls style="width:100%;"></audio>
        `;
        const audioEl = contentDiv.querySelector('audio');
        audioEl.src = voiceMsg.audio;
        msgDiv.appendChild(contentDiv);
        
        // Delete button if owner
        if(voiceMsg.uid === visitorId) {
            const delBtn = document.createElement('button');
            delBtn.innerHTML='✖';
            delBtn.style.border='none';
            delBtn.style.background='transparent';
            delBtn.style.color='rgba(255,255,255,0.5)';
            delBtn.style.cursor='pointer';
            delBtn.style.position='absolute';
            delBtn.style.top='5px';
            delBtn.style.right='5px';
            delBtn.style.fontSize='16px';
            delBtn.style.padding='4px 8px';
            delBtn.title='Delete voice message';
            delBtn.onclick = () => {
                if(confirm('Delete this voice message?')) {
                    snapshot.ref.remove();
                    msgDiv.remove();
                }
            };
            msgDiv.appendChild(delBtn);
        }
        
        chatMessages.appendChild(msgDiv);
        
        // Auto-scroll if near bottom
        if(chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50){
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
    
    // Handle voice message removal
    db.ref('voiceMessages').on('child_removed', snapshot => {
        const msgDiv = document.querySelector(`[data-voice-msg-id="${snapshot.key}"]`);
        if(msgDiv) {
            msgDiv.remove();
        }
    });
}

// Initialize profile on load
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if(db && userProfile.profileCreated) {
            const profileData = {
                avatar: userProfile.avatar,
                avatarImage: userProfile.avatarImage,
                status: userProfile.status,
                username: userProfile.username || username,
                lastSeen: Date.now()
            };
            db.ref('profiles/' + visitorId).update(profileData);
        }
    });
} else {
    if(db && userProfile.profileCreated) {
        const profileData = {
            avatar: userProfile.avatar,
            avatarImage: userProfile.avatarImage,
            status: userProfile.status,
            username: userProfile.username || username,
            lastSeen: Date.now()
        };
        db.ref('profiles/' + visitorId).update(profileData);
    }
}

// ================= PROFESSIONAL ENHANCEMENTS =================

// Professional Notification System
class NotificationSystem {
  constructor() {
      this.container = null;
      this.init();
  }

  init() {
      this.container = document.createElement('div');
      this.container.id = 'notificationContainer';
      this.container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:100000; display:flex; flex-direction:column; gap:12px; pointer-events:none;';
      document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 5000) {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.style.cssText = `
          padding: 16px 24px;
          background: rgba(15, 15, 25, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 12px;
          color: white;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          max-width: 400px;
          pointer-events: all;
          animation: slideInDown 0.3s ease-out;
          display: flex;
          align-items: center;
          gap: 12px;
      `;

      const icons = {
          success: '✓',
          error: '✕',
          info: 'ℹ',
          warning: '⚠'
      };

      const colors = {
          success: 'rgba(40, 167, 69, 0.3)',
          error: 'rgba(220, 53, 69, 0.3)',
          info: 'rgba(0, 123, 255, 0.3)',
          warning: 'rgba(255, 193, 7, 0.3)'
      };

      notification.style.borderColor = colors[type] || colors.info;
      notification.innerHTML = `
          <span style="font-size: 20px; font-weight: bold;">${icons[type] || icons.info}</span>
          <span style="flex: 1;">${message}</span>
          <button class="notification-close" style="background:none; border:none; color:rgba(255,255,255,0.7); cursor:pointer; font-size:18px; padding:0; width:24px; height:24px; display:flex; align-items:center; justify-content:center;">&times;</button>
      `;

      this.container.appendChild(notification);

      const closeBtn = notification.querySelector('.notification-close');
      const close = () => {
          notification.style.animation = 'fadeOutScale 0.3s ease-in';
          setTimeout(() => notification.remove(), 300);
      };

      closeBtn.addEventListener('click', close);
      setTimeout(close, duration);

      return notification;
  }
}

const notifications = new NotificationSystem();

// Professional Animation Utilities
const Animations = {
  fadeIn: (element, duration = 300) => {
      element.style.opacity = '0';
      element.style.transition = `opacity ${duration}ms ease`;
      requestAnimationFrame(() => {
          element.style.opacity = '1';
      });
  },

  fadeOut: (element, duration = 300) => {
      element.style.transition = `opacity ${duration}ms ease`;
      element.style.opacity = '0';
      return new Promise(resolve => setTimeout(resolve, duration));
  },

  slideIn: (element, direction = 'up', duration = 300) => {
      const transforms = {
          up: 'translateY(30px)',
          down: 'translateY(-30px)',
          left: 'translateX(30px)',
          right: 'translateX(-30px)'
      };
      element.style.transform = transforms[direction] || transforms.up;
      element.style.opacity = '0';
      element.style.transition = `all ${duration}ms ease`;
      requestAnimationFrame(() => {
          element.style.transform = 'translate(0, 0)';
          element.style.opacity = '1';
      });
  },

  scale: (element, from = 0.9, to = 1, duration = 300) => {
      element.style.transform = `scale(${from})`;
      element.style.opacity = '0';
      element.style.transition = `all ${duration}ms ease`;
      requestAnimationFrame(() => {
          element.style.transform = `scale(${to})`;
          element.style.opacity = '1';
      });
  }
};

// Professional Loading State Manager
class LoadingManager {
  constructor() {
      this.loaders = new Map();
  }

  show(element, text = 'Loading...') {
      const loaderId = `loader_${Date.now()}_${Math.random()}`;
      const loader = document.createElement('div');
      loader.className = 'loading-overlay';
      loader.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          border-radius: inherit;
      `;
      loader.innerHTML = `
          <div style="text-align: center;">
              <div class="spinner" style="margin: 0 auto 16px;"></div>
              <div style="color: white; font-size: 14px;">${text}</div>
          </div>
      `;
      
      const parent = element.parentElement || document.body;
      parent.style.position = 'relative';
      parent.appendChild(loader);
      this.loaders.set(loaderId, loader);
      return loaderId;
  }

  hide(loaderId) {
      const loader = this.loaders.get(loaderId);
      if (loader) {
          Animations.fadeOut(loader).then(() => loader.remove());
          this.loaders.delete(loaderId);
      }
  }
}

const loadingManager = new LoadingManager();

// Professional Form Validation
class FormValidator {
  static validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static validateURL(url) {
      try {
          new URL(url);
          return true;
      } catch {
          return false;
      }
  }

  static validateRequired(value) {
      return value && value.trim().length > 0;
  }

  static validateLength(value, min, max) {
      const len = value ? value.length : 0;
      return len >= min && len <= max;
  }

  static showError(input, message) {
      input.style.borderColor = 'rgba(220, 53, 69, 0.5)';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'form-error';
      errorDiv.style.cssText = 'color: #dc3545; font-size: 12px; margin-top: 4px;';
      errorDiv.textContent = message;
      input.parentElement.appendChild(errorDiv);
      setTimeout(() => {
          input.style.borderColor = '';
          errorDiv.remove();
      }, 5000);
  }
}

// Utils is already defined earlier in the file - adding additional methods here
Utils.formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

Utils.formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

Utils.copyToClipboard = async (text) => {
  try {
      await navigator.clipboard.writeText(text);
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show('Copied to clipboard!', 'success', 2000);
      }
      return true;
  } catch (err) {
      console.error('Failed to copy:', err);
      if (typeof notifications !== 'undefined' && notifications.show) {
          notifications.show('Failed to copy', 'error');
      }
      return false;
  }
};

// Professional Error Handler (only show notifications for critical errors)
window.addEventListener('error', (event) => {
  // Prevent default error handling for filtered errors
  event.preventDefault();
  
  // Ignore errors from extensions, scripts from other origins, AdSense, or expected errors
  if (event.filename && (
      event.filename.includes('chrome-extension://') ||
      event.filename.includes('moz-extension://') ||
      event.filename.includes('safari-extension://') ||
      event.filename.includes('googlesyndication.com') ||
      event.filename.includes('doubleclick.net') ||
      event.filename.includes('googleads.g.doubleclick.net') ||
      event.filename.includes('<anonymous>') // Firebase/AdSense anonymous scripts
  )) {
      return; // Ignore these common non-critical errors
  }
  
  if (event.message && (
      event.message.includes('Script error') ||
      event.message.includes('Non-Error promise rejection') ||
      event.message.includes('ResizeObserver loop') ||
      event.message.includes('Failed to fetch') ||
      event.message.includes('TypeError: Failed to fetch') ||
      event.message.includes('ERR_BLOCKED_BY_CLIENT') ||
      event.message.includes('NetworkError')
  )) {
      return; // Ignore these common non-critical errors
  }
  
  // Ignore AdSense-related errors by URL
  if (event.target && event.target.src && (
      event.target.src.includes('googlesyndication.com') ||
      event.target.src.includes('doubleclick.net') ||
      event.target.src.includes('googleads.g.doubleclick.net')
  )) {
      return; // Ignore AdSense resource loading errors
  }
  
  // Only show notification for actual JavaScript errors
  if (event.error && event.error instanceof Error) {
      console.error('Global error:', event.error);
      // Don't show notification for every error - only log it
      // Uncomment the line below if you want to see error notifications
      // notifications.show('An error occurred. Please check the console.', 'error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Prevent default error handling for filtered errors
  event.preventDefault();
  
  const reason = event.reason;
  const reasonStr = reason?.toString() || '';
  const reasonMsg = reason?.message || '';
  
  // Ignore AdSense-related promise rejections
  if (reasonStr.includes('googlesyndication.com') ||
      reasonStr.includes('doubleclick.net') ||
      reasonStr.includes('googleads.g.doubleclick.net') ||
      reasonStr.includes('ERR_BLOCKED_BY_CLIENT') ||
      reasonStr.includes('Failed to fetch') ||
      reasonStr.includes('TypeError: Failed to fetch') ||
      reasonMsg.includes('googlesyndication.com') ||
      reasonMsg.includes('doubleclick.net') ||
      reasonMsg.includes('ERR_BLOCKED_BY_CLIENT') ||
      reasonMsg.includes('Failed to fetch') ||
      reasonMsg.includes('TypeError: Failed to fetch')) {
      return; // Ignore AdSense-related promise rejections
  }
  
  // Ignore common promise rejections that are expected
  if (reasonStr.includes('aborted') ||
      reasonStr.includes('cancelled') ||
      reasonStr.includes('user') ||
      reasonMsg.includes('aborted') ||
      reasonMsg.includes('cancelled')) {
      return; // Ignore expected rejections
  }
  
  // Only log actual errors (not filtered ones)
  if (reason && !reasonStr.includes('Failed to fetch')) {
      console.error('Unhandled promise rejection:', event.reason);
  }
  // Don't show notification for every rejection - only log it
});

// Suppress AdSense-related console errors (they're expected and harmless)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = function(...args) {
  const message = args.join(' ');
  // Filter out AdSense-related errors and common non-critical errors
  if (message.includes('googlesyndication.com') ||
      message.includes('doubleclick.net') ||
      message.includes('googleads.g.doubleclick.net') ||
      message.includes('googleads') ||
      message.includes('ERR_BLOCKED_BY_CLIENT') ||
      message.includes('Failed to load resource') ||
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('TypeError: Failed to fetch') ||
      (message.includes('403') && (message.includes('ads') || message.includes('doubleclick') || message.includes('googleads'))) ||
      (message.includes('ads') && message.includes('fetch'))) {
      return; // Suppress these errors
  }
  originalConsoleError.apply(console, args);
};

// Suppress CSP violation warnings (they're just warnings and harmless)
console.warn = function(...args) {
  const message = args.join(' ');
  // Filter out CSP violations and other non-critical warnings
  if (message.includes('Content Security Policy') ||
      message.includes('CSP') ||
      message.includes('frame-ancestors') ||
      message.includes('violates') ||
      message.includes('report-only') ||
      message.includes('Failed to fetch') ||
      message.includes('Failed to load resource') ||
      message.includes('googlesyndication.com') ||
      message.includes('doubleclick.net') ||
      message.includes('googleads') ||
      (message.includes('403') && (message.includes('ads') || message.includes('doubleclick') || message.includes('googleads')))) {
      return; // Suppress these warnings
  }
  originalConsoleWarn.apply(console, args);
};

// Note: AdSense errors in the Network tab are normal and expected
// They occur when ad blockers block ad requests or when the site isn't fully approved yet

// Prevent text/element selection via double-click and drag
document.addEventListener('selectstart', (e) => {
  // Allow selection in input fields and textareas
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
  }
  e.preventDefault();
  return false;
});

document.addEventListener('dragstart', (e) => {
  // Allow dragging of images and links if needed
  if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
      return;
  }
  e.preventDefault();
  return false;
});

// Prevent double-click selection
document.addEventListener('mousedown', (e) => {
  if (e.detail > 1) { // Double-click
      e.preventDefault();
      return false;
  }
});

// Note: Context menu is already handled by the custom context menu code above
// The custom context menu will still work, but selection is disabled

// Professional Performance Monitor
class PerformanceMonitor {
  constructor() {
      this.metrics = {
          pageLoad: 0,
          renderTime: 0,
          interactions: []
      };
      this.init();
  }

  init() {
      if (window.performance && window.performance.timing) {
          window.addEventListener('load', () => {
              const timing = window.performance.timing;
              this.metrics.pageLoad = timing.loadEventEnd - timing.navigationStart;
              this.metrics.renderTime = timing.domComplete - timing.domLoading;
              console.log('Performance metrics:', this.metrics);
          });
      }
  }

  measure(name, fn) {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      this.metrics.interactions.push({ name, duration: end - start });
      return result;
  }
}

const perfMonitor = new PerformanceMonitor();

// Professional Keyboard Navigation
class KeyboardNavigation {
  constructor() {
      this.init();
  }

  init() {
      document.addEventListener('keydown', (e) => {
          // Escape to close modals
          if (e.key === 'Escape') {
              const modals = document.querySelectorAll('[id$="Modal"]');
              modals.forEach(modal => {
                  if (modal.style.display !== 'none') {
                      modal.style.display = 'none';
                  }
              });
          }

          // Ctrl/Cmd + K for search (if search exists)
          if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
              e.preventDefault();
              const searchInput = document.getElementById('searchFriendsInput');
              if (searchInput) {
                  searchInput.focus();
              }
          }
      });
  }
}

new KeyboardNavigation();

// Professional Smooth Scroll Enhancement
const smoothScrollTo = (element, offset = 0) => {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
  });
};

// Professional Intersection Observer for Animations
const observeElements = () => {
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              entry.target.classList.add('animate-in');
              observer.unobserve(entry.target);
          }
      });
  }, { threshold: 0.1 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
  });
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeElements);
} else {
  observeElements();
}

// Professional Image Lazy Loading
const lazyLoadImages = () => {
  const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                  img.src = img.dataset.src;
                  img.removeAttribute('data-src');
                  observer.unobserve(img);
              }
          }
      });
  });

  document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
  });
};

lazyLoadImages();

// Professional Toast Notification Helper
const showToast = (message, type = 'info', duration = 3000) => {
  return notifications.show(message, type, duration);
};

// Professional Confirmation Dialog
const confirmAction = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
          background: rgba(15, 15, 25, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 16px;
          padding: 30px;
          max-width: 400px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      `;

      dialog.innerHTML = `
          <h3 style="margin: 0 0 16px 0; color: #FFD700; font-size: 20px;">${title}</h3>
          <p style="margin: 0 0 24px 0; color: rgba(255, 255, 255, 0.9);">${message}</p>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button class="confirm-cancel" style="padding: 10px 20px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 8px; color: rgba(255, 255, 255, 0.9); cursor: pointer;">Cancel</button>
              <button class="confirm-ok" style="padding: 10px 20px; background: rgba(255, 215, 0, 0.2); border: 1px solid rgba(255, 215, 0, 0.4); border-radius: 8px; color: #FFD700; cursor: pointer; font-weight: 600;">Confirm</button>
          </div>
      `;

      modal.appendChild(dialog);
      document.body.appendChild(modal);

      const close = (result) => {
          Animations.fadeOut(modal).then(() => {
              modal.remove();
              resolve(result);
          });
      };

      dialog.querySelector('.confirm-ok').addEventListener('click', () => close(true));
      dialog.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
      modal.addEventListener('click', (e) => {
          if (e.target === modal) close(false);
      });

      Animations.fadeIn(modal);
  });
};

// Professional Local Storage Manager
class StorageManager {
  static set(key, value, expiry = null) {
      const item = {
          value,
          expiry: expiry ? Date.now() + expiry : null
      };
      localStorage.setItem(key, JSON.stringify(item));
  }

  static get(key) {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      try {
          const item = JSON.parse(itemStr);
          if (item.expiry && Date.now() > item.expiry) {
              localStorage.removeItem(key);
              return null;
          }
          return item.value;
      } catch {
          return null;
      }
  }

  static remove(key) {
      localStorage.removeItem(key);
  }

  static clear() {
      localStorage.clear();
  }
}

// Professional URL Parameter Handler
const URLParams = {
  get: (key) => {
      const params = new URLSearchParams(window.location.search);
      return params.get(key);
  },

  set: (key, value) => {
      const url = new URL(window.location);
      url.searchParams.set(key, value);
      window.history.pushState({}, '', url);
  },

  remove: (key) => {
      const url = new URL(window.location);
      url.searchParams.delete(key);
      window.history.pushState({}, '', url);
  }
};

// Professional Viewport Utilities
const Viewport = {
  isMobile: () => window.innerWidth < 768,
  isTablet: () => window.innerWidth >= 768 && window.innerWidth < 1024,
  isDesktop: () => window.innerWidth >= 1024,
  width: () => window.innerWidth,
  height: () => window.innerHeight
};

// Professional Device Detection
const Device = {
  isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: () => /Android/.test(navigator.userAgent),
  isMobile: () => /Mobile/.test(navigator.userAgent),
  isTouch: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0
};

// Professional Network Status Monitor
class NetworkMonitor {
  constructor() {
      this.online = navigator.onLine;
      this.init();
  }

  init() {
      window.addEventListener('online', () => {
          this.online = true;
          notifications.show('Connection restored', 'success');
      });

      window.addEventListener('offline', () => {
          this.online = false;
          notifications.show('Connection lost', 'error');
      });
  }

  isOnline() {
      return this.online;
  }
}

const networkMonitor = new NetworkMonitor();

// Professional Theme Manager Enhancement
class EnhancedThemeManager {
  constructor() {
      this.currentTheme = localStorage.getItem('selectedTheme') || 'default';
      this.init();
  }

  init() {
      this.applyTheme(this.currentTheme);
      this.addThemeToggle();
  }

  applyTheme(theme) {
      document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
      if (theme !== 'default') {
          document.body.classList.add(`theme-${theme}`);
      }
      this.currentTheme = theme;
      localStorage.setItem('selectedTheme', theme);
  }

  addThemeToggle() {
      // Add quick theme switcher if needed
  }
}

// Professional Analytics (Privacy-friendly)
class Analytics {
  static track(event, data = {}) {
      console.log('Event:', event, data);
      // Add your analytics tracking here
  }

  static pageView(page) {
      this.track('page_view', { page });
  }

  static userAction(action, details = {}) {
      this.track('user_action', { action, ...details });
  }
}

// Professional Accessibility Enhancements
const Accessibility = {
  init: () => {
      // Skip to main content link
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.textContent = 'Skip to main content';
      skipLink.className = 'sr-only';
      skipLink.style.cssText = `
          position: absolute;
          top: -40px;
          left: 0;
          background: #000;
          color: #fff;
          padding: 8px;
          z-index: 100000;
      `;
      skipLink.addEventListener('focus', () => {
          skipLink.style.top = '0';
      });
      skipLink.addEventListener('blur', () => {
          skipLink.style.top = '-40px';
      });
      document.body.insertBefore(skipLink, document.body.firstChild);

      // Add ARIA labels to interactive elements
      document.querySelectorAll('button:not([aria-label])').forEach(btn => {
          if (!btn.textContent.trim() && btn.title) {
              btn.setAttribute('aria-label', btn.title);
          }
      });
  }
};

Accessibility.init();

// Professional Performance Optimizations
const Performance = {
  // Lazy load heavy components
  lazyLoad: (selector, callback) => {
      const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting) {
                  callback(entry.target);
                  observer.unobserve(entry.target);
              }
          });
      });
      document.querySelectorAll(selector).forEach(el => observer.observe(el));
  },

  // Preload critical resources
  preload: (url, type = 'script') => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = type;
      document.head.appendChild(link);
  },

  // Debounced resize handler
  onResize: (callback, delay = 250) => {
      let timeout;
      window.addEventListener('resize', () => {
          clearTimeout(timeout);
          timeout = setTimeout(callback, delay);
      });
  }
};

// Professional Console Styling
if (console.log) {
  const originalLog = console.log;
  console.log = function(...args) {
      originalLog.apply(console, [
          '%cSHS Game Hall',
          'background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; padding: 2px 8px; border-radius: 4px; font-weight: bold;',
          ...args
      ]);
  };
}

// Professional Error Recovery
const ErrorRecovery = {
  retry: async (fn, maxRetries = 3, delay = 1000) => {
      for (let i = 0; i < maxRetries; i++) {
          try {
              return await fn();
          } catch (error) {
              if (i === maxRetries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
      }
  }
};

// Professional Feature Detection
const Features = {
  supports: {
      webGL: () => {
          try {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch {
              return false;
          }
      },
      webP: () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      },
      localStorage: () => {
          try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              return true;
          } catch {
              return false;
          }
      }
  }
};

// Professional Image Optimization
const ImageOptimizer = {
  compress: (file, maxWidth = 1920, quality = 0.8) => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;

                  if (width > maxWidth) {
                      height = (height * maxWidth) / width;
                      width = maxWidth;
                  }

                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, width, height);
                  canvas.toBlob(resolve, 'image/jpeg', quality);
              };
              img.src = e.target.result;
          };
          reader.readAsDataURL(file);
      });
  }
};

// Professional Color Utilities
const ColorUtils = {
  hexToRgb: (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
      } : null;
  },

  rgbToHex: (r, g, b) => {
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  lighten: (hex, percent) => {
      const rgb = this.hexToRgb(hex);
      if (!rgb) return hex;
      const factor = 1 + percent / 100;
      return this.rgbToHex(
          Math.min(255, Math.floor(rgb.r * factor)),
          Math.min(255, Math.floor(rgb.g * factor)),
          Math.min(255, Math.floor(rgb.b * factor))
      );
  },

  darken: (hex, percent) => {
      const rgb = this.hexToRgb(hex);
      if (!rgb) return hex;
      const factor = 1 - percent / 100;
      return this.rgbToHex(
          Math.max(0, Math.floor(rgb.r * factor)),
          Math.max(0, Math.floor(rgb.g * factor)),
          Math.max(0, Math.floor(rgb.b * factor))
      );
  }
};

// Professional String Utilities
const StringUtils = {
  truncate: (str, length, suffix = '...') => {
      return str.length > length ? str.substring(0, length) + suffix : str;
  },

  capitalize: (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  slugify: (str) => {
      return str.toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '');
  },

  escapeHtml: (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
  }
};

// Professional Array Utilities
const ArrayUtils = {
  shuffle: (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
  },

  chunk: (array, size) => {
      const chunks = [];
      for (let i = 0; i < array.length; i += size) {
          chunks.push(array.slice(i, i + size));
      }
      return chunks;
  },

  unique: (array) => {
      return [...new Set(array)];
  }
};

// Professional Object Utilities
const ObjectUtils = {
  deepClone: (obj) => {
      return JSON.parse(JSON.stringify(obj));
  },

  merge: (...objects) => {
      return Object.assign({}, ...objects);
  },

  isEmpty: (obj) => {
      return Object.keys(obj).length === 0;
  }
};

// Professional Date Utilities
const DateUtils = {
  format: (date, format = 'YYYY-MM-DD') => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');

      return format
          .replace('YYYY', year)
          .replace('MM', month)
          .replace('DD', day)
          .replace('HH', hours)
          .replace('mm', minutes)
          .replace('ss', seconds);
  },

  timeAgo: (date) => {
      return Utils.formatDate(new Date(date).getTime());
  }
};

// Professional DOM Utilities
const DOMUtils = {
  createElement: (tag, props = {}, children = []) => {
      const el = document.createElement(tag);
      Object.entries(props).forEach(([key, value]) => {
          if (key === 'style' && typeof value === 'object') {
              Object.assign(el.style, value);
          } else if (key === 'className') {
              el.className = value;
          } else if (key.startsWith('on')) {
              el.addEventListener(key.substring(2).toLowerCase(), value);
          } else {
              el.setAttribute(key, value);
          }
      });
      children.forEach(child => {
          if (typeof child === 'string') {
              el.appendChild(document.createTextNode(child));
          } else {
              el.appendChild(child);
          }
      });
      return el;
  },

  ready: (fn) => {
      if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', fn);
      } else {
          fn();
      }
  }
};

// Professional Event Emitter
class EventEmitter {
  constructor() {
      this.events = {};
  }

  on(event, callback) {
      if (!this.events[event]) {
          this.events[event] = [];
      }
      this.events[event].push(callback);
  }

  off(event, callback) {
      if (this.events[event]) {
          this.events[event] = this.events[event].filter(cb => cb !== callback);
      }
  }

  emit(event, data) {
      if (this.events[event]) {
          this.events[event].forEach(callback => callback(data));
      }
  }
}

const appEvents = new EventEmitter();


// Professional Modal Manager
class ModalManager {
  constructor() {
      this.modals = new Map();
      this.activeModal = null;
  }

  register(id, element) {
      this.modals.set(id, element);
  }

  open(id) {
      const modal = this.modals.get(id);
      if (modal) {
          if (this.activeModal && this.activeModal !== modal) {
              this.close(this.activeModal.id);
          }
          modal.style.display = 'flex';
          Animations.fadeIn(modal);
          this.activeModal = { id, element: modal };
      }
  }

  close(id) {
      const modal = this.modals.get(id);
      if (modal) {
          Animations.fadeOut(modal).then(() => {
              modal.style.display = 'none';
              if (this.activeModal && this.activeModal.id === id) {
                  this.activeModal = null;
              }
          });
      }
  }
}

const modalManager = new ModalManager();

// Professional Tooltip System
class TooltipSystem {
  constructor() {
      this.tooltips = new Map();
      this.init();
  }

  init() {
      document.querySelectorAll('[data-tooltip]').forEach(el => {
          this.createTooltip(el);
      });
  }

  createTooltip(element) {
      const text = element.dataset.tooltip;
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = text;
      tooltip.style.cssText = `
          position: absolute;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          pointer-events: none;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.2s;
          white-space: nowrap;
      `;

      element.style.position = 'relative';
      element.appendChild(tooltip);

      element.addEventListener('mouseenter', () => {
          tooltip.style.opacity = '1';
      });

      element.addEventListener('mouseleave', () => {
          tooltip.style.opacity = '0';
      });
  }
}

new TooltipSystem();



// Professional Console Commands (Easter eggs)
window.gameHallCommands = {
  help: () => {
      console.log('%cAvailable Commands:', 'font-weight: bold; color: #FFD700;');
      console.log('  - gameHallCommands.help() - Show this help');
      console.log('  - gameHallCommands.theme(name) - Change theme');
      console.log('  - gameHallCommands.notify(message) - Show notification');
      console.log('  - gameHallCommands.stats() - Show performance stats');
  },

  theme: (name) => {
      if (typeof applyTheme === 'function') {
          applyTheme(name);
          console.log(`Theme changed to: ${name}`);
      }
  },

  notify: (message) => {
      notifications.show(message);
  },

  stats: () => {
      console.table(perfMonitor.metrics);
  }
};

// Dynamic tooltip positioning to prevent clipping
function setupTooltips() {
  document.querySelectorAll('[title]').forEach(el => {
      if (el.hasAttribute('data-tooltip-setup')) return;
      el.setAttribute('data-tooltip-setup', 'true');
      
      el.addEventListener('mouseenter', function(e) {
          const tooltip = this.getAttribute('title');
          if (!tooltip) return;
          
          // Remove title temporarily to prevent default tooltip
          const originalTitle = this.getAttribute('title');
          this.setAttribute('data-original-title', originalTitle);
          this.removeAttribute('title');
          
          // Create custom tooltip
          const tooltipEl = document.createElement('div');
          tooltipEl.className = 'custom-tooltip';
          tooltipEl.textContent = tooltip;
          document.body.appendChild(tooltipEl);
          
          // Position tooltip
          const rect = this.getBoundingClientRect();
          const tooltipRect = tooltipEl.getBoundingClientRect();
          let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
          let top = rect.top - tooltipRect.height - 12;
          
          // Keep tooltip in viewport
          if (left < 10) left = 10;
          if (left + tooltipRect.width > window.innerWidth - 10) {
              left = window.innerWidth - tooltipRect.width - 10;
          }
          if (top < 10) {
              top = rect.bottom + 12;
              tooltipEl.classList.add('tooltip-below');
          }
          
          tooltipEl.style.left = left + 'px';
          tooltipEl.style.top = top + 'px';
          
          // Store reference for cleanup
          this._tooltipEl = tooltipEl;
      });
      
      el.addEventListener('mouseleave', function() {
          if (this._tooltipEl) {
              this._tooltipEl.remove();
              this._tooltipEl = null;
          }
          // Restore title
          const originalTitle = this.getAttribute('data-original-title');
          if (originalTitle) {
              this.setAttribute('title', originalTitle);
          }
      });
  });
}

// Initialize professional enhancements
DOMUtils.ready(() => {
  console.log('%c✨ Professional enhancements loaded!', 'font-size: 16px; font-weight: bold; color: #FFD700;');
  
  // Add smooth animations to modals
  document.querySelectorAll('[id$="Modal"]').forEach(modal => {
      modalManager.register(modal.id, modal);
  });

  // Initialize tooltips
  new TooltipSystem();
  setupTooltips();
  
  // Re-setup tooltips for dynamically added elements
  const observer = new MutationObserver(() => {
      setupTooltips();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Add loading states to buttons
  document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function() {
          if (this.dataset.loading !== 'true') {
              const originalText = this.innerHTML;
              this.dataset.loading = 'true';
              this.disabled = true;
              this.innerHTML = '<span class="spinner spinner-small"></span> Loading...';
              
              setTimeout(() => {
                  this.innerHTML = originalText;
                  this.disabled = false;
                  this.dataset.loading = 'false';
              }, 1000);
          }
      });
  });

  // Add professional hover effects
  document.querySelectorAll('.card, .modalInner').forEach(el => {
      el.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-2px)';
          this.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
      });
      el.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '';
      });
  });
});

// Professional Export for global use
window.ProfessionalUtils = {
  notifications,
  Animations,
  Utils,
  FormValidator,
  loadingManager,
  confirmAction,
  showToast,
  StorageManager,
  URLParams,
  Viewport,
  Device,
  ColorUtils,
  StringUtils,
  ArrayUtils,
  ObjectUtils,
  DateUtils,
  DOMUtils,
  Analytics,
  appEvents,
  modalManager
};

console.log('%c🚀 All professional enhancements are ready!', 'font-size: 14px; color: #28a745;');

// ================= Games Grid System =================
// Initialize gameSites array with default games (will be merged with JSON data)
gameSites = [
    { title: 'Chess FreezeNova', embed: 'https://cloud.onlinegames.io/games/2025/unity3/chess/index-og.html', image: 'https://www.onlinegames.io/media/posts/1116/responsive/chess-freezenova-xs.webp' },
    { title: 'Davo', embed: 'https://cloud.onlinegames.io/games/2025/construct/302/davo/index-og.html', image: 'https://www.onlinegames.io/media/posts/1115/responsive/davo-xs.webp' },
    { title: 'Fast Food Manager', embed: 'https://cloud.onlinegames.io/games/2025/unity4/fast-food-manager/index-og.html', image: 'https://www.onlinegames.io/media/posts/1114/responsive/fast-food-manager-xs.webp' },
    { title: 'Block Builder Survival', embed: 'https://cloud.onlinegames.io/games/2025/unity4/cubecraft-survival/index-og.html', image: 'https://www.onlinegames.io/media/posts/1113/responsive/cubecraft-survival-xs.webp' },
    { title: 'Love Tester', embed: 'https://www.onlinegames.io/games/2021/3/love-tester/index.html', image: 'https://www.onlinegames.io/media/posts/152/responsive/love-tester-xs.jpg' },
    { title: 'Drift King', embed: 'https://www.onlinegames.io/games/2024/unity/drift-king/index.html', image: 'https://www.onlinegames.io/media/posts/729/responsive/Drift-King-xs.jpg' },
    { title: 'Highway Traffic', embed: 'https://www.onlinegames.io/games/2022/unity/highway-traffic/index.html', image: 'https://www.onlinegames.io/media/posts/32/responsive/Highway-Traffic-2-xs.jpg' },
    { title: 'Stack Fire Ball', embed: 'https://www.onlinegames.io/games/2021/unity/stack-fire-ball/index.html', image: 'https://www.onlinegames.io/media/posts/184/responsive/Stack-Fire-Ball-Game-xs.jpg' },
    { title: 'Masked Special Forces', embed: 'https://www.onlinegames.io/games/2022/unity2/masked-special-forces/index.html', image: 'https://www.onlinegames.io/media/posts/310/responsive/Masked-Special-Forces-FPS-xs.jpg' },
    { title: 'City Simulator', embed: 'https://www.onlinegames.io/games/2023/unity2/gta-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/416/responsive/GTA-Simulator-xs.jpg' },
    { title: 'Real Flight Simulator', embed: 'https://cloud.onlinegames.io/games/2023/unity2/real-flight-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/342/responsive/Real-Flight-Simulator-2-xs.jpg' },
    { title: 'Stickman City Adventure', embed: 'https://cloud.onlinegames.io/games/2024/unity3/stickman-gta-city/index-og.html', image: 'https://www.onlinegames.io/media/posts/900/responsive/stickman-gta-city-free-xs.jpg' },
    { title: 'Drift Hunters Pro', embed: 'https://www.onlinegames.io/games/2023/unity/drift-hunters-pro/index.html', image: 'https://www.onlinegames.io/media/posts/397/responsive/Drift-Hunters-Pro-xs.jpg' },
    { title: 'Stickman Parkour', embed: 'https://cloud.onlinegames.io/games/2024/construct/219/stickman-parkour/index-og.html', image: 'https://www.onlinegames.io/media/posts/871/responsive/stickman-parkour-OG-xs.jpg' },
    { title: 'Fast Food Rush', embed: 'https://cloud.onlinegames.io/games/2025/unity/fast-food-rush/index-og.html', image: 'https://www.onlinegames.io/media/posts/979/responsive/fast-food-rush-xs.jpg' },
    { title: 'Get On Top', embed: 'https://www.onlinegames.io/games/2024/code/6/get-on-top/index.html', image: 'https://www.onlinegames.io/media/posts/697/responsive/Get-on-Top-xs.jpg' },
    { title: 'Edys Car Simulator', embed: 'https://www.onlinegames.io/games/2022/unity/edys-car-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/238/responsive/Edys-Car-Simulator-Online-xs.jpg' },
    { title: 'Crown Defense', embed: 'https://cloud.onlinegames.io/games/2025/construct/337/crown-defense/index-og.html', image: 'https://www.onlinegames.io/media/posts/1098/responsive/crown-defense-online-xs.webp' },
    { title: 'Escape Car', embed: 'https://cloud.onlinegames.io/games/2025/unity2/escape-car/index-og.html', image: 'https://www.onlinegames.io/media/posts/1000/responsive/Escape-Car-xs.jpg' },
    { title: 'Madalin Stunt Cars Pro', embed: 'https://www.onlinegames.io/games/2023/unity/madalin-stunt-cars-pro/index.html', image: 'https://www.onlinegames.io/media/posts/401/responsive/Madalin-Stunt-Cars-Pro-Game-xs.jpg' },
    { title: 'Guerrillas io', embed: 'https://www.onlinegames.io/games/2023/unity2/guerrillas-io/index.html', image: 'https://www.onlinegames.io/media/posts/423/responsive/Guerillas-io-xs.jpg' },
    { title: 'Drift Rider', embed: 'https://www.onlinegames.io/games/2023/unity3/drift-rider/index.html', image: 'https://www.onlinegames.io/media/posts/553/responsive/Drift-Rider-xs.jpg' },
    { title: 'Basket Hoop', embed: 'https://cloud.onlinegames.io/games/2024/construct/311/basket-hoop/index-og.html', image: 'https://www.onlinegames.io/media/posts/843/responsive/Basket-Hoop-xs.jpg' },
    { title: 'Stickman Destruction', embed: 'https://www.onlinegames.io/games/2021/unity3/stickman-destruction/index.html', image: 'https://www.onlinegames.io/media/posts/233/responsive/Stickman-Destruction-xs.jpg' },
    { title: 'Tactical Shooter Online', embed: 'https://www.onlinegames.io/games/2023/unity2/cs-online/index.html', image: 'https://www.onlinegames.io/media/posts/434/responsive/CS-Online-xs.jpg' },
    { title: 'Burnout City', embed: 'https://cloud.onlinegames.io/games/2024/unity/burnout-city/index-og.html', image: 'https://www.onlinegames.io/media/posts/861/responsive/burnoutcity-xs.jpg' },
    { title: 'Love Tester Story', embed: 'https://cloud.onlinegames.io/games/2024/construct/225/love-tester-story/index-og.html', image: 'https://www.onlinegames.io/media/posts/816/responsive/Love-Tester-Story-xs.jpg' },
    { title: 'Police Chase Drifter', embed: 'https://www.onlinegames.io/games/2021/3/police-chase-drifter/index.html', image: 'https://www.onlinegames.io/media/posts/155/responsive/Police-Chase-Drifter-Online-xs.jpg' },
    { title: 'Super Car Driving', embed: 'https://cloud.onlinegames.io/games/2024/unity2/super-car-driving/index-og.html', image: 'https://www.onlinegames.io/media/posts/854/responsive/supercardriving-2-xs.jpg' },
    { title: 'WarStrike', embed: 'https://cloud.onlinegames.io/games/2024/unity3/warstrike/index-og.html', image: 'https://www.onlinegames.io/media/posts/870/responsive/WarStrike-Online-xs.jpg' },
    { title: 'Legendary Sniper', embed: 'https://www.onlinegames.io/games/2021/unity3/legendary-sniper/index.html', image: 'https://www.onlinegames.io/media/posts/596/responsive/Legendary-Sniper-xs.jpg' },
    { title: 'Motorbike Stunt Simulator', embed: 'https://cloud.onlinegames.io/games/2021/unity/motorbike-stunt-simulator/index-og.html', image: 'https://www.onlinegames.io/media/posts/1045/responsive/motorbike_stunt_simulator_game-2-xs.webp' },
    { title: 'Capybara Clicker Pro', embed: 'https://www.onlinegames.io/games/2023/q2/capybara-clicker-pro/index.html', image: 'https://www.onlinegames.io/media/posts/554/responsive/Capybara-Clicker-Pro-xs.jpg' },
    { title: 'Block Blast', embed: 'https://cloud.onlinegames.io/games/2024/unity3/block-blast/index-og.html', image: 'https://www.onlinegames.io/media/posts/876/responsive/block-blast-xs.jpg' },
    { title: 'Subway Idle 3D', embed: 'https://www.onlinegames.io/games/2022/unity4/subway-idle-3d/index.html', image: 'https://www.onlinegames.io/media/posts/586/responsive/Subway-Idle-xs.jpg' },
    { title: 'Highway Racer Pro', embed: 'https://www.onlinegames.io/games/2024/unity/highway-racer-pro/index.html', image: 'https://www.onlinegames.io/media/posts/822/responsive/Highway-Racer-Pro-xs.jpg' },
    { title: 'Basketball io', embed: 'https://www.onlinegames.io/games/2022/unity3/basketball-io/index.html', image: 'https://www.onlinegames.io/media/posts/302/responsive/Basketball-io-2-xs.jpg' },
    { title: 'Mob City', embed: 'https://www.onlinegames.io/games/2021/unity3/mob-city/index.html', image: 'https://www.onlinegames.io/media/posts/418/responsive/Mob-City-xs.jpg' },
    { title: 'Crazy Drifter', embed: 'https://www.onlinegames.io/games/2022/unity3/crazy-drifter/index.html', image: 'https://www.onlinegames.io/media/posts/314/responsive/Crazy-Drifter-xs.jpg' },
    { title: 'Archer Hero', embed: 'https://www.onlinegames.io/games/2023/unity/archer-hero/index.html', image: 'https://www.onlinegames.io/media/posts/364/responsive/Archer-Hero-Online-xs.jpg' },
    { title: 'F1 Drift Racer', embed: 'https://www.onlinegames.io/games/2022/construct/134/f1-drift-racer/index.html', image: 'https://www.onlinegames.io/media/posts/504/responsive/F1-Drift-Racer-xs.jpg' },
    { title: 'Cat Simulator', embed: 'https://www.onlinegames.io/games/2022/unity4/cat-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/330/responsive/Cat-Simulator-Online-xs.jpg' },
    { title: 'Highway Cars', embed: 'https://www.onlinegames.io/games/2023/construct/211/highway-cars/index.html', image: 'https://www.onlinegames.io/media/posts/598/responsive/Highway-Cars-xs.jpg' },
    { title: 'Car Football', embed: 'https://www.onlinegames.io/games/2023/construct/198/car-football/index.html', image: 'https://www.onlinegames.io/media/posts/405/responsive/Car-Football-xs.jpg' },
    { title: 'ArmedForces.io', embed: 'https://www.onlinegames.io/games/2021/unity3/armedforces-io/index.html', image: 'https://www.onlinegames.io/media/posts/234/responsive/Armed-Forces-io-xs.jpg' },
    { title: 'Kick The Dummy', embed: 'https://www.onlinegames.io/games/2022/construct/153/kick-the-dummy/index.html', image: 'https://www.onlinegames.io/media/posts/414/responsive/Kick-The-Dummy-Game-xs.jpg' },
    { title: 'Cake Match Puzzle', embed: 'https://cloud.onlinegames.io/games/2024/unity3/cake-match-puzzle/index-og.html', image: 'https://www.onlinegames.io/media/posts/908/responsive/55-xs.jpg' },
    { title: 'FPS Strike', embed: 'https://cloud.onlinegames.io/games/2024/unity2/fps-strike/index-og.html', image: 'https://www.onlinegames.io/media/posts/902/responsive/fps-strike-online-xs.jpg' },
    { title: 'Drift Fury', embed: 'https://www.onlinegames.io/games/2023/unity/drift-fury/index.html', image: 'https://www.onlinegames.io/media/posts/650/responsive/Drift-Fury-xs.jpg' },
    { title: 'Rooftop Duel', embed: 'https://cloud.onlinegames.io/games/2025/construct/213/rooftop-duel/index-og.html', image: 'https://www.onlinegames.io/media/posts/1002/responsive/Rooftop-Duel-Online-xs.jpg' },
    { title: 'Mini Cars Racing', embed: 'https://cloud.onlinegames.io/games/2021/unity/mini-cars-racing/index-og.html', image: 'https://www.onlinegames.io/media/posts/1010/responsive/Mini-Cars-Racing-xs.jpg' },
    { title: 'Geometry Dasher FreezeNova', embed: 'https://www.onlinegames.io/games/2023/q2/geometry-dash-freezenova/index.html', image: 'https://www.onlinegames.io/media/posts/510/responsive/Geometry-Dash-FreezeNova-xs.jpg' },
    { title: 'Head Soccer 2022', embed: 'https://www.onlinegames.io/games/2023/construct/280/head-soccer-2022/index.html', image: 'https://www.onlinegames.io/media/posts/624/responsive/Head-Soccer-2022-xs.jpg' },
    { title: '8 Ball Pool Billiard', embed: 'https://www.onlinegames.io/games/2022/unity3/8-ball-pool-billiard/index.html', image: 'https://www.onlinegames.io/media/posts/442/responsive/8-Ball-Pool-Billiard-xs.jpg' },
    { title: 'Click Master Pro', embed: 'https://cloud.onlinegames.io/games/2025/unity/cookie-clicker-pro/index-og.html', image: 'https://www.onlinegames.io/media/posts/971/responsive/Cookie-Clicker-Pro-Game-xs.jpg' },
    { title: 'Secret Sniper Agent', embed: 'https://www.onlinegames.io/games/2022/construct/129/secret-sniper-agent/index.html', image: 'https://www.onlinegames.io/media/posts/753/responsive/Secret-Sniper-Agent-xs.jpg' },
    { title: 'Basketball King', embed: 'https://cloud.onlinegames.io/games/2024/construct/316/basketball-king/index-og.html', image: 'https://www.onlinegames.io/media/posts/907/responsive/basketball-king-xs.jpg' },
    { title: 'Nuts and Bolts Puzzle', embed: 'https://cloud.onlinegames.io/games/2025/unity/nuts-and-bolts-puzzle/index-og.html', image: 'https://www.onlinegames.io/media/posts/965/responsive/nuts-and-bolts-puzzle-xs.jpg' },
    { title: 'Monster Survivors', embed: 'https://cloud.onlinegames.io/games/2025/unity/monster-survivors/index-og.html', image: 'https://www.onlinegames.io/media/posts/942/responsive/Monster-survivors-xs.jpg' },
    { title: 'Fort Drifter', embed: 'https://www.onlinegames.io/games/2022/unity3/fort-drifter/index.html', image: 'https://www.onlinegames.io/media/posts/592/responsive/Fort-Drifter-xs.jpg' },
    { title: 'Supercars Drift', embed: 'https://www.onlinegames.io/games/2023/unity3/supercars-drift/index.html', image: 'https://www.onlinegames.io/media/posts/628/responsive/SuperCars-Drift-xs.jpg' },
    { title: 'Deer Hunter', embed: 'https://www.onlinegames.io/games/2021/1/deer-hunter/index.html', image: 'https://www.onlinegames.io/media/posts/591/responsive/Deer-Hunter-xs.jpg' },
    { title: 'Crazy Parking Fury', embed: 'https://www.onlinegames.io/games/2022/unity3/crazy-parking-fury/index.html', image: 'https://www.onlinegames.io/media/posts/643/responsive/Crazy-Parking-Fury-xs.jpg' },
    { title: 'Wasteland Shooters', embed: 'https://www.onlinegames.io/games/2021/unity2/wasteland-shooters/index.html', image: 'https://www.onlinegames.io/media/posts/218/responsive/Wasteland-Shooters-xs.jpg' },
    { title: 'Motorbike Traffic', embed: 'https://www.onlinegames.io/games/2021/unity/motorbike-traffic/index.html', image: 'https://www.onlinegames.io/media/posts/419/responsive/Motorbike-Traffic-Game-xs.jpg' },
    { title: 'Rome Simulator', embed: 'https://www.onlinegames.io/games/2021/unity/rome-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/634/responsive/Rome-Simulator-2-xs.jpg' },
    { title: 'Taxi Simulator', embed: 'https://www.onlinegames.io/games/2022/unity/taxi-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/465/responsive/Taxi-Simulator-xs.jpg' },
    { title: 'Block World', embed: 'https://cloud.onlinegames.io/games/2025/unity/voxel-world/index-og.html', image: 'https://www.onlinegames.io/media/posts/937/responsive/voxel-world-xs.jpg' },
    { title: 'Crazy Car Arena', embed: 'https://www.onlinegames.io/games/2022/unity3/crazy-car-arena/index.html', image: 'https://www.onlinegames.io/media/posts/317/responsive/Crazy-Car-Arena-Game-xs.jpg' },
    { title: 'ATV Highway Traffic', embed: 'https://www.onlinegames.io/games/2021/unity/atv-highway-traffic/index.html', image: 'https://www.onlinegames.io/media/posts/668/responsive/ATV-Highway-Traffic-xs.jpg' },
    { title: 'Poop Clicker', embed: 'https://www.onlinegames.io/games/2024/construct/292/poop-clicker/index.html', image: 'https://www.onlinegames.io/media/posts/742/responsive/Poop-Clicker-xs.jpg' },
    { title: 'Police Traffic', embed: 'https://www.onlinegames.io/games/2021/unity/police-traffic/index.html', image: 'https://www.onlinegames.io/media/posts/187/responsive/Pollice-Traffic-xs.jpg' },
    { title: 'Burnout Drift Hunter', embed: 'https://www.onlinegames.io/games/2022/unity4/burnout-drift-hunter/index.html', image: 'https://www.onlinegames.io/media/posts/327/responsive/Burnout-Drift-Hunter-Online-xs.jpg' },
    { title: 'Jeep Driver', embed: 'https://cloud.onlinegames.io/games/2021/1/jeep-driver/index-og.html', image: 'https://www.onlinegames.io/media/posts/1039/responsive/jeep-driver-game-3-xs.webp' },
    { title: 'Airplane Racer', embed: 'https://www.onlinegames.io/games/2022/unity/airplane-racer/index.html', image: 'https://www.onlinegames.io/media/posts/268/responsive/Airplane-Racer-xs.jpg' },
    { title: 'Solitaire', embed: 'https://cloud.onlinegames.io/games/2025/html/solitaire/index-og.html', image: 'https://www.onlinegames.io/media/posts/1007/responsive/solitaire-xs.jpg' },
    { title: '2 Player Crazy Racer', embed: 'https://www.onlinegames.io/games/2022/unity3/2-player-crazy-racer/index.html', image: 'https://www.onlinegames.io/media/posts/617/responsive/2-Player-Crazy-Racer-xs.jpg' },
    { title: 'Masked Forces Zombie Survival', embed: 'https://www.onlinegames.io/games/2021/unity3/masked-forces-zombie-survival/index.html', image: 'https://www.onlinegames.io/media/posts/225/responsive/Masked-Forces-Zombie-Survival-Online-xs.jpg' },
    { title: 'Highway Racer 2', embed: 'https://www.onlinegames.io/games/2022/unity2/highway-racer-2/index.html', image: 'https://www.onlinegames.io/media/posts/323/responsive/Highway-Racer-2-xs.jpg' },
    { title: 'Hero Rush Tower Defense', embed: 'https://www.onlinegames.io/games/2023/unity/hero-rush-tower-defense/index.html', image: 'https://www.onlinegames.io/media/posts/491/responsive/Hero-Rush-Tower-Defense-Play-xs.jpg' },
    { title: 'Kick the Alien', embed: 'https://cloud.onlinegames.io/games/2021/4/kick-the-alien/index-og.html', image: 'https://www.onlinegames.io/media/posts/997/responsive/Kick-the-Alien-xs.jpg' },
    { title: 'Alien Sky Invasion', embed: 'https://www.onlinegames.io/games/2021/unity3/alien-sky-invasion/index.html', image: 'https://www.onlinegames.io/media/posts/594/responsive/Alien-Sky-Invasion-xs.jpg' },
    { title: 'Kingdom Attack', embed: 'https://www.onlinegames.io/games/2021/unity3/kingdom-attack/index.html', image: 'https://www.onlinegames.io/media/posts/371/responsive/Kingdom-Attack-xs.jpg' },
    { title: 'Fun Party Makeup', embed: 'https://www.onlinegames.io/games/2021/4/fun-party-makeup/index.html', image: 'https://www.onlinegames.io/media/posts/723/responsive/Fun-Party-Makeup-xs.jpg' },
    { title: 'Wedding Beauty Salon', embed: 'https://www.onlinegames.io/games/2021/2/wedding-beauty-salon/index.html', image: 'https://www.onlinegames.io/media/posts/421/responsive/Wedding-Beauty-Salon-xs.jpg' },
    { title: 'Survival Karts', embed: 'https://cloud.onlinegames.io/games/2024/unity3/survival-karts/index-og.html', image: 'https://www.onlinegames.io/media/posts/887/responsive/survival-karts-play-xs.jpg' },
    { title: 'Super Mini Racing', embed: 'https://www.onlinegames.io/games/2022/unity4/super-mini-racing/index.html', image: 'https://www.onlinegames.io/media/posts/819/responsive/Super-Mini-Racing-xs.jpg' },
    { title: 'Survival Craft', embed: 'https://www.onlinegames.io/games/2022/unity/survival-craft/index.html', image: 'https://www.onlinegames.io/media/posts/593/responsive/Survival-Craft-Game-xs.jpg' },
    { title: 'Bus Subway Runner', embed: 'https://www.onlinegames.io/games/2022/unity/bus-subway-runner/index.html', image: 'https://www.onlinegames.io/media/posts/235/responsive/Bus-Subway-Runner-Game-xs.jpg' },
    { title: 'City Stunts', embed: 'https://www.onlinegames.io/games/2023/unity3/city-stunts/index.html', image: 'https://www.onlinegames.io/media/posts/629/responsive/City-Stunts-Game-xs.jpg' },
    { title: 'Snake Football', embed: 'https://www.onlinegames.io/games/2023/construct/200/snake-football/index.html', image: 'https://www.onlinegames.io/media/posts/706/responsive/Snake-Football-xs.jpg' },
    { title: 'Nova Clicker', embed: 'https://cloud.onlinegames.io/games/2024/construct/314/nova-clicker/index-og.html', image: 'https://www.onlinegames.io/media/posts/981/responsive/Nova-Clicker-xs.jpg' },
    { title: 'Farming Island', embed: 'https://cloud.onlinegames.io/games/2025/unity/farming-island/index-og.html', image: 'https://www.onlinegames.io/media/posts/988/responsive/farming-island-xs.jpg' },
    { title: 'Urban Sniper', embed: 'https://www.onlinegames.io/games/2022/unity2/urban-sniper/index.html', image: 'https://www.onlinegames.io/media/posts/322/responsive/Urban-Sniper-Game-xs.jpg' },
    { title: 'Draw the Car Path', embed: 'https://cloud.onlinegames.io/games/2021/4/draw-the-car-path/index-og.html', image: 'https://www.onlinegames.io/media/posts/936/responsive/draw-the-car-path-xs.jpg' },
    { title: 'Troll Level', embed: 'https://cloud.onlinegames.io/games/2024/unity2/troll-level/index-og.html', image: 'https://www.onlinegames.io/media/posts/857/responsive/troll-level-online-xs.jpg' },
    { title: 'SpartaHoppers', embed: 'https://cloud.onlinegames.io/games/2025/construct/227/spartahoppers/index-og.html', image: 'https://www.onlinegames.io/media/posts/949/responsive/sparta-hoppers-game-xs.jpg' },
    { title: 'Army Combat', embed: 'https://www.onlinegames.io/games/2021/unity/army-combat/index.html', image: 'https://www.onlinegames.io/media/posts/664/responsive/Army-Combat-xs.jpg' },
    { title: 'Crazy Karts', embed: 'https://www.onlinegames.io/games/2024/unity/crazy-karts/index.html', image: 'https://www.onlinegames.io/media/posts/740/responsive/Crazy-Karts-xs.jpg' },
    { title: 'Tank Arena', embed: 'https://cloud.onlinegames.io/games/2025/construct/293/tank-arena/index-og.html', image: 'https://www.onlinegames.io/media/posts/956/responsive/Tank-Arena-Online-xs.jpg' },
    { title: 'Julie Beauty Salon', embed: 'https://cloud.onlinegames.io/games/2021/1/julie-beauty-salon/index-og.html', image: 'https://www.onlinegames.io/media/posts/1011/responsive/Julie-Beauty-Salon-xs.jpg' },
    { title: 'Egg Car Racing', embed: 'https://cloud.onlinegames.io/games/2024/construct/289/egg-car-racing/index-og.html', image: 'https://www.onlinegames.io/media/posts/910/responsive/egg-car-racing-xs.jpg' },
    { title: 'Moto Trials', embed: 'https://www.onlinegames.io/games/2021/unity/moto-trials/index.html', image: 'https://www.onlinegames.io/media/posts/523/responsive/Moto-Trials-xs.jpg' },
    { title: 'Pixel Driver', embed: 'https://cloud.onlinegames.io/games/2021/unity3/pixel-driver/index-og.html', image: 'https://www.onlinegames.io/media/posts/990/responsive/Pixel-Driver-xs.jpg' },
    { title: 'Night Shift Security', embed: 'https://cloud.onlinegames.io/games/2025/unity2/five-nights-at-poppy/index-og.html', image: 'https://www.onlinegames.io/media/posts/992/responsive/Five-Nights-at-Poppy-xs.jpg' },
    { title: 'Offroad Rally', embed: 'https://www.onlinegames.io/games/2023/unity2/offroad-rally/index.html', image: 'https://www.onlinegames.io/media/posts/461/responsive/Offroad-Rally-xs.jpg' },
    { title: 'Skibidi Toilet io', embed: 'https://www.onlinegames.io/games/2023/construct/242/skibidi-toilet-io/index.html', image: 'https://www.onlinegames.io/media/posts/540/responsive/Skibidi-Toilet-xs.jpg' },
    { title: 'Survival Island', embed: 'https://cloud.onlinegames.io/games/2024/unity2/survival-island/index-og.html', image: 'https://www.onlinegames.io/media/posts/970/responsive/Survival-Island-xs.jpg' },
    { title: 'State io Wars', embed: 'https://www.onlinegames.io/games/2024/construct/233/state-io-wars/index.html', image: 'https://www.onlinegames.io/media/posts/685/responsive/State-io-Wars-xs.jpg' },
    { title: 'Hero Dragon Power', embed: 'https://www.onlinegames.io/games/2023/unity/hero-dragon-power/index.html', image: 'https://www.onlinegames.io/media/posts/365/responsive/Hero-Dragon-Power-Game-xs.jpg' },
    { title: 'Battle Royale Simulator', embed: 'https://www.onlinegames.io/games/2022/unity3/battle-royale-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/633/responsive/Battle-Royale-Simulator-xs.jpg' },
    { title: 'Monster Truck City Parking', embed: 'https://www.onlinegames.io/games/2021/unity/monster-truck-city-parking/index.html', image: 'https://www.onlinegames.io/media/posts/582/responsive/Monster-Truck-City-Parking-xs.jpg' },
    { title: 'Geometry Dasher Escape', embed: 'https://cloud.onlinegames.io/games/2024/construct/299/geometry-escape/index-og.html', image: 'https://www.onlinegames.io/media/posts/905/responsive/Geometry-Escape-xs.jpg' },
    { title: 'Dark Ninja Hanjo', embed: 'https://www.onlinegames.io/games/2023/unity/dark-ninja-hanjo/index.html', image: 'https://www.onlinegames.io/media/posts/451/responsive/Dark-Ninja-Hanjo-xs.jpg' },
    { title: 'Princess Influencer Salon', embed: 'https://www.onlinegames.io/games/2021/3/princess-influencer-salon/index.html', image: 'https://www.onlinegames.io/media/posts/485/responsive/Princess-Influencer-Salon-xs.jpg' },
    { title: 'Four Colors', embed: 'https://www.onlinegames.io/games/2023/code/four-colors/index.html', image: 'https://www.onlinegames.io/media/posts/535/responsive/Four-Colors-xs.jpg' },
    { title: 'Precision Sniper', embed: 'https://www.onlinegames.io/games/2021/1/sniper-elite/index.html', image: 'https://www.onlinegames.io/media/posts/127/responsive/Sniper-Elite-Online-xs.jpg' },
    { title: 'Tile Match', embed: 'https://cloud.onlinegames.io/games/2025/unity/tile-match/index-og.html', image: 'https://www.onlinegames.io/media/posts/939/responsive/tile-match-xs.jpg' },
    { title: 'Bandits Multiplayer PvP', embed: 'https://www.onlinegames.io/games/2021/unity2/bandits-multiplayer-pvp/index.html', image: 'https://www.onlinegames.io/media/posts/487/responsive/Bandits-Multiplayer-PvP-xs.jpg' },
    { title: 'Agent Smith', embed: 'https://www.onlinegames.io/games/2021/unity/agent-smith/index.html', image: 'https://www.onlinegames.io/media/posts/189/responsive/Agent-Smith-2-xs.jpg' },
    { title: 'Stick Guys Defense', embed: 'https://www.onlinegames.io/games/2022/unity3/stick-guys-defense/index.html', image: 'https://www.onlinegames.io/media/posts/476/responsive/Stick-Guys-Defense-xs.jpg' },
    { title: 'CobraZ.io Classic', embed: 'https://www.onlinegames.io/games/2022/unity/cobraz-io-classic/index.html', image: 'https://www.onlinegames.io/media/posts/546/responsive/Cobraz.io-Classic-xs.jpg' },
    { title: 'Shortcut Race', embed: 'https://www.onlinegames.io/games/2023/construct/237/shortcut-race/index.html', image: 'https://www.onlinegames.io/media/posts/492/responsive/Shortcut-Race-xs.jpg' },
    { title: 'Monster Truck Mountain Climb', embed: 'https://cloud.onlinegames.io/games/2021/2/monster-truck-mountain-climb/index-og.html', image: 'https://www.onlinegames.io/media/posts/924/responsive/monster-truck-mountain-climb-xs.jpg' },
    { title: 'Basketball Slam Dunk', embed: 'https://www.onlinegames.io/games/2021/unity2/basketball-slam-dunk/index.html', image: 'https://www.onlinegames.io/media/posts/200/responsive/Basketball-Slam-Dunk-xs.jpg' },
    { title: 'Snake', embed: 'https://cloud.onlinegames.io/games/2024/phaser/snake/index-og.html', image: 'https://www.onlinegames.io/media/posts/919/responsive/snake-xs.jpg' },
    { title: 'Powerslide Kart Simulator', embed: 'https://www.onlinegames.io/games/2022/unity3/powerslide-kart-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/578/responsive/Powerslide-Kart-Simulator-xs.jpg' },
    { title: 'Stunt Simulator 2', embed: 'https://www.onlinegames.io/games/2021/unity3/stunt-simulator-2/index.html', image: 'https://www.onlinegames.io/media/posts/765/responsive/Stunt-simulator-2-xs.jpg' },
    { title: 'Blocky Parkour Ninja', embed: 'https://www.onlinegames.io/games/2022/construct/156/blocky-parkour-ninja/index.html', image: 'https://www.onlinegames.io/media/posts/440/responsive/Blocky-Parkour-Ninja-xs.jpg' },
    { title: 'Football King', embed: 'https://www.onlinegames.io/games/2024/construct/226/football-king/index.html', image: 'https://www.onlinegames.io/media/posts/739/responsive/Football-King-xs.jpg' },
    { title: 'American Touchdown', embed: 'https://www.onlinegames.io/games/2021/unity3/american-touchdown/index.html', image: 'https://www.onlinegames.io/media/posts/545/responsive/American-Touchdown-Game-xs.jpg' },
    { title: 'Hover Racer', embed: 'https://www.onlinegames.io/games/2021/unity3/hover-racer/index.html ', image: 'https://www.onlinegames.io/media/posts/224/responsive/Hover-Racer-Game-xs.jpg' },
    { title: 'Nova Craft', embed: 'https://cloud.onlinegames.io/games/2024/more2/nova-craft/index.html', image: 'https://www.onlinegames.io/media/posts/841/responsive/Nova-Craft-xs.jpg' },
    { title: 'Futuristic Racer', embed: 'https://cloud.onlinegames.io/games/2021/2/futuristic-racer/index-og.html', image: 'https://www.onlinegames.io/media/posts/1051/responsive/futuristic_racer_game-xs.webp' },
    { title: 'Music Battle 3D', embed: 'https://www.onlinegames.io/games/2022/unity/fnf-funk-3d/index.html', image: 'https://www.onlinegames.io/media/posts/613/responsive/FNF-Funk-3D-xs.jpg' },
    { title: 'Tractor Farming Simulator', embed: 'https://www.onlinegames.io/games/2022/unity/tractor-farming-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/552/responsive/Tractor-Farming-Simulator-xs.jpg' },
    { title: 'Dinosaur Game', embed: 'https://www.onlinegames.io/games/2023/q2/dinosaur-game/index.html', image: 'https://www.onlinegames.io/media/posts/417/responsive/Dinosaur-Game-Online-xs.jpg' },
    { title: 'Jeep Racing', embed: 'https://www.onlinegames.io/games/2023/freezenova.com/jeep-racing/index.html', image: 'https://www.onlinegames.io/media/posts/564/responsive/Jeep-Racing-xs.jpg' },
    { title: 'Mahjong', embed: 'https://cloud.onlinegames.io/games/2025/unity/mahjong/index-og.html', image: 'https://www.onlinegames.io/media/posts/966/responsive/Mahjong-xs.jpg' },
    { title: 'Fire and Water', embed: 'https://www.onlinegames.io/games/2023/construct/179/fire-and-water/index.html', image: 'https://www.onlinegames.io/media/posts/469/responsive/Fire-and-Water-xs.jpg' },
    { title: 'Mech Shooter', embed: 'https://www.onlinegames.io/games/2022/unity/mech-shooter/index.html', image: 'https://www.onlinegames.io/media/posts/649/responsive/Mech-Shooter-xs.jpg' },
    { title: 'Kick the Zombie', embed: 'https://www.onlinegames.io/games/2021/2/kick-the-zombie/index.html', image: 'https://www.onlinegames.io/media/posts/755/responsive/kick-the-zombie-xs.jpg' },
    { title: 'Jacks Village', embed: 'https://www.onlinegames.io/games/2021/unity/jacks-village/index.html', image: 'https://www.onlinegames.io/media/posts/493/responsive/Jacks-Village-xs.jpg' },
    { title: 'Crazy Stickman Physics', embed: 'https://www.onlinegames.io/games/2023/construct/185/crazy-stickman-physics/index.html', image: 'https://www.onlinegames.io/media/posts/715/responsive/Crazy-Stickman-Physics-xs.jpg' },
    { title: 'Galactic Sniper', embed: 'https://www.onlinegames.io/games/2021/2/galactic-sniper/index.html', image: 'https://www.onlinegames.io/media/posts/719/responsive/Galactic-Sniper-xs.jpg' },
    { title: 'Evil Santa', embed: 'https://www.onlinegames.io/games/2021/1/evil-santa/index.html', image: 'https://www.onlinegames.io/media/posts/539/responsive/Evil-Santa-Game-xs.jpg' },
    { title: 'Kingdom Battle 3D', embed: 'https://cloud.onlinegames.io/games/2025/unity2/kingdom-battle-3d/index-og.html', image: 'https://www.onlinegames.io/media/posts/991/responsive/Kingdom-Battle-3D-xs.jpg' },
    { title: 'Limousine Simulator', embed: 'https://www.onlinegames.io/games/2021/4/limousine-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/701/responsive/Limousine-Simulator-xs.jpg' },
    { title: 'Car Wash', embed: 'https://www.onlinegames.io/games/2023/unity2/car-wash/index.html', image: 'https://www.onlinegames.io/media/posts/407/responsive/Car-Wash-Online-Game-xs.jpg' },
    { title: 'Perfect First Date', embed: 'https://www.onlinegames.io/games/2021/3/perfect-first-date/index.html', image: 'https://www.onlinegames.io/media/posts/532/responsive/Perfect-First-Date-xs.jpg' },
    { title: 'Witch Beauty Salon', embed: 'https://www.onlinegames.io/games/2021/2/witch-beauty-salon/index.html', image: 'https://www.onlinegames.io/media/posts/544/responsive/Witch-Beauty-Salon-xs.jpg' },
    { title: 'Paw Clicker', embed: 'https://cloud.onlinegames.io/games/2025/construct/331/paw-clicker/index-og.html', image: 'https://www.onlinegames.io/media/posts/1077/responsive/Paw-Clicker-xs.webp' },
    { title: 'Head Basketball', embed: 'https://www.onlinegames.io/games/2022/unity/head-basketball/index.html', image: 'https://www.onlinegames.io/media/posts/486/responsive/Head-Basketball-xs.jpg' },
    { title: 'Find It', embed: 'https://cloud.onlinegames.io/games/2025/unity/find-it/index-og.html', image: 'https://www.onlinegames.io/media/posts/940/responsive/Find-It-xs.jpg' },
    { title: 'Crazy Moto Racing', embed: 'https://cloud.onlinegames.io/games/2022/unity3/crazy-moto-racing/index-og.html', image: 'https://www.onlinegames.io/media/posts/931/responsive/crazy-moto-racing-xs.jpg' },
    { title: 'Zombie Sniper', embed: 'https://www.onlinegames.io/games/2022/construct/116/zombie-sniper/index.html', image: 'https://www.onlinegames.io/media/posts/745/responsive/Zombie-Sniper-xs.jpg' },
    { title: 'Storm City Mafia', embed: 'https://www.onlinegames.io/games/2022/unity/storm-city-mafia/index.html', image: 'https://www.onlinegames.io/media/posts/480/responsive/Storm-City-Mafia-xs.jpg' },
    { title: 'Holiday Clicker', embed: 'https://www.onlinegames.io/games/2023/construct/288/xmas-cookie-clicker/index.html', image: 'https://www.onlinegames.io/media/posts/588/responsive/Xmas-Cookie-Clicker-xs.jpg' },
    { title: 'Dont Fall io', embed: 'https://www.onlinegames.io/games/2021/unity/dont-fall-io/index.html', image: 'https://www.onlinegames.io/media/posts/182/responsive/Dont-Fall-io-2-xs.jpg' },
    { title: 'Hover Racer Pro', embed: 'https://www.onlinegames.io/games/2021/unity/hover-racer-pro/index.html', image: 'https://www.onlinegames.io/media/posts/572/responsive/Hover-Racer-Pro-xs.jpg' },
    { title: 'Soul Essence Adventure', embed: 'https://www.onlinegames.io/games/2022/unity2/soul-essence-adventure/index.html', image: 'https://www.onlinegames.io/media/posts/549/responsive/Soul-Essence-Adventure-xs.jpg' },
    { title: 'Mini Shooters', embed: 'https://www.onlinegames.io/games/2021/5/mini-shooters/index.html', image: 'https://www.onlinegames.io/media/posts/206/responsive/Mini-Shooters-Online-xs.jpg' },
    { title: 'Idle Dev Startup', embed: 'https://www.onlinegames.io/games/2023/unity3/idle-dev-startup/index.html', image: 'https://www.onlinegames.io/media/posts/566/responsive/Idle-Dev-Startup-Game-xs.jpg' },
    { title: 'Formula 1 Driver', embed: 'https://www.onlinegames.io/games/2022/construct/133/formula-1-driver/index.html', image: 'https://www.onlinegames.io/media/posts/497/responsive/Formula-1-Driver-xs.jpg' },
    { title: 'Pinball Simulator', embed: 'https://www.onlinegames.io/games/2021/unity2/pinball-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/460/responsive/Pinball-Simulator-xs.jpg' },
    { title: 'Tiny Crash Fighters', embed: 'https://www.onlinegames.io/games/2023/construct/285/tiny-crash-fighters/index.html', image: 'https://www.onlinegames.io/media/posts/622/responsive/Tiny-Crash-Fighters-xs.jpg' },
    { title: 'Hook Wars', embed: 'https://www.onlinegames.io/games/2023/unity3/hook-wars/index.html', image: 'https://www.onlinegames.io/media/posts/610/responsive/Hook-Wars-xs.jpg' },
    { title: 'Romantic Secret Kiss', embed: 'https://www.onlinegames.io/games/2021/3/romantic-secret-kiss/index.html', image: 'https://www.onlinegames.io/media/posts/483/responsive/Romantic-Secret-Kiss-xs.jpg' },
    { title: 'Kings io', embed: 'https://cloud.onlinegames.io/games/2025/construct/208/kings-io/index-og.html', image: 'https://www.onlinegames.io/media/posts/952/responsive/Kings-io-xs.jpg' },
    { title: 'War of Ships io', embed: 'https://www.onlinegames.io/games/2022/unity3/war-of-ships-io/index.html', image: 'https://www.onlinegames.io/media/posts/509/responsive/War-of-Ships-io-xs.jpg' },
    { title: 'Baby Beauty Salon', embed: 'https://www.onlinegames.io/games/2021/2/baby-beauty-salon/index.html', image: 'https://www.onlinegames.io/media/posts/774/responsive/Baby-Beauty-Salon-xs.jpg' },
    { title: 'Solitaire Adventure', embed: 'https://www.onlinegames.io/games/2022/unity4/solitaire-adventure/index.html', image: 'https://www.onlinegames.io/media/posts/519/responsive/Solitaire-Adventure-Tripeaks-xs.jpg' },
    { title: 'Kawaii Shooter', embed: 'https://cloud.onlinegames.io/games/2024/unity/kawaii-shooter/index-og.html', image: 'https://www.onlinegames.io/media/posts/844/responsive/Kawaii-Shooter-xs.jpg' },
    { title: 'Draw The Bridge', embed: 'https://www.onlinegames.io/games/2021/4/draw-the-bridge/index.html', image: 'https://www.onlinegames.io/media/posts/164/responsive/Draw-the-Bridge-Game-xs.jpg' },
    { title: 'Mad Doctor', embed: 'https://www.onlinegames.io/games/2021/4/mad-doctor/index.html', image: 'https://www.onlinegames.io/media/posts/494/responsive/Mad-Doctor-xs.jpg' },
    { title: 'Pets Beauty Salon', embed: 'https://www.onlinegames.io/games/2021/2/pets-beauty-salon/index.html', image: 'https://www.onlinegames.io/media/posts/474/responsive/Pets-Beauty-Salon-xs.jpg' },
    { title: 'Speed Drift Racing', embed: 'https://www.onlinegames.io/games/2022/construct/124/speed-drift-racing/index.html', image: 'https://www.onlinegames.io/media/posts/801/responsive/Speed-Drift-Racing-xs.jpg' },
    { title: 'Princesses Prom Night', embed: 'https://www.onlinegames.io/games/2021/3/princesses-prom-night/index.html', image: 'https://www.onlinegames.io/media/posts/498/responsive/Princesses-Prom-Night-xs.jpg' },
    { title: 'Zombie War Defense', embed: 'https://www.onlinegames.io/games/2022/unity/zombie-war-defense/index.html', image: 'https://www.onlinegames.io/media/posts/466/responsive/Zombie-War-Defense-Game-xs.jpg' },
    { title: 'Princess Beauty Salon', embed: 'https://www.onlinegames.io/games/2021/1/princess-beauty-salon/index.html', image: 'https://www.onlinegames.io/media/posts/525/responsive/Princess-Beauty-Salon-xs.jpg' },
    { title: 'Skateboard Marathon', embed: 'https://www.onlinegames.io/games/2022/unity3/skateboard-marathon/index.html', image: 'https://www.onlinegames.io/media/posts/518/responsive/Skateboard-Marathon-xs.jpg' },
    { title: 'Head Soccer Football', embed: 'https://www.onlinegames.io/games/2022/unity/head-soccer-football/index.html', image: 'https://www.onlinegames.io/media/posts/482/responsive/Head-Soccer-Football-xs.jpg' },
    { title: 'First Day of School', embed: 'https://www.onlinegames.io/games/2021/3/first-day-of-school/index.html', image: 'https://www.onlinegames.io/media/posts/514/responsive/First-Day-of-School-xs.jpg' },
    { title: 'Army Driver', embed: 'https://www.onlinegames.io/games/2022/construct/63/army-driver/index.html', image: 'https://www.onlinegames.io/media/posts/424/responsive/Army-Driver-xs.jpg' },
    { title: 'Unicorn Beauty Salon', embed: 'https://www.onlinegames.io/games/2021/1/unicorn-beauty-salon/index.html', image: 'https://www.onlinegames.io/media/posts/517/responsive/Unicorn-Beauty-Salon-xs.jpg' },
    { title: 'War Simulator', embed: 'https://www.onlinegames.io/games/2021/unity2/war-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/821/responsive/War-Simulator-xs.jpg' },
    { title: 'Apocalypse Truck', embed: 'https://cloud.onlinegames.io/games/2021/1/apocalypse-truck/index-og.html', image: 'https://www.onlinegames.io/media/posts/1015/responsive/apocalypse-truck-xs.jpg' },
    { title: 'Cross the Road', embed: 'https://www.onlinegames.io/games/2023/unity/cross-the-road/index.html', image: 'https://www.onlinegames.io/media/posts/734/responsive/Cross-the-Road-xs.jpg' },
    { title: 'Draw Here', embed: 'https://www.onlinegames.io/games/2021/unity2/draw-here/index.html', image: 'https://www.onlinegames.io/media/posts/567/responsive/Draw-Here-xs.jpg' },
    { title: 'Highway Moto', embed: 'https://cloud.onlinegames.io/games/2024/unity/highway-moto/index-og.html', image: 'https://www.onlinegames.io/media/posts/851/responsive/highway-moto-xs.jpg' },
    { title: 'Train Racing', embed: 'https://www.onlinegames.io/games/2022/construct/120/train-racing/index.html', image: 'https://www.onlinegames.io/media/posts/445/responsive/Train-Racing-Game-xs.jpg' },
    { title: 'Draw the Truck Bridge', embed: 'https://www.onlinegames.io/games/2022/construct/149/draw-the-truck-bridge/index.html', image: 'https://www.onlinegames.io/media/posts/724/responsive/Draw-the-Truck-Bridge-xs.jpg' },
    { title: 'Blocky Blast', embed: 'https://www.onlinegames.io/games/2022/unity3/blocky-blast/index.html', image: 'https://www.onlinegames.io/media/posts/551/responsive/Blocky-Blast-xs.jpg' },
    { title: 'Trains io', embed: 'https://www.onlinegames.io/games/2023/construct/235/trains-io/index.html', image: 'https://www.onlinegames.io/media/posts/470/responsive/Trains-io-Game-xs.jpg' },
    { title: 'Monster Truck Race Arena', embed: 'https://cloud.onlinegames.io/games/2021/3/monster-truck-race-arena/index-og.html', image: 'https://www.onlinegames.io/media/posts/996/responsive/Monster-Truck-Race-Arena-xs.jpg' },
    { title: 'Idle Restaurant', embed: 'https://www.onlinegames.io/games/2023/unity2/idle-restaurant/index.html', image: 'https://www.onlinegames.io/media/posts/453/responsive/Idle-Restaurant-xs.jpg' },
    { title: 'Nova Billiard', embed: 'https://www.onlinegames.io/games/2021/unity2/nova-billiard/index.html', image: 'https://www.onlinegames.io/media/posts/456/responsive/Nova-Billiard-Game-xs.jpg' },
    { title: 'Dockyard Tank Parking', embed: 'https://www.onlinegames.io/games/2021/unity/dockyard-tank-parking/index.html', image: 'https://www.onlinegames.io/media/posts/603/responsive/Dockyard-Tank-Parking-xs.jpg' },
    { title: 'Pyramid Solitaire', embed: 'https://cloud.onlinegames.io/games/2025/html/solitaire/index-og.html#pyramid', image: 'https://www.onlinegames.io/media/posts/1006/responsive/pyramid-Solitaire-xs.jpg' },
    { title: 'The Farmer', embed: 'https://www.onlinegames.io/games/2022/unity/the-farmer/index.html', image: 'https://www.onlinegames.io/media/posts/533/responsive/The-Farmer-xs.jpg' },
    { title: 'Owl and Rabbit Fashion', embed: 'https://www.onlinegames.io/games/2021/2/owl-and-rabbit-fashion/index.html', image: 'https://www.onlinegames.io/media/posts/475/responsive/Owl-and-Rabbit-Fashion-xs.jpg' },
    { title: 'Snake Wars', embed: 'https://www.onlinegames.io/games/2024/unity/snake-wars/index.html', image: 'https://www.onlinegames.io/media/posts/638/responsive/Snake-Wars-Free-Game-xs.jpg' },
    { title: 'Zombie Road', embed: 'https://www.onlinegames.io/games/2021/unity2/zombie-road/index.html', image: 'https://www.onlinegames.io/media/posts/631/responsive/Zombie-Road-xs.jpg' },
    { title: 'ToonZ io', embed: 'https://www.onlinegames.io/games/2021/unity3/toonz-io/index.html', image: 'https://www.onlinegames.io/media/posts/230/responsive/Toonz-io-Game-xs.jpg' },
    { title: 'Paradise Girls', embed: 'https://www.onlinegames.io/games/2021/4/paradise-girls/index.html', image: 'https://www.onlinegames.io/media/posts/556/responsive/Pradise-Girls-xs.jpg' },
    { title: 'Darkness Survivors', embed: 'https://www.onlinegames.io/games/2024/q2/darkness-survivors/index.html', image: 'https://www.onlinegames.io/media/posts/696/responsive/Darkness-Survivors-xs.jpg' },
    { title: 'Monster Truck Booster', embed: 'https://cloud.onlinegames.io/games/2024/construct/223/monster-truck-booster/index-og.html', image: 'https://www.onlinegames.io/media/posts/925/responsive/monster-truck-booster-xs.jpg' },
    { title: 'Jul Moto Racing ', embed: 'https://cloud.onlinegames.io/games/2022/construct/122/jul-moto-racing/index-og.html', image: 'https://www.onlinegames.io/media/posts/1041/responsive/jul_moto_racing_game-2-xs.webp' },
    { title: 'Funny Shooter Bro', embed: 'https://www.onlinegames.io/games/2024/unity/funny-shooter-bro/index.html', image: 'https://www.onlinegames.io/media/posts/735/responsive/Funny-Shooter-Bro-xs.jpg' },
    { title: 'Tank Racing', embed: 'https://www.onlinegames.io/games/2022/construct/151/tank-racing/index.html', image: 'https://www.onlinegames.io/media/posts/484/responsive/Tank-Racing-Online-xs.jpg' },
    { title: 'Squid Race Simulator', embed: 'https://www.onlinegames.io/games/2021/unity3/squid-race-simulator/index.html', image: 'https://www.onlinegames.io/media/posts/950/responsive/squid-race-simulator-xs.jpg' },
    { title: 'Mafia Getaway Cars', embed: 'https://cloud.onlinegames.io/games/2025/construct/298/mafia-getaway-cars/index-og.html', image: 'https://www.onlinegames.io/media/posts/982/responsive/Mafia-Getaway-Cars-xs.jpg' },
    { title: 'Rescue Helicopter', embed: 'https://www.onlinegames.io/games/2021/2/rescue-helicopter/index.html', image: 'https://www.onlinegames.io/media/posts/468/responsive/Rescue-Helicopter-xs.jpg' },
    { title: 'Racing Cars', embed: 'https://www.onlinegames.io/games/2021/1/racing-cars/index.html', image: 'https://www.onlinegames.io/media/posts/661/responsive/Racing-Cars-xs.jpg' },
    { title: 'Monster Truck Racing', embed: 'https://www.onlinegames.io/games/2021/1/monster-truck-racing/index.html', image: 'https://www.onlinegames.io/media/posts/826/responsive/Monster-Truck-Racing-xs.jpg' },
    { title: 'Space Crew Mystery', embed: 'https://www.onlinegames.io/games/2023/construct/234/among-impostor/index.html', image: 'https://www.onlinegames.io/media/posts/472/responsive/Among-Impostor-xs.jpg' },
    { title: 'Speedrun Parkour', embed: 'https://www.onlinegames.io/games/2022/construct/145/speedrun-parkour/index.html', image: 'https://www.onlinegames.io/media/posts/759/responsive/Speedrun-Parkour-xs.jpg' },
    { title: 'Truck Racing', embed: 'https://www.onlinegames.io/games/2022/construct/144/truck-racing/index.html', image: 'https://www.onlinegames.io/media/posts/712/responsive/Truck-Racing-xs.jpg' },
    { title: 'Crazy Ball Adventures', embed: 'https://www.onlinegames.io/games/2021/unity2/crazy-ball-adventures/index.html', image: 'https://www.onlinegames.io/media/posts/760/responsive/Crazy-Ball-Game-xs.jpg' },
    { title: 'Beat Rush', embed: 'https://www.onlinegames.io/games/2023/construct/279/geometry-rash/index.html', image: 'https://www.onlinegames.io/media/posts/616/responsive/Geometry-Rash-xs.jpg' },
    { title: 'Legends Arena', embed: 'https://www.onlinegames.io/games/2023/unity2/legends-arena/index.html', image: 'https://www.onlinegames.io/media/posts/608/responsive/Legends-Arena-xs.jpg' },
    { title: 'Sweet Sugar Match', embed: 'https://www.onlinegames.io/games/2022/unity/sweet-sugar-match/index.html', image: 'https://www.onlinegames.io/media/posts/576/responsive/Sweet-Sugar-Match-xs.jpg' },
    { title: 'Racing Cars 2', embed: 'https://www.onlinegames.io/games/2021/4/racing-cars-2/index.html', image: 'https://www.onlinegames.io/media/posts/762/responsive/Racing-Cars-2-xs.jpg' },
    { title: 'Draw the Bird Path', embed: 'https://www.onlinegames.io/games/2022/construct/147/draw-the-bird-path/index.html', image: 'https://www.onlinegames.io/media/posts/587/responsive/Draw-the-Bird-Path-xs.jpg' },
    { title: 'Egg Helix', embed: 'https://www.onlinegames.io/games/2022/unity2/egg-helix/index.html', image: 'https://www.onlinegames.io/media/posts/604/responsive/Egg-Helix-xs.jpg' },
    { title: 'Mr Space Bullet', embed: 'https://www.onlinegames.io/games/2021/4/mr-space-bullet/index.html', image: 'https://www.onlinegames.io/media/posts/707/responsive/Mr-Space-Bullet-xs.jpg' },
    { title: 'Crazy Hill Climb', embed: 'https://www.onlinegames.io/games/2023/construct/209/crazy-hill-climb/index.html', image: 'https://www.onlinegames.io/media/posts/520/responsive/Crazy-Hill-Climb-xs.jpg' },
    { title: 'Treasure Hunter', embed: 'https://www.onlinegames.io/games/2022/construct/164/treasure-hunter/index.html', image: 'https://www.onlinegames.io/media/posts/812/responsive/Treasure-Hunter-xs.jpg' },
    { title: 'Dino Chaos Idle', embed: 'https://www.onlinegames.io/games/2023/unity3/dino-chaos-idle/index.html', image: 'https://www.onlinegames.io/media/posts/614/responsive/Dino-Chaos-Idle-xs.jpg' },
    { title: 'Kick the Pirate', embed: 'https://cloud.onlinegames.io/games/2022/construct/92/kick-the-pirate/index-og.html', image: 'https://www.onlinegames.io/media/posts/1012/responsive/Kick-The-Pirate-xs.jpg' },
    { title: 'Hill Climb Cars', embed: 'https://www.onlinegames.io/games/2021/3/hill-climb-cars/index.html', image: 'https://www.onlinegames.io/media/posts/648/responsive/Hill-Climb-Cars-xs.jpg' },
    { title: 'Run 3 Space', embed: 'https://www.onlinegames.io/games/2023/construct/192/run-3-space/index.html', image: 'https://www.onlinegames.io/media/posts/579/responsive/Run-3-Space-xs.jpg' },
    { title: 'Descent Runner', embed: 'https://game.azgame.io/slope-rider/', image: 'https://azgames.io/upload/cache/upload/imgs/sloperider4-m200x200.webp' },
    { title: 'Wacky Flip', embed: 'https://game.azgame.io/wacky-flip/', image: 'https://azgames.io/upload/cache/upload/imgs/wackyflip-m180x180.png' },
    { title: 'Steal Brainrots', embed: 'https://gamea.azgame.io/steal-brainrots/', image: 'https://azgames.io/upload/cache/upload/imgs/stealbrainrots3-m180x180.png' },
    { title: 'Escape Road', embed: 'https://azgames.io/escape-road.embed', image: 'https://azgames.io/upload/cache/upload/imgs/escaperoad-m180x180.png' },
    { title: 'Curve Rush', embed: 'https://game.azgame.io/curve-rush/', image: 'https://azgames.io/upload/cache/upload/imgs/curverush2-m180x180.png' },
    { title: 'Traffic Road', embed: 'https://azgames.io/traffic-road.embed', image: 'https://azgames.io/upload/cache/upload/imgs/trafficroad-m180x180.png' },
    { title: 'Italian Brainrot Clicker 2', embed: 'https://game.azgame.io/italian-brainrot-clicker-2/', image: 'https://azgames.io/upload/cache/upload/imgs/italianbrainrotclicker3-m180x180.png' },
    { title: 'Undead Corridor', embed: 'https://gamea.azgame.io/undead-corridor/', image: 'https://azgames.io/upload/cache/upload/imgs/undeadcorridor2-m200x200.webp' },
    { title: 'Golf Hit', embed: 'https://game.azgame.io/golf-hit/', image: 'https://azgames.io/upload/cache/upload/imgs/golfhit2-m180x180.png' },
    { title: 'Geometry Dasher Lite', embed: 'https://files.rocketgames.io/uploads/games/g/geometry-dash-lite/files/f76f8e/index.html', image: 'https://www.onlinegames.io/media/posts/510/responsive/Geometry-Dash-FreezeNova-xs.jpg' }
];


// Fuzzy search function for game titles
function fuzzySearch(query, text) {
    if (!query) return true;
    query = query.toLowerCase();
    text = text.toLowerCase();
    
    // Exact match gets highest priority
    if (text.includes(query)) return true;
    
    // Check if all characters in query appear in order in text
    let queryIndex = 0;
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
        if (text[i] === query[queryIndex]) {
            queryIndex++;
        }
    }
    return queryIndex === query.length;
}

// Calculate similarity score for sorting
function calculateSimilarity(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();
    
    if (text === query) return 100;
    if (text.startsWith(query)) return 90;
    if (text.includes(query)) return 80;
    
    // Count matching characters in order
    let matches = 0;
    let queryIndex = 0;
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
        if (text[i] === query[queryIndex]) {
            matches++;
            queryIndex++;
        }
    }
    
    return (matches / query.length) * 70;
}

// Filter and render games
// Render games in a specific container (for search results on main page)
function renderGamesGridInContainer(filteredGames = null, container) {
    if (!container) return;
    
    const gamesToRender = filteredGames || gameSites;
    
    container.innerHTML = gamesToRender.map((site, index) => {
        const title = site.title || 'Game';
        const embed = site.embed || '';
        const image = site.image || '';
        const gameKey = getGameKey(embed);
        const ratingData = gameRatings[gameKey] || { average: 0, count: 0 };
        const avgRating = ratingData.average || 0;
        
        return `
            <div class="game-cube" data-embed="${embed}" data-index="${index}" style="animation-delay: ${index * 0.03}s;">
                <div class="game-cube-inner">
                    <div class="game-cube-image" style="background-image: url('${image}');"></div>
                    <div class="game-cube-title">${title}</div>
                    <div class="game-cube-rating" data-embed="${embed}" data-game-key="${gameKey}">
                        <div class="game-cube-stars">
                            ${[1, 2, 3, 4, 5].map(star => `
                                <i class="fas fa-star ${star <= Math.round(avgRating) ? 'active' : ''}" 
                                   data-rating="${star}"></i>
                            `).join('')}
                        </div>
                        <div class="game-cube-rating-text">
                            ${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'} 
                            ${ratingData.count > 0 ? `(${ratingData.count})` : ''}
                        </div>
                    </div>
                    <div class="game-cube-glow"></div>
                </div>
            </div>
        `;
    }).join('');
    
    // Helper function to convert title to filename
    function titleToFilename(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    // Helper function to get correct games path based on current location
    function getGamesPath(filename) {
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        return isInPagesFolder ? `../games/${filename}` : `games/${filename}`;
    }
    
    // Add click handlers - navigate to game detail page
    container.querySelectorAll('.game-cube').forEach(cube => {
        cube.addEventListener('click', (e) => {
            // Don't trigger if clicking on rating stars
            if (e.target.closest('.game-cube-rating')) {
                return;
            }
            const embed = cube.getAttribute('data-embed');
            const title = cube.querySelector('.game-cube-title').textContent;
            const filename = `game-${titleToFilename(title)}.html`;
            window.location.href = getGamesPath(filename);
        });
    });
    
    // Add rating click handlers
    container.querySelectorAll('.game-cube-stars .fa-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const rating = parseInt(star.getAttribute('data-rating'));
            const ratingContainer = star.closest('.game-cube-rating');
            const embed = ratingContainer.getAttribute('data-embed');
            const gameKey = ratingContainer.getAttribute('data-game-key');
            submitGameRating(gameKey, embed, rating);
        });
    });
}

function renderGamesGrid(filteredGames = null) {
    const gamesGrid = document.getElementById('gamesGrid');
    if (!gamesGrid) {
        console.warn('gamesGrid element not found in DOM');
        return;
    }
    
    const gamesToRender = filteredGames || gameSites;
    
    if (!gamesToRender || gamesToRender.length === 0) {
        console.warn('No games to render');
        gamesGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 40px;">No games found. Please try refreshing the page.</p>';
        return;
    }
    
    console.log('Rendering', gamesToRender.length, 'games');
    
    gamesGrid.innerHTML = gamesToRender.map((site, index) => {
        const title = site.title || 'Game';
        const embed = site.embed || '';
        const image = site.image || '';
        const gameKey = getGameKey(embed);
        const ratingData = gameRatings[gameKey] || { average: 0, count: 0 };
        const avgRating = ratingData.average || 0;
        
        return `
            <div class="game-cube" data-embed="${embed}" data-index="${index}" style="animation-delay: ${index * 0.03}s;">
                <div class="game-cube-inner">
                    <div class="game-cube-image" style="background-image: url('${image}');"></div>
                    <div class="game-cube-title">${title}</div>
                    <div class="game-cube-rating" data-embed="${embed}" data-game-key="${gameKey}">
                        <div class="game-cube-stars">
                            ${[1, 2, 3, 4, 5].map(star => `
                                <i class="fas fa-star ${star <= Math.round(avgRating) ? 'active' : ''}" 
                                   data-rating="${star}"></i>
                            `).join('')}
                        </div>
                        <div class="game-cube-rating-text">
                            ${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'} 
                            ${ratingData.count > 0 ? `(${ratingData.count})` : ''}
                        </div>
                    </div>
                    <div class="game-cube-glow"></div>
                </div>
            </div>
        `;
    }).join('');
    
    // Helper function to convert title to filename
    function titleToFilename(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    // Helper function to get correct games path based on current location
    function getGamesPath(filename) {
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        return isInPagesFolder ? `../games/${filename}` : `games/${filename}`;
    }
    
    // Add click handlers - navigate to game detail page
    gamesGrid.querySelectorAll('.game-cube').forEach(cube => {
        cube.addEventListener('click', (e) => {
            // Don't trigger if clicking on rating stars
            if (e.target.closest('.game-cube-rating')) {
                return;
            }
            const embed = cube.getAttribute('data-embed');
            const title = cube.querySelector('.game-cube-title').textContent;
            const filename = `game-${titleToFilename(title)}.html`;
            window.location.href = getGamesPath(filename);
        });
    });
    
    // Add rating click handlers
    gamesGrid.querySelectorAll('.game-cube-stars .fa-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const rating = parseInt(star.getAttribute('data-rating'));
            const ratingContainer = star.closest('.game-cube-rating');
            const embed = ratingContainer.getAttribute('data-embed');
            const gameKey = ratingContainer.getAttribute('data-game-key');
            submitGameRating(gameKey, embed, rating);
        });
    });
}

// Load games from JSON and categorize
// Note: allGamesFromJSON and categorizedGames are already declared at the top of the file

async function loadGamesFromJSON() {
    try {
        // Determine the correct path based on current page location
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        const gamesJsonPath = isInPagesFolder ? '../data/games.json' : 'data/games.json';
        const response = await fetch(gamesJsonPath);
        const loadedGames = await response.json();
        allGamesFromJSON = loadedGames;
        
        // Convert to gameSites format and merge with existing
        const jsonGames = loadedGames.map(game => ({
            title: game.title,
            embed: game.embed,
            image: game.image,
            tags: game.tags || '',
            description: game.description || ''
        }));
        
        // Merge with existing gameSites (prioritize JSON data)
        const existingEmbeds = new Set(jsonGames.map(g => g.embed));
        const additionalGames = gameSites.filter(g => !existingEmbeds.has(g.embed));
        // Add tags to additional games based on their titles
        const additionalGamesWithTags = additionalGames.map(game => {
            const title = (game.title || '').toLowerCase();
            let tags = '';
            
            // Infer tags from title
            if (title.includes('race') || title.includes('drift') || title.includes('car') || title.includes('driving')) {
                tags += 'racing,car,driving,';
            }
            if (title.includes('puzzle') || title.includes('match') || title.includes('block')) {
                tags += 'puzzle,brain,logic,';
            }
            if (title.includes('action') || title.includes('battle') || title.includes('combat')) {
                tags += 'action,arcade,battle,';
            }
            if (title.includes('shooter') || title.includes('sniper') || title.includes('gun')) {
                tags += 'shooting,fps,gun,';
            }
            if (title.includes('simulator') || title.includes('simulation')) {
                tags += 'simulator,simulation,';
            }
            if (title.includes('adventure') || title.includes('parkour')) {
                tags += 'adventure,parkour,';
            }
            if (title.includes('basketball') || title.includes('football') || title.includes('soccer')) {
                tags += 'sports,basketball,football,';
            }
            
            return {
                ...game,
                tags: tags || 'free,game'
            };
        });
        
        gameSites = [...jsonGames, ...additionalGamesWithTags];
        
        // Categorize games
        categorizeAllGames();
        
        // Initialize featured sections on homepage
        if (document.getElementById('featuredGamesSections')) {
            renderFeaturedSections();
        } else {
            // Fallback to old system if featured sections don't exist
            filterGamesByCategory('trending');
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Error loading games from JSON:', error);
        // Fallback to existing gameSites - add tags to them
        // Check if gameSites is initialized before using it
        if (typeof gameSites !== 'undefined' && gameSites && gameSites.length > 0) {
            gameSites = gameSites.map(game => {
            if (!game.tags) {
                const title = (game.title || '').toLowerCase();
                let tags = '';
                
                // Infer tags from title
                if (title.includes('race') || title.includes('drift') || title.includes('car') || title.includes('driving')) {
                    tags += 'racing,car,driving,';
                }
                if (title.includes('puzzle') || title.includes('match') || title.includes('block')) {
                    tags += 'puzzle,brain,logic,';
                }
                if (title.includes('action') || title.includes('battle') || title.includes('combat')) {
                    tags += 'action,arcade,battle,';
                }
                if (title.includes('shooter') || title.includes('sniper') || title.includes('gun')) {
                    tags += 'shooting,fps,gun,';
                }
                if (title.includes('simulator') || title.includes('simulation')) {
                    tags += 'simulator,simulation,';
                }
                if (title.includes('adventure') || title.includes('parkour')) {
                    tags += 'adventure,parkour,';
                }
                if (title.includes('basketball') || title.includes('football') || title.includes('soccer')) {
                    tags += 'sports,basketball,football,';
                }
                
                return {
                    ...game,
                    tags: tags || 'free,game'
                };
            }
            return game;
        });
        
        if (document.getElementById('featuredGamesSections')) {
            categorizeAllGames();
            renderFeaturedSections();
        } else {
            filterGamesByCategory('trending');
        }
        } else {
            console.warn('gameSites not initialized, cannot add tags');
            // Try to use the initial gameSites array if it exists
            if (typeof gameSites !== 'undefined' && gameSites && gameSites.length > 0) {
                // Just render what we have
                if (document.getElementById('featuredGamesSections')) {
                    categorizeAllGames();
                    renderFeaturedSections();
                }
            }
        }
        
        return Promise.resolve();
    }
}

function categorizeAllGames() {
    categorizedGames = {
        racing: [],
        puzzle: [],
        action: [],
        strategy: [],
        adventure: [],
        shooting: [],
        sports: [],
        simulation: [],
        new: []
    };
    
    gameSites.forEach((game, index) => {
        const tags = (game.tags || '').toLowerCase();
        const stats = getGameStats(game.embed);
        const gameKey = getGameKey(game.embed);
        const ratingData = gameRatings[gameKey] || { average: 0, count: 0 };
        
        const gameWithData = {
            ...game,
            clicks: stats ? stats.clicks : 0,
            rating: ratingData.average || 0,
            ratingCount: ratingData.count || 0,
            index: index
        };
        
        // Categorize by tags
        if (tags.includes('racing') || tags.includes('drift') || tags.includes('driving') || tags.includes('car')) {
            categorizedGames.racing.push(gameWithData);
        }
        if (tags.includes('puzzle') || tags.includes('brain') || tags.includes('logic') || tags.includes('match')) {
            categorizedGames.puzzle.push(gameWithData);
        }
        if (tags.includes('action') || tags.includes('arcade') || tags.includes('battle')) {
            categorizedGames.action.push(gameWithData);
        }
        if (tags.includes('strategy') || tags.includes('tower-defense') || tags.includes('defense')) {
            categorizedGames.strategy.push(gameWithData);
        }
        if (tags.includes('adventure') || tags.includes('parkour') || tags.includes('platformer')) {
            categorizedGames.adventure.push(gameWithData);
        }
        if (tags.includes('shooting') || tags.includes('sniper') || tags.includes('fps') || tags.includes('gun')) {
            categorizedGames.shooting.push(gameWithData);
        }
        if (tags.includes('sports') || tags.includes('basketball') || tags.includes('football') || tags.includes('soccer')) {
            categorizedGames.sports.push(gameWithData);
        }
        if (tags.includes('simulator') || tags.includes('simulation') || tags.includes('tycoon')) {
            categorizedGames.simulation.push(gameWithData);
        }
        
        // New games (recently added or no clicks)
        if (!stats || stats.clicks === 0) {
            categorizedGames.new.push(gameWithData);
        }
    });
    
    // Sort each category
    categorizedGames.racing.sort((a, b) => (b.rating * b.ratingCount) - (a.rating * a.ratingCount));
    categorizedGames.puzzle.sort((a, b) => (b.rating * b.ratingCount) - (a.rating * a.ratingCount));
    categorizedGames.action.sort((a, b) => b.clicks - a.clicks);
    categorizedGames.strategy.sort((a, b) => (b.rating * b.ratingCount) - (a.rating * a.ratingCount));
    categorizedGames.adventure.sort((a, b) => b.clicks - a.clicks);
    categorizedGames.shooting.sort((a, b) => b.clicks - a.clicks);
    categorizedGames.sports.sort((a, b) => (b.rating * b.ratingCount) - (a.rating * a.ratingCount));
    categorizedGames.simulation.sort((a, b) => b.clicks - a.clicks);
    categorizedGames.new.sort((a, b) => b.index - a.index); // Newest first
}

function renderFeaturedSections() {
    const container = document.getElementById('featuredGamesSections');
    if (!container) return;
    
    // Featured sections configuration
    const sections = [
        {
            title: '⭐ New This Week',
            icon: 'fa-star',
            games: categorizedGames.new.slice(0, 6),
            category: 'new',
            link: 'pages/games-new.html'
        },
        {
            title: '🏆 Top Rated Racing Games',
            icon: 'fa-trophy',
            games: categorizedGames.racing.slice(0, 6),
            category: 'racing',
            link: 'pages/games-racing.html'
        },
        {
            title: '🧩 Best Puzzle Games',
            icon: 'fa-puzzle-piece',
            games: categorizedGames.puzzle.slice(0, 6),
            category: 'puzzle',
            link: 'pages/games-puzzle.html'
        },
        {
            title: '🎯 Top Action Games',
            icon: 'fa-crosshairs',
            games: categorizedGames.action.slice(0, 6),
            category: 'action',
            link: 'pages/games-action.html'
        }
    ];
    
    container.innerHTML = sections.map(section => {
        if (section.games.length === 0) return '';
        
        const gamesHTML = section.games.map((game, index) => {
            const gameKey = getGameKey(game.embed);
            const ratingData = gameRatings[gameKey] || { average: 0, count: 0 };
            const avgRating = ratingData.average || 0;
            const filename = `game-${game.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.html`;
            
            return `
                <div class="game-cube" data-embed="${game.embed}" style="animation-delay: ${index * 0.03}s;">
                    <div class="game-cube-inner">
                        <div class="game-cube-image" style="background-image: url('${game.image}');"></div>
                        <div class="game-cube-title">${game.title}</div>
                        <div class="game-cube-rating" data-embed="${game.embed}" data-game-key="${gameKey}">
                            <div class="game-cube-stars">
                                ${[1, 2, 3, 4, 5].map(star => `
                                    <i class="fas fa-star ${star <= Math.round(avgRating) ? 'active' : ''}" 
                                       data-rating="${star}"></i>
                                `).join('')}
                            </div>
                            <div class="game-cube-rating-text">
                                ${avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'} 
                                ${ratingData.count > 0 ? `(${ratingData.count})` : ''}
                            </div>
                        </div>
                        <div class="game-cube-glow"></div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="featured-section">
                <div class="featured-section-header">
                    <h3><i class="fas ${section.icon}"></i> ${section.title}</h3>
                    <a href="${section.link}" class="view-more-btn">View All <i class="fas fa-arrow-right"></i></a>
                </div>
                <div class="featured-games-grid">
                    ${gamesHTML}
                </div>
            </div>
        `;
    }).join('');
    
    // Helper function to get correct games path based on current location
    function getGamesPath(filename) {
        const isInPagesFolder = window.location.pathname.includes('/pages/');
        return isInPagesFolder ? `../games/${filename}` : `games/${filename}`;
    }
    
    // Add click handlers
    container.querySelectorAll('.game-cube').forEach(cube => {
        cube.addEventListener('click', (e) => {
            if (e.target.closest('.game-cube-rating')) return;
            const embed = cube.getAttribute('data-embed');
            const title = cube.querySelector('.game-cube-title').textContent;
            const filename = `game-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.html`;
            window.location.href = getGamesPath(filename);
        });
    });
    
    // Add rating handlers
    container.querySelectorAll('.game-cube-stars .fa-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            const rating = parseInt(star.getAttribute('data-rating'));
            const ratingContainer = star.closest('.game-cube-rating');
            const embed = ratingContainer.getAttribute('data-embed');
            const gameKey = ratingContainer.getAttribute('data-game-key');
            submitGameRating(gameKey, embed, rating);
        });
    });
}

// Initialize games grid
function initGamesGrid() {
    // Ensure games grid is visible
    const gamesGridContainer = document.getElementById('gamesGridContainer');
    if (gamesGridContainer) {
        gamesGridContainer.style.display = 'block';
    }
    
    // Load games from JSON and render featured sections
    // If on a category page, wait for games to load before filtering
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = window.location.pathname.includes('games-') ? 
        window.location.pathname.split('games-')[1]?.replace('.html', '') : null;
    
    // Check if we're on all-games page (multiple ways to detect)
    const isAllGamesPage = window.location.pathname.includes('all-games.html') || 
                          window.location.pathname.endsWith('all-games.html') ||
                          window.location.pathname.includes('/pages/all-games') ||
                          window.location.href.includes('all-games.html');
    
    // Function to render games on all-games page
    function renderAllGames() {
        if (!gameSites || gameSites.length === 0) {
            console.warn('No games available to render');
            return;
        }
        
        const gamesGrid = document.getElementById('gamesGrid');
        if (!gamesGrid) {
            console.warn('gamesGrid element not found');
            return;
        }
        
        if (typeof filterGamesByCategory === 'function') {
            filterGamesByCategory('all');
        } else if (typeof renderGamesGrid === 'function') {
            renderGamesGrid();
        } else {
            console.error('Neither filterGamesByCategory nor renderGamesGrid functions available');
        }
    }
    
    loadGamesFromJSON().then(() => {
        // Ensure games are loaded before filtering
        if (!gameSites || gameSites.length === 0) {
            console.warn('Games not loaded yet, retrying...');
            setTimeout(() => {
                if (gameSites && gameSites.length > 0) {
                    if (isAllGamesPage) {
                        renderAllGames();
                    } else if (categoryFromUrl && typeof filterGamesByCategory === 'function') {
                        filterGamesByCategory(categoryFromUrl);
                    }
                } else {
                    console.error('Games still not loaded after retry');
                }
            }, 500);
            return;
        }
        
        // If we're on a category page, filter by that category
        if (categoryFromUrl && typeof filterGamesByCategory === 'function') {
            filterGamesByCategory(categoryFromUrl);
        } else if (isAllGamesPage) {
            // On all-games page, show all games by default
            renderAllGames();
        }
    }).catch((error) => {
        console.error('Error loading games:', error);
        // Fallback: try to render games anyway if gameSites has data
        if (gameSites && gameSites.length > 0) {
            if (isAllGamesPage) {
                renderAllGames();
            } else if (typeof renderGamesGrid === 'function') {
                renderGamesGrid();
            }
        } else {
            // If still no games, wait a bit and try again
            setTimeout(() => {
                if (gameSites && gameSites.length > 0) {
                    if (isAllGamesPage) {
                        renderAllGames();
                    } else if (typeof filterGamesByCategory === 'function') {
                        filterGamesByCategory('all');
                    }
                } else {
                    console.error('Games failed to load after multiple attempts');
                }
            }, 1000);
        }
    });
    
    // Setup search functionality
    const searchInput = document.getElementById('gamesSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        // Debounce search for real-time updates
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = e.target.value.trim();
                
                if (query === '') {
                    // If no search query, hide search results and show normal view
                    const searchResultsGrid = document.getElementById('searchResultsGrid');
                    const featuredSections = document.getElementById('featuredGamesSections');
                    if (searchResultsGrid) searchResultsGrid.style.display = 'none';
                    if (featuredSections) featuredSections.style.display = 'block';
                    
                    // If on all-games page, apply category filter
                    const activeCategory = document.querySelector('.category-btn.active');
                    if (activeCategory) {
                        const category = activeCategory.getAttribute('data-category');
                        filterGamesByCategory(category);
                    } else {
                        const gamesGrid = document.getElementById('gamesGrid');
                        if (gamesGrid) {
                            renderGamesGrid();
                        }
                    }
                    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
                    return;
                }
                
                // Show clear button
                if (clearSearchBtn) clearSearchBtn.style.display = 'flex';
                
                // Hide featured sections and show search results on main page
                const featuredSections = document.getElementById('featuredGamesSections');
                const searchResultsGrid = document.getElementById('searchResultsGrid');
                if (featuredSections) featuredSections.style.display = 'none';
                if (searchResultsGrid) searchResultsGrid.style.display = 'grid';
                
                // Get current category filter
                const activeCategory = document.querySelector('.category-btn.active');
                const category = activeCategory ? activeCategory.getAttribute('data-category') : 'all';
                
                // Start with category-filtered games
                let gamesToSearch = [...gameSites];
                
                if (category !== 'all') {
                    // Apply category filter first
                    gamesToSearch = gamesToSearch.map(site => {
                        const stats = getGameStats(site.embed);
                        const gameKey = getGameKey(site.embed);
                        const ratingData = gameRatings[gameKey] || { average: 0, count: 0 };
                        return {
                            ...site,
                            clicks: stats ? stats.clicks : 0,
                            lastClicked: stats ? stats.lastClicked : 0,
                            firstClicked: stats ? stats.firstClicked : Date.now(),
                            rating: ratingData.average || 0,
                            ratingCount: ratingData.count || 0
                        };
                    });
                    
                    if (category === 'popular') {
                        // Filter to games with ratings, then sort by rating and review count
                        gamesToSearch = gamesToSearch.filter(game => game.ratingCount > 0);
                        gamesToSearch.sort((a, b) => {
                            // Primary sort: by rating (higher is better)
                            if (a.rating !== b.rating) {
                                return b.rating - a.rating;
                            }
                            // Secondary sort: by number of reviews (more reviews = more popular)
                            return b.ratingCount - a.ratingCount;
                        });
                    } else if (category === 'trending') {
                        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
                        gamesToSearch = gamesToSearch.filter(game => game.clicks > 0 && game.lastClicked > oneDayAgo);
                    } else if (category === 'new') {
                        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                        gamesToSearch = gamesToSearch.filter(game => game.firstClicked > sevenDaysAgo || game.clicks === 0);
                    }
                }
                
                // Then apply search filter
                const filtered = gamesToSearch
                    .map(site => ({
                        ...site,
                        similarity: calculateSimilarity(query, site.title || '')
                    }))
                    .filter(site => fuzzySearch(query, site.title || ''))
                    .sort((a, b) => b.similarity - a.similarity);
                
                // Render in appropriate container
                const gamesGrid = document.getElementById('gamesGrid');
                if (gamesGrid) {
                    // On all-games page, render in gamesGrid
                    renderGamesGrid(filtered);
                } else if (searchResultsGrid) {
                    // On main page, render in searchResultsGrid
                    renderGamesGridInContainer(filtered, searchResultsGrid);
                }
            }, 150);
        });
    }
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
            clearSearchBtn.style.display = 'none';
        });
    }
    
    // Default game button
    const defaultGameBtn = document.getElementById('defaultGameBtn');
    if (defaultGameBtn) {
        defaultGameBtn.addEventListener('click', () => {
            // Load slope game
            loadGameSite('https://slopeonline.online/', 'Descent Runner - Default Game');
        });
    }
    
    // Category buttons
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Filter games by category
            const category = btn.getAttribute('data-category');
            filterGamesByCategory(category);
            
            // Clear search when changing category
            if (searchInput) {
                searchInput.value = '';
                if (clearSearchBtn) clearSearchBtn.style.display = 'none';
            }
        });
    });
    
    // Initialize game stats tracking
    initGameStats();
    
    // Initialize game ratings tracking
    initGameRatings();
}

// Game stats tracking
// Note: gameStats and gameStatsListener are already declared at the top of the file

// Game ratings tracking
// Note: gameRatings and gameRatingsListener are already declared at the top of the file

// Generate consistent game key from embed URL
function getGameKey(embed) {
    if (!embed) return null;
    try {
        // Use a more consistent key generation
        const url = new URL(embed);
        const path = url.pathname + url.search;
        // Create a hash-like key from the full URL
        let hash = 0;
        const str = embed;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'game_' + Math.abs(hash).toString(36);
    } catch (e) {
        // Fallback to base64 if URL parsing fails
        return 'game_' + btoa(embed).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    }
}

// Get game stats for a specific embed URL
function getGameStats(embed) {
    if (!embed || !gameStats) return null;
    const gameKey = getGameKey(embed);
    if (!gameKey) return null;
    return gameStats[gameKey] || null;
}

// Filter games by category
function filterGamesByCategory(category) {
    try {
        // Ensure games are loaded
        if (!gameSites || gameSites.length === 0) {
            console.warn('No games loaded yet, waiting...');
            // Try to load games if not already loaded
            if (typeof loadGamesFromJSON === 'function') {
                loadGamesFromJSON().then(() => {
                    filterGamesByCategory(category);
                });
            }
            return;
        }
        
        let filtered = [...gameSites];
        
        if (category === 'all') {
            // Show all games
            console.log('Filtering all games, total:', filtered.length);
            renderGamesGrid(filtered);
            return;
        }
        
        // Filter by game tags/category (only if category is tag-based)
        if (category === 'racing') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                const title = (game.title || '').toLowerCase();
                return tags.includes('racing') || tags.includes('drift') || tags.includes('driving') || tags.includes('car') ||
                       title.includes('race') || title.includes('drift') || title.includes('car') || title.includes('highway') ||
                       title.includes('traffic') || title.includes('racer');
            });
        } else if (category === 'puzzle') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                const title = (game.title || '').toLowerCase();
                return tags.includes('puzzle') || tags.includes('brain') || tags.includes('logic') || tags.includes('match') ||
                       title.includes('puzzle') || title.includes('match') || title.includes('block') || title.includes('chess');
            });
        } else if (category === 'action') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                const title = (game.title || '').toLowerCase();
                return tags.includes('action') || tags.includes('arcade') || tags.includes('battle') ||
                       title.includes('battle') || title.includes('combat') || title.includes('war') || title.includes('strike');
            });
        } else if (category === 'shooting') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                const title = (game.title || '').toLowerCase();
                return tags.includes('shooting') || tags.includes('sniper') || tags.includes('fps') || tags.includes('gun') ||
                       title.includes('shooter') || title.includes('sniper') || title.includes('gun') || title.includes('shoot');
            });
        } else if (category === 'strategy') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                return tags.includes('strategy') || tags.includes('tower-defense') || tags.includes('defense');
            });
        } else if (category === 'adventure') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                return tags.includes('adventure') || tags.includes('parkour') || tags.includes('platformer');
            });
        } else if (category === 'sports') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                const title = (game.title || '').toLowerCase();
                return tags.includes('sports') || tags.includes('basketball') || tags.includes('football') || tags.includes('soccer') ||
                       title.includes('basketball') || title.includes('football') || title.includes('soccer');
            });
        } else if (category === 'simulation') {
            filtered = filtered.filter(game => {
                const tags = (game.tags || '').toLowerCase();
                const title = (game.title || '').toLowerCase();
                return tags.includes('simulator') || tags.includes('simulation') || tags.includes('tycoon') ||
                       title.includes('simulator') || title.includes('simulation');
            });
        }
        
        // If no games match, show all games with a warning
        if (filtered.length === 0) {
            console.warn(`No games found for category: ${category}, showing all games`);
            filtered = [...gameSites];
        }
        
        // Add stats and ratings to each game (with error handling)
        filtered = filtered.map(site => {
            try {
                const stats = getGameStats(site.embed);
                const gameKey = getGameKey(site.embed);
                const ratingData = gameRatings[gameKey] || { average: 0, count: 0 };
                return {
                    ...site,
                    clicks: stats ? stats.clicks : 0,
                    lastClicked: stats ? stats.lastClicked : 0,
                    firstClicked: stats ? stats.firstClicked : Date.now(),
                    rating: ratingData.average || 0,
                    ratingCount: ratingData.count || 0
                };
            } catch (e) {
                // If stats fail, just use defaults
                const gameKey = getGameKey(site.embed);
                const ratingData = gameRatings[gameKey] || { average: 0, count: 0 };
                return {
                    ...site,
                    clicks: 0,
                    lastClicked: 0,
                    firstClicked: Date.now(),
                    rating: ratingData.average || 0,
                    ratingCount: ratingData.count || 0
                };
            }
        });
    
    if (category === 'popular') {
        // Sort by highest star rating and most reviews (most popular)
        filtered.sort((a, b) => {
            // Primary sort: by rating (higher is better)
            if (a.rating !== b.rating) {
                return b.rating - a.rating;
            }
            // Secondary sort: by number of reviews (more reviews = more popular)
            if (a.ratingCount !== b.ratingCount) {
                return b.ratingCount - a.ratingCount;
            }
            // Tertiary sort: by clicks as tiebreaker
            return b.clicks - a.clicks;
        });
    } else if (category === 'trending') {
        // Sort by recent activity (last 24-48 hours weighted heavily)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
        
        // Calculate trending scores for all games
        const allGamesWithScores = filtered.map(game => {
            const now = Date.now();
            let trendingScore = 0;
            
            if (game.clicks > 0) {
                // Base score from total clicks (logarithmic to prevent old games from dominating)
                const baseScore = Math.log10(game.clicks + 1) * 10;
                
                // Recent activity boost
                if (game.lastClicked > oneDayAgo) {
                    // Very recent (last 24 hours) - high boost
                    trendingScore = baseScore * 3;
                } else if (game.lastClicked > twoDaysAgo) {
                    // Recent (last 48 hours) - medium boost
                    trendingScore = baseScore * 1.5;
                } else {
                    // Older - lower score
                    trendingScore = baseScore * 0.5;
                }
                
                // Add recency decay factor
                const hoursSinceLastClick = (now - game.lastClicked) / (1000 * 60 * 60);
                const recencyFactor = Math.max(0, 1 - (hoursSinceLastClick / 72)); // Decay over 3 days
                trendingScore *= (1 + recencyFactor);
            }
            
            return { ...game, trendingScore: trendingScore };
        });
        
        // Separate trending games (with clicks) from non-trending games
        const trendingGames = allGamesWithScores
            .filter(game => game.clicks > 0)
            .sort((a, b) => b.trendingScore - a.trendingScore);
        
        // Get non-trending games (games with 0 clicks or very low scores)
        const nonTrendingGames = allGamesWithScores
            .filter(game => game.clicks === 0 || game.trendingScore < 1)
            .sort((a, b) => {
                // Sort by clicks first, then by array position (newer games first)
                if (b.clicks !== a.clicks) return b.clicks - a.clicks;
                // For games with same clicks, prefer newer ones (higher index in original array)
                const indexA = gameSites.findIndex(s => s.embed === a.embed);
                const indexB = gameSites.findIndex(s => s.embed === b.embed);
                return indexB - indexA;
            });
        
        // Combine: trending games first, then fill with other games
        filtered = [...trendingGames, ...nonTrendingGames];
    } else if (category === 'new') {
        // Show games that haven't been clicked yet (newly added) or recently added
        // Prioritize games with 0 clicks (newest additions)
        filtered = filtered.filter(game => game.clicks === 0);
        // Sort by array index (newer games are at the end of the array)
        const gameIndexMap = new Map();
        gameSites.forEach((site, index) => {
            gameIndexMap.set(site.embed, index);
        });
        filtered.sort((a, b) => {
            const indexA = gameIndexMap.get(a.embed) || 0;
            const indexB = gameIndexMap.get(b.embed) || 0;
            return indexB - indexA; // Newer games (higher index) first
        });
    }
    
        renderGamesGrid(filtered);
    } catch (e) {
        console.error('Error filtering games:', e);
        // Fallback: just render all games
        if (gameSites && gameSites.length > 0) {
            renderGamesGrid([...gameSites]);
        } else {
            console.error('No games available to render');
        }
    }
}

// Initialize game stats listener
function initGameStats() {
    if (!db) return;
    
    const statsRef = db.ref('gameStats');
    
    // Make Descent Runner popular by initializing it with clicks
    const slopeRiderEmbed = 'https://game.azgame.io/slope-rider/';
    const slopeRiderKey = getGameKey(slopeRiderEmbed);
    if (slopeRiderKey) {
        const slopeRiderRef = db.ref(`gameStats/${slopeRiderKey}`);
        slopeRiderRef.once('value', (snapshot) => {
            if (!snapshot.exists()) {
                // Initialize with popularity boost
                slopeRiderRef.set({
                    embed: slopeRiderEmbed,
                    title: 'Descent Runner',
                    clicks: 50,
                    lastClicked: Date.now(),
                    firstClicked: Date.now() - (7 * 24 * 60 * 60 * 1000) // 7 days ago to make it seem established
                });
            }
        });
    }
    
    // Listen for real-time updates
    gameStatsListener = statsRef.on('value', (snapshot) => {
        const stats = snapshot.val() || {};
        gameStats = stats;
        
        // Update UI if category is active
        const activeCategory = document.querySelector('.category-btn.active');
        if (activeCategory) {
            const category = activeCategory.getAttribute('data-category');
            filterGamesByCategory(category);
        }
    }, (error) => {
        console.error('Error loading game stats:', error);
    });
}

// Initialize game ratings listener
function initGameRatings() {
    if (!db) return;
    
    const ratingsRef = db.ref('gameRatings');
    
    // Listen for real-time updates
    gameRatingsListener = ratingsRef.on('value', (snapshot) => {
        const ratings = snapshot.val() || {};
        gameRatings = ratings;
        
        // Update UI if games grid is visible
        const gamesGrid = document.getElementById('gamesGrid');
        if (gamesGrid && gamesGrid.children.length > 0) {
            const activeCategory = document.querySelector('.category-btn.active');
            if (activeCategory) {
                const category = activeCategory.getAttribute('data-category');
                filterGamesByCategory(category);
            } else {
                renderGamesGrid();
            }
        }
    }, (error) => {
        console.error('Error loading game ratings:', error);
    });
}

// Submit game rating
function submitGameRating(gameKey, embed, rating) {
    if (!db || !gameKey) return;
    
    // Get user identifier (use localStorage to track per-user ratings)
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }
    
    const gameRatingRef = db.ref(`gameRatings/${gameKey}`);
    
    gameRatingRef.transaction((current) => {
        const ratingData = current || {
            embed: embed,
            ratings: {},
            total: 0,
            count: 0,
            average: 0
        };
        
        // Check if user already rated
        const previousRating = ratingData.ratings[userId];
        
        // Update or add rating
        ratingData.ratings[userId] = rating;
        
        // Recalculate average
        if (previousRating) {
            // User is updating their rating
            ratingData.total = ratingData.total - previousRating + rating;
        } else {
            // New rating
            ratingData.total = (ratingData.total || 0) + rating;
            ratingData.count = (ratingData.count || 0) + 1;
        }
        
        // Calculate average from total and count
        const ratingCount = Object.keys(ratingData.ratings).length;
        ratingData.average = ratingCount > 0 ? ratingData.total / ratingCount : 0;
        ratingData.count = ratingCount;
        
        return ratingData;
    }, (error, committed, snapshot) => {
        if (error) {
            console.error('Error submitting rating:', error);
        } else if (committed) {
            // Rating saved successfully
            console.log('Rating submitted successfully');
        }
    });
}

// Track game click
function trackGameClick(embed, title) {
    if (!db) return;
    
    const gameKey = getGameKey(embed);
    if (!gameKey) return;
    
    const gameRef = db.ref(`gameStats/${gameKey}`);
    
    gameRef.transaction((current) => {
        const now = Date.now();
        const stats = current || {
            embed: embed,
            title: title,
            clicks: 0,
            lastClicked: now,
            firstClicked: now
        };
        
        stats.clicks = (stats.clicks || 0) + 1;
        stats.lastClicked = now;
        if (!stats.firstClicked) stats.firstClicked = now;
        if (!stats.embed) stats.embed = embed;
        if (!stats.title) stats.title = title;
        
        return stats;
    });
}

// Load game site in iframe
function loadGameSite(embed, title) {
    const iframeContainer = document.getElementById('iframeContainer');
    const gamesGridContainer = document.getElementById('gamesGridContainer');
    const embeddedSite = document.getElementById('embeddedSite');
    const currentSiteTitle = document.getElementById('currentSiteTitle');
    
    if (!iframeContainer || !embeddedSite) {
        console.error('Iframe container or embedded site not found');
        return;
    }
    
    // Find the game in the array to check for custom embed
    const game = gameSites.find(site => site.embed === embed);
    
    // Track the game click
    trackGameClick(embed, title);
    
    // Hide games grid if it exists
    if (gamesGridContainer) {
        gamesGridContainer.style.display = 'none';
    }
    
    // Show iframe
    iframeContainer.style.display = 'block';
    
    // Set title
    if (currentSiteTitle) {
        currentSiteTitle.textContent = title;
    }
    
    // Clear any existing content
    embeddedSite.removeAttribute('srcdoc');
    embeddedSite.src = 'about:blank';
    
    // Load site - use custom HTML if available, otherwise use src
    setTimeout(() => {
        if (game && game.customEmbed && game.customHTML) {
            // Use srcdoc for custom HTML
            embeddedSite.srcdoc = game.customHTML;
        } else {
            // Use regular src
            embeddedSite.src = embed;
        }
        
        // Scroll to iframe
        setTimeout(() => {
            iframeContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, 100);
}

// Back to games button
document.addEventListener('DOMContentLoaded', () => {
    initGamesGrid();
    
    const backToGamesBtn = document.getElementById('backToGamesBtn');
    if (backToGamesBtn) {
        backToGamesBtn.addEventListener('click', () => {
            const iframeContainer = document.getElementById('iframeContainer');
            const gamesGridContainer = document.getElementById('gamesGridContainer');
            const embeddedSite = document.getElementById('embeddedSite');
            
            if (iframeContainer && gamesGridContainer) {
                // Hide iframe
                iframeContainer.style.display = 'none';
                
                // Show games grid
                gamesGridContainer.style.display = 'block';
                
                // Clear iframe src
                if (embeddedSite) {
                    embeddedSite.src = '';
                }
                
                // Scroll to games grid
                setTimeout(() => {
                    gamesGridContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        });
    }
});

// ================= Back to Top Button =================
const backToTopBtn = document.getElementById('backToTopBtn');

// Show/hide button based on scroll position
function handleScroll() {
    if (window.pageYOffset > 300) {
        backToTopBtn?.classList.add('show');
    } else {
        backToTopBtn?.classList.remove('show');
    }
}

// Scroll to top when button is clicked
backToTopBtn?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Listen for scroll events
window.addEventListener('scroll', Utils.throttle(handleScroll, 100));

// Check initial scroll position
handleScroll();

// Navigation button handlers
document.addEventListener('DOMContentLoaded', () => {
    // Chat button in navigation
    const navChatBtn = document.getElementById('navChatBtn');
    if (navChatBtn) {
        navChatBtn.addEventListener('click', () => {
            const toggleChatBtn = document.getElementById('toggleChatBtn');
            if (toggleChatBtn) toggleChatBtn.click();
        });
    }
    
    // Profile button in navigation
    const navProfileBtn = document.getElementById('navProfileBtn');
    if (navProfileBtn) {
        navProfileBtn.addEventListener('click', () => {
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) profileBtn.click();
        });
    }
    
    // Leaderboard button in navigation
    const navLeaderboardBtn = document.getElementById('navLeaderboardBtn');
    if (navLeaderboardBtn) {
        navLeaderboardBtn.addEventListener('click', () => {
            const leaderboardBtn = document.getElementById('leaderboardBtn');
            if (leaderboardBtn) leaderboardBtn.click();
        });
    }
    
    // Friends button in navigation
    const navFriendsBtn = document.getElementById('navFriendsBtn');
    if (navFriendsBtn) {
        navFriendsBtn.addEventListener('click', () => {
            const friendsBtn = document.getElementById('friendsBtn');
            if (friendsBtn) friendsBtn.click();
        });
    }
    
    // Drawing button in navigation
    const navDrawingBtn = document.getElementById('navDrawingBtn');
    if (navDrawingBtn) {
        navDrawingBtn.addEventListener('click', () => {
            const openDrawingBtn = document.getElementById('openDrawingBtn');
            if (openDrawingBtn) openDrawingBtn.click();
        });
    }
    
    // Footer Legal Pages
    const privacyPolicyBtn = document.getElementById('privacyPolicyBtn');
    const aboutUsBtn = document.getElementById('aboutUsBtn');
    const contactUsBtn = document.getElementById('contactUsBtn');
    const privacyPolicyModal = document.getElementById('privacyPolicyModal');
    const aboutUsModal = document.getElementById('aboutUsModal');
    const contactUsModal = document.getElementById('contactUsModal');
    
    // Open Privacy Policy
    if (privacyPolicyBtn) {
        privacyPolicyBtn.addEventListener('click', () => {
            if (privacyPolicyModal) {
                privacyPolicyModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    // Open About Us
    if (aboutUsBtn) {
        aboutUsBtn.addEventListener('click', () => {
            if (aboutUsModal) {
                aboutUsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    // Open Contact Us
    if (contactUsBtn) {
        contactUsBtn.addEventListener('click', () => {
            if (contactUsModal) {
                contactUsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    // Close modals
    const legalModalCloses = document.querySelectorAll('.legal-modal-close');
    legalModalCloses.forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.legal-modal');
            if (modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Close modals when clicking outside
    [privacyPolicyModal, aboutUsModal, contactUsModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    });
    
    // Contact form submission (for modal on index.html)
    const contactForm = document.getElementById('contactForm');
    const contactFormSuccess = document.getElementById('contactFormSuccess');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('contactName').value,
                email: document.getElementById('contactEmail').value,
                subject: document.getElementById('contactSubject').value,
                message: document.getElementById('contactMessage').value,
                timestamp: Date.now(),
                date: new Date().toISOString()
            };
            
            // Save to Firebase
            if (db) {
                try {
                    const messagesRef = db.ref('contactMessages');
                    await messagesRef.push(formData);
                    console.log('Contact message saved to Firebase');
                    
                    // Show success message
                    contactForm.style.display = 'none';
                    if (contactFormSuccess) {
                        contactFormSuccess.style.display = 'block';
                    }
                    
                    // Reset form after 5 seconds
                    setTimeout(() => {
                        contactForm.reset();
                        contactForm.style.display = 'block';
                        if (contactFormSuccess) {
                            contactFormSuccess.style.display = 'none';
                        }
                    }, 5000);
                } catch (error) {
                    console.error('Error saving message:', error);
                    alert('There was an error sending your message. Please try again.');
                }
            } else {
                // Fallback if Firebase is not available
                contactForm.style.display = 'none';
                if (contactFormSuccess) {
                    contactFormSuccess.style.display = 'block';
                }
                setTimeout(() => {
                    contactForm.reset();
                    contactForm.style.display = 'block';
                    if (contactFormSuccess) {
                        contactFormSuccess.style.display = 'none';
                    }
                }, 5000);
            }
        });
    }
    
    // Links from within modals
    const contactFromPrivacyBtn = document.getElementById('contactFromPrivacyBtn');
    const contactFromAboutBtn = document.getElementById('contactFromAboutBtn');
    
    if (contactFromPrivacyBtn) {
        contactFromPrivacyBtn.addEventListener('click', () => {
            if (privacyPolicyModal) privacyPolicyModal.classList.remove('active');
            if (contactUsModal) {
                contactUsModal.classList.add('active');
            }
        });
    }
    
    if (contactFromAboutBtn) {
        contactFromAboutBtn.addEventListener('click', () => {
            if (aboutUsModal) aboutUsModal.classList.remove('active');
            if (contactUsModal) {
                contactUsModal.classList.add('active');
            }
        });
    }
    
    // Footer quick links
    const footerGamesBtn = document.getElementById('footerGamesBtn');
    const footerLeaderboardBtn = document.getElementById('footerLeaderboardBtn');
    const footerChatBtn = document.getElementById('footerChatBtn');
    
    if (footerGamesBtn) {
        footerGamesBtn.addEventListener('click', () => {
            document.getElementById('gamesGridContainer')?.scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    if (footerLeaderboardBtn) {
        footerLeaderboardBtn.addEventListener('click', () => {
            const leaderboardBtn = document.getElementById('leaderboardBtn');
            if (leaderboardBtn) leaderboardBtn.click();
        });
    }
    
    if (footerChatBtn) {
        footerChatBtn.addEventListener('click', () => {
            const toggleChatBtn = document.getElementById('toggleChatBtn');
            if (toggleChatBtn) toggleChatBtn.click();
        });
    }
    
    // Footer scroll behavior - show on scroll down, hide on scroll up
    let lastScrollTop = 0;
    const footer = document.querySelector('.site-footer');
    
    if (footer) {
        const handleFooterScroll = Utils.throttle(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Only trigger if scrolled more than 5px difference
            if (Math.abs(scrollTop - lastScrollTop) > 5) {
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    // Scrolling down - show footer
                    footer.classList.add('visible');
                } else if (scrollTop < lastScrollTop) {
                    // Scrolling up - hide footer
                    footer.classList.remove('visible');
                }
                
                lastScrollTop = scrollTop;
            }
            
            // Hide footer if at the very top
            if (scrollTop < 50) {
                footer.classList.remove('visible');
            }
        }, 100);
        
        window.addEventListener('scroll', handleFooterScroll, { passive: true });
        
        // Check initial position
        handleFooterScroll();
    }
});

// Cookie Consent Functions
function saveCookieConsent() {
    console.log('Saving cookie consent:', cookieConsent);
    cookieConsent.consented = true;
    localStorage.setItem('cookieConsent', JSON.stringify(cookieConsent));
    console.log('Cookie consent saved to localStorage');
    
    // Hide banner
    const banner = document.getElementById('cookieConsentBanner');
    if (banner) {
        console.log('Hiding cookie banner');
        banner.style.animation = 'slideDown 0.3s ease-out';
        setTimeout(() => {
            banner.style.display = 'none';
        }, 300);
    } else {
        console.error('Cookie banner not found!');
    }
}

function updateCookieToggleUI() {
    const analyticsToggle = document.getElementById('analyticsCookiesToggle');
    const marketingToggle = document.getElementById('marketingCookiesToggle');
    
    if (analyticsToggle) analyticsToggle.checked = cookieConsent.analytics;
    if (marketingToggle) marketingToggle.checked = cookieConsent.marketing;
}

// Initialize cookie consent event listeners
function initCookieConsent() {
    console.log('Initializing cookie consent...');
    const cookieSettingsBtn = document.getElementById('cookieSettingsBtn');
    const closeCookieSettingsBtn = document.getElementById('closeCookieSettingsBtn');
    const acceptAllCookiesBtn = document.getElementById('acceptAllCookiesBtn');
    const rejectOptionalCookiesBtn = document.getElementById('rejectOptionalCookiesBtn');
    const saveCookiePreferencesBtn = document.getElementById('saveCookiePreferencesBtn');
    const acceptAllInSettingsBtn = document.getElementById('acceptAllInSettingsBtn');
    const analyticsCookiesToggle = document.getElementById('analyticsCookiesToggle');
    const marketingCookiesToggle = document.getElementById('marketingCookiesToggle');
    const cookieSettingsModal = document.getElementById('cookieSettingsModal');

    console.log('Cookie buttons found:', {
        cookieSettingsBtn: !!cookieSettingsBtn,
        acceptAllCookiesBtn: !!acceptAllCookiesBtn,
        rejectOptionalCookiesBtn: !!rejectOptionalCookiesBtn,
        cookieSettingsModal: !!cookieSettingsModal
    });

    // Open cookie settings
    if (cookieSettingsBtn) {
        cookieSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Cookie settings button clicked');
            updateCookieToggleUI();
            if (cookieSettingsModal) {
                cookieSettingsModal.style.display = 'flex';
            }
        });
    } else {
        console.error('cookieSettingsBtn not found!');
    }

    // Close cookie settings
    if (closeCookieSettingsBtn) {
        closeCookieSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Close cookie settings clicked');
            if (cookieSettingsModal) cookieSettingsModal.style.display = 'none';
        });
    }

    if (cookieSettingsModal) {
        cookieSettingsModal.addEventListener('click', (e) => {
            if (e.target === cookieSettingsModal) {
                cookieSettingsModal.style.display = 'none';
            }
        });
    }

    // Accept all cookies
    if (acceptAllCookiesBtn) {
        acceptAllCookiesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Accept all cookies clicked');
            cookieConsent.analytics = true;
            cookieConsent.marketing = true;
            saveCookieConsent();
        });
    } else {
        console.error('acceptAllCookiesBtn not found!');
    }

    if (acceptAllInSettingsBtn) {
        acceptAllInSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Accept all in settings clicked');
            cookieConsent.analytics = true;
            cookieConsent.marketing = true;
            updateCookieToggleUI();
            saveCookieConsent();
            if (cookieSettingsModal) cookieSettingsModal.style.display = 'none';
        });
    }

    // Reject optional cookies (essential only)
    if (rejectOptionalCookiesBtn) {
        rejectOptionalCookiesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Reject optional cookies clicked');
            cookieConsent.analytics = false;
            cookieConsent.marketing = false;
            saveCookieConsent();
        });
    } else {
        console.error('rejectOptionalCookiesBtn not found!');
    }

    // Save preferences
    if (saveCookiePreferencesBtn) {
        saveCookiePreferencesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Save preferences clicked');
            cookieConsent.analytics = analyticsCookiesToggle?.checked || false;
            cookieConsent.marketing = marketingCookiesToggle?.checked || false;
            saveCookieConsent();
            if (cookieSettingsModal) cookieSettingsModal.style.display = 'none';
        });
    }
}

// Initialize cookie consent when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCookieConsent);
} else {
    // DOM is already loaded
    initCookieConsent();
}