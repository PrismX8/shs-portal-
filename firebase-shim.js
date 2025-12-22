// Lightweight Firebase compatibility shim using BackendAPI
(function() {
  if (window.firebase) return;

  const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const DEFAULT_API = IS_LOCAL ? 'http://localhost:3000/api' : 'https://shs-portal-backend.vercel.app/api';
  const DEFAULT_WS = IS_LOCAL ? 'ws://localhost:3000' : 'wss://shs-portal-backend.vercel.app';

  let backendApi = null;
  function ensureBackend() {
    if (backendApi) return backendApi;
    if (typeof BackendAPI === 'undefined') return null;
    backendApi = new BackendAPI({ apiUrl: DEFAULT_API, wsUrl: DEFAULT_WS });
    if (!window.backendApi) window.backendApi = backendApi;
    if (!window.db) window.db = backendApi.database();
    return backendApi;
  }

  const firebase = {
    apps: [{}],
    initializeApp: () => firebase,
    database: () => {
      const api = ensureBackend();
      return api ? api.database() : null;
    }
  };

  window.firebase = firebase;
  ensureBackend();
})(); 
