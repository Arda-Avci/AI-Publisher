"""Fix barrel imports for files at root level that the main script missed."""
import os

src_dir = os.path.join(os.path.dirname(__file__), '..', 'src')

files_map = {
    'queue.ts': {
        'services': ['creditService', 'viralHook', 'aiService', 'splitScreen', 'videoService', 'aiBroll', 'emotionCaptions', 'beatSyncEditor'],
        'prefix': './',
    },
    'queue-graph.ts': {
        'services': ['creditService', 'aiService', 'videoService'],
        'prefix': './',
    },
    'lib/differentiate.ts': {
        'services': ['aiService'],
        'prefix': '../',
    },
    'routes/hooks.ts': {
        'services': ['viralHook'],
        'prefix': '../',
    },
}

for relpath, info in files_map.items():
    fpath = os.path.join(src_dir, relpath)
    if not os.path.exists(fpath):
        print(f'  SKIP: {relpath} not found')
        continue
    
    with open(fpath, 'r', encoding='utf-8') as fh:
        content = fh.read()
    
    changed = False
    for svc in info['services']:
        old = f"from '{info['prefix']}services/{svc}.js'"
        new = f"from '{info['prefix']}services/index.js'"
        if old in content:
            content = content.replace(old, new)
            changed = True
            print(f'  {relpath}: {svc} replaced')
    
    if changed:
        with open(fpath, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print(f'  UPDATED: {relpath}')
    else:
        print(f'  SKIP: {relpath} no matching imports found')

print('\nDone. Run: npx tsc --noEmit && npx vitest run')
