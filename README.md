# Ad Blocker Pro

Chrome/Edge extension that blocks ads across the web and on OTT streaming platforms (JioHotstar, Prime Video, Netflix).

## What it does

- **Web ad blocking** — uses EasyList, EasyPrivacy, and uBlock filter lists compiled into MV3 declarativeNetRequest rules
- **JioHotstar** — intercepts fetch() API responses to strip ad payloads + hooks HLS.js to remove ad segments from m3u8 playlists
- **Prime Video** — auto-clicks skip buttons, seeks past ads when no skip is available
- **Netflix** — same auto-skip/seek approach as Prime
- **Popup UI** — global toggle, per-site toggle, per-platform toggles, blocked ads counter

## Setup

```powershell
npm install
.\scripts\download-filters.ps1   # downloads EasyList, EasyPrivacy, uBlock filters
```

## Dev

```powershell
npm run dev        # starts dev server with HMR
npm test           # runs vitest
npm run build      # production build -> .output/chrome-mv3/
```

## Load in Chrome

1. `npm run build`
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" → select the `.output/chrome-mv3` folder

## How it works

Built with [WXT](https://wxt.dev) (Vite-based MV3 extension framework) + React + TypeScript.

- **Network layer** — `@ghostery/adblocker` parses filter lists and compiles them to DNR rules. Background worker updates lists every 24h.
- **OTT layer** — Content scripts run in `world: "MAIN"` to access page-level JS. Each platform has its own script injected only on matching domains.
- **Cosmetic layer** — CSS selectors from filter lists injected per-page to hide ad elements that slip through network blocking.

## Project structure

```
entrypoints/           # WXT file-based entrypoints
  background.ts        # service worker (filter updates, messaging, stats)
  content.ts           # general cosmetic filtering
  hotstar-content/     # JioHotstar content script
  prime-content/       # Prime Video content script
  netflix-content/     # Netflix content script
  popup/               # React popup UI
ott/                   # OTT platform modules
  hotstar/             # fetch interception, HLS hooking, cosmetic rules
  prime/               # auto-skip, cosmetic rules
  netflix/             # auto-skip, cosmetic rules
  shared/              # MutationObserver utils, player detection
filters/               # filter list management
  compiler.ts          # @ghostery/adblocker → DNR rules
  updater.ts           # periodic fetch + compile
  lists.ts             # filter list URLs
storage/               # chrome.storage wrappers
ui/                    # React components + hooks
utils/                 # logger, typed messaging
```

## License

MIT
