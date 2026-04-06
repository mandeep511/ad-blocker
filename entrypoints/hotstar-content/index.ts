export default defineContentScript({
  matches: ['*://*.hotstar.com/*', '*://*.jiohotstar.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    import('../../ott/hotstar/content').then(({ initHotstarAdBlocker }) => {
      initHotstarAdBlocker();
    });
  },
});
