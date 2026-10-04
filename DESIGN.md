# Type Pilot redesign

Brief: compact utility like Palette Pilot and Tab Volume Manager. Remove promotional copy from the extension. The website must show actual captured extension UI, never HTML illustrations pretending to be screenshots. Keep all redesign work local until Stefan approves publication.

## Tokens

- Canvas: #17161b; surface: #211f26; control: #2b2831.
- Text: #f2eef8; secondary: #aca5b6; active: #b399f2.
- Light theme uses neutral #f3f3f5 and #ffffff, not warm editorial paper.
- UI: system sans, 11/12/14/18px. Actual sampled font is the main visual content, at up to 34px.
- 400px popup, 16px gutters, 8px control gaps. 8px controls, 12px panels. Left aligned, numeric values tabular.

## Layout

Inspect: [brand / panel / settings] [Inspect | Pairing | Library] [Pick font | Scan page] [actual sample + six values + role assignment] [scan results].
Pairing: [name] [four roles] [editable actual font sample] [family + four properties] [collapsed extras] [Save | Export].
Library: [search / import / backup] [name + actual font sample + open / more].
Website: [brand / GitHub] [four-word headline + one sentence + download] [actual inspector screenshot] [pairing screenshot + short explanation] [footer].

## Review against brief

Removed the decorative Aa hero, all eyebrow labels, intro headings, feature-number strips, persistent instructions and large footer. Font samples carry the visual identity, because they are the object being inspected. Controls stay quiet. No artificial UI replicas, illustrative browser frames, staged metric badges, or invented screenshots. Website screenshots must come from the running Edge extension and retain its exact UI.

## Verification

Capture screenshots of Inspect and Pairing after functional checks. Review popup height, text density, light/dark themes, and narrow side panel. Test capture, save/reopen, CSS export and scan. Leave live site removed and keep redesign branches unpublished.

Verified in Edge: light/dark popup, side panel, scan (16 styles), click capture, assigning an inspected style, variable weight 650, saved pairing reopen, draft-discard confirmation and Copy CSS. All 11 automated tests pass. Website reviewed at desktop and 440px mobile width. The two website images are actual Edge popup captures. Public /type-pilot/ returns 404 after rollback. No redesign branch has been pushed.
