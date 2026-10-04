<div align="center">
  <img src="icons/icon128.png" width="96" alt="Font Pirate">
  <h1>Font Pirate</h1>
  <p>Good type is out there.</p>
  <p>Google Fonts, page inspection and saved pairings for Chrome and Edge.</p>
</div>

<p align="center"><img src="assets/screenshots/catalog.png" width="340" alt="Google Fonts catalog"><img src="assets/screenshots/pairing.png" width="340" alt="A saved font pairing"></p>

## Find your font

Browse all **1,950 Google Fonts** in the bundled October 2026 catalog. Search, filter by style, star favorites and preview your own text. Font files load when needed, so opening the extension doesn't download the whole library.

## Identify type on the web

Select text and choose **Identify font** from the right-click menu. Or choose **Pick a font…**, then click the text you want. The inspector reads the CSS family, weight, size, line height and spacing. Press Escape to stop picking.

## Put fonts together

Add fonts to a heading, body, subheading or caption. Preview the combination, save it, copy CSS, or export CSS/JSON. Existing Type Pilot libraries and JSON backups remain compatible.

## Try the local preview

1. Download the ZIP and unzip it.
2. Open `edge://extensions` or `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Pin **Font Pirate**. Reload the extension after local changes.

The current redesign is a local preview. The public portfolio page stays removed until approved. The repository folder and GitHub URL retain the earlier TypePilot name to preserve the installed development extension and history.

## Privacy and previews

- Pairings and favorites stay in `chrome.storage.local`. No account, analytics or telemetry.
- Google font stylesheets and font files are loaded from `fonts.googleapis.com` and `fonts.gstatic.com`. These requests include the font family and style, never your preview text or captured text.
- The bundled catalog works offline; remote font previews need a connection or browser cache. An unavailable preview is reported rather than presented as an exact font.
- Page access uses `activeTab`, granted by a toolbar click, shortcut or context-menu command. There is no always-running content script or access to every website.
- **Identify font** reads the start of the selected text. If a selection spans multiple styles, inspect each separately. **Pick a font…** starts the on-page picker.
- Identification reports the CSS family stack. It cannot determine a font baked into an image or prove which fallback rendered each glyph. Non-Google web fonts may preview using a local fallback. Captured CSS remains exact.
- Browser internal pages, PDF viewers and inaccessible cross-origin frames cannot be inspected.

## Development

Vanilla HTML, CSS and JavaScript. Manifest V3, Chrome/Edge 116+.

```sh
npm test
npm run package
```

The package is `dist/font-pirate-2.0.0.zip`. It includes the complete catalog and all runtime files. The generated ZIP is ignored by Git.

### Refresh the catalog

```sh
curl --fail --location https://fonts.google.com/metadata/fonts -o /tmp/google-fonts-metadata.json
python3 scripts/update-fonts.py /tmp/google-fonts-metadata.json
```

Catalog facts come from [Google Fonts](https://fonts.google.com/). Fonts retain their respective licenses; open each family's Google Fonts page for its license and downloads. The extension does not bundle font binaries. Do not send user text through the CSS API's `text` parameter.

### Icon

The custom letter and eyepatch live in `assets/font-pirate/FontPirate.icon`. The document was opened, adjusted and exported in **Apple Icon Composer**. Export a 1024px PNG to `assets/font-pirate/font-pirate-composer.png`, then run:

```sh
python3 scripts/resize-icons.py
```

Design rationale and sources: [DESIGN.md](DESIGN.md).

## License

Proprietary. All rights reserved. The official unmodified preview may be used for personal evaluation. See [LICENSE](LICENSE).
