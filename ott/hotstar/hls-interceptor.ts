import { HOTSTAR_AD_URL_PATTERNS } from './domains';
import { logger } from '../../utils/logger';

export function stripAdSegments(playlistText: string): string {
  const lines = playlistText.split('\n');
  const result: string[] = [];
  let inAdBlock = false;
  let pendingDiscontinuity = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '#EXT-X-DISCONTINUITY') {
      const nextUrl = findNextUrl(lines, i + 1);
      if (nextUrl && isAdUrl(nextUrl)) {
        inAdBlock = true;
        continue;
      } else if (inAdBlock) {
        inAdBlock = false;
        continue;
      } else {
        pendingDiscontinuity = true;
        continue;
      }
    }

    if (inAdBlock) continue;

    if (pendingDiscontinuity) {
      result.push('#EXT-X-DISCONTINUITY');
      pendingDiscontinuity = false;
    }

    result.push(lines[i]);
  }

  const stripped = result.join('\n');
  if (stripped !== playlistText) {
    logger.debug('Stripped ad segments from HLS playlist');
  }
  return stripped;
}

function findNextUrl(lines: string[], startIdx: number): string | null {
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;
    return line;
  }
  return null;
}

function isAdUrl(url: string): boolean {
  return HOTSTAR_AD_URL_PATTERNS.some((pattern) => pattern.test(url));
}

export function installHlsInterceptor(): void {
  const checkInterval = setInterval(() => {
    const Hls = (window as unknown as { Hls?: any }).Hls;
    if (!Hls) return;
    clearInterval(checkInterval);
    hookHlsLoader(Hls);
    logger.info('HLS.js interceptor installed');
  }, 500);

  setTimeout(() => clearInterval(checkInterval), 30_000);
}

function hookHlsLoader(Hls: any): void {
  const originalLoadSource = Hls.prototype.loadSource;

  Hls.prototype.loadSource = function (url: string) {
    logger.debug(`HLS loadSource intercepted: ${url}`);

    const instance = this as any;
    const OriginalLoader = instance.config.pLoader || instance.config.loader;

    class AdStrippingLoader {
      private loader: any;

      constructor(config: any) {
        this.loader = new OriginalLoader(config);
      }

      load(context: any, config: any, callbacks: any) {
        const originalOnSuccess = callbacks.onSuccess;
        callbacks.onSuccess = (response: any, stats: any, loadContext: any) => {
          if (typeof response.data === 'string' && response.data.includes('#EXTINF')) {
            response.data = stripAdSegments(response.data);
          }
          originalOnSuccess(response, stats, loadContext);
        };
        this.loader.load(context, config, callbacks);
      }

      abort() { this.loader.abort(); }
      destroy() { this.loader.destroy(); }
    }

    instance.config.pLoader = AdStrippingLoader;
    return originalLoadSource.call(this, url);
  };
}
