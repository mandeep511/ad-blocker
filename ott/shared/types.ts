export interface OTTPlatform {
  name: string;
  id: 'hotstar' | 'prime' | 'netflix';
  domains: string[];
  contentScriptMatches: string[];
}

export interface AdDetectionResult {
  isAd: boolean;
  skipButton?: HTMLElement | null;
  adDuration?: number;
}
