# Ad Blocker Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome/Edge extension that blocks web ads via filter lists (DNR) and blocks OTT platform ads (JioHotstar, Prime Video, Netflix) via content script techniques.

**Architecture:** WXT framework with file-based entrypoints. Background service worker manages filter list compilation to DNR rules and periodic updates. OTT content scripts run in `world: "MAIN"` to intercept page-level APIs (fetch, HLS.js). React popup provides toggle controls and stats.

**Tech Stack:** WXT (Vite/MV3), React 18, TypeScript, Tailwind CSS, `@ghostery/adblocker` (formerly `@cliqz/adblocker`), Vitest

> **Note:** The spec references `@cliqz/adblocker` but the package has been renamed to `@ghostery/adblocker`. We use the current package name throughout.

---

## File Structure

```
ad-block-chrome-ext/
├── src/
│   ├── entrypoints/
│   │   ├── background/index.ts          # Service worker: filter updates, DNR, stats, OTT script registration
│   │   ├── popup/
│   │   │   ├── index.html               # Popup HTML shell
│   │   │   ├── main.tsx                  # React mount point
│   │   │   ├── App.tsx                   # Popup root component
│   │   │   └── App.css                   # Tailwind imports
│   │   └── content/index.ts             # General cosmetic filtering content script
│   ├── ott/
│   │   ├── hotstar/
│   │   │   ├── content.ts               # Hotstar content script entry (world: MAIN)
│   │   │   ├── hls-interceptor.ts       # HLS.js m3u8 ad segment stripping
│   │   │   ├── fetch-interceptor.ts     # fetch() wrapper for BFF API filtering
│   │   │   └── domains.ts              # Blocked ad domains list
│   │   ├── prime/
│   │   │   ├── content.ts               # Prime Video content script entry
│   │   │   ├── auto-skip.ts            # Skip button auto-clicker + seek
│   │   │   └── domains.ts
│   │   ├── netflix/
│   │   │   ├── content.ts               # Netflix content script entry
│   │   │   ├── auto-skip.ts            # Skip/seek logic
│   │   │   └── domains.ts
│   │   └── shared/
│   │       ├── mutation-observer.ts     # Shared DOM observation utility
│   │       ├── player-detector.ts       # Generic video player state detection
│   │       └── types.ts                 # Shared OTT types
│   ├── filters/
│   │   ├── compiler.ts                  # @ghostery/adblocker -> DNR rule compilation
│   │   ├── lists.ts                     # Filter list URLs and metadata
│   │   ├── updater.ts                   # Background fetch + update logic
│   │   └── bundled/                     # Baseline filter lists (built into extension)
│   │       ├── easylist.txt
│   │       ├── easyprivacy.txt
│   │       └── ublock-ads.txt
│   ├── storage/
│   │   ├── settings.ts                  # User settings CRUD (chrome.storage.sync)
│   │   └── stats.ts                     # Blocked count tracking (chrome.storage.local)
│   ├── ui/
│   │   ├── components/
│   │   │   ├── Toggle.tsx               # Reusable toggle switch
│   │   │   ├── Counter.tsx              # Blocked ads counter display
│   │   │   ├── PlatformToggle.tsx       # OTT platform enable/disable
│   │   │   └── SiteToggle.tsx           # Per-site enable/disable
│   │   └── hooks/
│   │       ├── useSettings.ts           # Settings hook (read + write + listen)
│   │       └── useStats.ts              # Stats hook (read + listen)
│   └── utils/
│       ├── messaging.ts                 # chrome.runtime typed message helpers
│       └── logger.ts                    # Debug logging utility
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── tests/
│   ├── filters/
│   │   ├── compiler.test.ts
│   │   └── lists.test.ts
│   ├── ott/
│   │   ├── hotstar/
│   │   │   ├── hls-interceptor.test.ts
│   │   │   └── fetch-interceptor.test.ts
│   │   ├── prime/
│   │   │   └── auto-skip.test.ts
│   │   ├── netflix/
│   │   │   └── auto-skip.test.ts
│   │   └── shared/
│   │       └── mutation-observer.test.ts
│   ├── storage/
│   │   ├── settings.test.ts
│   │   └── stats.test.ts
│   └── utils/
│       └── messaging.test.ts
├── wxt.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

---

## Task 1: Project Scaffolding & Configuration

**Files:**
- Create: `wxt.config.ts`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`, `assets/icon-*.png`
- Create: `src/entrypoints/popup/index.html`, `src/entrypoints/popup/main.tsx`, `src/entrypoints/popup/App.tsx`, `src/entrypoints/popup/App.css`
- Create: `src/entrypoints/background/index.ts`

- [ ] **Step 1: Initialize WXT project with React template**

```bash
cd /c/Projects/ad-block-chrome-ext
npx wxt@latest init . --template react
```

Select defaults when prompted. This scaffolds the WXT project with React, TypeScript, and basic entrypoints.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @ghostery/adblocker
npm install -D tailwindcss @tailwindcss/vite vitest
```

- [ ] **Step 3: Configure `wxt.config.ts` with manifest permissions**

Replace the generated `wxt.config.ts` with:

```typescript
import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Ad Blocker Pro',
    description: 'Block ads on the web and OTT platforms (JioHotstar, Prime Video, Netflix)',
    version: '1.0.0',
    permissions: [
      'declarativeNetRequest',
      'declarativeNetRequestFeedback',
      'storage',
      'activeTab',
      'scripting',
      'alarms',
    ],
    host_permissions: [
      '*://*.hotstar.com/*',
      '*://*.jiohotstar.com/*',
      '*://*.primevideo.com/*',
      '*://*.amazon.com/gp/video/*',
      '*://*.netflix.com/*',
      '<all_urls>',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
```

- [ ] **Step 5: Create test setup file with Chrome API mocks**

Create `tests/setup.ts`:

```typescript
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
```

- [ ] **Step 6: Set up Tailwind CSS**

Replace `src/entrypoints/popup/App.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 7: Create placeholder extension icons**

```bash
mkdir -p assets
# Create simple placeholder PNG icons (will be replaced with real icons later)
# For now, use a 1x1 pixel placeholder for each size
python3 -c "
import struct, zlib
def png(w,h):
    raw = b''
    for y in range(h):
        raw += b'\x00' + b'\x20\x80\xff\xff' * w
    return b'\x89PNG\r\n\x1a\n' + \
        struct.pack('>I',13) + b'IHDR' + struct.pack('>IIBI',w,h,8,6) + struct.pack('>I',zlib.crc32(b'IHDR'+struct.pack('>IIBI',w,h,8,6))&0xffffffff) + \
        struct.pack('>I',len(zlib.compress(raw))) + b'IDAT' + zlib.compress(raw) + struct.pack('>I',zlib.crc32(b'IDAT'+zlib.compress(raw))&0xffffffff) + \
        struct.pack('>I',0) + b'IEND' + struct.pack('>I',zlib.crc32(b'IEND')&0xffffffff)
for s in [16,48,128]:
    open(f'assets/icon-{s}.png','wb').write(png(s,s))
" 2>/dev/null || echo "Icons can be added manually later"
```

- [ ] **Step 8: Verify project builds**

```bash
npm run build
```

Expected: Build completes without errors, output in `.output/` directory.

- [ ] **Step 9: Commit**

```bash
git init
echo "node_modules/\n.output/\ndist/" > .gitignore
git add .
git commit -m "feat: scaffold WXT project with React, Tailwind, and Chrome extension permissions"
```

---

## Task 2: Logger Utility

**Files:**
- Create: `src/utils/logger.ts`

- [ ] **Step 1: Create logger utility**

Create `src/utils/logger.ts`:

```typescript
const PREFIX = '[AdBlockPro]';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'warn';

export const logger = {
  setLevel(level: LogLevel) {
    currentLevel = level;
  },

  debug(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.debug(PREFIX, ...args);
    }
  },

  info(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.info(PREFIX, ...args);
    }
  },

  warn(...args: unknown[]) {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(PREFIX, ...args);
    }
  },

  error(...args: unknown[]) {
    console.error(PREFIX, ...args);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/logger.ts
git commit -m "feat: add debug logger utility"
```

---

## Task 3: Typed Messaging Layer

**Files:**
- Create: `src/utils/messaging.ts`
- Create: `tests/utils/messaging.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/utils/messaging.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, onMessage, type MessageMap } from '../../src/utils/messaging';

// Define test message types
declare module '../../src/utils/messaging' {
  interface MessageMap {
    'test:ping': { payload: string; response: string };
    'test:count': { payload: number; response: number };
  }
}

describe('messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendMessage calls chrome.runtime.sendMessage with typed payload', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce('pong');

    const result = await sendMessage('test:ping', 'hello');

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'test:ping',
      payload: 'hello',
    });
    expect(result).toBe('pong');
  });

  it('onMessage registers a typed handler', () => {
    const handler = vi.fn();
    onMessage('test:count', handler);

    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/utils/messaging.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement messaging module**

Create `src/utils/messaging.ts`:

```typescript
// Extend this interface via declaration merging in each module
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MessageMap {
  'get-settings': { payload: undefined; response: Settings };
  'update-settings': { payload: Partial<Settings>; response: void };
  'get-stats': { payload: undefined; response: Stats };
  'increment-blocked': { payload: { hostname: string }; response: void };
  'toggle-extension': { payload: boolean; response: void };
  'toggle-site': { payload: { hostname: string; enabled: boolean }; response: void };
  'toggle-platform': {
    payload: { platform: 'hotstar' | 'prime' | 'netflix'; enabled: boolean };
    response: void;
  };
}

import type { Settings } from '../storage/settings';
import type { Stats } from '../storage/stats';

type MessageType = keyof MessageMap;

interface Message<T extends MessageType> {
  type: T;
  payload: MessageMap[T]['payload'];
}

export function sendMessage<T extends MessageType>(
  type: T,
  payload: MessageMap[T]['payload'],
): Promise<MessageMap[T]['response']> {
  return chrome.runtime.sendMessage({ type, payload });
}

export function onMessage<T extends MessageType>(
  type: T,
  handler: (
    payload: MessageMap[T]['payload'],
  ) => Promise<MessageMap[T]['response']> | MessageMap[T]['response'],
): void {
  chrome.runtime.onMessage.addListener(
    (message: Message<T>, _sender, sendResponse) => {
      if (message.type === type) {
        const result = handler(message.payload);
        if (result instanceof Promise) {
          result.then(sendResponse);
          return true; // keep channel open for async response
        }
        sendResponse(result);
      }
    },
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utils/messaging.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/messaging.ts tests/utils/messaging.test.ts
git commit -m "feat: add typed chrome.runtime messaging helpers"
```

---

## Task 4: Storage Layer — Settings

**Files:**
- Create: `src/storage/settings.ts`
- Create: `tests/storage/settings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/storage/settings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSettings,
  updateSettings,
  DEFAULT_SETTINGS,
  type Settings,
} from '../../src/storage/settings';

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
    expect(settings.platforms.hotstar).toBe(true); // default
  });

  it('updateSettings writes partial settings to sync storage', async () => {
    vi.mocked(chrome.storage.sync.get).mockResolvedValueOnce({});

    await updateSettings({ enabled: false });

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({
      settings: expect.objectContaining({ enabled: false }),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/storage/settings.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement settings module**

Create `src/storage/settings.ts`:

```typescript
export interface Settings {
  enabled: boolean;
  disabledSites: string[];
  platforms: {
    hotstar: boolean;
    prime: boolean;
    netflix: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  disabledSites: [],
  platforms: {
    hotstar: true,
    prime: true,
    netflix: true,
  },
};

const STORAGE_KEY = 'settings';

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<Settings> | undefined;
  if (!stored) return { ...DEFAULT_SETTINGS };

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    platforms: {
      ...DEFAULT_SETTINGS.platforms,
      ...stored.platforms,
    },
  };
}

export async function updateSettings(
  partial: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = {
    ...current,
    ...partial,
    platforms: {
      ...current.platforms,
      ...(partial.platforms ?? {}),
    },
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: updated });
  return updated;
}

export function isSiteDisabled(settings: Settings, hostname: string): boolean {
  return settings.disabledSites.includes(hostname);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/storage/settings.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/settings.ts tests/storage/settings.test.ts
git commit -m "feat: add settings storage with chrome.storage.sync"
```

---

## Task 5: Storage Layer — Stats

**Files:**
- Create: `src/storage/stats.ts`
- Create: `tests/storage/stats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/storage/stats.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStats, incrementBlocked, resetSessionStats } from '../../src/storage/stats';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/storage/stats.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement stats module**

Create `src/storage/stats.ts`:

```typescript
export interface Stats {
  totalBlocked: number;
  sessionBlocked: number;
  blockedPerSite: Record<string, number>;
}

const DEFAULT_STATS: Stats = {
  totalBlocked: 0,
  sessionBlocked: 0,
  blockedPerSite: {},
};

const STORAGE_KEY = 'stats';

export async function getStats(): Promise<Stats> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Stats | undefined;
  return stored ?? { ...DEFAULT_STATS };
}

export async function incrementBlocked(hostname: string): Promise<Stats> {
  const stats = await getStats();
  stats.totalBlocked += 1;
  stats.sessionBlocked += 1;
  stats.blockedPerSite[hostname] = (stats.blockedPerSite[hostname] ?? 0) + 1;
  await chrome.storage.local.set({ [STORAGE_KEY]: stats });
  return stats;
}

export async function resetSessionStats(): Promise<void> {
  const stats = await getStats();
  stats.sessionBlocked = 0;
  await chrome.storage.local.set({ [STORAGE_KEY]: stats });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/storage/stats.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/storage/stats.ts tests/storage/stats.test.ts
git commit -m "feat: add stats tracking with chrome.storage.local"
```

---

## Task 6: Filter List Definitions

**Files:**
- Create: `src/filters/lists.ts`
- Create: `tests/filters/lists.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/filters/lists.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { FILTER_LISTS, getEnabledLists } from '../../src/filters/lists';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/filters/lists.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement filter lists module**

Create `src/filters/lists.ts`:

```typescript
export interface FilterList {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  bundledPath?: string;
}

export const FILTER_LISTS: FilterList[] = [
  {
    id: 'easylist',
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    enabled: true,
    bundledPath: 'bundled/easylist.txt',
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    enabled: true,
    bundledPath: 'bundled/easyprivacy.txt',
  },
  {
    id: 'ublock-ads',
    name: 'uBlock Filters — Ads',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    enabled: true,
    bundledPath: 'bundled/ublock-ads.txt',
  },
  {
    id: 'ublock-privacy',
    name: 'uBlock Filters — Privacy',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
    enabled: true,
  },
  {
    id: 'peter-lowe',
    name: "Peter Lowe's Ad Server List",
    url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext',
    enabled: true,
  },
];

export function getEnabledLists(): FilterList[] {
  return FILTER_LISTS.filter((l) => l.enabled);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/filters/lists.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/filters/lists.ts tests/filters/lists.test.ts
git commit -m "feat: add filter list definitions with URLs and bundled paths"
```

---

## Task 7: Filter Compiler — `@ghostery/adblocker` to DNR Rules

**Files:**
- Create: `src/filters/compiler.ts`
- Create: `tests/filters/compiler.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/filters/compiler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { compileFiltersToDNR, createEngine } from '../../src/filters/compiler';

describe('filter compiler', () => {
  it('createEngine parses raw filter text into a FiltersEngine', () => {
    const raw = '||example.com/ads.js^\n||tracker.net/pixel.gif^';
    const engine = createEngine(raw);

    expect(engine).toBeDefined();
    // Engine should match a known ad URL
    const result = engine.match({
      type: 'script',
      url: 'https://example.com/ads.js',
      sourceUrl: 'https://page.com',
    });
    expect(result.match).toBe(true);
  });

  it('createEngine does not match non-ad URLs', () => {
    const raw = '||example.com/ads.js^';
    const engine = createEngine(raw);

    const result = engine.match({
      type: 'script',
      url: 'https://example.com/main.js',
      sourceUrl: 'https://page.com',
    });
    expect(result.match).toBe(false);
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

  it('compileFiltersToDNR handles cosmetic filters gracefully (skips them)', () => {
    const raw = 'example.com##.ad-banner\n||ads.example.com^';
    const rules = compileFiltersToDNR(raw);

    // Should only produce rules for network filters, not cosmetic
    for (const rule of rules) {
      expect(rule.action.type).toBe('block');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/filters/compiler.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement filter compiler**

Create `src/filters/compiler.ts`:

```typescript
import {
  FiltersEngine,
  NetworkFilter,
  Request,
  parseFilters,
} from '@ghostery/adblocker';
import { logger } from '../utils/logger';

// Re-export Request for convenience
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

/**
 * Create a FiltersEngine from raw filter list text.
 * Combines multiple raw filter texts with newlines.
 */
export function createEngine(rawFilters: string): FiltersEngine {
  return FiltersEngine.parse(rawFilters);
}

/**
 * Compile raw EasyList-format filters into Chrome DNR rules.
 * Only converts network filters (cosmetic filters are handled separately).
 */
export function compileFiltersToDNR(rawFilters: string): DNRRule[] {
  const { networkFilters } = parseFilters(rawFilters);
  const rules: DNRRule[] = [];
  let ruleId = 1;

  for (const filter of networkFilters) {
    // Skip exception/whitelist rules for now (marked with @@)
    if (filter.isException()) continue;

    const urlFilter = networkFilterToUrlFilter(filter);
    if (!urlFilter) continue;

    const rule: DNRRule = {
      id: ruleId++,
      action: { type: 'block' },
      condition: {
        urlFilter,
      },
    };

    // Map resource types if specified
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
  // Use the filter's raw pattern string
  const pattern = filter.getFilter();
  if (!pattern) return null;

  // Convert ABP pattern to DNR urlFilter format
  // ABP uses || for domain anchor, ^ for separator
  let urlFilter = pattern;
  urlFilter = urlFilter.replace(/\^/g, '*');

  return urlFilter;
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

  // Check which content types the filter applies to
  for (const [abpType, dnrType] of Object.entries(ABP_TO_DNR_TYPES)) {
    if (filter.getFilter()?.includes(`$${abpType}`)) {
      types.push(dnrType);
    }
  }

  return types;
}

/**
 * Serialize engine to Uint8Array for caching in storage.
 */
export function serializeEngine(engine: FiltersEngine): Uint8Array {
  return engine.serialize();
}

/**
 * Deserialize engine from cached Uint8Array.
 */
export function deserializeEngine(data: Uint8Array): FiltersEngine {
  return FiltersEngine.deserialize(data);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/filters/compiler.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/filters/compiler.ts tests/filters/compiler.test.ts
git commit -m "feat: add filter list compiler with DNR rule generation"
```

---

## Task 8: Filter Updater

**Files:**
- Create: `src/filters/updater.ts`

- [ ] **Step 1: Implement filter updater**

Create `src/filters/updater.ts`:

```typescript
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

/**
 * Fetch all enabled filter lists and compile to DNR rules.
 * Called on install and periodically by the background worker.
 */
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

  // Apply DNR dynamic rules (max 30,000)
  const cappedRules = rules.slice(0, 30_000);

  try {
    // Remove all existing dynamic rules, then add new ones
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: cappedRules as chrome.declarativeNetRequest.Rule[],
    });

    // Cache the engine for cosmetic filter use
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

/**
 * Check if filter lists need updating (older than UPDATE_INTERVAL_HOURS).
 */
export async function needsUpdate(): Promise<boolean> {
  const result = await chrome.storage.local.get(LAST_UPDATED_KEY);
  const lastUpdated = result[LAST_UPDATED_KEY] as number | undefined;
  if (!lastUpdated) return true;

  const hoursSince = (Date.now() - lastUpdated) / (1000 * 60 * 60);
  return hoursSince >= UPDATE_INTERVAL_HOURS;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/filters/updater.ts
git commit -m "feat: add filter list fetcher and DNR rule updater"
```

---

## Task 9: OTT Shared Utilities

**Files:**
- Create: `src/ott/shared/types.ts`
- Create: `src/ott/shared/mutation-observer.ts`
- Create: `src/ott/shared/player-detector.ts`
- Create: `tests/ott/shared/mutation-observer.test.ts`

- [ ] **Step 1: Create shared OTT types**

Create `src/ott/shared/types.ts`:

```typescript
export interface OTTPlatform {
  name: string;
  id: 'hotstar' | 'prime' | 'netflix';
  domains: string[];
  contentScriptMatches: string[];
}

export interface AdDetectionResult {
  isAd: boolean;
  skipButton?: HTMLElement | null;
  adDuration?: number;
}
```

- [ ] **Step 2: Write the failing test for mutation-observer**

Create `tests/ott/shared/mutation-observer.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { observeDOM, type DOMObserverOptions } from '../../../src/ott/shared/mutation-observer';

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

    // MutationObserver is async, wait a tick
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
    cleanup(); // should not throw
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/ott/shared/mutation-observer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement mutation-observer utility**

Create `src/ott/shared/mutation-observer.ts`:

```typescript
import { logger } from '../../utils/logger';

export interface DOMObserverOptions {
  selector: string;
  onMatch: (element: Element) => void;
  target?: Node;
  subtree?: boolean;
}

/**
 * Watch for DOM elements matching a CSS selector being added.
 * Returns a cleanup function to disconnect the observer.
 */
export function observeDOM(options: DOMObserverOptions): () => void {
  const { selector, onMatch, target = document.body, subtree = true } = options;

  // Check existing elements first
  if (target instanceof Element) {
    const existing = target.querySelectorAll(selector);
    existing.forEach((el) => onMatch(el));
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;

        if (node.matches(selector)) {
          onMatch(node);
        }

        // Also check children of added nodes
        const children = node.querySelectorAll(selector);
        children.forEach((el) => onMatch(el));
      }
    }
  });

  observer.observe(target, {
    childList: true,
    subtree,
  });

  return () => {
    logger.debug(`Disconnecting MutationObserver for "${selector}"`);
    observer.disconnect();
  };
}
```

- [ ] **Step 5: Implement player-detector utility**

Create `src/ott/shared/player-detector.ts`:

```typescript
import { logger } from '../../utils/logger';
import { observeDOM } from './mutation-observer';
import type { AdDetectionResult } from './types';

export interface PlayerDetectorOptions {
  /** CSS selector for the video element */
  videoSelector: string;
  /** CSS selector that appears when an ad is playing */
  adIndicatorSelector: string;
  /** CSS selector for skip button (if platform has one) */
  skipButtonSelector?: string;
  /** Callback when ad state changes */
  onAdStateChange: (result: AdDetectionResult) => void;
}

/**
 * Monitor a video player for ad playback states.
 * Uses MutationObserver to detect when ad indicators appear/disappear.
 */
export function detectPlayerAds(options: PlayerDetectorOptions): () => void {
  const {
    videoSelector,
    adIndicatorSelector,
    skipButtonSelector,
    onAdStateChange,
  } = options;

  let lastAdState = false;

  const checkAdState = () => {
    const adIndicator = document.querySelector(adIndicatorSelector);
    const isAd = adIndicator !== null;

    if (isAd !== lastAdState) {
      lastAdState = isAd;

      const skipButton = skipButtonSelector
        ? (document.querySelector(skipButtonSelector) as HTMLElement | null)
        : null;

      logger.debug(`Ad state changed: ${isAd ? 'AD' : 'CONTENT'}`);
      onAdStateChange({ isAd, skipButton });
    }
  };

  // Poll periodically since ad state changes might not trigger DOM mutations
  const interval = setInterval(checkAdState, 500);

  // Also observe for DOM changes as a faster detection path
  const cleanup = observeDOM({
    selector: adIndicatorSelector,
    onMatch: () => checkAdState(),
  });

  return () => {
    clearInterval(interval);
    cleanup();
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/ott/shared/mutation-observer.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/ott/shared/ tests/ott/shared/
git commit -m "feat: add shared OTT utilities (MutationObserver, player detector, types)"
```

---

## Task 10: JioHotstar OTT Module

**Files:**
- Create: `src/ott/hotstar/domains.ts`
- Create: `src/ott/hotstar/fetch-interceptor.ts`
- Create: `src/ott/hotstar/hls-interceptor.ts`
- Create: `src/ott/hotstar/content.ts`
- Create: `tests/ott/hotstar/fetch-interceptor.test.ts`
- Create: `tests/ott/hotstar/hls-interceptor.test.ts`

- [ ] **Step 1: Create Hotstar domains list**

Create `src/ott/hotstar/domains.ts`:

```typescript
/** Hotstar/JioHotstar ad-serving domains to block at network level */
export const HOTSTAR_AD_DOMAINS = [
  'hesads.akamaized.net',
  'videoads.hotstar.com',
  'brands.hotstar.com',
  'bifrost-api.hotstar.com',
  'agl-intl.hotstar.com',
  'pubads.g.doubleclick.net',
  'securepubads.g.doubleclick.net',
  'imasdk.googleapis.com',
];

/** URL patterns that indicate ad content in API responses */
export const HOTSTAR_AD_URL_PATTERNS = [
  /hesads\.akamaized\.net/,
  /videoads\.hotstar\.com/,
  /brands\.hotstar\.com/,
  /adtech/i,
  /\/ads\//i,
  /ad[-_]?break/i,
];

/** Keys in BFF API responses that carry ad payloads */
export const HOTSTAR_AD_PAYLOAD_KEYS = [
  'ads',
  'adBreaks',
  'ad_breaks',
  'adConfig',
  'adServerUrl',
  'adTagUrl',
  'vastXml',
  'vmapXml',
  'csai',
];

/** CSS selectors for Hotstar ad UI elements */
export const HOTSTAR_AD_SELECTORS = [
  '[class*="ad-overlay"]',
  '[class*="ad-banner"]',
  '[class*="AdContainer"]',
  '[class*="ad-countdown"]',
  '[class*="ad-badge"]',
  '[data-testid*="ad"]',
  '.shaka-ad-container',
];
```

- [ ] **Step 2: Write the failing test for fetch-interceptor**

Create `tests/ott/hotstar/fetch-interceptor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { stripAdPayloadKeys } from '../../../src/ott/hotstar/fetch-interceptor';

describe('stripAdPayloadKeys', () => {
  it('removes ad-related keys from API response', () => {
    const response = {
      playbackUrl: 'https://stream.hotstar.com/video.m3u8',
      ads: { preroll: 'https://ads.example.com/preroll.xml' },
      adBreaks: [{ time: 0, type: 'preroll' }],
      title: 'Movie Title',
    };

    const cleaned = stripAdPayloadKeys(response);

    expect(cleaned.playbackUrl).toBe('https://stream.hotstar.com/video.m3u8');
    expect(cleaned.title).toBe('Movie Title');
    expect(cleaned.ads).toBeUndefined();
    expect(cleaned.adBreaks).toBeUndefined();
  });

  it('handles nested objects with ad keys', () => {
    const response = {
      data: {
        playback: {
          adConfig: { enabled: true },
          streamUrl: 'https://stream.hotstar.com/v.m3u8',
        },
      },
    };

    const cleaned = stripAdPayloadKeys(response);

    expect(cleaned.data.playback.streamUrl).toBe('https://stream.hotstar.com/v.m3u8');
    expect(cleaned.data.playback.adConfig).toBeUndefined();
  });

  it('returns primitives unchanged', () => {
    expect(stripAdPayloadKeys('hello')).toBe('hello');
    expect(stripAdPayloadKeys(42)).toBe(42);
    expect(stripAdPayloadKeys(null)).toBe(null);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/ott/hotstar/fetch-interceptor.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement fetch-interceptor**

Create `src/ott/hotstar/fetch-interceptor.ts`:

```typescript
import { HOTSTAR_AD_PAYLOAD_KEYS } from './domains';
import { logger } from '../../utils/logger';

/**
 * Recursively strip ad-related keys from an API response object.
 * Exported for testing.
 */
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

/**
 * Intercept fetch() calls on Hotstar pages to strip ad payloads
 * from BFF API responses before the player processes them.
 *
 * Must run in world: "MAIN" to access the page's fetch.
 */
export function installFetchInterceptor(): void {
  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const response = await originalFetch.call(this, input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Only intercept Hotstar API responses (JSON)
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
      // Not JSON or parse error — return original
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
```

- [ ] **Step 5: Run fetch-interceptor tests**

```bash
npx vitest run tests/ott/hotstar/fetch-interceptor.test.ts
```

Expected: PASS

- [ ] **Step 6: Write the failing test for hls-interceptor**

Create `tests/ott/hotstar/hls-interceptor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { stripAdSegments } from '../../../src/ott/hotstar/hls-interceptor';

const SAMPLE_M3U8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
https://stream.hotstar.com/segment1.ts
#EXTINF:10.0,
https://stream.hotstar.com/segment2.ts
#EXT-X-DISCONTINUITY
#EXTINF:15.0,
https://hesads.akamaized.net/ad-segment1.ts
#EXTINF:15.0,
https://hesads.akamaized.net/ad-segment2.ts
#EXT-X-DISCONTINUITY
#EXTINF:10.0,
https://stream.hotstar.com/segment3.ts
#EXT-X-ENDLIST`;

describe('stripAdSegments', () => {
  it('removes ad segments between discontinuity markers', () => {
    const result = stripAdSegments(SAMPLE_M3U8);

    expect(result).toContain('segment1.ts');
    expect(result).toContain('segment2.ts');
    expect(result).toContain('segment3.ts');
    expect(result).not.toContain('hesads.akamaized.net');
    expect(result).not.toContain('ad-segment');
  });

  it('preserves playlist headers', () => {
    const result = stripAdSegments(SAMPLE_M3U8);

    expect(result).toContain('#EXTM3U');
    expect(result).toContain('#EXT-X-VERSION:3');
    expect(result).toContain('#EXT-X-TARGETDURATION:10');
  });

  it('handles playlists with no ad segments', () => {
    const clean = `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:10.0,
https://stream.hotstar.com/segment1.ts
#EXT-X-ENDLIST`;

    const result = stripAdSegments(clean);
    expect(result).toContain('segment1.ts');
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

```bash
npx vitest run tests/ott/hotstar/hls-interceptor.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 8: Implement hls-interceptor**

Create `src/ott/hotstar/hls-interceptor.ts`:

```typescript
import { HOTSTAR_AD_URL_PATTERNS } from './domains';
import { logger } from '../../utils/logger';

/**
 * Strip ad segments from an HLS m3u8 playlist.
 * Ad segments are identified by:
 * 1. Being between #EXT-X-DISCONTINUITY tags
 * 2. Having URLs matching known ad domain patterns
 *
 * Exported for testing.
 */
export function stripAdSegments(playlistText: string): string {
  const lines = playlistText.split('\n');
  const result: string[] = [];
  let inAdBlock = false;
  let pendingDiscontinuity = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === '#EXT-X-DISCONTINUITY') {
      // Look ahead to see if the next segment URL is an ad
      const nextUrl = findNextUrl(lines, i + 1);
      if (nextUrl && isAdUrl(nextUrl)) {
        inAdBlock = true;
        continue;
      } else if (inAdBlock) {
        // End of ad block
        inAdBlock = false;
        continue;
      } else {
        pendingDiscontinuity = true;
        continue;
      }
    }

    if (inAdBlock) {
      continue; // skip ad segment lines
    }

    if (pendingDiscontinuity) {
      result.push('#EXT-X-DISCONTINUITY');
      pendingDiscontinuity = false;
    }

    result.push(lines[i]);
  }

  const stripped = result.join('\n');
  if (stripped !== playlistText) {
    logger.debug('Stripped ad segments from HLS playlist');
  }
  return stripped;
}

function findNextUrl(lines: string[], startIdx: number): string | null {
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;
    return line; // First non-empty, non-tag line is a URL
  }
  return null;
}

function isAdUrl(url: string): boolean {
  return HOTSTAR_AD_URL_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Hook into HLS.js on the page to intercept m3u8 playlist loading.
 * Must run in world: "MAIN" to access the page's Hls constructor.
 */
export function installHlsInterceptor(): void {
  // Wait for Hls.js to be available on the page
  const checkInterval = setInterval(() => {
    const Hls = (window as unknown as { Hls?: HlsConstructor }).Hls;
    if (!Hls) return;

    clearInterval(checkInterval);
    hookHlsLoader(Hls);
    logger.info('HLS.js interceptor installed');
  }, 500);

  // Stop checking after 30 seconds
  setTimeout(() => clearInterval(checkInterval), 30_000);
}

interface HlsConstructor {
  DefaultConfig: {
    loader: unknown;
  };
  prototype: {
    loadSource: (url: string) => void;
  };
}

function hookHlsLoader(Hls: HlsConstructor): void {
  const originalLoadSource = Hls.prototype.loadSource;

  Hls.prototype.loadSource = function (url: string) {
    logger.debug(`HLS loadSource intercepted: ${url}`);

    // Intercept the internal playlist loader
    const instance = this as unknown as {
      config: {
        pLoader?: unknown;
        loader: unknown;
      };
    };

    const OriginalLoader = instance.config.pLoader || instance.config.loader;

    class AdStrippingLoader {
      private loader: {
        load: (context: LoadContext, config: unknown, callbacks: LoadCallbacks) => void;
        abort: () => void;
        destroy: () => void;
      };

      constructor(config: unknown) {
        this.loader = new (OriginalLoader as new (config: unknown) => typeof this.loader)(config);
      }

      load(context: LoadContext, config: unknown, callbacks: LoadCallbacks) {
        const originalOnSuccess = callbacks.onSuccess;

        callbacks.onSuccess = (
          response: { data: string },
          stats: unknown,
          loadContext: unknown,
        ) => {
          if (
            typeof response.data === 'string' &&
            response.data.includes('#EXTINF')
          ) {
            response.data = stripAdSegments(response.data);
          }
          originalOnSuccess(response, stats, loadContext);
        };

        this.loader.load(context, config, callbacks);
      }

      abort() {
        this.loader.abort();
      }

      destroy() {
        this.loader.destroy();
      }
    }

    instance.config.pLoader = AdStrippingLoader as unknown as typeof OriginalLoader;

    return originalLoadSource.call(this, url);
  };
}

interface LoadContext {
  url: string;
  type: string;
}

interface LoadCallbacks {
  onSuccess: (response: { data: string }, stats: unknown, context: unknown) => void;
  onError: (error: unknown) => void;
  onTimeout: (stats: unknown, context: unknown) => void;
}
```

- [ ] **Step 9: Run HLS interceptor tests**

```bash
npx vitest run tests/ott/hotstar/hls-interceptor.test.ts
```

Expected: PASS

- [ ] **Step 10: Create Hotstar content script entry**

Create `src/ott/hotstar/content.ts`:

```typescript
import { installFetchInterceptor } from './fetch-interceptor';
import { installHlsInterceptor } from './hls-interceptor';
import { HOTSTAR_AD_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

/**
 * JioHotstar content script — runs in world: "MAIN"
 * to access page-level JavaScript objects.
 */
export function initHotstarAdBlocker(): void {
  logger.info('JioHotstar ad blocker initializing...');

  // 1. Install fetch() interceptor for BFF API ad payload stripping
  installFetchInterceptor();

  // 2. Install HLS.js interceptor for m3u8 ad segment stripping
  installHlsInterceptor();

  // 3. Inject CSS to hide ad overlays
  injectCosmeticRules();

  logger.info('JioHotstar ad blocker active');
}

function injectCosmeticRules(): void {
  const style = document.createElement('style');
  style.textContent = HOTSTAR_AD_SELECTORS.map(
    (selector) => `${selector} { display: none !important; }`,
  ).join('\n');
  document.head.appendChild(style);
  logger.debug('Hotstar cosmetic rules injected');
}
```

- [ ] **Step 11: Commit**

```bash
git add src/ott/hotstar/ tests/ott/hotstar/
git commit -m "feat: add JioHotstar OTT ad blocker (fetch + HLS interceptors)"
```

---

## Task 11: Amazon Prime Video OTT Module

**Files:**
- Create: `src/ott/prime/domains.ts`
- Create: `src/ott/prime/auto-skip.ts`
- Create: `src/ott/prime/content.ts`
- Create: `tests/ott/prime/auto-skip.test.ts`

- [ ] **Step 1: Create Prime domains and selectors**

Create `src/ott/prime/domains.ts`:

```typescript
/** Prime Video ad-related CSS selectors */
export const PRIME_AD_SELECTORS = {
  /** Button to skip ads when available */
  skipButton: '[class*="adSkipButton"], .atvwebplayersdk-adtimeindicator-skip-button, [data-testid="ad-skip-button"]',
  /** Indicator that an ad is currently playing */
  adIndicator: '.atvwebplayersdk-ad-timer, [class*="adTimerText"], [class*="ad-badge"]',
  /** Ad progress bar overlay */
  adProgressBar: '[class*="adProgressBar"]',
  /** Sponsored content banners */
  sponsoredBanners: '[class*="sponsored"], [class*="Sponsored"], [data-testid*="sponsored"]',
  /** Video element */
  video: 'video',
};

/** Cosmetic selectors to always hide */
export const PRIME_COSMETIC_SELECTORS = [
  '[class*="sponsored"]',
  '[class*="Sponsored"]',
  '[data-testid*="sponsored"]',
  '[class*="ad-banner"]',
];
```

- [ ] **Step 2: Write the failing test for auto-skip**

Create `tests/ott/prime/auto-skip.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trySkipAd } from '../../../src/ott/prime/auto-skip';

describe('trySkipAd', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicks skip button when available', () => {
    const button = document.createElement('button');
    button.className = 'adSkipButton';
    button.click = vi.fn();
    document.body.appendChild(button);

    const result = trySkipAd('[class*="adSkipButton"]', 'video');

    expect(button.click).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('returns false when no skip button exists', () => {
    const result = trySkipAd('[class*="adSkipButton"]', 'video');
    expect(result).toBe(false);
  });

  it('seeks video to end when no skip button but video exists', () => {
    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 30, writable: true });
    video.currentTime = 5;
    document.body.appendChild(video);

    // Add an ad indicator so seek triggers
    const adBadge = document.createElement('div');
    adBadge.className = 'ad-badge';
    document.body.appendChild(adBadge);

    const result = trySkipAd('[class*="nonexistent"]', 'video', '[class*="ad-badge"]');

    expect(video.currentTime).toBe(30);
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/ott/prime/auto-skip.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement auto-skip module**

Create `src/ott/prime/auto-skip.ts`:

```typescript
import { logger } from '../../utils/logger';

/**
 * Attempt to skip an ad by clicking the skip button or seeking the video.
 * Returns true if an action was taken.
 */
export function trySkipAd(
  skipButtonSelector: string,
  videoSelector: string,
  adIndicatorSelector?: string,
): boolean {
  // Strategy 1: Click skip button
  const skipButton = document.querySelector(skipButtonSelector) as HTMLElement | null;
  if (skipButton) {
    skipButton.click();
    logger.debug('Clicked skip button');
    return true;
  }

  // Strategy 2: Seek video to end of ad
  if (adIndicatorSelector) {
    const adIndicator = document.querySelector(adIndicatorSelector);
    if (adIndicator) {
      const video = document.querySelector(videoSelector) as HTMLVideoElement | null;
      if (video && video.duration && isFinite(video.duration)) {
        video.currentTime = video.duration;
        logger.debug('Seeked video to end of ad');
        return true;
      }
    }
  }

  return false;
}

/**
 * Start monitoring for ads and auto-skip them.
 * Returns cleanup function.
 */
export function startAutoSkip(
  skipButtonSelector: string,
  adIndicatorSelector: string,
  videoSelector: string,
): () => void {
  const interval = setInterval(() => {
    const adIndicator = document.querySelector(adIndicatorSelector);
    if (adIndicator) {
      trySkipAd(skipButtonSelector, videoSelector, adIndicatorSelector);
    }
  }, 500);

  logger.info('Prime Video auto-skip started');

  return () => {
    clearInterval(interval);
    logger.info('Prime Video auto-skip stopped');
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/ott/prime/auto-skip.test.ts
```

Expected: PASS

- [ ] **Step 6: Create Prime Video content script entry**

Create `src/ott/prime/content.ts`:

```typescript
import { startAutoSkip } from './auto-skip';
import { PRIME_AD_SELECTORS, PRIME_COSMETIC_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

/**
 * Amazon Prime Video content script — runs in world: "MAIN"
 */
export function initPrimeAdBlocker(): void {
  logger.info('Prime Video ad blocker initializing...');

  // 1. Start auto-skip monitoring
  startAutoSkip(
    PRIME_AD_SELECTORS.skipButton,
    PRIME_AD_SELECTORS.adIndicator,
    PRIME_AD_SELECTORS.video,
  );

  // 2. Inject cosmetic rules
  injectCosmeticRules();

  logger.info('Prime Video ad blocker active');
}

function injectCosmeticRules(): void {
  const style = document.createElement('style');
  style.textContent = PRIME_COSMETIC_SELECTORS.map(
    (selector) => `${selector} { display: none !important; }`,
  ).join('\n');
  document.head.appendChild(style);
  logger.debug('Prime Video cosmetic rules injected');
}
```

- [ ] **Step 7: Commit**

```bash
git add src/ott/prime/ tests/ott/prime/
git commit -m "feat: add Amazon Prime Video OTT ad blocker (auto-skip + cosmetic)"
```

---

## Task 12: Netflix OTT Module

**Files:**
- Create: `src/ott/netflix/domains.ts`
- Create: `src/ott/netflix/auto-skip.ts`
- Create: `src/ott/netflix/content.ts`
- Create: `tests/ott/netflix/auto-skip.test.ts`

- [ ] **Step 1: Create Netflix domains and selectors**

Create `src/ott/netflix/domains.ts`:

```typescript
/** Netflix ad-related CSS selectors */
export const NETFLIX_AD_SELECTORS = {
  /** Button to skip ads when available */
  skipButton: '[data-uia="ad-skip-button"], [class*="skip-ad"], .watch-video--skip-ad-button',
  /** Indicator that an ad is currently playing */
  adIndicator: '[data-uia="ad-progress-bar"], [class*="ad-indicator"], [class*="AdBreak"]',
  /** Video element */
  video: 'video',
  /** Ad countdown timer */
  adTimer: '[class*="ad-timer"], [data-uia="ad-timer"]',
};

/** Cosmetic selectors to hide */
export const NETFLIX_COSMETIC_SELECTORS = [
  '[class*="billboard-ad"]',
  '[class*="interstitial-ad"]',
];
```

- [ ] **Step 2: Write the failing test for Netflix auto-skip**

Create `tests/ott/netflix/auto-skip.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trySkipNetflixAd } from '../../../src/ott/netflix/auto-skip';

describe('trySkipNetflixAd', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicks skip button when available', () => {
    const button = document.createElement('button');
    button.setAttribute('data-uia', 'ad-skip-button');
    button.click = vi.fn();
    document.body.appendChild(button);

    const result = trySkipNetflixAd();

    expect(button.click).toHaveBeenCalled();
    expect(result).toBe('skipped');
  });

  it('seeks video past ad when ad indicator present but no skip button', () => {
    const adBar = document.createElement('div');
    adBar.setAttribute('data-uia', 'ad-progress-bar');
    document.body.appendChild(adBar);

    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 60, writable: true });
    video.currentTime = 5;
    document.body.appendChild(video);

    const result = trySkipNetflixAd();

    expect(video.currentTime).toBe(60);
    expect(result).toBe('seeked');
  });

  it('returns "none" when no ad is detected', () => {
    const result = trySkipNetflixAd();
    expect(result).toBe('none');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/ott/netflix/auto-skip.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement Netflix auto-skip**

Create `src/ott/netflix/auto-skip.ts`:

```typescript
import { NETFLIX_AD_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

type SkipResult = 'skipped' | 'seeked' | 'none';

/**
 * Attempt to skip a Netflix ad via button click or video seek.
 */
export function trySkipNetflixAd(): SkipResult {
  // Strategy 1: Click skip button
  const skipButton = document.querySelector(
    NETFLIX_AD_SELECTORS.skipButton,
  ) as HTMLElement | null;
  if (skipButton) {
    skipButton.click();
    logger.debug('Netflix: clicked skip button');
    return 'skipped';
  }

  // Strategy 2: Seek past ad
  const adIndicator = document.querySelector(NETFLIX_AD_SELECTORS.adIndicator);
  if (adIndicator) {
    const video = document.querySelector(
      NETFLIX_AD_SELECTORS.video,
    ) as HTMLVideoElement | null;
    if (video && video.duration && isFinite(video.duration)) {
      video.currentTime = video.duration;
      logger.debug('Netflix: seeked past ad');
      return 'seeked';
    }
  }

  return 'none';
}

/**
 * Start monitoring Netflix for ads and auto-skip them.
 * Returns cleanup function.
 */
export function startNetflixAutoSkip(): () => void {
  const interval = setInterval(() => {
    trySkipNetflixAd();
  }, 500);

  logger.info('Netflix auto-skip started');

  return () => {
    clearInterval(interval);
    logger.info('Netflix auto-skip stopped');
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/ott/netflix/auto-skip.test.ts
```

Expected: PASS

- [ ] **Step 6: Create Netflix content script entry**

Create `src/ott/netflix/content.ts`:

```typescript
import { startNetflixAutoSkip } from './auto-skip';
import { NETFLIX_COSMETIC_SELECTORS } from './domains';
import { logger } from '../../utils/logger';

/**
 * Netflix content script — runs in world: "MAIN"
 */
export function initNetflixAdBlocker(): void {
  logger.info('Netflix ad blocker initializing...');

  // 1. Start auto-skip monitoring
  startNetflixAutoSkip();

  // 2. Inject cosmetic rules
  injectCosmeticRules();

  logger.info('Netflix ad blocker active');
}

function injectCosmeticRules(): void {
  const style = document.createElement('style');
  style.textContent = NETFLIX_COSMETIC_SELECTORS.map(
    (selector) => `${selector} { display: none !important; }`,
  ).join('\n');
  document.head.appendChild(style);
  logger.debug('Netflix cosmetic rules injected');
}
```

- [ ] **Step 7: Commit**

```bash
git add src/ott/netflix/ tests/ott/netflix/
git commit -m "feat: add Netflix OTT ad blocker (auto-skip + seek + cosmetic)"
```

---

## Task 13: OTT Content Script WXT Entrypoints

**Files:**
- Create: `src/entrypoints/hotstar-content/index.ts`
- Create: `src/entrypoints/prime-content/index.ts`
- Create: `src/entrypoints/netflix-content/index.ts`

These are the WXT file-based entrypoints that register the OTT content scripts with the correct `world: "MAIN"` and domain matching.

- [ ] **Step 1: Create Hotstar WXT content script entrypoint**

Create `src/entrypoints/hotstar-content/index.ts`:

```typescript
import { defineContentScript } from 'wxt/utils';
import { initHotstarAdBlocker } from '../../ott/hotstar/content';

export default defineContentScript({
  matches: ['*://*.hotstar.com/*', '*://*.jiohotstar.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    initHotstarAdBlocker();
  },
});
```

- [ ] **Step 2: Create Prime Video WXT content script entrypoint**

Create `src/entrypoints/prime-content/index.ts`:

```typescript
import { defineContentScript } from 'wxt/utils';
import { initPrimeAdBlocker } from '../../ott/prime/content';

export default defineContentScript({
  matches: ['*://*.primevideo.com/*', '*://*.amazon.com/gp/video/*'],
  world: 'MAIN',
  runAt: 'document_idle',
  main() {
    initPrimeAdBlocker();
  },
});
```

- [ ] **Step 3: Create Netflix WXT content script entrypoint**

Create `src/entrypoints/netflix-content/index.ts`:

```typescript
import { defineContentScript } from 'wxt/utils';
import { initNetflixAdBlocker } from '../../ott/netflix/content';

export default defineContentScript({
  matches: ['*://*.netflix.com/*'],
  world: 'MAIN',
  runAt: 'document_idle',
  main() {
    initNetflixAdBlocker();
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/hotstar-content/ src/entrypoints/prime-content/ src/entrypoints/netflix-content/
git commit -m "feat: add WXT content script entrypoints for OTT platforms"
```

---

## Task 14: General Cosmetic Filtering Content Script

**Files:**
- Create: `src/entrypoints/content/index.ts`

- [ ] **Step 1: Implement general cosmetic filtering content script**

Create `src/entrypoints/content/index.ts`:

```typescript
import { defineContentScript } from 'wxt/utils';
import { logger } from '../../utils/logger';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',

  async main() {
    logger.debug('General cosmetic filter content script loaded');

    // Request cosmetic filters for this page from the background
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'get-cosmetic-filters',
        payload: {
          url: window.location.href,
          hostname: window.location.hostname,
          domain: getDomain(window.location.hostname),
        },
      });

      if (response?.styles) {
        injectStyles(response.styles);
      }
    } catch (err) {
      logger.error('Failed to get cosmetic filters:', err);
    }
  },
});

function injectStyles(css: string): void {
  if (!css.trim()) return;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  logger.debug(`Injected ${css.split('\n').length} cosmetic rules`);
}

function getDomain(hostname: string): string {
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(-2).join('.') : hostname;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entrypoints/content/
git commit -m "feat: add general cosmetic filtering content script"
```

---

## Task 15: Background Service Worker

**Files:**
- Modify: `src/entrypoints/background/index.ts`

- [ ] **Step 1: Implement background service worker**

Replace `src/entrypoints/background/index.ts` with:

```typescript
import { defineBackground } from 'wxt/utils';
import { fetchAndCompileFilters, needsUpdate } from '../../filters/updater';
import { getSettings, updateSettings } from '../../storage/settings';
import { getStats, incrementBlocked, resetSessionStats } from '../../storage/stats';
import { logger } from '../../utils/logger';

export default defineBackground({
  main() {
    logger.info('Background service worker started');

    // On install: fetch and compile filter lists
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        logger.info('Extension installed — fetching filter lists');
        await resetSessionStats();
        await fetchAndCompileFilters();
      }
    });

    // Set up periodic filter list updates (every 24 hours)
    chrome.alarms.create('filter-update', { periodInMinutes: 24 * 60 });

    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'filter-update') {
        if (await needsUpdate()) {
          logger.info('Updating filter lists...');
          await fetchAndCompileFilters();
        }
      }
    });

    // Track blocked requests via declarativeNetRequest feedback
    if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
      chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
        async (info) => {
          const hostname = new URL(info.request.url).hostname;
          await incrementBlocked(hostname);
        },
      );
    }

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((err) => {
          logger.error('Message handler error:', err);
          sendResponse(undefined);
        });
      return true; // keep channel open for async
    });

    logger.info('Background service worker ready');
  },
});

async function handleMessage(
  message: { type: string; payload?: unknown },
): Promise<unknown> {
  switch (message.type) {
    case 'get-settings':
      return getSettings();

    case 'update-settings':
      return updateSettings(message.payload as Partial<typeof import('../../storage/settings').DEFAULT_SETTINGS>);

    case 'get-stats':
      return getStats();

    case 'increment-blocked':
      return incrementBlocked((message.payload as { hostname: string }).hostname);

    case 'toggle-extension': {
      const enabled = message.payload as boolean;
      return updateSettings({ enabled });
    }

    case 'toggle-site': {
      const { hostname, enabled } = message.payload as { hostname: string; enabled: boolean };
      const settings = await getSettings();
      const disabledSites = enabled
        ? settings.disabledSites.filter((s) => s !== hostname)
        : [...settings.disabledSites, hostname];
      return updateSettings({ disabledSites });
    }

    case 'toggle-platform': {
      const { platform, enabled: platformEnabled } = message.payload as {
        platform: 'hotstar' | 'prime' | 'netflix';
        enabled: boolean;
      };
      const currentSettings = await getSettings();
      return updateSettings({
        platforms: { ...currentSettings.platforms, [platform]: platformEnabled },
      });
    }

    case 'get-cosmetic-filters': {
      // Return cosmetic filters for a given page (from cached engine)
      // This will be enhanced once the engine caching is fully wired
      return { styles: '' };
    }

    default:
      logger.warn(`Unknown message type: ${message.type}`);
      return undefined;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/entrypoints/background/
git commit -m "feat: add background service worker with filter management and message handling"
```

---

## Task 16: React UI — Hooks

**Files:**
- Create: `src/ui/hooks/useSettings.ts`
- Create: `src/ui/hooks/useStats.ts`

- [ ] **Step 1: Implement useSettings hook**

Create `src/ui/hooks/useSettings.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../../storage/settings';
import { DEFAULT_SETTINGS } from '../../storage/settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial settings
    chrome.runtime
      .sendMessage({ type: 'get-settings' })
      .then((result: Settings) => {
        setSettings(result);
        setLoading(false);
      });

    // Listen for storage changes
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === 'sync' && changes.settings) {
        setSettings(changes.settings.newValue as Settings);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const updated = await chrome.runtime.sendMessage({
      type: 'update-settings',
      payload: partial,
    });
    setSettings(updated);
  }, []);

  return { settings, updateSettings, loading };
}
```

- [ ] **Step 2: Implement useStats hook**

Create `src/ui/hooks/useStats.ts`:

```typescript
import { useState, useEffect } from 'react';
import type { Stats } from '../../storage/stats';

const DEFAULT_STATS: Stats = {
  totalBlocked: 0,
  sessionBlocked: 0,
  blockedPerSite: {},
};

export function useStats() {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);

  useEffect(() => {
    // Load initial stats
    chrome.runtime
      .sendMessage({ type: 'get-stats' })
      .then((result: Stats) => setStats(result));

    // Listen for storage changes
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string,
    ) => {
      if (area === 'local' && changes.stats) {
        setStats(changes.stats.newValue as Stats);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return stats;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/ui/hooks/
git commit -m "feat: add useSettings and useStats React hooks"
```

---

## Task 17: React UI — Components

**Files:**
- Create: `src/ui/components/Toggle.tsx`
- Create: `src/ui/components/Counter.tsx`
- Create: `src/ui/components/PlatformToggle.tsx`
- Create: `src/ui/components/SiteToggle.tsx`

- [ ] **Step 1: Create Toggle component**

Create `src/ui/components/Toggle.tsx`:

```tsx
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="flex items-center justify-between py-2 cursor-pointer">
      <span className="text-sm font-medium text-gray-200">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}
```

- [ ] **Step 2: Create Counter component**

Create `src/ui/components/Counter.tsx`:

```tsx
interface CounterProps {
  total: number;
  session: number;
}

export function Counter({ total, session }: CounterProps) {
  return (
    <div className="text-center py-3">
      <div className="text-3xl font-bold text-blue-400">
        {formatNumber(total)}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        ads blocked ({formatNumber(session)} this session)
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
```

- [ ] **Step 3: Create PlatformToggle component**

Create `src/ui/components/PlatformToggle.tsx`:

```tsx
import { Toggle } from './Toggle';

interface PlatformToggleProps {
  platforms: { hotstar: boolean; prime: boolean; netflix: boolean };
  onToggle: (platform: 'hotstar' | 'prime' | 'netflix', enabled: boolean) => void;
  disabled?: boolean;
}

const PLATFORM_LABELS = {
  hotstar: 'JioHotstar',
  prime: 'Prime Video',
  netflix: 'Netflix',
} as const;

export function PlatformToggle({ platforms, onToggle, disabled }: PlatformToggleProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        OTT Platforms
      </div>
      {(Object.keys(PLATFORM_LABELS) as Array<keyof typeof PLATFORM_LABELS>).map(
        (platform) => (
          <Toggle
            key={platform}
            label={PLATFORM_LABELS[platform]}
            checked={platforms[platform]}
            onChange={(checked) => onToggle(platform, checked)}
            disabled={disabled}
          />
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create SiteToggle component**

Create `src/ui/components/SiteToggle.tsx`:

```tsx
import { Toggle } from './Toggle';

interface SiteToggleProps {
  hostname: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export function SiteToggle({ hostname, enabled, onToggle, disabled }: SiteToggleProps) {
  return (
    <div className="border-t border-gray-700 pt-2">
      <Toggle
        label={hostname}
        checked={enabled}
        onChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/
git commit -m "feat: add popup UI components (Toggle, Counter, PlatformToggle, SiteToggle)"
```

---

## Task 18: React UI — Popup App

**Files:**
- Modify: `src/entrypoints/popup/App.tsx`
- Modify: `src/entrypoints/popup/main.tsx`
- Modify: `src/entrypoints/popup/index.html`

- [ ] **Step 1: Update popup HTML**

Replace `src/entrypoints/popup/index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ad Blocker Pro</title>
  </head>
  <body class="w-[350px] min-h-[400px] bg-gray-900 text-white">
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Update popup main.tsx**

Replace `src/entrypoints/popup/main.tsx` with:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Implement App.tsx**

Replace `src/entrypoints/popup/App.tsx` with:

```tsx
import { useState, useEffect } from 'react';
import { useSettings } from '../../ui/hooks/useSettings';
import { useStats } from '../../ui/hooks/useStats';
import { Toggle } from '../../ui/components/Toggle';
import { Counter } from '../../ui/components/Counter';
import { PlatformToggle } from '../../ui/components/PlatformToggle';
import { SiteToggle } from '../../ui/components/SiteToggle';

export default function App() {
  const { settings, updateSettings, loading } = useSettings();
  const stats = useStats();
  const [currentHostname, setCurrentHostname] = useState<string>('');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.url) {
        try {
          setCurrentHostname(new URL(tabs[0].url).hostname);
        } catch {
          // Invalid URL (e.g., chrome:// pages)
        }
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const siteEnabled = !settings.disabledSites.includes(currentHostname);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src="/assets/icon-48.png" alt="Ad Blocker Pro" className="w-8 h-8" />
        <h1 className="text-lg font-bold">Ad Blocker Pro</h1>
      </div>

      {/* Global toggle */}
      <Toggle
        label="Ad Blocking"
        checked={settings.enabled}
        onChange={(enabled) => updateSettings({ enabled })}
      />

      {/* Stats counter */}
      <Counter total={stats.totalBlocked} session={stats.sessionBlocked} />

      {/* Site toggle */}
      {currentHostname && (
        <SiteToggle
          hostname={currentHostname}
          enabled={siteEnabled}
          onToggle={(enabled) => {
            const disabledSites = enabled
              ? settings.disabledSites.filter((s) => s !== currentHostname)
              : [...settings.disabledSites, currentHostname];
            updateSettings({ disabledSites });
          }}
          disabled={!settings.enabled}
        />
      )}

      {/* OTT Platform toggles */}
      <PlatformToggle
        platforms={settings.platforms}
        onToggle={(platform, enabled) =>
          updateSettings({
            platforms: { ...settings.platforms, [platform]: enabled },
          })
        }
        disabled={!settings.enabled}
      />

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-700">
        v1.0.0
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/popup/
git commit -m "feat: implement popup UI with settings, stats, and platform toggles"
```

---

## Task 19: Download Bundled Filter Lists

**Files:**
- Create: `src/filters/bundled/easylist.txt`
- Create: `src/filters/bundled/easyprivacy.txt`
- Create: `src/filters/bundled/ublock-ads.txt`

- [ ] **Step 1: Create a download script**

Create `scripts/download-filters.sh`:

```bash
#!/bin/bash
# Download baseline filter lists for bundling with the extension

BUNDLED_DIR="src/filters/bundled"
mkdir -p "$BUNDLED_DIR"

echo "Downloading EasyList..."
curl -sL "https://easylist.to/easylist/easylist.txt" -o "$BUNDLED_DIR/easylist.txt"

echo "Downloading EasyPrivacy..."
curl -sL "https://easylist.to/easylist/easyprivacy.txt" -o "$BUNDLED_DIR/easyprivacy.txt"

echo "Downloading uBlock Filters (Ads)..."
curl -sL "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt" -o "$BUNDLED_DIR/ublock-ads.txt"

echo "Done. Filter list sizes:"
wc -l "$BUNDLED_DIR"/*.txt
```

- [ ] **Step 2: Run the download script**

```bash
bash scripts/download-filters.sh
```

Expected: Three filter list files downloaded to `src/filters/bundled/`.

- [ ] **Step 3: Add to .gitignore (filter lists are large, regenerated on build)**

Add to `.gitignore`:

```
src/filters/bundled/*.txt
```

- [ ] **Step 4: Commit**

```bash
git add scripts/download-filters.sh .gitignore
git commit -m "feat: add filter list download script for bundled baseline lists"
```

---

## Task 20: Build Verification & Final Integration

**Files:**
- All files from previous tasks

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Build the extension**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 3: Verify manifest output**

```bash
cat .output/chrome-mv3/manifest.json
```

Expected: manifest.json includes all permissions, content scripts, and background worker.

- [ ] **Step 4: Fix any build or type errors**

If there are errors, fix them and re-run the build.

- [ ] **Step 5: Commit final integration**

```bash
git add -A
git commit -m "chore: fix build issues and verify full extension integration"
```

---

## Summary

| Task | Component | Tests |
|------|-----------|-------|
| 1 | Project scaffolding & config | Build verification |
| 2 | Logger utility | N/A (simple) |
| 3 | Typed messaging layer | messaging.test.ts |
| 4 | Storage — Settings | settings.test.ts |
| 5 | Storage — Stats | stats.test.ts |
| 6 | Filter list definitions | lists.test.ts |
| 7 | Filter compiler (DNR) | compiler.test.ts |
| 8 | Filter updater | N/A (integration) |
| 9 | OTT shared utilities | mutation-observer.test.ts |
| 10 | JioHotstar OTT module | fetch-interceptor.test.ts, hls-interceptor.test.ts |
| 11 | Prime Video OTT module | auto-skip.test.ts |
| 12 | Netflix OTT module | auto-skip.test.ts |
| 13 | OTT WXT entrypoints | Build verification |
| 14 | General cosmetic filtering | Build verification |
| 15 | Background service worker | Build verification |
| 16 | React hooks | N/A (integration) |
| 17 | React UI components | Build verification |
| 18 | Popup App integration | Build verification |
| 19 | Bundled filter lists | Download verification |
| 20 | Build verification & integration | Full test + build |
