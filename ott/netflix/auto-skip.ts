import { NETFLIX_AD_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

type SkipResult = 'skipped' | 'seeked' | 'none';

export function trySkipNetflixAd(): SkipResult {
  const skipButton = document.querySelector(NETFLIX_AD_SELECTORS.skipButton) as HTMLElement | null;
  if (skipButton) {
    skipButton.click();
    logger.debug('Netflix: clicked skip button');
    return 'skipped';
  }

  const adIndicator = document.querySelector(NETFLIX_AD_SELECTORS.adIndicator);
  if (adIndicator) {
    const video = document.querySelector(NETFLIX_AD_SELECTORS.video) as HTMLVideoElement | null;
    if (video && video.duration && isFinite(video.duration)) {
      video.currentTime = video.duration;
      logger.debug('Netflix: seeked past ad');
      return 'seeked';
    }
  }

  return 'none';
}

export function startNetflixAutoSkip(): () => void {
  const interval = setInterval(() => { trySkipNetflixAd(); }, 500);
  logger.info('Netflix auto-skip started');
  return () => {
    clearInterval(interval);
    logger.info('Netflix auto-skip stopped');
  };
}
