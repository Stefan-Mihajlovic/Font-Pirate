<h1>
  <img src="./icons/icon128.png" alt="Type Pilot logo" width="48" height="48" align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/type-pilot-wordmark-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="./assets/type-pilot-wordmark-light.svg">
    <img src="./assets/type-pilot-wordmark-light.svg" alt="Type Pilot" height="48" align="center">
  </picture>
</h1>

Type Pilot is a local-first browser typography workspace. Inspect the type behind your favorite websites, collect thoughtful font pairings, and turn inspiration into reusable CSS.

## Version 1.0 — Preview

- Click-to-inspect font family, size, weight, style, line height, letter spacing, and text transform
- Scan a page for distinct typography styles
- Build reusable heading, subheading, body, and caption pairings
- Edit typography values and preview your own text
- Save, search, duplicate, and organize up to 200 named pairings
- Copy production-friendly CSS variables and utility classes
- CSS and JSON export, plus local library backup and import
- Popup and side-panel workspaces
- Persistent light and dark appearance
- Keyboard shortcut: Alt+Shift+T on Windows/Linux or Command+Shift+Y on macOS (remappable in browser extension settings)

All preview features are free. No account, analytics, remote font downloads, or subscription.

[Explore Type Pilot](https://stefanmihajlovic.com/type-pilot/)

## Try it locally

1. Download or clone this repository into a permanent folder.
2. Open `edge://extensions` in Microsoft Edge, or `chrome://extensions` in Chrome.
3. Enable **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`.
4. Pin Type Pilot, open a regular website, and click its icon.
5. Choose **Pick typography**, then click some text. Reopen Type Pilot to use the captured style. Alternatively, open its side panel to keep your workspace visible.

Chrome/Edge 116 or newer is required. This preview is not yet listed in the extension stores.

## Privacy and permissions

Pairings and settings stay in local extension storage. Type Pilot only reads a page after you choose to inspect or scan it. Saved source URLs omit query strings and fragments. Captured text and page paths may still contain private content; review exports before sharing them.

- `activeTab`: temporary access to the page you choose.
- `scripting`: run the typography inspector on that page.
- `storage`: save your settings, drafts, and library locally.
- `sidePanel`: keep the workspace beside your page.

No broad host permissions, browsing history collection, account, or backend. Removing the extension removes its local library; export a backup first.

## Font behavior

Type Pilot reads **computed CSS font families**, not the exact rendered font for every glyph. It does not download, identify fonts inside images, or distribute font files. A web font that is not installed locally may use a fallback in the extension preview; CSS exports keep the original family declaration. Obtain and license fonts separately for your projects.

Browser settings pages, extension stores, built-in PDF viewers, and embedded frames are not supported. Page scans inspect up to 10,000 elements and retain up to 100 distinct styles. Dynamic content must be scanned again after it loads.

## Development

No runtime dependencies or build step. Edit the source, reload the extension, and reopen its UI. Refresh any page that had the inspector injected before reloading.

- `npm test` — import/export validation and inspector lifecycle checks
- `npm run package` — create the installable ZIP in `dist/`
- `swift scripts/make-icons.swift "$PWD"` — regenerate icons on macOS
- `tests/fixture.html` — local typography test page

## License

Copyright (c) 2026 Stefan Mihajlovic. Type Pilot is proprietary software and all rights are reserved. No permission is granted to use, copy, modify, or distribute its source code except as explicitly stated in [LICENSE](./LICENSE). The official preview package may be installed for personal evaluation.
