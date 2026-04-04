import {
  FiltersEngine,
  NetworkFilter,
  Request,
  parseFilters,
} from '@ghostery/adblocker';
import { logger } from '../utils/logger';

export { Request } from '@ghostery/adblocker';

interface DNRRule {
  id: number;
  action: { type: 'block' };
  condition: {
    urlFilter?: string;
    domains?: string[];
    resourceTypes?: string[];
  };
}

export function createEngine(rawFilters: string): FiltersEngine {
  return FiltersEngine.parse(rawFilters);
}

export function compileFiltersToDNR(rawFilters: string): DNRRule[] {
  const { networkFilters } = parseFilters(rawFilters);
  const rules: DNRRule[] = [];
  let ruleId = 1;

  for (const filter of networkFilters) {
    if (filter.isException()) continue;

    const urlFilter = networkFilterToUrlFilter(filter);
    if (!urlFilter) continue;

    const rule: DNRRule = {
      id: ruleId++,
      action: { type: 'block' },
      condition: { urlFilter },
    };

    const resourceTypes = getResourceTypes(filter);
    if (resourceTypes.length > 0) {
      rule.condition.resourceTypes = resourceTypes;
    }

    rules.push(rule);
  }

  logger.info(`Compiled ${rules.length} DNR rules from ${networkFilters.length} network filters`);
  return rules;
}

function networkFilterToUrlFilter(filter: NetworkFilter): string | null {
  const hostname = filter.getHostname();
  const pattern = filter.getFilter();

  // At least one of hostname or pattern must be present
  if (!hostname && !pattern) return null;

  let urlFilter = '';

  if (filter.isHostnameAnchor() && hostname) {
    urlFilter += `||${hostname}`;
  }

  if (pattern) {
    urlFilter += pattern;
  } else if (!urlFilter) {
    return null;
  }

  // Replace ^ (separator placeholder) with * wildcard for DNR
  urlFilter = urlFilter.replace(/\^/g, '*');

  return urlFilter || null;
}

const ABP_TO_DNR_TYPES: Record<string, string> = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  font: 'font',
  xmlhttprequest: 'xmlhttprequest',
  media: 'media',
  websocket: 'websocket',
  subdocument: 'sub_frame',
  document: 'main_frame',
  other: 'other',
};

function getResourceTypes(filter: NetworkFilter): string[] {
  const types: string[] = [];
  for (const [abpType, dnrType] of Object.entries(ABP_TO_DNR_TYPES)) {
    if (filter.getFilter()?.includes(`$${abpType}`)) {
      types.push(dnrType);
    }
  }
  return types;
}

export function serializeEngine(engine: FiltersEngine): Uint8Array {
  return engine.serialize();
}

export function deserializeEngine(data: Uint8Array): FiltersEngine {
  return FiltersEngine.deserialize(data);
}
