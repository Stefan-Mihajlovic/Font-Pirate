# Font Pirate — local redesign

## Brief
A compact typography tool, with the complete Google Fonts catalog, on-page identification, and saved pairings. Purple identity. A custom letter with an eyepatch. No public launch before review.

## Research, 4 October 2026
- Google Fonts: visually reviewed catalog. Search, live text previews and category filters. Official metadata contains 1,950 families. Keep the catalog searchable offline; load font files only as needed.
- Fontshare: visually reviewed. The type specimen is the content; direct search and editable sample. Avoid importing the website's large filter system into a popup.
- Pangram Pangram: visually reviewed. Large image-led panels, short copy, strong type. Art should relate to the identity rather than a random scene.
- Raycast: visually reviewed. A single strong identity image carries the hero; restrained product copy.
- Fonts Ninja: inspector reference. A font name and a sample should precede secondary metrics.
- WhatFont: earlier research. Inspect in context, then reveal detail.

Sources: https://fonts.google.com/ · https://www.fontshare.com/ · https://pangrampangram.com/ · https://www.raycast.com/ · https://www.fonts.ninja/tools · https://whatfonttool.com/
Technical references: https://developers.google.com/fonts/docs/css2 · https://developer.chrome.com/docs/extensions/reference/api/contextMenus · https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy

## Tokens and composition
- Paper #FFFFFF, soft paper #F5F3F9, ink #241F2E, secondary #746B80, violet #8054D9, pale violet #EFE7FC.
- UI: system sans, 14px controls and labels, 28px font specimens. Website: a confident rounded display face with a quiet sans supporting face.
- Popup: 410px, 590px tall. Fixed header/search; one scrolling list. Detail replaces list, with a clear back action. Page inspection has its own tab. Pairing editing keeps one role visible at a time.
- Brand: custom lowercase a, counter as the eye, diagonal eyepatch. Large readable silhouette, minimal pieces. Native Icon Composer source and export.
- Site: full image hero tied to the pirate identity, short headline/one sentence/one CTA. Next section: actual extension screenshots at useful reading size. Installation in a disclosure. No eyebrow text, feature-card grid, tiny captions, or fake UI.

```
[mark Font Pirate        panel settings]
[ Fonts | On this page | Pairings ]
[ Search Google Fonts             ]
[ All styles       Popular       ☆]
[ Inter                         ☆ ]
[ Playfair Display              ☆ ]
[ … scroll all families …         ]
```

## Review before build
The rejected coastal metal-letter image was unrelated to the tool. Replace it with an original graphic world tied to the pirate letter; keep the rest of the page quiet. The old popup put scan results under “Fonts”, implying an incomplete library. Separate catalog from page font inspection. Remote previews must be real fonts, not local fallbacks passed off as correct previews. Do not send user's specimen text or captured text in font requests.
