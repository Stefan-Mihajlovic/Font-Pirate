import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'manifest.json').read_text())['version']
output = root / 'dist' / f'font-pirate-{version}.zip'
output.parent.mkdir(exist_ok=True)
files = ['manifest.json', 'background.js', 'core.js', 'catalog.js', 'fonts.json', 'content.js', 'index.html', 'app.js', 'style.css', 'LICENSE', 'plus-ui.js', 'plus-license.js', 'page-preview.js', 'font-matching.js', 'font-signatures.json']
with ZipFile(output, 'w', ZIP_DEFLATED) as z:
    for name in files:
        if name == 'manifest.json':
            manifest = json.loads((root / name).read_text())
            # Public Chrome identity keeps licensing origins stable for downloaded previews.
            manifest['key'] = (root / 'scripts/chrome-public-key.txt').read_text().strip()
            z.writestr(name, json.dumps(manifest, indent=2) + '\n')
        else:
            z.write(root / name, name)
    for path in (root / 'icons').glob('icon*.png'):
        if path.stem in ['icon16', 'icon32', 'icon48', 'icon128']:
            z.write(path, str(path.relative_to(root)))
print(output)
