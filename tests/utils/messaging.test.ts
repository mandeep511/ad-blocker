import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, onMessage } from '../../utils/messaging';

describe('messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendMessage calls chrome.runtime.sendMessage with typed payload', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce('pong');

    const result = await sendMessage('get-stats', undefined);

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'get-stats',
      payload: undefined,
    });
  });

  it('onMessage registers a typed handler', () => {
    const handler = vi.fn();
    onMessage('get-stats', handler);

    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});
