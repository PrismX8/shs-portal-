// Lightweight script for individual game pages.
// Handles:
// - Minimal Firebase init for ratings/reviews
// - Random game button on the game detail page
// - Lite-mode/performance tweaks for low-end devices
// - Inject sidebar if missing

(function () {
  // Sidebar removed from game pages - using back button instead
  // ---- Visitor counter injection (shared across game pages) ----
  // ---- Lite-mode / low-performance detection ----
  try {
    const ua = navigator.userAgent || '';
    const isChromeOS = ua.includes('CrOS');
    const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const lowMem = navigator.deviceMemory && navigator.deviceMemory <= 2;
    const prefersReduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isChromeOS || lowCores || lowMem || prefersReduce) {
      document.documentElement.classList.add('lite-mode');
    }
  } catch (e) {
    // Non-critical
  }

  // ---- Backend fallback instead of Firebase ----
  function initBackendDb() {
    try {
      if (window.db) return window.db;
      if (typeof BackendAPI === 'undefined') return null;
      const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      const apiUrl = IS_LOCAL ? 'http://localhost:3000/api' : 'https://shs-portal-backend.vercel.app/api';
      const wsUrl = IS_LOCAL ? 'ws://localhost:3000' : 'wss://shs-portal-backend.vercel.app';
      const api = new BackendAPI({ apiUrl, wsUrl });
      window.backendApi = api;
      window.db = api.database();
      return window.db;
    } catch (err) {
      console.warn('Backend init error on game page:', err);
      return null;
    }
  }

  // ---- Random game button (uses data/game-slugs.json) ----
  let cachedGameList = null;

  function getCurrentSlug() {
    try {
      const path = window.location.pathname || '';
      const match = path.match(/game-([a-z0-9-]+)\.html$/i);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function buildGamePathFromSlug(slug) {
    const filename = 'game-' + slug + '.html';
    const path = window.location.pathname || '';
    if (path.includes('/games/')) {
      return filename;
    }
    if (path.includes('/pages/')) {
      return '../games/' + filename;
    }
    return 'games/' + filename;
  }

  function loadGameSlugs() {
    if (cachedGameList) {
      return Promise.resolve(cachedGameList);
    }

    // Resolve JSON path relative to this page
    let jsonPath = '../data/game-slugs.json';
    const path = window.location.pathname || '';
    if (path.includes('/games/')) {
      jsonPath = '../data/game-slugs.json';
    } else if (path.includes('/pages/')) {
      jsonPath = '../data/game-slugs.json';
    } else {
      jsonPath = 'data/game-slugs.json';
    }

    return fetch(jsonPath, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        cachedGameList = Array.isArray(list) ? list : [];
        return cachedGameList;
      })
      .catch((err) => {
        console.warn('Failed to load game slugs for random game:', err);
        return [];
      });
  }

  function initRandomGameButton() {
    const btns = document.querySelectorAll('#randomGameBtn, #randomGameBtnTop');
    if (!btns.length) return;

    const pickRandomFromData = () =>
      loadGameData().then((list) => {
        if (!list || !list.length) return null;
        const currentSlug = getCurrentSlug();
        const pool = list.filter(
          (item) => item && item.title && slugifyTitle(item.title) !== currentSlug
        );
        const usable = pool.length ? pool : list;
        return usable[Math.floor(Math.random() * usable.length)];
      });

    btns.forEach((btn) => {
      if (btn.hasAttribute('data-handler-attached')) return;
      btn.setAttribute('data-handler-attached', 'true');
      btn.addEventListener('click', function () {
        Promise.all([
          pickRandomFromData(),
          loadGameSlugs().catch(() => []),
        ]).then(([fromData, slugList]) => {
          // Prefer full game data for better coverage
          let targetSlug = fromData ? slugifyTitle(fromData.title || '') : '';
          if (!targetSlug && Array.isArray(slugList) && slugList.length) {
            const currentSlug = getCurrentSlug();
            const pool = slugList.filter((item) => item && item.slug && item.slug !== currentSlug);
            const usable = pool.length ? pool : slugList;
            targetSlug = usable.length ? usable[Math.floor(Math.random() * usable.length)].slug : '';
          }
          if (!targetSlug) {
            alert('No other games available right now. Please try again later.');
            return;
          }
          const target = buildGamePathFromSlug(targetSlug);
          window.location.href = target;
        });
      });
    });
  }

  function getHomeHref() {
    const path = window.location.pathname || '';
    if (path.includes('/games/')) {
      return '../index.html';
    }
    if (path.includes('/pages/')) {
      return '../index.html';
    }
    return 'index.html';
  }

  function getAssetPath(rel) {
    const path = window.location.pathname || '';
    if (path.includes('/games/')) return '../' + rel;
    if (path.includes('/pages/')) return '../' + rel;
    return rel;
  }

  function ensureBackHomeButton() {
    const homeHref = getHomeHref();
    const existing = document.querySelector('.premium-back-btn');
    if (existing) {
      existing.setAttribute('href', homeHref);
      existing.setAttribute('aria-label', 'Back to home');
      return;
    }

    const backBtn = document.createElement('a');
    backBtn.className = 'premium-back-btn';
    backBtn.id = 'gameBackHomeBtn';
    backBtn.href = homeHref;
    backBtn.setAttribute('aria-label', 'Back to home');
    backBtn.innerHTML = '<i class="fas fa-arrow-left"></i><span>Back to Home</span>';

    const pageRoot = document.querySelector('.premium-game-page') || document.body;
    pageRoot.insertBefore(backBtn, pageRoot.firstChild);
  }

  // Strip down the layout and add a slim class we can target with CSS
  function simplifyLayout() {
    document.body.classList.add('game-page-slim');
    const pageRoot = document.querySelector('.premium-game-page');
    if (pageRoot) {
      pageRoot.classList.add('game-page-slim');
    }
  }

  function shuffleArray(list) {
    const copy = Array.isArray(list) ? [...list] : [];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renderRandomGameGrid() {
    const host = document.querySelector('.premium-game-container') || document.querySelector('.premium-game-page');
    if (!host) return;

    const section = document.createElement('section');
    section.className = 'game-quick-picks';
    section.innerHTML = `
      <div class="game-quick-picks__title">
        <i class="fas fa-dice"></i>
        <span>Random games</span>
      </div>
    `;
    const grid = document.createElement('div');
    grid.className = 'game-quick-picks__grid';
    section.appendChild(grid);
    host.appendChild(section);

    loadGameSlugs().then((list) => {
      if (!list || !list.length) {
        grid.innerHTML = '<div class="game-quick-picks__empty">No games available right now.</div>';
        return;
      }
      const currentSlug = getCurrentSlug();
      const pool = list.filter((item) => item && item.slug && item.slug !== currentSlug);
      const picks = shuffleArray(pool.length ? pool : list).slice(0, 12);
      grid.innerHTML = picks
        .map((item) => {
          const href = buildGamePathFromSlug(item.slug);
          const title = item.title || item.slug;
          return `
            <a class="game-quick-pick" href="${href}">
              <span class="game-quick-pick__name">${title}</span>
              <span class="game-quick-pick__cta">Play</span>
            </a>
          `;
        })
        .join('');
    });
  }

  function ensureTopBar() {
    const container = document.querySelector('.premium-game-container');
    const titleEl = document.getElementById('gameTitle');
    if (!container || !titleEl) return;
    if (container.querySelector('.game-top-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'game-top-bar';
    const backHref = getHomeHref();
    bar.innerHTML = `
      <a class="game-top-bar__back" href="${backHref}">
        <i class="fas fa-arrow-left"></i>
        <span>Home</span>
      </a>
      <div class="game-top-bar__title" title="${titleEl.textContent || ''}">
        ${titleEl.textContent || ''}
      </div>
      <div class="game-top-bar__spacer"></div>
    `;
    container.insertBefore(bar, container.firstChild);
  }

  function ensureFullscreenButton() {
    const container = document.querySelector('.premium-game-container');
    if (!container || container.querySelector('.game-fullscreen-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'game-fullscreen-btn';
    btn.innerHTML = '<i class="fas fa-expand"></i><span>Fullscreen</span>';

    btn.addEventListener('click', () => {
      const embedContainer = document.querySelector('.premium-game-embed') || document.body;
      const iframe = embedContainer.querySelector('iframe');
      const target = embedContainer.requestFullscreen ? embedContainer : iframe;
      if (target && target.requestFullscreen) {
        target.requestFullscreen().catch(() => {
          if (iframe && iframe.requestFullscreen) {
            iframe.requestFullscreen().catch(() => {});
          }
        });
      }
    });

    const bar = container.querySelector('.game-top-bar');
    if (bar) {
      bar.appendChild(btn);
    } else {
      container.insertBefore(btn, container.firstChild);
    }
  }

  function replaceUrlWithHome() {
    try {
      const homeHref = getHomeHref();
      const target = new URL(homeHref, window.location.href);
      const stateSlug = getCurrentSlug();
      history.replaceState({ game: stateSlug || null }, '', target.href);
    } catch (e) {
      // Non-critical
    }
  }

  // ---- Enhanced layout with side rails and bottom strip ----
  let cachedGameData = null;
  const FALLBACK_GAME_SET = [
    { title: 'Tap Road', image: 'https://azgames.io/upload/cache/upload/imgs/taproad-m180x180.jpg' },
    { title: 'City Brawl', image: 'https://azgames.io/upload/imgs/citybrawl3.png' },
    { title: 'Lizard Lizard Clicker', image: 'https://azgames.io/upload/imgs/lizardlizardclicker2.png' },
    { title: 'Slope Rider', image: 'https://azgames.io/upload/cache/upload/imgs/sloperider4-m180x180.png' },
    { title: 'Dunk Dash', image: 'https://azgames.io/upload/imgs/dunkdash3.png' },
    { title: 'Mob City', image: 'https://www.onlinegames.io/media/posts/418/responsive/Mob-City-xs.jpg' },
    { title: 'Drift King', image: 'https://www.onlinegames.io/media/posts/729/responsive/Drift-King-xs.jpg' },
    { title: 'Basketball io', image: 'https://www.onlinegames.io/media/posts/302/responsive/Basketball-io-2-xs.jpg' }
  ];

  function slugifyTitle(title = '') {
    return (title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function getSafeImageUrl(game = {}) {
    const placeholder = getAssetPath('images/logoshs.png');
    try {
      const candidate =
        (game && (game.image || game.thumbnail || game.thumb || game.imageUrl || '')) || '';
      const raw = String(candidate).trim();
      if (!raw) return placeholder;
      if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
      if (raw.includes('images.weserv.nl/?url=')) return raw;
      const normalized = raw.startsWith('http')
        ? raw
        : `https://${raw.replace(/^\/+/, '')}`;
      const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(
        normalized.replace(/^https?:\/\//i, '')
      )}&output=webp`;
      return proxied || placeholder;
    } catch (_) {
      return placeholder;
    }
  }

  function normalizeGameRecord(game = {}) {
    const image = getSafeImageUrl(game);
    if (!image) return null;
    return {
      ...game,
      title: game.title || 'Untitled Game',
      embed: game.embed || '',
      image
    };
  }

  function getGameDataPath() {
    const path = window.location.pathname || '';
    if (path.includes('/games/')) return '../data/games.json';
    if (path.includes('/pages/')) return '../data/games.json';
    return 'data/games.json';
  }

  function loadGameData() {
    if (cachedGameData) return Promise.resolve(cachedGameData);

    const shapeList = (list) =>
      (Array.isArray(list) ? list : [])
        .map((item) => normalizeGameRecord(item))
        .filter(Boolean);

    return fetch(getGameDataPath(), { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const normalized = shapeList(list);
        cachedGameData = normalized.length ? normalized : shapeList(FALLBACK_GAME_SET);
        return cachedGameData;
      })
      .catch((err) => {
        console.warn('Failed to load game data for rails:', err);
        cachedGameData = shapeList(FALLBACK_GAME_SET);
        return cachedGameData;
      });
  }

  function createGameCardHTML(game) {
    const slug = slugifyTitle(game.title || '');
    const href = buildGamePathFromSlug(slug);
    const src = getSafeImageUrl(game);
    const title = game.title || 'Game';
    const description = (game.description || '').trim();
    const shortDescription =
      description.length > 120 ? description.substring(0, 120) + '...' : description;
    const avgRating = (game.rating && game.rating.average) || 0;
    const ratingDisplay = avgRating > 0 ? avgRating.toFixed(1) : 'New';
    const ratingHtml =
      avgRating > 0
        ? `<i class="fas fa-star"></i> ${ratingDisplay}`
        : '<span>New</span>';
    return `
      <a class="big-game-cube" href="${href}" title="${title}" data-title="${title}" data-filename="${href}">
        <div class="big-game-cube-gradient-ring"></div>
        <div class="big-game-cube-hover-overlay">
            <div class="big-game-cube-title-overlay">${title}</div>
            <div class="big-game-cube-rating-overlay">${ratingHtml}</div>
            ${description ? `<div class="big-game-cube-description-overlay">${shortDescription}</div>` : ''}
        </div>
        <div class="big-game-cube-gold-ring"></div>
        <div class="game-cube-image" style="background-image:url('${src}'); border-radius:14px; height:160px; min-height:160px; max-height:160px;"></div>
        <div class="game-cube-title" style="text-align:center; margin-top:10px;">${title}</div>
      </a>
    `;
  }

  function setupGameStage() {
    const embed = document.querySelector('.premium-game-embed');
    if (!embed) return;
    const container = embed.closest('.premium-game-container');
    if (!container || container.querySelector('.game-stage')) return;

    const fullscreenBtn = container.querySelector('.premium-fullscreen-btn');
    const description = container.querySelector('.premium-game-description');

    const stage = document.createElement('div');
    stage.className = 'game-stage';

    const leftRail = document.createElement('div');
    leftRail.className = 'game-rail game-rail--left';

    const center = document.createElement('div');
    center.className = 'game-stage__center';

    const rightRail = document.createElement('div');
    rightRail.className = 'game-rail game-rail--right';

    const bottomStrip = document.createElement('div');
    bottomStrip.className = 'game-strip';
    bottomStrip.innerHTML = `
      <div class="game-strip__title">
        <i class="fas fa-list"></i>
        <span>More games to try</span>
      </div>
      <div class="game-strip__text-list" style="display:flex; flex-wrap:wrap; gap:10px; padding:4px 0;"></div>
    `;

    embed.parentNode.insertBefore(stage, embed);
    stage.appendChild(leftRail);

    // Add a secondary random button above the embed
    const randomBlock = document.createElement('div');
    randomBlock.style.cssText =
      'display:flex; align-items:center; gap:10px; margin-bottom:12px; background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); padding:12px 14px; border-radius:12px;';
    randomBlock.innerHTML = `
      <span style="font-weight:800; color:#e2e8f0;">Bored?</span>
      <button id="randomGameBtnTop" class="premium-random-btn" style="margin:0;">
        <i class="fas fa-random"></i>
        <span>Random Game</span>
      </button>
    `;
    center.appendChild(randomBlock);
    center.appendChild(embed);
    if (fullscreenBtn) {
      center.appendChild(fullscreenBtn);
    }
    if (description) {
      center.appendChild(description);
    }
    stage.appendChild(center);
    stage.appendChild(rightRail);
    stage.insertAdjacentElement('afterend', bottomStrip);
  }

  function buildInfoRailContent(title, items = []) {
    if (!items.length) return '';
    const list = items
      .map((item) => `<li style="margin-bottom:6px; line-height:1.4;">${item}</li>`)
      .join('');
    return `
      <div class="rail-card rail-card--cube" style="min-height:auto; padding:14px; background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.08); border-radius:14px;">
        <div class="rail-card__title" style="font-weight:800; margin-bottom:10px;">${title}</div>
        <ul style="padding-left:18px; margin:0;">${list}</ul>
      </div>
    `;
  }

  function renderTextLinks(container, items = []) {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = '<span style="color:rgba(255,255,255,0.65);">No games to show.</span>';
      return;
    }
    container.innerHTML = items
      .map(
        (item) => `<a href="${buildGamePathFromSlug(item.slug)}" style="display:inline-flex; gap:6px; align-items:center; padding:6px 10px; border-radius:10px; background:rgba(255,255,255,0.04); color:#e5e7eb; text-decoration:none; border:1px solid rgba(255,255,255,0.08);">
            <i class="fas fa-play" style="color:#22c55e;"></i>
            <span>${item.title || item.slug}</span>
        </a>`
      )
      .join('');
  }

  function renderRails() {
    const leftRail = document.querySelector('.game-rail--left');
    const rightRail = document.querySelector('.game-rail--right');
    const stripList = document.querySelector('.game-strip__text-list');
    if (!leftRail || !rightRail || !stripList) return;

    loadGameData().then((list) => {
      if (!list.length) return;
      const currentSlug = getCurrentSlug();
      const pool = list.filter((g) => slugifyTitle(g.title) !== currentSlug && g.image);
      const fallback = list.filter((g) => slugifyTitle(g.title) !== currentSlug);
      const picks = shuffleArray(pool.length ? pool : fallback.length ? fallback : list);
      const textItems = picks.map((g) => ({
        title: g.title || 'Game',
        slug: slugifyTitle(g.title || ''),
      }));

      const leftItems = textItems.slice(0, 12);
      const rightItems = textItems.slice(12, 24);

      leftRail.innerHTML = renderRailList(leftItems);
      rightRail.innerHTML = renderRailList(rightItems);

      const stripPicks = textItems.slice(0, 18);
      renderTextLinks(stripList, stripPicks);
    });
  }

  function renderRailList(items = []) {
    if (!items.length) return '';
    return `
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${items
          .map(
            (item) => `<a href="${buildGamePathFromSlug(item.slug)}" style="display:block; padding:10px 12px; border-radius:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:#e5e7eb; text-decoration:none;">
              <i class="fas fa-gamepad" style="margin-right:8px; color:#22c55e;"></i>${item.title}
            </a>`
          )
          .join('')}
      </div>
    `;
  }

  // ---- Page init ----
  window.addEventListener('DOMContentLoaded', function () {
    simplifyLayout();
    // Initialize backend so inline rating/review script can use `db`
    initBackendDb();
    // Wire the random game button
    initRandomGameButton();
    ensureBackHomeButton();
    ensureTopBar();
    ensureFullscreenButton();
    replaceUrlWithHome();
    setupGameStage();
    renderRandomGameGrid();
    renderRails();

    // Apply proxy wrapper for lite mode to speed up game loading
    if (document.documentElement.classList.contains('lite-mode')) {
      const proxyScript = document.createElement('script');
      proxyScript.src = '../game-proxy-wrapper.js';
      proxyScript.defer = true;
      document.head.appendChild(proxyScript);
    }

    // Per-game performance tweaks
    try {
      const path = window.location.pathname || '';
      const isFastFoodManagerPage = /game-fast-food-manager\.html$/i.test(path);
      if (isFastFoodManagerPage) {
        const embedContainer = document.querySelector('.premium-game-embed');
        if (embedContainer) {
          // Reduce effective resolution to help FPS on low-end devices
          embedContainer.style.maxWidth = '960px';
          embedContainer.style.height = '520px';
          embedContainer.style.margin = '0 auto 40px';
        }
      }
    } catch (e) {
      // Non-critical
    }
  });
})();
