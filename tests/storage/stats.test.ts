import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStats, incrementBlocked, resetSessionStats } from '../../storage/stats';

describe('stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getStats returns zero counts when storage is empty', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({});
    const stats = await getStats();
    expect(stats.totalBlocked).toBe(0);
    expect(stats.sessionBlocked).toBe(0);
  });

  it('incrementBlocked increments both total and session counts', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({
      stats: { totalBlocked: 10, sessionBlocked: 3, blockedPerSite: {} },
    });
    await incrementBlocked('example.com');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      stats: expect.objectContaining({
        totalBlocked: 11,
        sessionBlocked: 4,
      }),
    });
  });

  it('incrementBlocked tracks per-site counts', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({
      stats: { totalBlocked: 0, sessionBlocked: 0, blockedPerSite: {} },
    });
    await incrementBlocked('example.com');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      stats: expect.objectContaining({
        blockedPerSite: { 'example.com': 1 },
      }),
    });
  });

  it('resetSessionStats resets only session count', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValueOnce({
      stats: { totalBlocked: 50, sessionBlocked: 20, blockedPerSite: { 'a.com': 5 } },
    });
    await resetSessionStats();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      stats: expect.objectContaining({
        totalBlocked: 50,
        sessionBlocked: 0,
      }),
    });
  });
});
