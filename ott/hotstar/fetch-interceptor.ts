import { HOTSTAR_AD_PAYLOAD_KEYS } from './domains';
import { logger } from '../../utils/logger';

export function stripAdPayloadKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripAdPayloadKeys(item));
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (HOTSTAR_AD_PAYLOAD_KEYS.includes(key)) {
      logger.debug(`Stripped ad key from response: "${key}"`);
      continue;
    }
    result[key] = stripAdPayloadKeys(value);
  }
  return result;
}

export function installFetchInterceptor(): void {
  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await originalFetch.call(this, input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (!isHotstarApiUrl(url)) {
      return response;
    }

    try {
      const cloned = response.clone();
      const json = await cloned.json();
      const cleaned = stripAdPayloadKeys(json);
      logger.debug(`Intercepted Hotstar API: ${url}`);
      return new Response(JSON.stringify(cleaned), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      return response;
    }
  };

  logger.info('Hotstar fetch interceptor installed');
}

function isHotstarApiUrl(url: string): boolean {
  return (
    url.includes('api.hotstar.com') ||
    url.includes('bifrost') ||
    url.includes('/v1/page') ||
    url.includes('/playback/')
  );
}
