function openWrapped(url) {
    // Prevent running if already in an iframe to avoid nested wrapping
    if (window !== window.top) return;

    const win = window.open("about:blank");
    if (!win) return alert("Popup blocked!");

    win.document.documentElement.style.margin = "0";
    win.document.documentElement.style.padding = "0";
    win.document.body.style.margin = "0";
    win.document.body.style.padding = "0";
    win.document.body.style.background = "#0b0c12";
    win.document.body.style.overflow = "hidden";

    const iframe = win.document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";
    iframe.src = url;
    iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads";
    iframe.allow = "fullscreen; autoplay; clipboard-write; accelerometer; gyroscope; picture-in-picture; magnetometer";
    iframe.referrerPolicy = "no-referrer";

    win.document.body.appendChild(iframe);

    iframe.onload = () => {
        try {
            const iframeWindow = iframe.contentWindow;
            // Override window.open: Discord and YouTube open in normal new tab, others trapped in same iframe
            iframeWindow.open = function(url, target, features) {
                if (url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('discord.gg'))) {
                    window.open(url, '_blank');
                    return null;
                } else {
                    return iframeWindow;
                }
            };

            // Override location methods to navigate within the iframe
            const originalAssign = iframeWindow.location.assign;
            iframeWindow.location.assign = function(url) { iframe.src = url; };
            const originalReplace = iframeWindow.location.replace;
            iframeWindow.location.replace = function(url) { iframe.src = url; };

            // Prevent setting location.href to external by overriding
            Object.defineProperty(iframeWindow.location, 'href', {
                get: function() { return iframe.src; },
                set: function(val) { iframe.src = val; }
            });

            // Additional security: prevent access to parent window
            Object.defineProperty(iframeWindow, 'top', { value: iframeWindow, writable: false, configurable: false });
            Object.defineProperty(iframeWindow, 'parent', { value: iframeWindow, writable: false, configurable: false });
            iframeWindow.opener = null;

            // Override history methods to stay in iframe
            const originalPushState = iframeWindow.history.pushState;
            iframeWindow.history.pushState = function(state, title, url) {
                if (url && typeof url === 'string') iframe.src = url;
                return originalPushState.call(this, state, title, url);
            };
            const originalReplaceState = iframeWindow.history.replaceState;
            iframeWindow.history.replaceState = function(state, title, url) {
                if (url && typeof url === 'string') iframe.src = url;
                return originalReplaceState.call(this, state, title, url);
            };

            // Override location.reload to reload iframe
            const originalReload = iframeWindow.location.reload;
            iframeWindow.location.reload = function() {
                iframe.src = iframe.src;
            };

            const doc = iframe.contentDocument;
            const patchElements = () => {
                // Handle links: Discord and YouTube open in new tab, others in same iframe
                const links = doc.querySelectorAll("a");
                links.forEach(a => {
                    const href = a.href || '';
                    const isAllowed = href.includes('youtube.com') || href.includes('youtu.be') || href.includes('discord.gg');
                    if (isAllowed) {
                        a.target = "_blank";
                    } else {
                        a.target = "_self";
                    }
                    // Prevent right-click open in new tab by disabling context menu on links
                    a.oncontextmenu = (e) => e.preventDefault();
                });
                // Force all forms to submit in the same iframe
                const forms = doc.querySelectorAll("form");
                forms.forEach(f => f.target = "_self");
            };

            const observer = new MutationObserver(patchElements);
            observer.observe(doc, { childList: true, subtree: true });
            patchElements();

            // Prevent unload events that might try to navigate away
            iframeWindow.addEventListener('beforeunload', (e) => {
                e.preventDefault();
                e.returnValue = '';
            });

        } catch (e) {
            // If cross-origin, access is blocked, but sandbox prevents escapes
            console.warn('Cannot access iframe content (likely cross-origin), but sandbox secures it:', e);
        }
    };

    // Focus the wrapper window
    try { win.focus(); } catch (_) {}

    // Attempt to close the original tab
    setTimeout(() => {
        try {
            window.open('', '_self');
            window.close();
        } catch (_) {}
    }, 100);
}

function openGame() {
    openWrapped("https://shsportal.vercel.app/");
}

function openYouTube() {
    window.open("https://youtube.com/", "_blank");
}
