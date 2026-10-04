# Type Pilot: second design direction

User rejected the first redesign as unintuitive and generic. Do not publish without approval.

Research: WhatFont (https://whatfonttool.com/) emphasizes pointing at type on the page. Fonts Ninja (https://fonts.ninja/tools) shows a concise hover inspector, font summary and separate details. Cosmos (https://www.cosmos.so/) provides a reference for letting imagery lead. These inform interaction hierarchy; no borrowed brand assets.

## Intent

Open the extension and immediately see fonts on the current page. Group styles by family, rather than making users scan and parse a long repeated list. One primary action: Pick a font. Keep the side panel open while picking so results arrive without reopening the extension. Only two navigation destinations: Fonts and Pairings. Editing is a drill-down from a selected font or saved pairing, with an explicit Back button. Advanced CSS properties stay collapsed. Show a complete pairing specimen when no role is being edited.

## Visual language

Canvas #ffffff; ink #20334b; supporting text #6a7c90; sea mist #eef4f8; selection #2464e8; hairlines #e4ebf1. Dark theme uses #152436 / #1e3148. Compact system UI at 11/13/16px; large actual font specimens supply variety. No intro copy, no three equal action tabs, no decorative labels. Controls use plain verbs.

Website: full viewport original coastal sculpture image; oversized, tightly set white sans title left; quiet navigation; one download action. Hero typography uses Arial with deliberate scale, not serif plus beige or purple SaaS cards. Below: a working-product gallery with real screenshots and a single short caption per mode. One installation disclosure. No feature grid, checkmark bullets, eyebrows, fake UI, invented stats, or gratuitous motion.

Icon: custom lowercase t formed by a typographic stem and folded directional wing. Three vector layers, assembled and finished in Apple's Icon Composer, exported as PNG for the extension. Preserve editable .icon source. No old Tp monogram.

Hero generated with the built-in image generator: monumental brushed-aluminum lowercase a on a dark rocky coast, blue hour, quiet open sea at left, sculpture at right; no words or UI overlays. Saved in the portfolio assets folder. Image is artwork, screenshots remain actual application captures.

## Validation of this revision

- Icon imported as three SVG layers, composed in `/Applications/Icon Composer.app`, saved as `assets/icon-layers/TypePilot.icon`, and exported through File > Export as a 1024px PNG. Chromium sizes derive from that export.
- In Edge 1.2.0, opening the popup immediately lists grouped fonts. Expanding Arial shows three styles; collapsed installation text no longer pollutes scans.
- Pick a font starts page selection and opens the side panel. Clicking the hero heading updates the panel immediately. Use in pairing opens the combined specimen. Clicking the body sample opens its editor; size edits and Copy CSS work.
- Saved and reopened the Coastal notes example without overwriting the existing Editorial warmth pairing. All 11 storage/export validation tests pass.
- Three final gallery images are unmodified screenshots of the running Edge popup. Desktop and 440px mobile page layouts reviewed, including gallery mouse and arrow-key interaction.
- Live Type Pilot route still returns 404. Both redesign branches remain local; no website or repository publication was performed.
