    window.addEventListener('DOMContentLoaded', () => {
      const introOverlay = document.getElementById('introOverlay');
      const loadingText = document.getElementById('loadingText');
      const mainContent = document.getElementById('mainContent');

      setTimeout(() => {
        setTimeout(() => {
          introOverlay.classList.add('hide');
          setTimeout(() => {
            mainContent.classList.remove('content-hidden');
            mainContent.classList.add('content-visible');
            setTimeout(() => {
              introOverlay.remove();
            }, 800);
          }, 100);
        }, 2500);
      }, 500);
    });

    document.querySelectorAll('a[href]').forEach(link => {
      link.setAttribute('target', '_blank');
    });

    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    function filterGames() {
      const input = document.getElementById('search-input').value.toLowerCase();
      const gameLinks = document.querySelectorAll('.game-container > a');

      gameLinks.forEach(link => {
        const title = link.querySelector('.game-title').textContent.toLowerCase();
        if (input === '' || title.includes(input)) {
          link.style.display = 'block';
        } else {
          link.style.display = 'none';
        }
      });
    }

    const debouncedFilterGames = debounce(filterGames, 200);

    document.addEventListener('DOMContentLoaded', filterGames);

    document.getElementById('search-input').addEventListener('input', debouncedFilterGames);
