"""Build a release with only the extension source, README, and MIT license."""
from pathlib import Path
import json
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'extension/manifest.json').read_text())['version']
destination = root / 'dist' / 'blooket-cyber-assistant'
destination.mkdir(parents=True, exist_ok=True)
files = ['manifest.json', 'assistant.js', 'background.js', 'controller.js', 'popup.html', 'popup.js']
for name in files:
    shutil.copy2(root / 'extension' / name, destination / name)
for name in ['LICENSE', 'README.md']:
    shutil.copy2(root / name, destination / name)
archive_path = destination.parent / f'blooket-cyber-assistant-{version}.zip'
with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(files + ['LICENSE', 'README.md']):
        archive.write(destination / name, f'blooket-cyber-assistant/{name}')
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None
print(archive_path)
