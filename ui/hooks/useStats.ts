import { useState, useEffect } from 'react';
import type { Stats } from '../../storage/stats';

const DEFAULT_STATS: Stats = {
  totalBlocked: 0,
  sessionBlocked: 0,
  blockedPerSite: {},
};

export function useStats() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);

  useEffect(() => {
    chrome.runtime
      .sendMessage({ type: 'get-stats' })
      .then((result: Stats) => setStats(result));

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === 'local' && changes.stats) {
        setStats(changes.stats.newValue as Stats);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return stats;
}
