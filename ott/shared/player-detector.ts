import { logger } from '../../utils/logger';
import { observeDOM } from './mutation-observer';
import type { AdDetectionResult } from './types';

export interface PlayerDetectorOptions {
  videoSelector: string;
  adIndicatorSelector: string;
  skipButtonSelector?: string;
  onAdStateChange: (result: AdDetectionResult) => void;
}

export function detectPlayerAds(options: PlayerDetectorOptions): () => void {
  const { videoSelector, adIndicatorSelector, skipButtonSelector, onAdStateChange } = options;
  let lastAdState = false;

  const checkAdState = () => {
    const adIndicator = document.querySelector(adIndicatorSelector);
    const isAd = adIndicator !== null;

    if (isAd !== lastAdState) {
      lastAdState = isAd;
      const skipButton = skipButtonSelector
        ? (document.querySelector(skipButtonSelector) as HTMLElement | null)
        : null;
      logger.debug(`Ad state changed: ${isAd ? 'AD' : 'CONTENT'}`);
      onAdStateChange({ isAd, skipButton });
    }
  };

  const interval = setInterval(checkAdState, 500);
  const cleanup = observeDOM({
    selector: adIndicatorSelector,
    onMatch: () => checkAdState(),
  });

  return () => {
    clearInterval(interval);
    cleanup();
  };
}
