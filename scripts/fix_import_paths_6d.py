"""Fix constants import paths for files in subdirectories."""
import os, re

SRC = os.path.join(os.path.dirname(__file__), '..', 'src')

fixes = {
    'lib/upload.ts': '../constants.js',
    'routes/characterGeneration.ts': '../constants.js',
    'routes/characterLibrary.ts': '../constants.js',
    'routes/documentUpload.ts': '../constants.js',
    'services/inpaintingService.ts': '../constants.js',
    'services/videoToVideoService.ts': '../constants.js',
    'lib/docker-host.ts': '../constants.js',
}

for rel, correct_path in fixes.items():
    fpath = os.path.join(SRC, rel)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix wrong import path (./constants.js -> ../constants.js)
    old = "import { FILE_LIMITS } from './constants.js';" if 'FILE_LIMITS' in content else None
    if old and old in content:
        content = content.replace(old, f"import {{ FILE_LIMITS }} from '{correct_path}';")
        print(f'  Fixed: {rel}')
    
    # Check for other wrong paths
    m = re.search(r"import\s*\{([^}]+)\}\s*from\s*'\./constants\.js'", content)
    if m:
        groups = m.group(1).strip()
        content = content.replace(
            f"import {{ {groups} }} from './constants.js';",
            f"import {{ {groups} }} from '{correct_path}';"
        )
        print(f'  Fixed path: {rel} -> {correct_path}')
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Done')
