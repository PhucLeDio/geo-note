// Simple service worker registration for production builds
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Only register in production (when served from a host) to avoid interfering with dev server
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((reg) => {
            console.log('Service worker registered.', reg);
          })
          .catch((err) => {
            console.warn('Service worker registration failed:', err);
          });
      });
    }
  }
}
