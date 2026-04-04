import { vi } from 'vitest';

// Mock chrome.storage API
const storageData: Record<string, unknown> = {};

const createStorageArea = () => ({
  get: vi.fn((keys: string | string[]) => {
    if (typeof keys === 'string') {
      return Promise.resolve({ [keys]: storageData[keys] });
    }
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      result[key] = storageData[key];
    }
    return Promise.resolve(result);
  }),
  set: vi.fn((items: Record<string, unknown>) => {
    Object.assign(storageData, items);
    return Promise.resolve();
  }),
  remove: vi.fn((keys: string | string[]) => {
    const keyArr = typeof keys === 'string' ? [keys] : keys;
    for (const key of keyArr) {
      delete storageData[key];
    }
    return Promise.resolve();
  }),
});

const chrome = {
  storage: {
    sync: createStorageArea(),
    local: createStorageArea(),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  declarativeNetRequest: {
    updateDynamicRules: vi.fn(() => Promise.resolve()),
    getDynamicRules: vi.fn(() => Promise.resolve([])),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([])),
  },
};

vi.stubGlobal('chrome', chrome);
