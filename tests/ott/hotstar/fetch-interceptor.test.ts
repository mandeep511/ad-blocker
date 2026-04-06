import { describe, it, expect } from 'vitest';
import { stripAdPayloadKeys } from '../../../ott/hotstar/fetch-interceptor';

describe('stripAdPayloadKeys', () => {
  it('removes ad-related keys from API response', () => {
    const response = {
      playbackUrl: 'https://stream.hotstar.com/video.m3u8',
      ads: { preroll: 'https://ads.example.com/preroll.xml' },
      adBreaks: [{ time: 0, type: 'preroll' }],
      title: 'Movie Title',
    };
    const cleaned = stripAdPayloadKeys(response) as any;
    expect(cleaned.playbackUrl).toBe('https://stream.hotstar.com/video.m3u8');
    expect(cleaned.title).toBe('Movie Title');
    expect(cleaned.ads).toBeUndefined();
    expect(cleaned.adBreaks).toBeUndefined();
  });

  it('handles nested objects with ad keys', () => {
    const response = {
      data: {
        playback: {
          adConfig: { enabled: true },
          streamUrl: 'https://stream.hotstar.com/v.m3u8',
        },
      },
    };
    const cleaned = stripAdPayloadKeys(response) as any;
    expect(cleaned.data.playback.streamUrl).toBe('https://stream.hotstar.com/v.m3u8');
    expect(cleaned.data.playback.adConfig).toBeUndefined();
  });

  it('returns primitives unchanged', () => {
    expect(stripAdPayloadKeys('hello')).toBe('hello');
    expect(stripAdPayloadKeys(42)).toBe(42);
    expect(stripAdPayloadKeys(null)).toBe(null);
  });
});
