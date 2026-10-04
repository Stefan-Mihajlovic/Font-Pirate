"""Normalize the official Google Fonts metadata response into the bundled catalog."""
import json, sys
from datetime import date
from pathlib import Path
raw=Path(sys.argv[1]).read_text()
data=json.loads(raw[raw.index('{'):])
fonts=[{'family':f['family'],'category':f['category'],'weights':list(f['fonts']),'popularity':f['popularity']} for f in data['familyMetadataList']]
if len(fonts)<1000 or len({f['family'] for f in fonts})!=len(fonts):
    raise SystemExit('Invalid or incomplete catalog; existing catalog unchanged.')
output=Path(__file__).resolve().parents[1]/'fonts.json'
output.write_text(json.dumps({'updated':date.today().isoformat(),'fonts':fonts},ensure_ascii=False,separators=(',',':'))+'\n')
print(f'{len(fonts)} families → {output}')
