document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.setAttribute('data-popup-style', 'true');
  style.innerHTML = `
    .popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.4s ease, visibility 0.4s ease;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .popup-overlay.visible {
      opacity: 1;
      visibility: visible;
    }
    .popup-content {
      position: relative;
      width: 100vw;
      height: 100vh;
      background-color: #000;
      overflow: hidden;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.5);
    }
    .popup-notch {
      position: fixed;
      top: 50%;
      right: 0;
      width: 8px;
      height: 80px;
      background: rgba(40, 40, 40, 0.8);
      border-radius: 4px 0 0 4px;
      z-index: 10000;
      cursor: pointer;
      transform: translateY(-50%);
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-right: none;
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .popup-notch:after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 2px;
      height: 30px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 1px;
      transition: all 0.3s ease;
    }
    .popup-notch:hover {
      background: rgba(60, 60, 60, 0.9);
      width: 10px;
    }
    .popup-notch:hover:after {
      background: rgba(255, 255, 255, 0.8);
    }
    .popup-controls {
      position: fixed;
      top: 50%;
      right: 20px;
      background: rgba(30, 30, 30, 0.85);
      border-radius: 20px;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      z-index: 9998;
      transform: translateX(100px) translateY(-50%);
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .popup-notch-wrapper {
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      z-index: 10000;
      display: flex;
      align-items: center;
      height: 300px;
      padding-left: 100px;
    }
    .popup-notch-wrapper::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 20px 0 0 20px;
      pointer-events: none;
      transition: all 0.3s ease;
    }
    .popup-notch-wrapper:hover .popup-controls,
    .popup-controls.visible {
      transform: translateX(0) translateY(-50%);
      opacity: 1;
      visibility: visible;
    }
    .popup-controls:before {
      content: '';
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-left: 8px solid rgba(30, 30, 30, 0.85);
      z-index: 1;
    }
    .control-button {
      background: rgba(60, 60, 60, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      cursor: pointer;
      width: 45px;
      height: 45px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.9;
      transition: all 0.2s ease;
      margin: 0;
      border-radius: 16px;
      position: relative;
      font-family: 'Unbounded', sans-serif;
      font-weight: 700;
    }
    .control-button:hover {
      opacity: 1;
      background: rgba(80, 80, 80, 0.8);
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .control-button:active {
      transform: translateY(1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .control-button svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: white;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .control-button::after {
      content: attr(data-tooltip);
      position: absolute;
      right: calc(100% + 18px);
      top: 50%;
      transform: translateY(-50%);
      background: rgba(20, 20, 20, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      pointer-events: none;
      font-family: 'Unbounded', sans-serif;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      width: auto;
      min-width: 120px;
      text-align: center;
    }
    .control-button:hover::after {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%);
    }
    .control-divider {
      width: 24px;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
      margin: 2px 0;
    }
    .iframe-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 48px;
      height: 48px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top: 3px solid rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      z-index: 10001;
    }
    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
    .popup-toast {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(30px);
      background: rgba(30, 30, 30, 0.85);
      color: white;
      font-family: 'Unbounded', sans-serif;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 24px;
      border-radius: 32px;
      z-index: 10002;
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .popup-toast.visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    .instructional-popup {
      position: fixed;
      top: 50%;
      right: 70px;
      transform: translate(0, -50%) scale(0.95);
      background: rgba(20, 20, 20, 0.95);
      color: white;
      font-family: 'Unbounded', sans-serif;
      font-size: 14px;
      padding: 20px;
      border-radius: 16px;
      z-index: 10003;
      width: 280px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      opacity: 0;
      visibility: hidden;
      transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
    }
    .instructional-popup.visible {
      opacity: 1;
      visibility: visible;
      transform: translate(0, -50%) scale(1);
    }
    .instructional-popup h3 {
      margin-top: 0;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #ffffff;
    }
    .instructional-popup p {
      margin-bottom: 15px;
      line-height: 1.5;
      font-weight: 400;
    }
    .instructional-popup .close-instructional {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-family: 'Unbounded', sans-serif;
      font-weight: 700;
      font-size: 13px;
      transition: all 0.2s ease;
      display: block;
      width: 100%;
      text-align: center;
      margin-top: 15px;
    }
    .instructional-popup .close-instructional:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .instructional-popup:after {
      content: '';
      position: absolute;
      right: -10px;
      top: 50%;
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-bottom: 10px solid transparent;
      border-left: 10px solid rgba(20, 20, 20, 0.95);
    }
  `;
  document.head.appendChild(style);
  const originalStates = new Map();
  let isPopupOpen = false;
  let controlsVisible = false;
  let hasShownInstructional = false;
  let controlsMouseEnterTimestamp = 0;
  let controlsHoverTimeout = null;
  const fontCheck = document.querySelector('link[href*="fonts.googleapis.com/css2?family=Unbounded:wght@400;700"]');
  if (!fontCheck) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700&display=swap';
    document.head.appendChild(font);
  }
  const handleLinkClick = (e) => {
    const link = e.target.closest('a');
    if (!link || !link.href || isPopupOpen) return;
    if (link.href.includes('game') || 
        link.href.includes('play') || 
        link.dataset.popup === 'true' ||
        link.classList.contains('game-link')) {
      e.preventDefault();
      e.stopPropagation();
      openGamePopup(link.href);
    }
  };
  const hideContent = () => {
    originalStates.clear();
    document.body.childNodes.forEach(node => {
      if (node.nodeType === 1 && 
          !node.classList.contains('popup-overlay') && 
          !node.classList.contains('popup-notch-wrapper') && 
          !node.classList.contains('popup-notch') && 
          !node.classList.contains('popup-controls') &&
          !node.classList.contains('popup-toast') &&
          !node.classList.contains('instructional-popup')) {
        originalStates.set(node, {
          display: window.getComputedStyle(node).display
        });
        node.style.display = 'none';
      }
    });
  };
  const showContent = () => {
    originalStates.forEach((state, node) => {
      node.style.display = state.display;
    });
    originalStates.clear();
  };
  const showToast = (message, duration = 3000) => {
    const existingToast = document.querySelector('.popup-toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }
    const toast = document.createElement('div');
    toast.className = 'popup-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  };
  const showInstructionalPopup = () => {
    if (hasShownInstructional) return;
    hasShownInstructional = true;
    const instructional = document.createElement('div');
    instructional.className = 'instructional-popup';
    instructional.innerHTML = `
      <h3>Game Controls</h3>
      <p>Hover over the control bar on the right side of the screen to access game options.</p>
      <p>You can close, refresh, or enter fullscreen from the control panel.</p>
      <button class="close-instructional">Nice!</button>
    `;
    document.body.appendChild(instructional);
    setTimeout(() => {
      instructional.classList.add('visible');
    }, 1500);
    const closeBtn = instructional.querySelector('.close-instructional');
    closeBtn.addEventListener('click', () => {
      instructional.classList.remove('visible');
      setTimeout(() => {
        if (document.body.contains(instructional)) {
          document.body.removeChild(instructional);
        }
      }, 500);
    });
  };
  const showControls = () => {
    const controls = document.querySelector('.popup-controls');
    if (controls) {
      controlsVisible = true;
      controls.classList.add('visible');
      if (controlsHoverTimeout) {
        clearTimeout(controlsHoverTimeout);
        controlsHoverTimeout = null;
      }
    }
  };
  const hideControls = () => {
    const controls = document.querySelector('.popup-controls');
    if (controls && controlsVisible) {
      controlsVisible = false;
      controls.classList.remove('visible');
    }
  };
  const toggleControls = () => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  };
  const openGamePopup = (gameUrl) => {
    if (isPopupOpen) return;
    isPopupOpen = true;
    hideContent();
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    const content = document.createElement('div');
    content.className = 'popup-content';
    const loading = document.createElement('div');
    loading.className = 'iframe-loading';
    content.appendChild(loading);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%; height:100%; border:none; opacity:0; transition: opacity 0.3s ease;';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    iframe.onload = () => {
      setTimeout(() => {
        iframe.style.opacity = '1';
        content.removeChild(loading);
        showToast('Game loaded successfully', 2000);
        showInstructionalPopup();
      }, 500);
    };
    iframe.src = gameUrl;
    content.appendChild(iframe);
    const notchWrapper = document.createElement('div');
    notchWrapper.className = 'popup-notch-wrapper';
    const notch = document.createElement('div');
    notch.className = 'popup-notch';
    const controls = document.createElement('div');
    controls.className = 'popup-controls';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'control-button';
    closeBtn.setAttribute('data-tooltip', 'Close Game');
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M18 6L6 18M6 6l12 12"></path>
      </svg>
    `;
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'control-button';
    fullscreenBtn.setAttribute('data-tooltip', 'Fullscreen');
    fullscreenBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"></path>
      </svg>
    `;
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'control-button';
    refreshBtn.setAttribute('data-tooltip', 'Refresh Game');
    refreshBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
    `;
    const divider = document.createElement('div');
    divider.className = 'control-divider';
    const closePopup = () => {
      overlay.classList.remove('visible');
      showToast('Game closed', 2000);
      hideControls();
      setTimeout(() => {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        if (document.body.contains(notchWrapper)) document.body.removeChild(notchWrapper);
        showContent();
        isPopupOpen = false;
        controlsVisible = false;
      }, 400);
    };
    closeBtn.addEventListener('click', closePopup);
    notch.addEventListener('click', toggleControls);
    notchWrapper.addEventListener('mouseenter', () => {
      controlsMouseEnterTimestamp = Date.now();
      controlsHoverTimeout = setTimeout(() => {
        showControls();
      }, 100);
    });
    notchWrapper.addEventListener('mouseleave', () => {
      if (controlsHoverTimeout) {
        clearTimeout(controlsHoverTimeout);
        controlsHoverTimeout = null;
      }
      const timeVisible = Date.now() - controlsMouseEnterTimestamp;
      if (timeVisible > 300) {
        controlsHoverTimeout = setTimeout(() => {
          hideControls();
        }, 300);
      }
    });
    fullscreenBtn.addEventListener('click', () => {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.webkitRequestFullscreen) {
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) {
        iframe.msRequestFullscreen();
      }
    });
    refreshBtn.addEventListener('click', () => {
      iframe.src = iframe.src;
      content.appendChild(loading);
      iframe.style.opacity = '0';
      showToast('Refreshing game...', 2000);
    });
    overlay.appendChild(content);
    controls.appendChild(closeBtn);
    controls.appendChild(divider.cloneNode());
    controls.appendChild(fullscreenBtn);
    controls.appendChild(refreshBtn);
    notchWrapper.appendChild(notch);
    notchWrapper.appendChild(controls);
    document.body.appendChild(overlay);
    document.body.appendChild(notchWrapper);
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      showToast('Loading game...', 2500);
    });
  };
  const cleanup = () => {
    document.removeEventListener('click', handleLinkClick, true);
    document.removeEventListener('touchstart', handleLinkClick, true);
    const overlay = document.querySelector('.popup-overlay');
    const notchWrapper = document.querySelector('.popup-notch-wrapper');
    const toast = document.querySelector('.popup-toast');
    const instructional = document.querySelector('.instructional-popup');
    if (overlay) document.body.removeChild(overlay);
    if (notchWrapper) document.body.removeChild(notchWrapper);
    if (toast) document.body.removeChild(toast);
    if (instructional) document.body.removeChild(instructional);
    if (isPopupOpen) showContent();
  };
  document.addEventListener('click', handleLinkClick, true);
  document.addEventListener('touchstart', handleLinkClick, true);
  window.addEventListener('beforeunload', cleanup);
});
