export default defineContentScript({
  matches: ['*://*.primevideo.com/*', '*://*.amazon.com/gp/video/*'],
  world: 'MAIN',
  runAt: 'document_idle',
  main() {
    import('../../ott/prime/content').then(({ initPrimeAdBlocker }) => {
      initPrimeAdBlocker();
    });
  },
});
