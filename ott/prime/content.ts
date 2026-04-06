import { startAutoSkip } from './auto-skip';
import { PRIME_AD_SELECTORS, PRIME_COSMETIC_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

export function initPrimeAdBlocker(): void {
  logger.info('Prime Video ad blocker initializing...');
  startAutoSkip(
    PRIME_AD_SELECTORS.skipButton,
    PRIME_AD_SELECTORS.adIndicator,
    PRIME_AD_SELECTORS.video,
  );
  injectCosmeticRules();
  logger.info('Prime Video ad blocker active');
}

function injectCosmeticRules(): void {
  const style = document.createElement('style');
  style.textContent = PRIME_COSMETIC_SELECTORS.map(
    (selector) => `${selector} { display: none !important; }`,
  ).join('\n');
  document.head.appendChild(style);
  logger.debug('Prime Video cosmetic rules injected');
}
