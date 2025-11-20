(function(){
  const fontLink1 = document.createElement('link');
  fontLink1.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@200..900&display=swap';
  fontLink1.rel = 'stylesheet';
  document.head.appendChild(fontLink1);
  
  const style = document.createElement('style');
  style.textContent = `
    .context-menu {
      position: fixed;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
      padding: 10px;
      z-index: 9999;
      min-width: 280px;
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
      transform-origin: top left;
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                  transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      overflow: hidden;
    }
    
    .context-menu.show {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
    
    .context-menu.hide {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
      pointer-events: none;
    }
    
    .context-menu-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .context-menu-title {
      font-family: 'Unbounded', sans-serif;
      font-weight: 700;
      font-size: 18px;
      color: #fff;
      margin: 0;
      flex-grow: 1;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    .context-menu-section {
      margin-bottom: 8px;
    }

    .context-menu-section-title {
      font-family: 'Unbounded', sans-serif;
      font-size: 12px;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.65);
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 0 16px 4px;
      margin: 0;
    }
    
    .context-menu ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .context-menu li {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      font-family: 'Unbounded', sans-serif;
      font-weight: 400;
      font-size: 14px;
      color: #fff;
      cursor: pointer;
      transition: all 0.2s ease;
      border-radius: 8px;
      margin: 2px 4px;
      position: relative;
      overflow: hidden;
    }
    
    .context-menu li:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    
    .context-menu li:active {
      transform: scale(0.98);
      background: rgba(255, 255, 255, 0.2);
    }
    
    .context-menu li.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .context-menu li.disabled:hover {
      background: transparent;
    }
    
    .context-menu li.separator {
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
      margin: 8px 4px;
      padding: 0;
    }
    
    .context-menu li.separator:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    
    .context-menu .icon {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      flex-shrink: 0;
      opacity: 0.9;
    }
    
    .context-menu .shortcut {
      margin-left: auto;
      font-size: 11px;
      opacity: 0.7;
      font-family: 'Unbounded', sans-serif;
      font-weight: 300;
      background: rgba(255, 255, 255, 0.1);
      padding: 3px 6px;
      border-radius: 4px;
    }
    
    .context-menu .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    }
    
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
    
    .accessibility-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .accessibility-modal-backdrop.show {
      opacity: 1;
      visibility: visible;
    }
    
    .accessibility-modal-backdrop.hide {
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    
    .accessibility-modal {
      background: rgba(15, 15, 15, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
      width: 90%;
      max-width: 400px;
      padding: 24px;
      transform: scale(0.95);
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
      overflow: hidden;
    }
    
    .accessibility-modal-backdrop.show .accessibility-modal {
      transform: scale(1);
      opacity: 1;
    }
    
    .accessibility-modal-backdrop.hide .accessibility-modal {
      transform: scale(0.95);
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    
    .accessibility-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 16px;
    }
    
    .accessibility-modal-title {
      font-family: 'Unbounded', sans-serif;
      font-weight: 700;
      font-size: 20px;
      color: white;
      margin: 0;
    }
    
    .accessibility-modal-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: white;
      transition: background 0.2s ease;
    }
    
    .accessibility-modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .accessibility-modal-close svg {
      width: 16px;
      height: 16px;
    }
    
    .accessibility-option {
      display: flex;
      align-items: center;
      margin: 16px 0;
    }
    
    .accessibility-option label {
      font-family: 'Unbounded', sans-serif;
      font-weight: 400;
      font-size: 14px;
      color: #fff;
      margin-left: 12px;
      flex-grow: 1;
    }
    
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 14px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 50%;
      left: 0;
      right: 0;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      transform: translateY(-50%);
      transition: .3s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 12px;
      width: 12px;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      transition: .3s;
    }

    input:checked + .toggle-slider {
      background: #a855f7;
    }

    input:checked + .toggle-slider:before {
      transform: translateX(24px) translateY(-50%);
    }
    
    .accessibility-description {
      font-family: 'Unbounded', sans-serif;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin: 5px 0 0 58px;
    }
    
    .accessibility-footer {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 16px;
    }
    
    .accessibility-save-btn {
      background: linear-gradient(45deg, #6b21a8, #a855f7);
      border: none;
      border-radius: 8px;
      color: white;
      font-family: 'Unbounded', sans-serif;
      font-weight: 500;
      font-size: 14px;
      padding: 10px 20px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      box-shadow: 0 2px 8px rgba(107, 33, 168, 0.3);
    }
    
    .accessibility-save-btn:hover {
      background: linear-gradient(45deg, #7e22ce, #c084fc);
      box-shadow: 0 3px 12px rgba(107, 33, 168, 0.4);
    }
    
    .accessibility-save-btn:active {
      transform: scale(0.97);
      box-shadow: 0 1px 4px rgba(107, 33, 168, 0.2);
    }
    
    .context-menu li {
      opacity: 0;
      transform: translateY(8px);
    }
    
    .context-menu.show li {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .context-menu.show li:nth-child(1) { transition-delay: 0.05s; }
    .context-menu.show li:nth-child(2) { transition-delay: 0.1s; }
    .context-menu.show li:nth-child(3) { transition-delay: 0.15s; }
    .context-menu.show li:nth-child(4) { transition-delay: 0.2s; }
    .context-menu.show li:nth-child(5) { transition-delay: 0.25s; }
    .context-menu.show li:nth-child(6) { transition-delay: 0.3s; }
    .context-menu.show li:nth-child(7) { transition-delay: 0.35s; }
    
    @media (prefers-reduced-motion) {
      .context-menu, 
      .context-menu li,
      .context-menu.show,
      .context-menu.hide,
      .accessibility-modal-backdrop,
      .accessibility-modal {
        transition: none;
      }
    }
    
    .high-contrast-mode {
      filter: contrast(1.5) !important;
      background: #000 !important;
      color: #fff !important;
    }
    
    .high-contrast-mode a {
      color: #3ff !important;
    }
    
    .high-contrast-mode .context-menu {
      background: rgba(0, 0, 0, 0.95) !important;
    }
    
    .screen-reader-focus a:focus, 
    .screen-reader-focus button:focus, 
    .screen-reader-focus input:focus, 
    .screen-reader-focus [tabindex]:focus {
      outline: 3px solid #4f9bff !important;
      outline-offset: 2px !important;
    }
    
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `;
  document.head.appendChild(style);

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Context Menu');
  
  menu.innerHTML = `
    <div class="context-menu-header">
      <h3 class="context-menu-title">Navigation</h3>
    </div>
    
    <div class="context-menu-section">
      <ul>
        <li data-action="refresh" role="menuitem" tabindex="0" aria-label="Refresh Page">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.5 15"/>
          </svg>
          Refresh Page
          <span class="shortcut">F5</span>
        </li>
        <li data-action="back" role="menuitem" tabindex="0" aria-label="Go Back">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
          <span class="shortcut">Alt+←</span>
        </li>
        <li data-action="forward" role="menuitem" tabindex="0" aria-label="Go Forward">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          Forward
          <span class="shortcut">Alt+→</span>
        </li>
        <li data-action="home" role="menuitem" tabindex="0" aria-label="Go to Home Page">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <path d="M9 22V12h6v10"/>
          </svg>
          Home
          <span class="shortcut">Alt+Home</span>
        </li>
      </ul>
    </div>
  `;
  document.body.appendChild(menu);

  const accessibilityModal = document.createElement('div');
  accessibilityModal.className = 'accessibility-modal-backdrop';
  accessibilityModal.setAttribute('role', 'dialog');
  accessibilityModal.setAttribute('aria-label', 'Accessibility Settings');
  accessibilityModal.setAttribute('aria-modal', 'true');
  
  accessibilityModal.innerHTML = `
    <div class="accessibility-modal">
      <div class="accessibility-modal-header">
        <h2 class="accessibility-modal-title">Accessibility Settings</h2>
        <button class="accessibility-modal-close" aria-label="Close accessibility settings">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="accessibility-option">
        <label class="toggle-switch">
          <input type="checkbox" id="high-contrast">
          <span class="toggle-slider"></span>
        </label>
        <label for="high-contrast">High Contrast</label>
      </div>
      <p class="accessibility-description">Increases contrast and improves visibility</p>
      
      <div class="accessibility-option">
        <label class="toggle-switch">
          <input type="checkbox" id="reduce-motion">
          <span class="toggle-slider"></span>
        </label>
        <label for="reduce-motion">Reduce Motion</label>
      </div>
      <p class="accessibility-description">Minimizes animations and transitions</p>
      
      <div class="accessibility-option">
        <label class="toggle-switch">
          <input type="checkbox" id="screen-reader">
          <span class="toggle-slider"></span>
        </label>
        <label for="screen-reader">Screen Reader Support</label>
        </div>
      <p class="accessibility-description">Enhances compatibility with screen readers</p>
      
      <div class="accessibility-footer">
        <button class="accessibility-save-btn">Save Settings</button>
      </div>
    </div>
  `;
  document.body.appendChild(accessibilityModal);

  const accessibilitySettings = {
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    fontSize: 100
  };
  
  function loadSavedSettings() {
    try {
      const savedSettings = localStorage.getItem('accessibilitySettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        accessibilitySettings.highContrast = parsedSettings.highContrast || false;
        accessibilitySettings.reduceMotion = parsedSettings.reduceMotion || false;
        accessibilitySettings.screenReader = parsedSettings.screenReader || false;
        accessibilitySettings.fontSize = parsedSettings.fontSize || 100;
        
        document.getElementById('high-contrast').checked = accessibilitySettings.highContrast;
        document.getElementById('reduce-motion').checked = accessibilitySettings.reduceMotion;
        document.getElementById('screen-reader').checked = accessibilitySettings.screenReader;
        
        applyAccessibilitySettings();
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
    }
  }
  
  function saveSettings() {
    try {
      localStorage.setItem('accessibilitySettings', JSON.stringify(accessibilitySettings));
    } catch (error) {
      console.error('Error saving accessibility settings:', error);
    }
  }

  function applyAccessibilitySettings() {
    if (accessibilitySettings.highContrast) {
      document.documentElement.classList.add('high-contrast-mode');
    } else {
      document.documentElement.classList.remove('high-contrast-mode');
    }
    
    if (accessibilitySettings.reduceMotion) {
      const reduceMotionStyle = document.getElementById('reduce-motion-style') || document.createElement('style');
      reduceMotionStyle.id = 'reduce-motion-style';
      reduceMotionStyle.textContent = `
        *, *::before, *::after {
          animation-duration: 0.001s !important;
          transition-duration: 0.001s !important;
        }
      `;
      if (!document.getElementById('reduce-motion-style')) {
        document.head.appendChild(reduceMotionStyle);
      }
    } else {
      const reduceMotionStyle = document.getElementById('reduce-motion-style');
      if (reduceMotionStyle) {
        reduceMotionStyle.remove();
      }
    }
    
    if (accessibilitySettings.screenReader) {
      document.documentElement.classList.add('screen-reader-focus');
      
      menu.querySelectorAll('li').forEach(item => {
        const label = item.getAttribute('aria-label');
        if (label && !item.querySelector('.sr-only')) {
          const srText = document.createElement('span');
          srText.className = 'sr-only';
          srText.textContent = label;
          item.prepend(srText);
        }
      });
    } else {
      document.documentElement.classList.remove('screen-reader-focus');
      document.querySelectorAll('.sr-only').forEach(el => el.remove());
    }
    
    document.documentElement.style.fontSize = `${accessibilitySettings.fontSize}%`;
  }

  function showMenu(e) {
    e.preventDefault();
    
    const { clientX: x, clientY: y } = e;
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    
    let left = x;
    let top = y;
    
    if (left + menuWidth > window.innerWidth) {
      left = window.innerWidth - menuWidth - 10;
    }
    
    if (top + menuHeight > window.innerHeight) {
      top = window.innerHeight - menuHeight - 10;
    }
    
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    
    menu.classList.remove('hide');
    menu.classList.add('show');
    
    setTimeout(() => {
      const firstItem = menu.querySelector('li[tabindex="0"]');
      if (firstItem) firstItem.focus();
    }, 100);
  }

  function hideMenu() {
    if (!menu.classList.contains('show')) return;
    
    menu.classList.add('hide');
    menu.classList.remove('show');
    
    setTimeout(() => {
      if (menu.classList.contains('hide')) {
        menu.classList.remove('hide');
      }
    }, 300);
  }
  
  function showAccessibilityModal() {
    accessibilityModal.classList.add('show');
    
    setTimeout(() => {
      const closeButton = accessibilityModal.querySelector('.accessibility-modal-close');
      if (closeButton) closeButton.focus();
    }, 100);
    
    document.getElementById('high-contrast').checked = accessibilitySettings.highContrast;
    document.getElementById('reduce-motion').checked = accessibilitySettings.reduceMotion;
    document.getElementById('screen-reader').checked = accessibilitySettings.screenReader;
  }
  
  function hideAccessibilityModal() {
    if (!accessibilityModal.classList.contains('show')) return;
    
    accessibilityModal.classList.remove('show');
    accessibilityModal.classList.add('hide');
    
    setTimeout(() => {
      if (accessibilityModal.classList.contains('hide')) {
        accessibilityModal.classList.remove('hide');
      }
    }, 300);
  }
  
  function createRipple(event) {
    const element = event.currentTarget;
    
    if (element.classList.contains('disabled') || element.classList.contains('separator')) {
      return;
    }
    
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    element.appendChild(ripple);
    
    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  }

  function handleMenuAction(e) {
    const li = e.target.closest('li');
    if (!li || li.classList.contains('disabled') || li.classList.contains('separator')) return;
    
    createRipple(e);
    
    const action = li.dataset.action;
    if (!action) return;
    
    setTimeout(() => {
      switch(action) {
        case 'refresh':
          location.reload();
          break;
        case 'back':
          history.back();
          break;
        case 'forward':
          history.forward();
          break;
        case 'home':
          location.href = '/';
          break;
        case 'accessibility':
          hideMenu();
          showAccessibilityModal();
          return;
        default:
          console.log(`Action ${action} triggered`);
      }
      
      hideMenu();
    }, 200);
  }
  
  function saveAccessibilitySettings() {
    accessibilitySettings.highContrast = document.getElementById('high-contrast').checked;
    accessibilitySettings.reduceMotion = document.getElementById('reduce-motion').checked;
    accessibilitySettings.screenReader = document.getElementById('screen-reader').checked;
    accessibilitySettings.fontSize = 100;
    
    applyAccessibilitySettings();
    saveSettings();
    hideAccessibilityModal();
  }
  
  menu.addEventListener('click', handleMenuAction);
  
  document.addEventListener('contextmenu', showMenu);
  document.addEventListener('click', e => {
    if (!menu.contains(e.target)) {
      hideMenu();
    }
  });
  
  accessibilityModal.querySelector('.accessibility-modal-close').addEventListener('click', hideAccessibilityModal);
  accessibilityModal.querySelector('.accessibility-save-btn').addEventListener('click', saveAccessibilitySettings);
  
  accessibilityModal.addEventListener('click', e => {
    if (e.target === accessibilityModal) {
      hideAccessibilityModal();
    }
  });
  
  document.querySelectorAll('.accessibility-option input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const preview = checkbox.id === 'high-contrast' || checkbox.id === 'reduce-motion' || checkbox.id === 'screen-reader';
      
      if (preview) {
        if (checkbox.id === 'high-contrast') {
          document.documentElement.classList.toggle('high-contrast-mode', checkbox.checked);
        } else if (checkbox.id === 'reduce-motion') {
          if (checkbox.checked) {
            const style = document.getElementById('reduce-motion-style') || document.createElement('style');
            style.id = 'reduce-motion-style';
            style.textContent = `
              *, *::before, *::after {
                animation-duration: 0.001s !important;
                transition-duration: 0.001s !important;
              }
            `;
            if (!document.getElementById('reduce-motion-style')) {
              document.head.appendChild(style);
            }
          } else {
            document.getElementById('reduce-motion-style')?.remove();
          }
        } else if (checkbox.id === 'screen-reader') {
          document.documentElement.classList.toggle('screen-reader-focus', checkbox.checked);
        }
      }
    });
  });
  
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (menu.classList.contains('show')) {
        hideMenu();
      }
      if (accessibilityModal.classList.contains('show')) {
        hideAccessibilityModal();
      }
    }
    
    if (menu.classList.contains('show')) {
      const items = Array.from(menu.querySelectorAll('li:not(.separator):not(.disabled)[tabindex="0"]'));
      const currentIndex = items.findIndex(item => item === document.activeElement);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[nextIndex].focus();
      } else if (e.key === 'Enter' && document.activeElement.closest('li')) {
        e.preventDefault();
        document.activeElement.click();
      }
    }
    
    if (accessibilityModal.classList.contains('show')) {
      const focusableElements = accessibilityModal.querySelectorAll('button, [tabindex="0"], input');
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  });
  
  menu.querySelectorAll('li').forEach(item => {
    if (!item.classList.contains('separator')) {
      item.addEventListener('mousedown', e => e.preventDefault());
    }
  });
  
  window.addEventListener('resize', hideMenu);
  window.addEventListener('scroll', hideMenu);
  
  loadSavedSettings();
  
  window.contextMenu = {
    show: showMenu,
    hide: hideMenu,
    showAccessibilitySettings: showAccessibilityModal
  };
})();
