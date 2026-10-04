<h1>
  <img src="./icons/icon128.png" alt="Type Pilot logo" width="48" height="48" align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/type-pilot-wordmark-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/type-pilot-wordmark-light.svg">
    <img src="./assets/type-pilot-wordmark-light.svg" alt="Type Pilot" height="48" align="center">
  </picture>
</h1>

Inspect fonts on a page, save typography pairings, and export CSS.

## Version 1.2 — Preview

- Click-to-inspect font family, size, weight, style, line height, letter spacing, and text transform
- See the current page’s fonts immediately, grouped by family
- Build reusable heading, subheading, body, and caption pairings
- Preview a complete pairing; click a sample to edit it
- Save, search, duplicate, and organize up to 200 named pairings
- Copy production-friendly CSS variables and utility classes
- CSS and JSON export, plus local library backup and import
- Popup and side-panel workspaces
- Persistent light and dark appearance
- Keyboard shortcut: Alt+Shift+T on Windows/Linux or Command+Shift+Y on macOS (remappable in browser extension settings)

All preview features are free. No account, analytics, remote font downloads, or subscription.

The redesigned preview is under review. Its website is currently offline.

## Try it locally

1. Download or clone this repository into a permanent folder.
2. Open `edge://extensions` in Microsoft Edge, or `chrome://extensions` in Chrome.
3. Enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. Pin Type Pilot, open a regular website, and click its icon.
5. The page’s fonts appear automatically. Expand a font to inspect its styles, or choose **Pick a font** and click text on the page. The result appears in the side panel.
6. Choose **Use in pairing**. Click any sample in the preview to edit it, then save or copy CSS.

Chrome/Edge 116 or newer is required. This preview is not yet listed in the extension stores.

## Privacy and permissions

Pairings and settings stay in local extension storage. Type Pilot reads the active page when you open its toolbar popup or explicitly pick or refresh fonts. Saved source URLs omit query strings and fragments. Captured text and page paths may still contain private content; review exports before sharing them.

- `activeTab`: temporary access to the page you choose.
- `scripting`: run the typography inspector on that page.
- `storage`: save your settings, drafts, and library locally.
- `sidePanel`: keep the workspace beside your page.

No broad host permissions, browsing history collection, account, or backend. Removing the extension removes its local library; export a backup first.

## Font behavior

Type Pilot reads **computed CSS font families**, not the exact rendered font for every glyph. It does not download, identify fonts inside images, or distribute font files. A web font that is not installed locally may use a fallback in the extension preview; CSS exports keep the original family declaration. Obtain and license fonts separately for your projects.

Browser settings pages, extension stores, built-in PDF viewers, and embedded frames are not supported. Page scans inspect up to 10,000 elements and retain up to 100 distinct styles. Use **Refresh page fonts** after dynamic content loads.

## Development

No runtime dependencies or build step. Edit the source, reload the extension, and reopen its UI. Refresh any page that had the inspector injected before reloading.

- `npm test` — import/export validation, concurrent library writes, and message permission checks
- `npm run package` — create the installable ZIP in `dist/`
- Open `assets/icon-layers/TypePilot.icon` in Apple Icon Composer to edit the icon; export over `assets/icon-layers/type-pilot-composer.png`, then run `python3 scripts/resize-icons.py`
- `tests/fixture.html` — local typography test page

## License

Copyright (c) 2026 Stefan Mihajlovic. Type Pilot is proprietary software and all rights are reserved. No permission is granted to use, copy, modify, or distribute its source code except as explicitly stated in [LICENSE](./LICENSE). The official preview package may be installed for personal evaluation.
