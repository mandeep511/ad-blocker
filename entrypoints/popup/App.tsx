import { useState, useEffect } from 'react';
import { useSettings } from '../../ui/hooks/useSettings';
import { useStats } from '../../ui/hooks/useStats';
import { Toggle } from '../../ui/components/Toggle';
import { Counter } from '../../ui/components/Counter';
import { PlatformToggle } from '../../ui/components/PlatformToggle';
import { SiteToggle } from '../../ui/components/SiteToggle';

export default function App() {
  const { settings, updateSettings, loading } = useSettings();
  const stats = useStats();
  const [currentHostname, setCurrentHostname] = useState<string>('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.url) {
        try {
          setCurrentHostname(new URL(tabs[0].url).hostname);
        } catch {
          // Invalid URL (e.g., chrome:// pages)
        }
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const siteEnabled = !settings.disabledSites.includes(currentHostname);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src="/icon/48.png" alt="Ad Blocker Pro" className="w-8 h-8" />
        <h1 className="text-lg font-bold">Ad Blocker Pro</h1>
      </div>

      {/* Global toggle */}
      <Toggle
        label="Ad Blocking"
        checked={settings.enabled}
        onChange={(enabled) => updateSettings({ enabled })}
      />

      {/* Stats counter */}
      <Counter total={stats.totalBlocked} session={stats.sessionBlocked} />

      {/* Site toggle */}
      {currentHostname && (
        <SiteToggle
          hostname={currentHostname}
          enabled={siteEnabled}
          onToggle={(enabled) => {
            const disabledSites = enabled
              ? settings.disabledSites.filter((s) => s !== currentHostname)
              : [...settings.disabledSites, currentHostname];
            updateSettings({ disabledSites });
          }}
          disabled={!settings.enabled}
        />
      )}

      {/* OTT Platform toggles */}
      <PlatformToggle
        platforms={settings.platforms}
        onToggle={(platform, enabled) =>
          updateSettings({
            platforms: { ...settings.platforms, [platform]: enabled },
          })
        }
        disabled={!settings.enabled}
      />

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-700">
        v1.0.0
      </div>
    </div>
  );
}
