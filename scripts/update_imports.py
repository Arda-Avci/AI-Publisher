"""Update imports to use barrel index.ts for high-traffic services.

Only updates files with 3+ service imports. Conservative approach — 
each changed file is listed for review, nothing auto-applied unless --apply flag given.
"""
import os, re, sys
from collections import defaultdict

src_dir = os.path.join(os.path.dirname(__file__), '..', 'src')

# Candidate services (from barrel index.ts)
candidates = [
    'creditService', 'viralHook', 'aiService', 'splitScreen',
    'colorGrader', 'videoService', 'aiBroll', 'emotionCaptions',
    'beatAnalyzer', 'beatSyncEditor', 'characterService',
]

# Find all files that import from candidate services
file_imports = defaultdict(list)
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if not f.endswith(('.ts', '.tsx')) or f.endswith('.spec.ts') or f.endswith('.test.ts'):
            continue
        if '/node_modules/' in root.replace('\\', '/'):
            continue
        if 'services/' in root.replace('\\', '/') or root.endswith('services'):
            continue
        fpath = os.path.join(root, f)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
        for svc in candidates:
            pattern = f'./services/{svc}.js'
            pattern2 = f'../services/{svc}.js'
            if pattern in content or pattern2 in content:
                rel = os.path.relpath(fpath, src_dir).replace('\\', '/')
                file_imports[rel].append(svc)

# Find files with 3+ candidate imports (high-value targets)
high_value = {f: svcs for f, svcs in file_imports.items() if len(svcs) >= 2}
all_files = dict(file_imports)

print(f'Files importing from candidate services: {len(file_imports)}')
print(f'High-value files (2+ candidate imports): {len(high_value)}')
print()

# Show files grouped by count
for f in sorted(all_files, key=lambda x: len(all_files[x]), reverse=True):
    flag = ' *' if f in high_value else ''
    print(f'  {f}: {all_files[f]}{flag}')

if '--apply' in sys.argv:
    # Apply the changes — careful
    count = 0
    for f, svcs in all_files.items():
        fpath = os.path.join(src_dir, f)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
        changed = False
        for svc in svcs:
            # Calculate the relative path to services/index.js
            depth = f.count('/') - f.rstrip('/').count('/')
            prefix = '../' * (len(f.split('/')))
            # More precise: count dir depth
            rel_dir = os.path.dirname(f)
            if rel_dir == '.':
                prefix = './'
            else:
                prefix = '../' * (rel_dir.count('/') + 1)
            
            old = f"from '{prefix}services/{svc}.js'"
            new = f"from '{prefix}services/index.js'"
            
            if old in content:
                content = content.replace(old, new)
                changed = True
        
        if changed:
            with open(fpath, 'w', encoding='utf-8') as fh:
                fh.write(content)
            count += 1
            print(f'  UPDATED: {f}')
    
    print(f'\n{count} files updated. Run tsc --noEmit to verify.')
else:
    print(f'\nRun with --apply to auto-update imports.')
    print(f'Then run: npx tsc --noEmit && npx vitest run')
