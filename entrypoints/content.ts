export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',

  async main() {
    // Request cosmetic filters for this page from the background
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'get-cosmetic-filters',
        payload: {
          url: window.location.href,
          hostname: window.location.hostname,
          domain: getDomain(window.location.hostname),
        },
      });

      if (response?.styles) {
        injectStyles(response.styles);
      }
    } catch (err) {
      console.error('[AdBlockPro] Failed to get cosmetic filters:', err);
    }
  },
});

function injectStyles(css: string): void {
  if (!css.trim()) return;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

function getDomain(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : hostname;
}
