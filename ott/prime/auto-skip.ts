import { logger } from '../../utils/logger';

export function trySkipAd(
  skipButtonSelector: string,
  videoSelector: string,
  adIndicatorSelector?: string,
): boolean {
  const skipButton = document.querySelector(skipButtonSelector) as HTMLElement | null;
  if (skipButton) {
    skipButton.click();
    logger.debug('Clicked skip button');
    return true;
  }

  if (adIndicatorSelector) {
    const adIndicator = document.querySelector(adIndicatorSelector);
    if (adIndicator) {
      const video = document.querySelector(videoSelector) as HTMLVideoElement | null;
      if (video && video.duration && isFinite(video.duration)) {
        video.currentTime = video.duration;
        logger.debug('Seeked video to end of ad');
        return true;
      }
    }
  }

  return false;
}

export function startAutoSkip(
  skipButtonSelector: string,
  adIndicatorSelector: string,
  videoSelector: string,
): () => void {
  const interval = setInterval(() => {
    const adIndicator = document.querySelector(adIndicatorSelector);
    if (adIndicator) {
      trySkipAd(skipButtonSelector, videoSelector, adIndicatorSelector);
    }
  }, 500);

  logger.info('Prime Video auto-skip started');
  return () => {
    clearInterval(interval);
    logger.info('Prime Video auto-skip stopped');
  };
}
