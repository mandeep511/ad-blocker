import { startNetflixAutoSkip } from './auto-skip';
import { NETFLIX_COSMETIC_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

export function initNetflixAdBlocker(): void {
  logger.info('Netflix ad blocker initializing...');
  startNetflixAutoSkip();
  injectCosmeticRules();
  logger.info('Netflix ad blocker active');
}

function injectCosmeticRules(): void {
  const style = document.createElement('style');
  style.textContent = NETFLIX_COSMETIC_SELECTORS.map(
    (selector) => `${selector} { display: none !important; }`,
  ).join('\n');
  document.head.appendChild(style);
  logger.debug('Netflix cosmetic rules injected');
}
