export const HOTSTAR_AD_DOMAINS = [
  'hesads.akamaized.net',
  'videoads.hotstar.com',
  'brands.hotstar.com',
  'bifrost-api.hotstar.com',
  'agl-intl.hotstar.com',
  'pubads.g.doubleclick.net',
  'securepubads.g.doubleclick.net',
  'imasdk.googleapis.com',
];

export const HOTSTAR_AD_URL_PATTERNS = [
  /hesads\.akamaized\.net/,
  /videoads\.hotstar\.com/,
  /brands\.hotstar\.com/,
  /adtech/i,
  /\/ads\//i,
  /ad[-_]?break/i,
];

export const HOTSTAR_AD_PAYLOAD_KEYS = [
  'ads',
  'adBreaks',
  'ad_breaks',
  'adConfig',
  'adServerUrl',
  'adTagUrl',
  'vastXml',
  'vmapXml',
  'csai',
];

export const HOTSTAR_AD_SELECTORS = [
  '[class*="ad-overlay"]',
  '[class*="ad-banner"]',
  '[class*="AdContainer"]',
  '[class*="ad-countdown"]',
  '[class*="ad-badge"]',
  '[data-testid*="ad"]',
  '.shaka-ad-container',
];
