
(function() {
    function removeLoadingScreen() {
        const introScreen = document.getElementById('introScreen');
        if (introScreen) {
            introScreen.style.transition = 'opacity 0.5s ease';
            introScreen.style.opacity = '0';
            setTimeout(function() {
                if (introScreen && introScreen.parentNode) {
                    introScreen.remove();
                }
            }, 500);
        }
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(removeLoadingScreen, 1500);
    } else {
        window.addEventListener('load', function() {
            setTimeout(removeLoadingScreen, 1500);
        });
    }
    setTimeout(removeLoadingScreen, 3000);
})();
const firebaseConfig = {
  apiKey: "AIzaSyBn1apVsFafY2-2a2QPeslX17XR0gWE9qs",
  authDomain: "shsproject-d60d0.firebaseapp.com",
  databaseURL: "https://shsproject-d60d0-default-rtdb.firebaseio.com",
  projectId: "shsproject-d60d0",
};

let db;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  alert('Failed to connect to Firebase. Please check your internet connection.');
  db = null;
}

// Generate a unique visitor ID (persistent across sessions)
let visitorId = localStorage.getItem('visitorId');
if (!visitorId) {
    visitorId = 'visitor_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    localStorage.setItem('visitorId', visitorId);
}
console.log('Visitor ID:', visitorId);
if (db) {
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
function stopTyping(){
    if (!db) return;
    typing = false;
    db.ref('chatTyping/'+visitorId).remove().catch(error => console.error('Error removing typing:', error));
}

// Send message
chatInput.addEventListener('keypress', e => {
    if (!db) return;
    if(e.key === 'Enter' && chatInput.value.trim() !== ''){
        const msgData = {
            user: username,
            text: chatInput.value,
            color: userColor,
            time: Date.now(),
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
    leftDiv.style.maxWidth='85%';
    leftDiv.style.wordWrap='break-word';
    if(msg.uid === visitorId && snapshot){
        const delBtn = document.createElement('button');
        delBtn.innerHTML='✖';
        delBtn.style.border='none';
        delBtn.style.background='transparent';
        delBtn.style.color='rgba(255,255,255,0.5)';
        delBtn.style.cursor='pointer';
        delBtn.title='Delete';
        delBtn.onclick = () => snapshot.ref.remove();
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
const changeNameBtn = document.getElementById('changeNameBtn');
const chatNameColorPopup = document.getElementById('chatNameColorPopup');
const chatPopupUsername = document.getElementById('chatPopupUsername');
const chatPopupColor = document.getElementById('chatPopupColor');
const chatSaveNameColor = document.getElementById('chatSaveNameColor');
changeNameBtn.addEventListener('click', () => {
    chatPopupUsername.value = username;
    chatPopupColor.value = userColor;
    chatNameColorPopup.style.display = 'block';
});
chatSaveNameColor.addEventListener('click', () => {
    if(chatPopupUsername.value.trim() !== '') username = chatPopupUsername.value.trim();
    userColor = chatPopupColor.value;
    chatNameColorPopup.style.display = 'none';
});
document.querySelectorAll('.control-section-header').forEach(header => {
  header.addEventListener('click', () => {
    const section = header.parentElement;
    section.classList.toggle('active');
  });
});
const iframe = document.getElementById('embeddedSite');
let zoomLevel = 1;
let originalSrc = iframe.src;
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

extraBtn.addEventListener('click', ()=>{ if(!onExtra){ iframe.src='https://funfrinew.neocities.org/'; extraBtn.innerHTML='<i class="fas fa-arrow-left"></i> Go Back'; onExtra=true; } else { iframe.src=originalSrc; extraBtn.innerHTML='<i class="fas fa-gamepad"></i> Extra Site'; onExtra=false; } });
privacyBtn.addEventListener('click', ()=>{ if(!onPrivacy){ iframe.src="https://webtoppings.bar/browse?url=https://wikipedia.org&region=us-west&mode=privacy"; privacyBtn.innerHTML='<i class="fas fa-arrow-left"></i> Go Back'; onPrivacy=true; } else { iframe.src=originalSrc; privacyBtn.innerHTML='<i class="fas fa-shield-alt"></i> Browser';     onPrivacy=false; } });
const steps = [
    {text:"Welcome! This tutorial guides you through the buttons.", target:null},
    {text:"Reload: Reloads the embedded site.", target:document.getElementById('reloadBtn')},
    {text:"Fullscreen: Make the site fullscreen.", target:document.getElementById('fullscreenBtn')},
    {text:"Zoom: Scale the site for better view.", target:document.getElementById('zoomInBtn')},
    {text:"Hide/Show: Hide or show the embedded site.", target:document.getElementById('hideIframeBtn')},
    {text:"Extra Site: Open a fun game site.", target:extraBtn},
    {text:"Browser: Browse UNBLOCKED!", target:privacyBtn}
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

    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
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
      const isVoice = item.type === 'voice';
      const preview = isVoice ? '🎤 Voice Message' : (item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text);
      const borderColor = isVoice ? 'rgba(0,150,255,0.5)' : 'rgba(255,215,0,0.5)';
      const refPath = isVoice ? 'voiceMessages' : 'chat';
      
      return `
        <div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); border-radius:6px; margin-bottom:8px; border-left:3px solid ${borderColor};">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:600; color:#FFD700; margin-bottom:4px; font-size:13px;">
              ${user} ${isVoice ? '<i class="fas fa-microphone" style="color:rgba(0,150,255,0.8);"></i>' : ''}
            </div>
            <div style="font-size:12px; color:rgba(255,255,255,0.8); margin-bottom:4px; word-break:break-word;">${preview}</div>
            <div style="font-size:10px; color:rgba(255,255,255,0.5);">${time} • ${isVoice ? 'Voice Message' : 'Text Message'}</div>
          </div>
          <button class="adminDeleteChatBtn" data-msg-id="${item.id}" data-msg-type="${item.type}" data-ref-path="${refPath}" style="padding:6px 12px; background:#dc3545; border:1px solid #dc3545; color:#ffffff; border-radius:4px; cursor:pointer; font-size:12px; white-space:nowrap; flex-shrink:0;">Delete</button>
        </div>
      `;
    }).join('');
    
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
    let stars = [];

    function resizeStarCanvas() {
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
        // Recreate stars on resize (reduced for performance)
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push(createStar());
        }
    }
    window.addEventListener('resize', Utils.debounce(resizeStarCanvas, 250));
    resizeStarCanvas();

    function createStar() {
        return {
            x: Math.random() * starCanvas.width,
            y: Math.random() * starCanvas.height,
            size: Math.random() * 2.5 + 0.5,
            brightness: Math.random() * 0.6 + 0.4,
            twinkle: Math.random() * 0.03 + 0.01,
            baseBrightness: Math.random() * 0.6 + 0.4,
            depth: Math.random() * 0.8 + 0.2,
            color: Math.random() > 0.8 ? '#FFD700' : '#FFFFFF' // Some gold stars
        };
    }

    let lastStarFrame = 0;
    function animateStars() {
        const now = performance.now();
        // Throttle to ~30fps for stars
        if (now - lastStarFrame < 33) {
            requestAnimationFrame(animateStars);
            return;
        }
        lastStarFrame = now;
        
        starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
        const centerX = starCanvas.width / 2;
        const centerY = starCanvas.height / 2;
        const time = Date.now();
        
        for (let star of stars) {
            // Enhanced parallax with mouse interaction
            const offsetX = (mouseX - centerX) * star.depth * 0.03;
            const offsetY = (mouseY - centerY) * star.depth * 0.03;
            let drawX = star.x + offsetX;
            let drawY = star.y + offsetY;

            // Wrap around edges
            if (drawX < 0) drawX += starCanvas.width;
            if (drawX > starCanvas.width) drawX -= starCanvas.width;
            if (drawY < 0) drawY += starCanvas.height;
            if (drawY > starCanvas.height) drawY -= starCanvas.height;

            // Enhanced mouse interaction - stars glow when mouse is near (optimized)
            const dx = mouseX - drawX;
            const dy = mouseY - drawY;
            const distSq = dx * dx + dy * dy;
            const mouseEffect = distSq < 22500 ? Math.max(0, 1 - Math.sqrt(distSq) / 150) : 0; // 150^2
            star.brightness = star.baseBrightness + mouseEffect * 0.7;
            
            // Twinkle animation
            star.brightness += Math.sin(time * star.twinkle) * 0.15;
            star.brightness = Math.max(0.2, Math.min(1, star.brightness));
            
            // Simplified drawing (no gradient for better performance)
            const color = star.color === '#FFD700' ? '255, 215, 0' : '255, 255, 255';
            const glowSize = star.size * (1 + mouseEffect);
            
            // Simple glow
            starCtx.beginPath();
            starCtx.arc(drawX, drawY, glowSize * 1.5, 0, Math.PI * 2);
            starCtx.fillStyle = `rgba(${color}, ${star.brightness * 0.3})`;
            starCtx.fill();
            
            // Core star
            starCtx.beginPath();
            starCtx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
            starCtx.fillStyle = `rgba(${color}, ${star.brightness})`;
            starCtx.fill();
        }
        requestAnimationFrame(animateStars);
    }
    animateStars();
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStars);
} else {
    initStars();
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
        chatContainer.style.display = 'block';
        // Auto-scroll to bottom when opening
        setTimeout(() => {
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    } else {
        chatContainer.style.display = 'none';
    }
});

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
    if(!localStorage.getItem('tutorialShown')) {
        startTutorial();
    } else {
        showPopup();
    }
});

// ================= Intro Screen Particles =================
const particleCanvas = document.createElement('canvas');
particleCanvas.width = window.innerWidth;
particleCanvas.height = window.innerHeight;
document.querySelector('.introParticles').appendChild(particleCanvas);
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

window.addEventListener('resize', ()=>{
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
});

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
    
    notifications.show('User unblocked', 'success', 2000);
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
        if (!starCanvas || !interactiveBg) {
            console.warn('Background canvas elements not found');
        }
    }, 500);
});

// ---------------- Polls/Voting ----------------
const pollsBtn = document.getElementById('pollsBtn');
const pollsModal = document.getElementById('pollsModal');
const closePollsBtn = document.getElementById('closePollsBtn');
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

emojiBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
    if(!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
        emojiPicker.style.display = 'none';
    }
});

emojiOptions.forEach(emoji => {
    emoji.addEventListener('click', () => {
        if(chatInput) {
            chatInput.value += emoji.textContent;
            chatInput.focus();
        }
        emojiPicker.style.display = 'none';
    });
    emoji.addEventListener('mouseenter', () => {
        emoji.style.background = 'rgba(255,215,0,0.2)';
    });
    emoji.addEventListener('mouseleave', () => {
        emoji.style.background = 'transparent';
    });
});


// File send button
const sendFileBtn = document.getElementById('sendFileBtn');
const chatFileInput = document.createElement('input');
chatFileInput.type = 'file';
chatFileInput.style.display = 'none';
document.body.appendChild(chatFileInput);

sendFileBtn?.addEventListener('click', () => {
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

// ---------------- Attach Link ----------------
const attachLinkBtn = document.getElementById('attachLinkBtn');
attachLinkBtn?.addEventListener('click', () => {
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
            }
        } catch(e) {
            alert('Invalid URL. Please enter a valid web address.');
        }
    }
});

// ---------------- Voice Chat ----------------
const voiceChatBtn = document.getElementById('voiceChatBtn');
const voiceIndicator = document.getElementById('voiceIndicator');
let mediaRecorder = null;
let audioChunks = [];

let isRecording = false;
let recordingStream = null;

async function startRecording() {
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
            if(recordingStream) {
                recordingStream.getTracks().forEach(track => track.stop());
                recordingStream = null;
            }
            isRecording = false;
            if(voiceIndicator) voiceIndicator.style.display = 'none';
        };
        
        mediaRecorder.onerror = (e) => {
            console.error('MediaRecorder error:', e);
            isRecording = false;
            if(voiceIndicator) voiceIndicator.style.display = 'none';
        };
        
        mediaRecorder.start();
        if(voiceIndicator) voiceIndicator.style.display = 'block';
    } catch(err) {
        console.error('Microphone access error:', err);
        alert('Microphone access denied. Please allow microphone access to use voice chat.');
        isRecording = false;
    }
}

function stopRecording() {
    if(mediaRecorder && mediaRecorder.state !== 'inactive' && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

// Mouse events
voiceChatBtn?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startRecording();
});

voiceChatBtn?.addEventListener('mouseup', (e) => {
    e.preventDefault();
    stopRecording();
});

voiceChatBtn?.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    stopRecording();
});

// Touch events for mobile
voiceChatBtn?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
});

voiceChatBtn?.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
});

voiceChatBtn?.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    stopRecording();
});

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

// Professional Debounce and Throttle Utilities
const Utils = {
    debounce: (func, wait) => {
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

    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    formatDate: (timestamp) => {
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
    },

    formatNumber: (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            notifications.show('Copied to clipboard!', 'success', 2000);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            notifications.show('Failed to copy', 'error');
            return false;
        }
    }
};

// Professional Error Handler (only show notifications for critical errors)
window.addEventListener('error', (event) => {
    // Ignore errors from extensions, scripts from other origins, AdSense, or expected errors
    if (event.filename && (
        event.filename.includes('chrome-extension://') ||
        event.filename.includes('moz-extension://') ||
        event.filename.includes('safari-extension://') ||
        event.filename.includes('googlesyndication.com') ||
        event.filename.includes('doubleclick.net') ||
        event.filename.includes('googleads.g.doubleclick.net') ||
        event.message && (
            event.message.includes('Script error') ||
            event.message.includes('Non-Error promise rejection') ||
            event.message.includes('ResizeObserver loop') ||
            event.message.includes('Failed to fetch') ||
            event.message.includes('ERR_BLOCKED_BY_CLIENT')
        )
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
    // Ignore AdSense-related promise rejections
    if (event.reason && (
        (typeof event.reason === 'string' && (
            event.reason.includes('googlesyndication.com') ||
            event.reason.includes('doubleclick.net') ||
            event.reason.includes('ERR_BLOCKED_BY_CLIENT') ||
            event.reason.includes('Failed to fetch')
        )) ||
        (event.reason && event.reason.message && (
            event.reason.message.includes('googlesyndication.com') ||
            event.reason.message.includes('doubleclick.net') ||
            event.reason.message.includes('ERR_BLOCKED_BY_CLIENT') ||
            event.reason.message.includes('Failed to fetch')
        ))
    )) {
        return; // Ignore AdSense-related promise rejections
    }
    
    // Ignore common promise rejections that are expected
    const reason = event.reason;
    if (reason && (
        typeof reason === 'string' && (
            reason.includes('aborted') ||
            reason.includes('cancelled') ||
            reason.includes('user')
        ) ||
        reason && reason.message && (
            reason.message.includes('aborted') ||
            reason.message.includes('cancelled')
        )
    )) {
        return; // Ignore expected rejections
    }
    
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show notification for every rejection - only log it
    // Uncomment the line below if you want to see rejection notifications
});

// Suppress AdSense-related console errors (they're expected and harmless)
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    // Filter out AdSense-related errors
    if (message.includes('googlesyndication.com') ||
        message.includes('doubleclick.net') ||
        message.includes('googleads.g.doubleclick.net') ||
        message.includes('ERR_BLOCKED_BY_CLIENT') ||
        message.includes('Failed to fetch') && message.includes('ads')) {
        return; // Suppress these errors
    }
    originalConsoleError.apply(console, args);
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

// Initialize professional enhancements
DOMUtils.ready(() => {
    console.log('%c✨ Professional enhancements loaded!', 'font-size: 16px; font-weight: bold; color: #FFD700;');
    
    // Add smooth animations to modals
    document.querySelectorAll('[id$="Modal"]').forEach(modal => {
        modalManager.register(modal.id, modal);
    });

    // Initialize tooltips
    new TooltipSystem();

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
