import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trySkipAd } from '../../../ott/prime/auto-skip';

describe('trySkipAd', () => {
  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => { document.body.innerHTML = ''; });

  it('clicks skip button when available', () => {
    const button = document.createElement('button');
    button.className = 'adSkipButton';
    button.click = vi.fn();
    document.body.appendChild(button);

    const result = trySkipAd('[class*="adSkipButton"]', 'video');
    expect(button.click).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no skip button exists', () => {
    const result = trySkipAd('[class*="adSkipButton"]', 'video');
    expect(result).toBe(false);
  });

  it('seeks video to end when no skip button but video and ad indicator exist', () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 30, writable: true });
    video.currentTime = 5;
    document.body.appendChild(video);

    const adBadge = document.createElement('div');
    adBadge.className = 'ad-badge';
    document.body.appendChild(adBadge);

    const result = trySkipAd('[class*="nonexistent"]', 'video', '[class*="ad-badge"]');
    expect(video.currentTime).toBe(30);
    expect(result).toBe(true);
  });
});
