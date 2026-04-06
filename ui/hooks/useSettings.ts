import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../../storage/settings';
import { DEFAULT_SETTINGS } from '../../storage/settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: 'get-settings' })
      .then((result: Settings) => {
        setSettings(result);
        setLoading(false);
      });

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === 'sync' && changes.settings) {
        setSettings(changes.settings.newValue as Settings);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const updated = await chrome.runtime.sendMessage({
      type: 'update-settings',
      payload: partial,
    });
    setSettings(updated);
  }, []);

  return { settings, updateSettings, loading };
}
