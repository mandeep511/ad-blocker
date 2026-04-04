import { getEnabledLists, type FilterList } from './lists';
import { createEngine, compileFiltersToDNR, serializeEngine } from './compiler';
import { logger } from '../utils/logger';

const LAST_UPDATED_KEY = 'filterListsLastUpdated';
const CACHED_ENGINE_KEY = 'cachedEngine';
const UPDATE_INTERVAL_HOURS = 24;

interface UpdateResult {
  success: boolean;
  rulesCount: number;
  error?: string;
}

export async function fetchAndCompileFilters(): Promise<UpdateResult> {
  const lists = getEnabledLists();
  const rawTexts: string[] = [];

  for (const list of lists) {
    try {
      const text = await fetchFilterList(list);
      rawTexts.push(text);
      logger.info(`Fetched filter list: ${list.name} (${text.length} bytes)`);
    } catch (err) {
      logger.error(`Failed to fetch ${list.name}:`, err);
    }
  }

  if (rawTexts.length === 0) {
    return { success: false, rulesCount: 0, error: 'No filter lists fetched' };
  }

  const combined = rawTexts.join('\n');
  const rules = compileFiltersToDNR(combined);
  const cappedRules = rules.slice(0, 30_000);

  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: cappedRules as chrome.declarativeNetRequest.Rule[],
    });

    const engine = createEngine(combined);
    const serialized = serializeEngine(engine);
    await chrome.storage.local.set({
      [CACHED_ENGINE_KEY]: Array.from(serialized),
      [LAST_UPDATED_KEY]: Date.now(),
    });

    logger.info(`Applied ${cappedRules.length} DNR rules`);
    return { success: true, rulesCount: cappedRules.length };
  } catch (err) {
    logger.error('Failed to update DNR rules:', err);
    return { success: false, rulesCount: 0, error: String(err) };
  }
}

async function fetchFilterList(list: FilterList): Promise<string> {
  const response = await fetch(list.url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${list.url}`);
  }
  return response.text();
}

export async function needsUpdate(): Promise<boolean> {
  const result = await chrome.storage.local.get(LAST_UPDATED_KEY);
  const lastUpdated = result[LAST_UPDATED_KEY] as number | undefined;
  if (!lastUpdated) return true;
  const hoursSince = (Date.now() - lastUpdated) / (1000 * 60 * 60);
  return hoursSince >= UPDATE_INTERVAL_HOURS;
}
