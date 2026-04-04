import { describe, it, expect } from 'vitest';
import { compileFiltersToDNR, createEngine } from '../../filters/compiler';

describe('filter compiler', () => {
  it('createEngine parses raw filter text into a FiltersEngine', () => {
    const raw = '||example.com/ads.js^\n||tracker.net/pixel.gif^';
    const engine = createEngine(raw);
    expect(engine).toBeDefined();
  });

  it('compileFiltersToDNR converts filters to DNR rule format', () => {
    const raw = '||ads.example.com^';
    const rules = compileFiltersToDNR(raw);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toMatchObject({
      id: expect.any(Number),
      action: { type: 'block' },
      condition: expect.objectContaining({
        urlFilter: expect.any(String),
      }),
    });
  });

  it('compileFiltersToDNR skips cosmetic filters', () => {
    const raw = 'example.com##.ad-banner\n||ads.example.com^';
    const rules = compileFiltersToDNR(raw);
    for (const rule of rules) {
      expect(rule.action.type).toBe('block');
    }
  });
});
