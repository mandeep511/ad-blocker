import { describe, it, expect } from 'vitest';
import { FILTER_LISTS, getEnabledLists } from '../../filters/lists';

describe('filter lists', () => {
  it('has at least 3 bundled filter lists', () => {
    const bundled = FILTER_LISTS.filter((l) => l.bundledPath);
    expect(bundled.length).toBeGreaterThanOrEqual(3);
  });

  it('every list has a valid URL', () => {
    for (const list of FILTER_LISTS) {
      expect(list.url).toMatch(/^https:\/\//);
    }
  });

  it('getEnabledLists returns only enabled lists', () => {
    const enabled = getEnabledLists();
    expect(enabled.every((l) => l.enabled)).toBe(true);
  });
});
