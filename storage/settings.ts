export interface Settings {
  enabled: boolean;
  disabledSites: string[];
  platforms: {
    hotstar: boolean;
    prime: boolean;
    netflix: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  disabledSites: [],
  platforms: {
    hotstar: true,
    prime: true,
    netflix: true,
  },
};

const STORAGE_KEY = 'settings';

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    platforms: {
      ...DEFAULT_SETTINGS.platforms,
      ...stored.platforms,
    },
  };
}

export async function updateSettings(
  partial: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = {
    ...current,
    ...partial,
    platforms: {
      ...current.platforms,
      ...(partial.platforms ?? {}),
    },
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
  return updated;
}

export function isSiteDisabled(settings: Settings, hostname: string): boolean {
  return settings.disabledSites.includes(hostname);
}
