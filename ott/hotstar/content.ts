import { installFetchInterceptor } from './fetch-interceptor';
import { installHlsInterceptor } from './hls-interceptor';
import { HOTSTAR_AD_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

export function initHotstarAdBlocker(): void {
  logger.info('JioHotstar ad blocker initializing...');
  installFetchInterceptor();
  installHlsInterceptor();
  injectCosmeticRules();
  logger.info('JioHotstar ad blocker active');
}

function injectCosmeticRules(): void {
  const style = document.createElement('style');
  style.textContent = HOTSTAR_AD_SELECTORS.map(
    (selector) => `${selector} { display: none !important; }`,
  ).join('\n');
  document.head.appendChild(style);
  logger.debug('Hotstar cosmetic rules injected');
}
