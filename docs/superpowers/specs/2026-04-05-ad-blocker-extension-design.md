# Ad Blocker Chrome Extension — Design Spec

## Overview

A Chrome/Edge extension that provides general-purpose web ad blocking plus specialized OTT platform ad blocking for JioHotstar, Amazon Prime Video, and Netflix.

**Framework:** WXT (Vite-based, MV3)
**UI:** React + TypeScript
**Browsers:** Chrome + Edge
**Filter Engine:** `@cliqz/adblocker` (Ghostery's open-source library)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Chrome Extension                │
├──────────┬──────────┬───────────┬───────────────┤
│ Network  │   OTT    │ Cosmetic  │     UI        │
│  Layer   │  Layer   │  Layer    │   Layer       │
├──────────┼──────────┼───────────┼───────────────┤
│@cliqz/   │Per-plat- │CSS inject │React popup    │
│adblocker │form      │+ element  │+ options page │
│→ DNR     │content   │hiding     │               │
│rules     │scripts   │           │               │
├──────────┴──────────┴───────────┴───────────────┤
│            Background Service Worker             │
│  - Filter list fetch + compile                   │
│  - Remote OTT script updates                     │
│  - Stats tracking (blocked count)                │
│  - Storage management (chrome.storage)           │
├─────────────────────────────────────────────────┤
│              Remote Config Server                │
│  - Filter list updates (EasyList, uBlock, etc.)  │
│  - OTT platform scripts (versioned JSON)         │
└─────────────────────────────────────────────────┘
```

### Layer Details

#### 1. Network Layer

**Purpose:** Block ad/tracker network requests before they load.

- `@cliqz/adblocker` parses EasyList-format filter lists into a matching engine
- At build time: compile bundled filter lists into `declarativeNetRequest` (DNR) static rulesets (JSON)
- At runtime: background service worker fetches updated filter lists periodically, compiles to DNR dynamic rules
- Bundled baseline lists: EasyList, EasyPrivacy, uBlock filters (Ads + Privacy)
- Remote update lists fetched from raw GitHub URLs

**DNR rule limits (MV3):**
- Static rules: up to 330,000 (across all rulesets)
- Dynamic rules: 30,000
- Session rules: 5,000

#### 2. OTT Layer

**Purpose:** Platform-specific ad blocking using content script techniques that go beyond network-level filtering.

Each platform gets its own content script module, injected only on matching domains via `chrome.scripting.registerContentScripts()`.

##### JioHotstar (`*.hotstar.com`, `*.jiohotstar.com`)

| Technique | Description |
|-----------|-------------|
| **Domain blocking** | DNR rules for `hesads.akamaized.net`, `videoads.hotstar.com`, `brands.hotstar.com`, `bifrost-api.hotstar.com`, `agl-intl.hotstar.com` |
| **fetch() interception** | Content script (`world: "MAIN"`) wraps `fetch()` to intercept BFF API responses and strip ad payload keys before the player processes them |
| **HLS.js playlist hooking** | Override HLS player's loader callback to parse `.m3u8` playlists and strip ad segments (identified by `#EXT-X-DISCONTINUITY` tags + ad URL patterns) before the player parses them |
| **DOM cosmetic hiding** | Hide ad overlays, countdown timers, "Ad" badges via CSS injection |

##### Amazon Prime Video (`*.primevideo.com`, `*.amazon.com/gp/video/*`)

| Technique | Description |
|-----------|-------------|
| **Auto-skip button click** | Detect and auto-click "Skip ads" button via MutationObserver |
| **Ad state detection** | Monitor player DOM for ad markers (progress bar ad badge), seek forward when detected |
| **Banner/overlay hiding** | CSS rules to hide sponsored content rows, homepage ad banners |

##### Netflix (`*.netflix.com`)

| Technique | Description |
|-----------|-------------|
| **Auto-skip** | Detect ad playback via DOM markers, auto-click skip button when available |
| **Video seek** | When ad is detected (ad progress bar visible), seek video element to end of ad segment |
| **Player state monitoring** | Listen for player state changes via DOM observation to detect ad-to-content transitions |

**All OTT scripts use `world: "MAIN"`** to access page-level JavaScript objects (HLS.js instances, fetch API, player APIs).

#### 3. Cosmetic Layer

**Purpose:** Hide ad elements that aren't blocked at the network level.

- CSS selectors extracted from filter lists by `@cliqz/adblocker`
- Injected per-page via `chrome.scripting.insertCSS()` or content script `<style>` injection
- OTT-specific cosmetic rules bundled with each platform's content script
- Rules applied via MutationObserver to handle dynamically inserted ad elements

#### 4. UI Layer

**Purpose:** User-facing controls and status display.

**Popup (React):**
- Global on/off toggle
- Per-site enable/disable toggle (current tab's domain)
- OTT platform toggles (Hotstar / Prime / Netflix) — individually toggleable
- Blocked ads counter (total + current session)
- Extension status indicator

**State management:**
- All settings persisted in `chrome.storage.sync` (syncs across devices)
- Stats (blocked count) in `chrome.storage.local`
- Popup reads state on open, listens for changes via `chrome.storage.onChanged`

---

## Folder Structure

```
ad-block-chrome-ext/
├── docs/
│   └── superpowers/specs/          # Design docs
├── src/
│   ├── entrypoints/                # WXT file-based entrypoints
│   │   ├── background/
│   │   │   └── index.ts            # Service worker: filter updates, DNR management, stats
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   ├── main.tsx            # React mount
│   │   │   └── App.tsx             # Popup UI root
│   │   └── content/
│   │       └── index.ts            # General cosmetic filtering content script
│   ├── ott/                        # OTT platform modules
│   │   ├── hotstar/
│   │   │   ├── content.ts          # Hotstar content script (world: MAIN)
│   │   │   ├── hls-interceptor.ts  # HLS.js m3u8 ad segment stripping
│   │   │   ├── fetch-interceptor.ts# fetch() wrapper for BFF API filtering
│   │   │   └── domains.ts          # Blocked domains list
│   │   ├── prime/
│   │   │   ├── content.ts          # Prime Video content script
│   │   │   ├── auto-skip.ts        # Skip button auto-clicker
│   │   │   └── domains.ts
│   │   ├── netflix/
│   │   │   ├── content.ts          # Netflix content script
│   │   │   ├── auto-skip.ts        # Skip/seek logic
│   │   │   └── domains.ts
│   │   └── shared/
│   │       ├── mutation-observer.ts # Shared DOM observation utilities
│   │       ├── player-detector.ts  # Generic video player state detection
│   │       └── types.ts            # Shared OTT types
│   ├── filters/                    # Filter list management
│   │   ├── compiler.ts             # @cliqz/adblocker → DNR rule compilation
│   │   ├── lists.ts                # Filter list URLs and metadata
│   │   ├── updater.ts              # Background fetch + update logic
│   │   └── bundled/                # Baseline filter lists (built into extension)
│   │       ├── easylist.txt
│   │       ├── easyprivacy.txt
│   │       └── ublock-ads.txt
│   ├── storage/                    # Chrome storage abstraction
│   │   ├── settings.ts             # User settings CRUD
│   │   └── stats.ts                # Blocked count tracking
│   ├── ui/                         # Shared React components
│   │   ├── components/
│   │   │   ├── Toggle.tsx
│   │   │   ├── Counter.tsx
│   │   │   ├── PlatformToggle.tsx
│   │   │   └── SiteToggle.tsx
│   │   └── hooks/
│   │       ├── useSettings.ts
│   │       └── useStats.ts
│   └── utils/                      # Shared utilities
│       ├── messaging.ts            # chrome.runtime message helpers
│       └── logger.ts               # Debug logging utility
├── assets/                         # Extension icons, images
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── wxt.config.ts                   # WXT configuration
├── tailwind.config.ts              # Tailwind CSS config (for popup)
├── tsconfig.json
├── package.json
└── README.md
```

---

## Remote Update System

### Filter Lists
- On install: use bundled baseline filter lists
- Background service worker checks for updates every 24 hours
- Fetches from raw GitHub URLs (EasyList, uBlock Origin uAssets)
- Compiles updated lists to DNR dynamic rules via `@cliqz/adblocker`
- Stores last-updated timestamp in `chrome.storage.local`

### OTT Platform Scripts
- A hosted JSON manifest defines current script versions per platform:
  ```json
  {
    "version": "1.2.0",
    "platforms": {
      "hotstar": { "version": "1.1.0", "scriptUrl": "...", "hash": "..." },
      "prime":   { "version": "1.0.2", "scriptUrl": "...", "hash": "..." },
      "netflix": { "version": "1.0.1", "scriptUrl": "...", "hash": "..." }
    }
  }
  ```
- Background worker checks manifest on startup + every 12 hours
- Downloads updated scripts, verifies integrity hash, stores in `chrome.storage.local`
- Content scripts load from storage rather than being hardcoded
- Fallback: bundled scripts used if remote fetch fails

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| MV3 API for blocking | `declarativeNetRequest` | Only option in MV3; `webRequest` is read-only |
| Content script world | `MAIN` for OTT scripts | Required to access page-level JS (HLS.js, fetch) |
| Filter list parser | `@cliqz/adblocker` | Battle-tested, handles EasyList format, DNR compilation |
| State sync | `chrome.storage.sync` | Settings follow user across devices |
| OTT script delivery | Remote JSON manifest + hashed scripts | Platforms change frequently; avoids full extension updates |
| UI framework | React + Tailwind | Fast development, familiar stack |
| Build framework | WXT | Best MV3 DX, cross-browser support, Vite-based |

---

## Permissions Required

```json
{
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback",
    "storage",
    "activeTab",
    "scripting",
    "alarms"
  ],
  "host_permissions": [
    "*://*.hotstar.com/*",
    "*://*.jiohotstar.com/*",
    "*://*.primevideo.com/*",
    "*://*.amazon.com/gp/video/*",
    "*://*.netflix.com/*",
    "<all_urls>"
  ]
}
```

- `declarativeNetRequest` — network-level ad blocking
- `declarativeNetRequestFeedback` — blocked request count for stats
- `storage` — persist settings and stats
- `activeTab` — get current tab domain for per-site toggle
- `scripting` — register/inject OTT content scripts dynamically
- `alarms` — schedule periodic filter list + OTT script updates
- `<all_urls>` — general web ad blocking requires broad host access

---

## Testing Strategy

- **Unit tests:** Filter compilation, DNR rule generation, HLS m3u8 parsing/stripping, fetch response filtering
- **Integration tests:** Content script injection on test pages, storage read/write, message passing
- **Manual testing:** Each OTT platform with known ad-serving content
- **Test framework:** Vitest (built into WXT/Vite ecosystem)

---

## Out of Scope (V1)

- Firefox support (future — WXT makes this easy to add later)
- Custom user filter rules
- Advanced logging/debugging UI
- Whitelist management UI
- YouTube-specific ad blocking (covered by general filter lists for now)
- Safari support
