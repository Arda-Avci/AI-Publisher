"""Add DIRECTORIES+PORTS import to files missing it."""
import os

SRC = os.path.join(os.path.dirname(__file__), '..', 'src')

files = [
    ('AdvancedVideoQueueManager.ts', './constants.js'),
    ('routes/payments.ts', '../constants.js'),
    ('services/browserUseService.ts', '../constants.js'),
]

for rel, import_path in files:
    fpath = os.path.join(SRC, rel)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # First check if import already exists
    if f"from '{import_path}'" in content:
        print(f'  SKIP (already has constants import): {rel}')
        continue
    
    # Find last import line
    lines = content.split('\n')
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith('import ') and ('from' in line or 'require' in line) and i < 40:
            last_import = i
    
    insert_line = f"import {{ DIRECTORIES, PORTS }} from '{import_path}';"
    
    if last_import >= 0:
        lines.insert(last_import + 1, insert_line)
    else:
        lines.insert(0, insert_line)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'  ADDED: {rel}')

print('Done')
