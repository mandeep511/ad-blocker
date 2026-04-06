import { describe, it, expect } from 'vitest';
import { stripAdSegments } from '../../../ott/hotstar/hls-interceptor';

const SAMPLE_M3U8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
https://stream.hotstar.com/segment1.ts
#EXTINF:10.0,
https://stream.hotstar.com/segment2.ts
#EXT-X-DISCONTINUITY
#EXTINF:15.0,
https://hesads.akamaized.net/ad-segment1.ts
#EXTINF:15.0,
https://hesads.akamaized.net/ad-segment2.ts
#EXT-X-DISCONTINUITY
#EXTINF:10.0,
https://stream.hotstar.com/segment3.ts
#EXT-X-ENDLIST`;

describe('stripAdSegments', () => {
  it('removes ad segments between discontinuity markers', () => {
    const result = stripAdSegments(SAMPLE_M3U8);
    expect(result).toContain('segment1.ts');
    expect(result).toContain('segment2.ts');
    expect(result).toContain('segment3.ts');
    expect(result).not.toContain('hesads.akamaized.net');
    expect(result).not.toContain('ad-segment');
  });

  it('preserves playlist headers', () => {
    const result = stripAdSegments(SAMPLE_M3U8);
    expect(result).toContain('#EXTM3U');
    expect(result).toContain('#EXT-X-VERSION:3');
    expect(result).toContain('#EXT-X-TARGETDURATION:10');
  });

  it('handles playlists with no ad segments', () => {
    const clean = `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:10.0,
https://stream.hotstar.com/segment1.ts
#EXT-X-ENDLIST`;
    const result = stripAdSegments(clean);
    expect(result).toContain('segment1.ts');
  });
});
