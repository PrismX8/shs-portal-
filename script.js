 
// ================= Loading Screen Removal (RUN FIRST) =================
// Remove loading screen immediately - don't wait for anything
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
    
    // Try immediately
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(removeLoadingScreen, 1500);
    } else {
        window.addEventListener('load', function() {
            setTimeout(removeLoadingScreen, 1500);
        });
    }
    
    // Safety fallback - always remove after 3 seconds
    setTimeout(removeLoadingScreen, 3000);
})();

// ---------------- Firebase ----------------
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

// Generate a unique visitor ID (per session)
const visitorId = 'visitor_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
console.log('Visitor ID:', visitorId);

// Online presence
if (db) {
  const onlineRef = db.ref('online/' + visitorId);
  onlineRef.set({online:true, timestamp: Date.now()}).catch(error => {
    console.error('Error setting online status:', error);
  });
  onlineRef.onDisconnect().remove();
}

// UI element
const visitorCounter = document.getElementById('visitorCounter');

// Increment total visitors only once per user (use localStorage to avoid duplicates)
if (db && !localStorage.getItem('visitorCounted')) {
    db.ref('totalVisitors').transaction(val => (val || 0) + 1).catch(error => {
      console.error('Error updating visitor count:', error);
    });
    localStorage.setItem('visitorCounted', 'yes');
}

// Listen for online users and total visitors
const totalRef = db ? db.ref('totalVisitors') : null;
const onlineDbRef = db ? db.ref('online') : null;

function updateCounter() {
    if (!onlineDbRef || !totalRef) return;
    onlineDbRef.once('value').then(snap => {
        const online = snap.numChildren();
        totalRef.once('value').then(snap2 => {
            const total = snap2.val() || 0;
            visitorCounter.innerText = `Visitors Online: ${online} | Total Visitors: ${total}`;
        });
    }).catch(error => {
        console.error('Error updating counter:', error);
    });
}

// Update counter live when online users change
if (onlineDbRef && totalRef) {
  onlineDbRef.on('value', updateCounter);
  totalRef.on('value', updateCounter);
}

// ---------------- Chat ----------------
// Load username from profile if it exists, otherwise use default
let userProfileData = JSON.parse(localStorage.getItem('userProfile')) || { profileCreated: false };
let username = (userProfileData.profileCreated && userProfileData.username) ? userProfileData.username : ('Guest' + Math.floor(Math.random()*1000));
let userColor = ['#007bff','#ff4500','#32cd32','#ffa500','#9932cc'][Math.floor(Math.random()*5)];

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const typingIndicator = document.getElementById('typingIndicator');

// Typing indicator
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

// Helper function to render a chat message
function renderChatMessage(msg, msgId, snapshot) {
    const msgDiv = document.createElement('div');
    msgDiv.setAttribute('data-msg-id', msgId);
    msgDiv.style.marginBottom='6px';
    msgDiv.style.display='flex';
    msgDiv.style.gap='10px';
    msgDiv.style.alignItems='flex-start';
    
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
    // Handle links
    if(msg.link) {
        content = `${content}<br><a href="${msg.link}" target="_blank" rel="noopener noreferrer" style="color:#FFD700; text-decoration:underline;">${msg.link}</a>`;
    }
    
    leftDiv.innerHTML = `<span style="color:${msg.color}; font-weight:bold;">${msg.user}</span>: ${content} 
                         <small style="color:rgba(255,255,255,0.5); font-size:11px;">${new Date(msg.time).toLocaleTimeString()}</small>`;
    leftDiv.style.maxWidth='85%';
    leftDiv.style.wordWrap='break-word';
    
    // Delete button if owner
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
    
    // Add emoji reactions section
    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'emoji-reactions';
    reactionsDiv.style.cssText = 'display:flex; gap:5px; margin-top:5px; flex-wrap:wrap; width:100%;';
    msgDiv.appendChild(reactionsDiv);
    
    chatMessages.appendChild(msgDiv);

    // Auto-scroll if near bottom
    if(chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 50){
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Load reactions
    if(msg.reactions) {
        updateMessageReactions(msgId, msg.reactions);
    }
}

// Listen to chat messages - optimized loading
if (db) {
  // Load initial messages in bulk for faster display
  db.ref('chat').limitToLast(50).once('value').then(snap => {
      const initialMessages = snap.val() || {};
      const messageArray = Object.entries(initialMessages)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => (a.time || 0) - (b.time || 0));
      
      // Render all initial messages at once
      messageArray.forEach(({id, ...msg}) => {
          renderChatMessage(msg, id, null);
      });
      
      // Now listen for new messages only
      const lastMessageTime = messageArray.length > 0 ? messageArray[messageArray.length - 1].time : 0;
      db.ref('chat').limitToLast(100).on('child_added', snapshot => {
          const msg = snapshot.val();
          // Only render if it's a new message (not in initial load)
          if(msg && msg.time > lastMessageTime) {
              renderChatMessage(msg, snapshot.key, snapshot);
          }
      });
  }).catch(err => {
      console.error('Error loading initial chat:', err);
      // Fallback to original method if bulk load fails
      db.ref('chat').limitToLast(100).on('child_added', snapshot => {
          const msg = snapshot.val();
          renderChatMessage(msg, snapshot.key, snapshot);
      });
  });
  
  // Listen for reaction changes
  db.ref('chat').on('child_changed', snapshot => {
      const msg = snapshot.val();
      if(msg.reactions) {
          updateMessageReactions(snapshot.key, msg.reactions);
      }
  });

  // Typing indicators
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

// Open popup
changeNameBtn.addEventListener('click', () => {
    chatPopupUsername.value = username;
    chatPopupColor.value = userColor;
    chatNameColorPopup.style.display = 'block';
});

// Save changes
chatSaveNameColor.addEventListener('click', () => {
    if(chatPopupUsername.value.trim() !== '') username = chatPopupUsername.value.trim();
    userColor = chatPopupColor.value;
    chatNameColorPopup.style.display = 'none';
});

// ---------------- Collapsible Control Sections ----------------
document.querySelectorAll('.control-section-header').forEach(header => {
  header.addEventListener('click', () => {
    const section = header.parentElement;
    section.classList.toggle('active');
  });
});

// ---------------- Buttons ----------------
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
privacyBtn.addEventListener('click', ()=>{ if(!onPrivacy){ iframe.src="https://webtoppings.bar/browse?url=https://wikipedia.org&region=us-west&mode=privacy"; privacyBtn.innerHTML='<i class="fas fa-arrow-left"></i> Go Back'; onPrivacy=true; } else { iframe.src=originalSrc; privacyBtn.innerHTML='<i class="fas fa-shield-alt"></i> Browser'; onPrivacy=false; } });

// ---------------- Tutorial ----------------
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

// ---------------- Popup ----------------
const popup = document.getElementById('fullscreenPopup');
// Close when clicking the X button
popup.querySelector('.closeBtn').addEventListener('click', () => {
    popup.classList.remove('show');
});

// Close when clicking *anywhere* outside the popupContent
popup.addEventListener('click', (e) => {
        popup.classList.remove('show');
});

function showPopup(){
    popup.classList.add('show');
}

// ================= Admin Panel =================
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
  if(confirm('Reset total visitors count to 0?')) {
    db.ref('totalVisitors').set(1).then(() => {
      alert('Visitors count reset');
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
    window.addEventListener('resize', resizeCanvas); 
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

for(let i = 0; i < 200; i++) {
    sparkles.push(createSparkle());
}

// Add ripple effect on mouse move
document.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.95) { // Occasional ripples
        ripples.push({
            x: e.clientX,
            y: e.clientY,
            radius: 0,
            maxRadius: 100 + Math.random() * 50,
            alpha: 0.6,
            speed: 2 + Math.random()
        });
    }
});

function animateSparkles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw sparkles
    for(let s of sparkles) {
        // Twinkle effect
        s.alpha = s.baseAlpha + Math.sin(Date.now() * s.twinkle) * 0.3;
        s.alpha = Math.max(0.1, Math.min(0.8, s.alpha));
        
        // Mouse attraction
        const dx = mouseX - s.x;
        const dy = mouseY - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
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
        
        // Draw with glow
        const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
        const rgb = s.color === '#FFD700' ? [255, 215, 0] : 
                    s.color === '#FFFF99' ? [255, 255, 153] : [255, 255, 255];
        gradient.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${s.alpha})`);
        gradient.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
        
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Core sparkle
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${s.alpha})`;
        ctx.fill();
    }
    
    // Draw and update ripples
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

// Initialize sparkles when popup is shown (lazy init)
// This will be called when popup opens, or we can init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSparkles);
} else {
    // Try to init, but it's ok if canvas doesn't exist yet
    setTimeout(initSparkles, 100);
}

// ---------------- Enhanced Interactive Background ----------------
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
    window.addEventListener('resize', resizeInteractiveBg);
    resizeInteractiveBg();

    // Track mouse with trail
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        mouseTrail.push({ x: mouseX, y: mouseY, time: Date.now() });
        if (mouseTrail.length > maxTrailLength) {
            mouseTrail.shift();
        }
    });

    // Add click ripple effect
    document.addEventListener('click', (e) => {
        clickRipples.push({
            x: e.clientX,
            y: e.clientY,
            radius: 0,
            maxRadius: 300,
            alpha: 0.8,
            speed: 5
        });
    });

    // Animate interactive background
    function animateInteractiveBg() {
        bgCtx.clearRect(0, 0, interactiveBg.width, interactiveBg.height);
        
        // Create radial gradient from mouse position (subtle glow)
        const gradient = bgCtx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 500);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.12)');
        gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.06)');
        gradient.addColorStop(0.6, 'rgba(255, 215, 0, 0.02)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, interactiveBg.width, interactiveBg.height);
        
        // Draw mouse trail
        for (let i = 0; i < mouseTrail.length; i++) {
            const point = mouseTrail[i];
            const age = Date.now() - point.time;
            const alpha = Math.max(0, 1 - age / 800);
            const size = 4 * alpha;
            
            bgCtx.beginPath();
            bgCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
            bgCtx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.5})`;
            bgCtx.fill();
        }
        
        // Draw and update click ripples
        for (let i = clickRipples.length - 1; i >= 0; i--) {
            const ripple = clickRipples[i];
            ripple.radius += ripple.speed;
            ripple.alpha -= 0.015;
            
            if (ripple.radius > ripple.maxRadius || ripple.alpha <= 0) {
                clickRipples.splice(i, 1);
                continue;
            }
            
            // Draw ripple with gradient
            const rippleGradient = bgCtx.createRadialGradient(ripple.x, ripple.y, ripple.radius - 10, ripple.x, ripple.y, ripple.radius);
            rippleGradient.addColorStop(0, `rgba(255, 215, 0, ${ripple.alpha * 0.3})`);
            rippleGradient.addColorStop(1, `rgba(255, 215, 0, 0)`);
            
            bgCtx.strokeStyle = `rgba(255, 215, 0, ${ripple.alpha})`;
            bgCtx.lineWidth = 3;
            bgCtx.beginPath();
            bgCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            bgCtx.stroke();
            
            // Inner glow
            bgCtx.fillStyle = rippleGradient;
            bgCtx.beginPath();
            bgCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            bgCtx.fill();
        }
        
        // Remove old trail points
        mouseTrail = mouseTrail.filter(p => Date.now() - p.time < 800);
        
        requestAnimationFrame(animateInteractiveBg);
    }
    animateInteractiveBg();
}

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveBackground);
} else {
    initInteractiveBackground();
}

// ---------------- Enhanced Stars ----------------
function initStars() {
    const starCanvas = document.getElementById('starCanvas');
    if (!starCanvas) return;
    
    const starCtx = starCanvas.getContext('2d');
    let stars = [];

    function resizeStarCanvas() {
        starCanvas.width = window.innerWidth;
        starCanvas.height = window.innerHeight;
        // Recreate stars on resize
        stars = [];
        for (let i = 0; i < 300; i++) {
            stars.push(createStar());
        }
    }
    window.addEventListener('resize', resizeStarCanvas);
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

    function animateStars() {
        starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
        const centerX = starCanvas.width / 2;
        const centerY = starCanvas.height / 2;
        
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

            // Enhanced mouse interaction - stars glow when mouse is near
            const dx = mouseX - drawX;
            const dy = mouseY - drawY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const mouseEffect = Math.max(0, 1 - distance / 150);
            star.brightness = star.baseBrightness + mouseEffect * 0.7;
            
            // Twinkle animation
            star.brightness += Math.sin(Date.now() * star.twinkle) * 0.15;
            star.brightness = Math.max(0.2, Math.min(1, star.brightness));
            
            // Draw star with glow effect
            const glowSize = star.size * (1 + mouseEffect * 2);
            const gradient = starCtx.createRadialGradient(drawX, drawY, 0, drawX, drawY, glowSize * 2);
            gradient.addColorStop(0, star.color === '#FFD700' ? `rgba(255, 215, 0, ${star.brightness})` : `rgba(255, 255, 255, ${star.brightness})`);
            gradient.addColorStop(0.5, star.color === '#FFD700' ? `rgba(255, 215, 0, ${star.brightness * 0.5})` : `rgba(255, 255, 255, ${star.brightness * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            starCtx.beginPath();
            starCtx.arc(drawX, drawY, glowSize, 0, Math.PI * 2);
            starCtx.fillStyle = gradient;
            starCtx.fill();
            
            // Core star
            starCtx.beginPath();
            starCtx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
            starCtx.fillStyle = star.color === '#FFD700' ? `rgba(255, 215, 0, ${star.brightness})` : `rgba(255, 255, 255, ${star.brightness})`;
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


// ================= Custom Context Menu =================
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

// ---------------- Chat Toggle ----------------
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

// ================= Theme Customizer =================
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

    // Update selected state
    themeOptions.forEach(opt => opt.style.borderColor = opt.dataset.theme === theme ? '#28a745' : '');
  });
});

// Seasonal theme selection
seasonalThemes.forEach(theme => {
  theme.addEventListener('click', () => {
    const season = theme.dataset.season;
    applySeasonal(season === currentSeasonal ? '' : season);

    // Update selected state
    seasonalThemes.forEach(t => t.style.opacity = t.dataset.season === currentSeasonal ? '1' : '0.6');
  });
});

// Apply saved theme on load
applyTheme(currentTheme);
applySeasonal(currentSeasonal);

// ================= Achievement System =================
const achievementsBtn = document.getElementById('achievementsBtn');
const achievementsModal = document.getElementById('achievementsModal');
const closeAchievementsBtn = document.getElementById('closeAchievementsBtn');

// Achievement tracking
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

// Reset daily challenge if it's a new day
const now = Date.now();
const lastReset = userStats.lastDailyReset;
const oneDay = 24 * 60 * 60 * 1000;
if (now - lastReset > oneDay) {
  userStats.dailyMessages = 0;
  userStats.lastDailyReset = now;
}

function updateAchievements() {
  // Chat Master (10 messages)
  const chatProgress = Math.min((userStats.chatMessages / 10) * 100, 100);
  document.getElementById('chatProgress').style.width = chatProgress + '%';
  document.getElementById('chatCount').textContent = userStats.chatMessages + '/10';
  if (userStats.chatMessages >= 10) {
    document.getElementById('chatBadge').style.borderColor = '#28a745';
    document.getElementById('chatBadge').style.background = '#d4edda';
  }

  // Artist (30 minutes drawing)
  const drawProgress = Math.min((userStats.drawTime / 30) * 100, 100);
  document.getElementById('drawProgress').style.width = drawProgress + '%';
  document.getElementById('drawCount').textContent = Math.floor(userStats.drawTime) + '/30 min';
  if (userStats.drawTime >= 30) {
    document.getElementById('drawBadge').style.borderColor = '#28a745';
    document.getElementById('drawBadge').style.background = '#d4edda';
  }

  // Gamer (60 minutes gaming)
  const gameProgress = Math.min((userStats.gameTime / 60) * 100, 100);
  document.getElementById('gameProgress').style.width = gameProgress + '%';
  document.getElementById('gameCount').textContent = Math.floor(userStats.gameTime) + '/60 min';
  if (userStats.gameTime >= 60) {
    document.getElementById('gameBadge').style.borderColor = '#28a745';
    document.getElementById('gameBadge').style.background = '#d4edda';
  }

  // Social Butterfly (120 minutes online)
  const socialProgress = Math.min((userStats.onlineTime / 120) * 100, 100);
  document.getElementById('socialProgress').style.width = socialProgress + '%';
  document.getElementById('socialCount').textContent = Math.floor(userStats.onlineTime) + '/120 min';
  if (userStats.onlineTime >= 120) {
    document.getElementById('socialBadge').style.borderColor = '#28a745';
    document.getElementById('socialBadge').style.background = '#d4edda';
  }

  // Explorer (visit all sites)
  const explorerProgress = Math.min((userStats.sitesVisited.length / 2) * 100, 100);
  document.getElementById('explorerProgress').style.width = explorerProgress + '%';
  document.getElementById('explorerCount').textContent = userStats.sitesVisited.length + '/2';
  if (userStats.sitesVisited.length >= 2) {
    document.getElementById('explorerBadge').style.borderColor = '#28a745';
    document.getElementById('explorerBadge').style.background = '#d4edda';
  }

  // Stylist (try 3 themes)
  const themeProgress = Math.min((userStats.themesTried.length / 3) * 100, 100);
  document.getElementById('themeProgress').style.width = themeProgress + '%';
  document.getElementById('themeCount').textContent = userStats.themesTried.length + '/3';
  if (userStats.themesTried.length >= 3) {
    document.getElementById('themeBadge').style.borderColor = '#28a745';
    document.getElementById('themeBadge').style.background = '#d4edda';
  }

  // Daily Challenge
  const dailyProgress = Math.min((userStats.dailyMessages / 5) * 100, 100);
  document.getElementById('dailyProgress').style.width = dailyProgress + '%';
  document.getElementById('dailyCount').textContent = userStats.dailyMessages + '/5';

  localStorage.setItem('userStats', JSON.stringify(userStats));
}

// Track user activity
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

// Achievements button
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

// Track online time
let onlineStartTime = Date.now();
setInterval(() => {
  const minutes = (Date.now() - onlineStartTime) / (1000 * 60);
  trackActivity('online', minutes - userStats.onlineTime);
  onlineStartTime = Date.now();
}, 60000); // Update every minute

// Track drawing time
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

// Track game time (simplified - tracks time on main game)
let gameStartTime = Date.now();
setInterval(() => {
  const minutes = (Date.now() - gameStartTime) / (1000 * 60);
  trackActivity('game', minutes - userStats.gameTime);
  gameStartTime = Date.now();
}, 60000);

// Track site visits
document.getElementById('extraSiteBtn').addEventListener('click', () => {
  trackActivity('site', 'extra');
});
document.getElementById('privacyBtn').addEventListener('click', () => {
  trackActivity('site', 'privacy');
});

// Track theme changes
themeOptions.forEach(option => {
  option.addEventListener('click', () => {
    trackActivity('theme', option.dataset.theme);
  });
});

// Initial update
updateAchievements();

// ================= Keyboard Shortcuts =================
document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in inputs
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
      // Close modals
      document.getElementById('themeModal').style.display = 'none';
      document.getElementById('achievementsModal').style.display = 'none';
      document.getElementById('drawingModal').style.display = 'none';
      break;
  }
});

// Show keyboard shortcuts hint
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

// Add to body
document.body.appendChild(shortcutsHint);

// Show hints on ? key
document.addEventListener('keydown', (e) => {
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const hint = document.getElementById('shortcutsHint');
    hint.style.display = hint.style.display === 'none' ? 'block' : 'none';
  }
});

// Auto-save user preferences every 30 seconds
setInterval(() => {
  localStorage.setItem('userStats', JSON.stringify(userStats));
  localStorage.setItem('selectedTheme', currentTheme);
  localStorage.setItem('selectedSeasonal', currentSeasonal);
}, 30000);

// ================= Stats Dashboard =================
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const closeStatsBtn = document.getElementById('closeStatsBtn');

function updateStatsDisplay() {
  // Main stats
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

// ---------------- Friends System ----------------
const friendsBtn = document.getElementById('friendsBtn');
const friendsModal = document.getElementById('friendsModal');
const closeFriendsBtn = document.getElementById('closeFriendsBtn');
const friendsList = document.getElementById('friendsList');
const searchFriendsInput = document.getElementById('searchFriendsInput');
const searchResults = document.getElementById('searchResults');
let friends = JSON.parse(localStorage.getItem('friends')) || [];


closeFriendsBtn?.addEventListener('click', () => {
    friendsModal.style.display = 'none';
});

friendsModal?.addEventListener('click', (e) => {
    if(e.target === friendsModal) friendsModal.style.display = 'none';
});

// Load all profile users on friends modal open - optimized with parallel loading
function loadAllProfileUsers() {
    if(!db || !searchResults) return;
    
    // Load both in parallel for faster loading
    Promise.all([
        db.ref('profiles').once('value'),
        db.ref('online').once('value')
    ]).then(([profilesSnap, onlineSnap]) => {
        const profiles = profilesSnap.val() || {};
        const onlineData = onlineSnap.val() || {};
        
        // Show all profile users initially
        const allUsers = Object.entries(profiles)
            .filter(([id]) => id !== visitorId && profiles[id] && profiles[id].username)
            .map(([id, profile]) => {
                const isOnline = !!onlineData[id];
                const avatarStyle = profile.avatarImage 
                    ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                    : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
                const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
                return { id, profile, isOnline, avatarStyle, avatarContent };
            })
            .sort((a, b) => {
                // Sort online users first
                if(a.isOnline !== b.isOnline) return b.isOnline - a.isOnline;
                return (a.profile.username || '').localeCompare(b.profile.username || '');
            });
        
        displayUserSearchResults(allUsers);
    }).catch(err => {
        console.error('Error loading profile users:', err);
        if(searchResults) {
            searchResults.innerHTML = '<p style="text-align:center; color:rgba(255,0,0,0.7);">Error loading users.</p>';
        }
    });
}

function displayUserSearchResults(users) {
    if(!searchResults) return;
    searchResults.innerHTML = users.map(({id, profile, isOnline, avatarStyle, avatarContent}) => `
        <div style="display:flex; align-items:center; gap:12px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:8px;">
            <div style="width:35px; height:35px; border-radius:50%; ${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">
                ${avatarContent}
            </div>
            <div style="flex:1;">
                <div style="font-weight:500; color:rgba(255,255,255,0.9);">${profile.username || 'User'}</div>
                <div style="font-size:11px; color:rgba(255,255,255,0.5);">${isOnline ? '🟢 Online' : '⚫ Offline'}</div>
            </div>
            <button class="addFriendBtn" data-id="${id}" style="padding:6px 12px; background:rgba(255,215,0,0.1); border:1px solid rgba(255,215,0,0.3); border-radius:6px; color:#FFD700; cursor:pointer;">
                ${friends.includes(id) ? '✓ Friend' : '+ Add'}
            </button>
        </div>
    `).join('');
    
    document.querySelectorAll('.addFriendBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            if(!friends.includes(id)) {
                friends.push(id);
                localStorage.setItem('friends', JSON.stringify(friends));
                updateFriendsList();
                loadAllProfileUsers(); // Refresh the list
            }
        });
    });
}

friendsBtn?.addEventListener('click', () => {
    friendsModal.style.display = 'flex';
    updateFriendsList();
    loadAllProfileUsers(); // Load all users when modal opens
});

searchFriendsInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if(!db || !searchResults) return;
    
    if(query.length === 0) {
        // Show all users when search is empty
        loadAllProfileUsers();
        return;
    }
    
    // Debounce search to avoid too many queries
    clearTimeout(searchFriendsInput.searchTimeout);
    searchFriendsInput.searchTimeout = setTimeout(() => {
        // Search all profile users - parallel loading
        Promise.all([
            db.ref('profiles').once('value'),
            db.ref('online').once('value')
        ]).then(([profilesSnap, onlineSnap]) => {
        const profiles = profilesSnap.val() || {};
        const online = onlineSnap.val() || {};
        const matches = Object.entries(profiles)
            .filter(([id, profile]) => 
                id !== visitorId && 
                profile.username && 
                profile.username.toLowerCase().includes(query)
            )
            .map(([id, profile]) => {
                const isOnline = !!online[id];
                const avatarStyle = profile.avatarImage 
                    ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                    : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
                const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
                return { id, profile, isOnline, avatarStyle, avatarContent };
            })
            .sort((a, b) => {
                if(a.isOnline !== b.isOnline) return b.isOnline - a.isOnline;
                return (a.profile.username || '').localeCompare(b.profile.username || '');
            })
            .slice(0, 20); // Limit to 20 results
        
        displayUserSearchResults(matches);
        }).catch(err => {
            console.error('Error searching users:', err);
            if(searchResults) {
                searchResults.innerHTML = '<p style="text-align:center; color:rgba(255,0,0,0.7);">Error searching users.</p>';
            }
        });
    }, 300); // 300ms debounce
});

function updateFriendsList() {
    if(!friendsList) return;
    if(friends.length === 0) {
        friendsList.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.5);">No friends yet. Search for users above!</p>';
        return;
    }
    if(db) {
        Promise.all([
            db.ref('online').once('value'),
            db.ref('profiles').once('value')
        ]).then(([onlineSnap, profilesSnap]) => {
            const online = onlineSnap.val() || {};
            const profiles = profilesSnap.val() || {};
            friendsList.innerHTML = friends.map(id => {
                const user = online[id];
                const profile = profiles[id] || {};
                const avatarStyle = profile.avatarImage 
                    ? `background-image: url(${profile.avatarImage}); background-size: cover; background-position: center;`
                    : `background: linear-gradient(135deg, #FFD700, #FFA500);`;
                const avatarContent = profile.avatarImage ? '' : (profile.avatar || '👤');
                return `
                    <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:10px;">
                        <div style="width:40px; height:40px; border-radius:50%; ${avatarStyle} display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;">
                            ${avatarContent}
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:600; color:#FFD700;">${user?.username || profile.username || 'User'}</div>
                            <div style="font-size:12px; color:rgba(255,255,255,0.6);">
                                ${user ? '🟢 Online' : '⚫ Offline'}
                            </div>
                        </div>
                        <button class="removeFriendBtn" data-id="${id}" style="padding:6px 12px; background:rgba(220,53,69,0.2); border:1px solid rgba(220,53,69,0.4); border-radius:6px; color:#dc3545; cursor:pointer;">Remove</button>
                    </div>
                `;
            }).join('');
            document.querySelectorAll('.removeFriendBtn').forEach(btn => {
                btn.addEventListener('click', () => {
                    friends = friends.filter(id => id !== btn.dataset.id);
                    localStorage.setItem('friends', JSON.stringify(friends));
                    updateFriendsList();
                });
            });
        });
    }
}

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
