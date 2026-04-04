export interface Stats {
  totalBlocked: number;
  sessionBlocked: number;
  blockedPerSite: Record<string, number>;
}

const DEFAULT_STATS: Stats = {
  totalBlocked: 0,
  sessionBlocked: 0,
  blockedPerSite: {},
};

const STORAGE_KEY = 'stats';

export async function getStats(): Promise<Stats> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Stats | undefined;
  return stored ?? { ...DEFAULT_STATS };
}

export async function incrementBlocked(hostname: string): Promise<Stats> {
  const stats = await getStats();
  stats.totalBlocked += 1;
  stats.sessionBlocked += 1;
  stats.blockedPerSite[hostname] = (stats.blockedPerSite[hostname] ?? 0) + 1;
  await chrome.storage.local.set({ [STORAGE_KEY]: stats });
  return stats;
}

export async function resetSessionStats(): Promise<void> {
  const stats = await getStats();
  stats.sessionBlocked = 0;
  await chrome.storage.local.set({ [STORAGE_KEY]: stats });
}
