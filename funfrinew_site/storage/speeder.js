const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

let loadingCount = 0;
const queue = [];
const images = document.querySelectorAll('img[data-src]');

images.forEach(img => {
  img.src = PLACEHOLDER;
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const img = entry.target;
    if (entry.isIntersecting) {

      if (!img.classList.contains('loaded')) {
        loadImage(img);
      }
    } else {

      if (img.classList.contains('loaded')) {
        img.src = PLACEHOLDER;
        img.classList.remove('loaded');
      }
    }
  });
}, { rootMargin: '0px' });


images.forEach(img => observer.observe(img));


function loadImage(img) {
  if (loadingCount < 2) {
    startLoading(img);
  } else {
    if (!queue.includes(img)) {
      queue.push(img);
    }
  }
}


function startLoading(img) {
  loadingCount++;
  img.src = img.getAttribute('data-src');
  img.onload = () => {
    img.classList.add('loaded');
    loadingCount--;
    loadNext();
  };
  img.onerror = () => {
    console.error('Failed to load image:', img.getAttribute('data-src'));
    loadingCount--;
    loadNext();
  };
}


function loadNext() {
  if (queue.length > 0 && loadingCount < 2) {
    const nextImg = queue.shift();
    startLoading(nextImg);
  }
}


if (!('IntersectionObserver' in window)) {
  images.forEach(img => {
    img.src = img.getAttribute('data-src');
  });
}
