import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSettings,
  updateSettings,
  DEFAULT_SETTINGS,
} from '../../storage/settings';

describe('settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSettings returns defaults when storage is empty', async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValueOnce({});
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('getSettings merges stored values with defaults', async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValueOnce({
      settings: { enabled: false },
    });
    const settings = await getSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.platforms.hotstar).toBe(true);
  });

  it('updateSettings writes partial settings to sync storage', async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValueOnce({});
    await updateSettings({ enabled: false });
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      settings: expect.objectContaining({ enabled: false }),
    });
  });
});
