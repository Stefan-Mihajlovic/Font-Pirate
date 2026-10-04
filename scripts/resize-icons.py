"""Resize the real Icon Composer export for Chromium's icon slots (macOS)."""
from pathlib import Path
import subprocess
root = Path(__file__).resolve().parents[1]
source = root / 'assets/icon-layers/type-pilot-composer.png'
if not source.exists():
    raise SystemExit('Export the icon from Icon Composer first; see README.md.')
for size in (16, 32, 48, 128, 256, 512):
    subprocess.run(['sips', '-z', str(size), str(size), str(source), '--out', str(root / 'icons' / f'icon{size}.png')], check=True)
