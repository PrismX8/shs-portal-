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
        if (!Array.isArray(list)) return [];
        cachedGameList = list;
        return cachedGameList;
      })
      .catch((err) => {
        console.warn('Failed to load game slugs for random game:', err);
        return [];
      });
  }

  function initRandomGameButton() {
    const btn = document.getElementById('randomGameBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      loadGameSlugs().then((list) => {
        if (!list.length) {
          alert('No other games available right now. Please try again later.');
          return;
        }
        const currentSlug = getCurrentSlug();
        const pool = list.filter(
          (item) => item && item.slug && item.slug !== currentSlug
        );
        const usable = pool.length ? pool : list;
        if (!usable.length) {
          alert('No other games available right now. Please try again later.');
          return;
        }
        const choice = usable[Math.floor(Math.random() * usable.length)];
        const target = buildGamePathFromSlug(choice.slug);
        window.location.href = target;
      });
    });
  }

  // ---- Page init ----
  window.addEventListener('DOMContentLoaded', function () {
    // Initialize backend so inline rating/review script can use `db`
    initBackendDb();
    // Wire the random game button
    initRandomGameButton();

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
