(function() {
  try {
    const path = (window.location.pathname || '').replace(/\/+$/, '/') || '/';
    const lowerPath = path.toLowerCase();
    const isMainPage = lowerPath === '/' || lowerPath === '/index.html' || lowerPath === '/index.htm';
    if (isMainPage) return;

    const alreadyWrapped = window.top !== window || window.location.protocol === 'about:';
    const flagKey = '__ab_wrap_done__';
    if (alreadyWrapped || sessionStorage.getItem(flagKey) === '1') return;

    sessionStorage.setItem(flagKey, '1');
    const targetUrl = window.location.href;
    const wrapper = window.open('about:blank', '_blank');

    if (!wrapper || wrapper.closed) {
      // Pop-up blocked or not allowed; let the page continue normally.
      sessionStorage.removeItem(flagKey);
      return;
    }

    const iframeAttrs = [
      'style="border:0;width:100%;height:100%;display:block;"',
      'allowfullscreen',
      'allow="fullscreen; autoplay; clipboard-write; accelerometer; gyroscope; picture-in-picture; magnetometer"',
      'referrerpolicy="no-referrer"',
      'sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-popups-to-escape-sandbox"'
    ].join(' ');

    const html = [
      '<!doctype html>',
      '<html>',
      '<head>',
      '<title>Loading...</title>',
      '<style>html,body{margin:0;height:100%;background:#0b0c12;}iframe{border:0;width:100%;height:100%;display:block;}</style>',
      '</head>',
      '<body>',
      `<iframe src="${targetUrl}" ${iframeAttrs}></iframe>`,
      '</body>',
      '</html>'
    ].join('');

    wrapper.document.open();
    wrapper.document.write(html);
    wrapper.document.close();
    try { wrapper.focus(); } catch (_) {}

    // Try to close this tab so only the about:blank wrapper stays open
    setTimeout(() => {
      try {
        window.open('', '_self');
        window.close();
      } catch (_) {}
    }, 0);
  } catch (err) {
    console.warn('about-blank wrapper failed:', err);
  }
})();
