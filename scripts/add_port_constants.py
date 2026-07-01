"""Add PORTS import + replace 4000 default port in 5 files."""
import os, re

SRC = os.path.join(os.path.dirname(__file__), '..', 'src')

files = [
    ('server.ts', './constants.js', [(r'process\.env\.PORT\s*\|\|\s*4000', 'process.env.PORT || PORTS.SERVER')]),
    ('queue.ts', './constants.js', [(r'process\.env\.PORT\s*\|\|\s*4000', 'process.env.PORT || PORTS.SERVER')]),
    ('AdvancedVideoQueueManager.ts', './constants.js', [(r'process\.env\.PORT\s*\|\|\s*4000', 'process.env.PORT || PORTS.SERVER')]),
    ('routes/payments.ts', '../constants.js', [(r'process\.env\.PORT\s*\|\|\s*4000', 'process.env.PORT || PORTS.SERVER')]),
    ('services/browserUseService.ts', '../constants.js', [(r'process\.env\.PORT\s*\|\|\s*4000', 'process.env.PORT || PORTS.SERVER')]),
]

for rel, import_path, replacements in files:
    fpath = os.path.join(SRC, rel)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace port defaults
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content)
    
    # Add PORTS to existing DIRECTORIES import from constants
    old_import = f"import {{ DIRECTORIES }} from '{import_path}';"
    new_import = f"import {{ DIRECTORIES, PORTS }} from '{import_path}';"
    content = content.replace(old_import, new_import)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  UPDATED: {rel}')

print('\nDone.')
