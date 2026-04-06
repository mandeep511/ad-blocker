export default defineBackground({
  main() {
    console.info('[AdBlockPro] Background service worker started');

    // On install: fetch and compile filter lists
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        console.info('[AdBlockPro] Extension installed — fetching filter lists');
        const { resetSessionStats } = await import('../storage/stats');
        const { fetchAndCompileFilters } = await import('../filters/updater');
        await resetSessionStats();
        await fetchAndCompileFilters();
      }
    });

    // Set up periodic filter list updates (every 24 hours)
    chrome.alarms.create('filter-update', { periodInMinutes: 24 * 60 });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'filter-update') {
        const { needsUpdate, fetchAndCompileFilters } = await import('../filters/updater');
        if (await needsUpdate()) {
          console.info('[AdBlockPro] Updating filter lists...');
          await fetchAndCompileFilters();
        }
      }
    });

    // Track blocked requests via declarativeNetRequest feedback
    if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
      chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
        async (info) => {
          const { incrementBlocked } = await import('../storage/stats');
          const hostname = new URL(info.request.url).hostname;
          await incrementBlocked(hostname);
        },
      );
    }

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((err) => {
          console.error('[AdBlockPro] Message handler error:', err);
          sendResponse(undefined);
        });
      return true;
    });

    console.info('[AdBlockPro] Background service worker ready');
  },
});

async function handleMessage(
  message: { type: string; payload?: unknown },
): Promise<unknown> {
  const { getSettings, updateSettings } = await import('../storage/settings');
  const { getStats, incrementBlocked } = await import('../storage/stats');

  switch (message.type) {
    case 'get-settings':
      return getSettings();

    case 'update-settings':
      return updateSettings(message.payload as any);

    case 'get-stats':
      return getStats();

    case 'increment-blocked':
      return incrementBlocked((message.payload as { hostname: string }).hostname);

    case 'toggle-extension': {
      const enabled = message.payload as boolean;
      return updateSettings({ enabled });
    }

    case 'toggle-site': {
      const { hostname, enabled } = message.payload as { hostname: string; enabled: boolean };
      const settings = await getSettings();
      const disabledSites = enabled
        ? settings.disabledSites.filter((s) => s !== hostname)
        : [...settings.disabledSites, hostname];
      return updateSettings({ disabledSites });
    }

    case 'toggle-platform': {
      const { platform, enabled: platformEnabled } = message.payload as {
        platform: 'hotstar' | 'prime' | 'netflix';
        enabled: boolean;
      };
      const currentSettings = await getSettings();
      return updateSettings({
        platforms: { ...currentSettings.platforms, [platform]: platformEnabled },
      });
    }

    case 'get-cosmetic-filters':
      return { styles: '' };

    default:
      console.warn(`[AdBlockPro] Unknown message type: ${message.type}`);
      return undefined;
  }
}
