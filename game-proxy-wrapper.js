function wrapGameUrlWithProxy(url) {
  if (!url || url.startsWith('about:') || url.startsWith('data:') || url.includes('proxyyy.up.railway.app')) {
    return url;
  }
  const encodedUrl = encodeURIComponent(url);
  const proxied = `https://proxyyy.up.railway.app/?url=${encodedUrl}`;
  console.log('Lite mode: Wrapping game URL with proxy for faster loading:', url, '->', proxied);
  return proxied;
}

document.addEventListener('DOMContentLoaded', function() {
  const gameEmbed = document.getElementById('gameEmbed');
  if (gameEmbed && gameEmbed.src) {
    gameEmbed.src = wrapGameUrlWithProxy(gameEmbed.src);
  }
});

document.addEventListener('beforeload', function(e) {
  const gameEmbed = document.getElementById('gameEmbed');
  if (e.target === gameEmbed && gameEmbed.src) {
    gameEmbed.src = wrapGameUrlWithProxy(gameEmbed.src);
  }
}, true);
