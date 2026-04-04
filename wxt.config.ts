import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Ad Blocker Pro',
    description: 'Block ads on the web and OTT platforms (JioHotstar, Prime Video, Netflix)',
    version: '1.0.0',
    permissions: [
      'declarativeNetRequest',
      'declarativeNetRequestFeedback',
      'storage',
      'activeTab',
      'scripting',
      'alarms',
    ],
    host_permissions: [
      '*://*.hotstar.com/*',
      '*://*.jiohotstar.com/*',
      '*://*.primevideo.com/*',
      '*://*.amazon.com/gp/video/*',
      '*://*.netflix.com/*',
      '<all_urls>',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
