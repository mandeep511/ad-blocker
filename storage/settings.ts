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
  platforms: { hotstar: true, prime: true, netflix: true },
};
