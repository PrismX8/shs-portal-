self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // External URL, wrap in about:blank
    console.log('SW: Intercepting external fetch:', event.request.url);
    const html = `<!doctype html><html><head><title>Loading...</title><style>html,body{margin:0;height:100%;background:#0b0c12;}iframe{border:0;width:100%;height:100%;display:block;}</style></head><body><iframe src="${event.request.url}" allowfullscreen referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-popups-to-escape-sandbox"></iframe></body></html>`;
    event.respondWith(new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  }
});
