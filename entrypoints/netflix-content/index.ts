export default defineContentScript({
  matches: ['*://*.netflix.com/*'],
  world: 'MAIN',
  runAt: 'document_idle',
  main() {
    import('../../ott/netflix/content').then(({ initNetflixAdBlocker }) => {
      initNetflixAdBlocker();
    });
  },
});
