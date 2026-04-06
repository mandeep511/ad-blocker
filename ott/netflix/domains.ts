export const NETFLIX_AD_SELECTORS = {
  skipButton: '[data-uia="ad-skip-button"], [class*="skip-ad"], .watch-video--skip-ad-button',
  adIndicator: '[data-uia="ad-progress-bar"], [class*="ad-indicator"], [class*="AdBreak"]',
  video: 'video',
  adTimer: '[class*="ad-timer"], [data-uia="ad-timer"]',
};

export const NETFLIX_COSMETIC_SELECTORS = [
  '[class*="billboard-ad"]',
  '[class*="interstitial-ad"]',
];
