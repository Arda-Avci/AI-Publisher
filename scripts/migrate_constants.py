"""Replace hardcoded directory strings with constants.ts imports.

Usage:
  python scripts/migrate_constants.py --apply
  python scripts/migrate_constants.py  (dry run)
"""
import os, re, sys

SRC_DIR = os.path.join(os.path.dirname(__file__), '..', 'src')

# (old_string, new_string) pairs
REPLACEMENTS = [
    ("'videolar'", 'DIRECTORIES.VIDEO_OUTPUT'),
    ('"videolar"', 'DIRECTORIES.VIDEO_OUTPUT'),
    ("'uploads'", 'DIRECTORIES.UPLOADS'),
    ('"uploads"', 'DIRECTORIES.UPLOADS'),
]

def get_import_path(filepath):
    rel = os.path.relpath(os.path.join(SRC_DIR, 'constants.ts'),
                           os.path.dirname(filepath)).replace(os.sep, '/')
    # Ensure relative path starts with ./ or ../
    if not rel.startswith('.'):
        rel = './' + rel
    return rel.replace('.ts', '.js')

def scan_and_replace(apply=False):
    changes = []
    for root, dirs, files in os.walk(SRC_DIR):
        for fname in files:
            if not fname.endswith(('.ts', '.tsx')):
                continue
            if any(fname.endswith(s) for s in ('.spec.ts', '.test.ts', '.d.ts')):
                continue
            fpath = os.path.join(root, fname)
            if os.path.normcase(fpath) == os.path.normcase(os.path.join(SRC_DIR, 'constants.ts')):
                continue
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, SRC_DIR).replace(os.sep, '/')
            
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            modified = content
            matched = set()
            for old_str, new_code in REPLACEMENTS:
                count = modified.count(old_str)
                if count > 0:
                    matched.add(new_code.split('.')[0])
                    modified = modified.replace(old_str, new_code)
            
            if not matched:
                continue
            
            # Add import (DIRECTORIES) after last existing import
            import_path = get_import_path(fpath)
            import_line = f"import {{ DIRECTORIES }} from '{import_path}';"
            
            lines = modified.split('\n')
            # Find last import line
            last_import_idx = -1
            for i, line in enumerate(lines):
                stripped = line.strip()
                if stripped.startswith('import ') and ('from' in stripped or '=' in stripped):
                    last_import_idx = i
            
            # Check if already imported
            already_imported = any(import_line in l for l in lines)
            
            if already_imported:
                print(f'  SKIP (already imported): {rel}')
                continue
            
            insert_pos = last_import_idx + 1 if last_import_idx >= 0 else 0
            lines.insert(insert_pos, import_line)
            modified = '\n'.join(lines)
            
            changes.append((rel, list(matched)))
            
            if apply:
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(modified)
    
    return changes

if __name__ == '__main__':
    apply = '--apply' in sys.argv
    changes = scan_and_replace(apply)
    
    print(f'\nFiles changed: {len(changes)}')
    for rel, groups in sorted(changes):
        print(f'  {rel}: {", ".join(sorted(groups))}')
    
    if not apply:
        print('\nDRY RUN — no changes made. Use --apply to execute.')
    else:
        print('\nDone. Run: npx tsc --noEmit')
