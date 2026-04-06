import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trySkipNetflixAd } from '../../../ott/netflix/auto-skip';

describe('trySkipNetflixAd', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('clicks skip button when available', () => {
    const button = document.createElement('button');
    button.setAttribute('data-uia', 'ad-skip-button');
    button.click = vi.fn();
    document.body.appendChild(button);

    const result = trySkipNetflixAd();
    expect(button.click).toHaveBeenCalled();
    expect(result).toBe('skipped');
  });

  it('seeks video past ad when ad indicator present but no skip button', () => {
    const adBar = document.createElement('div');
    adBar.setAttribute('data-uia', 'ad-progress-bar');
    document.body.appendChild(adBar);

    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 60, writable: true });
    video.currentTime = 5;
    document.body.appendChild(video);

    const result = trySkipNetflixAd();
    expect(video.currentTime).toBe(60);
    expect(result).toBe('seeked');
  });

  it('returns "none" when no ad is detected', () => {
    const result = trySkipNetflixAd();
    expect(result).toBe('none');
  });
});
