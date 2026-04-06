import { describe, it, expect, vi, afterEach } from 'vitest';
import { observeDOM } from '../../../ott/shared/mutation-observer';

describe('observeDOM', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('calls callback when matching elements are added', async () => {
    const callback = vi.fn();
    const cleanup = observeDOM({
      selector: '.ad-overlay',
      onMatch: callback,
      target: document.body,
    });

    const div = document.createElement('div');
    div.className = 'ad-overlay';
    document.body.appendChild(div);

    await new Promise((r) => setTimeout(r, 0));
    expect(callback).toHaveBeenCalledWith(expect.any(HTMLElement));
    cleanup();
  });

  it('returns a cleanup function that disconnects the observer', () => {
    const cleanup = observeDOM({
      selector: '.ad-overlay',
      onMatch: vi.fn(),
      target: document.body,
    });
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
