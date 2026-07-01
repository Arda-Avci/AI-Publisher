"""Find service imports missing .js extension (not caught by barrel refactor)."""
import os, re, sys

src_dir = os.path.join(os.path.dirname(__file__), '..', 'src')

no_ext = []   # imports without .js
with_ext = [] # imports with .js

for root, dirs, files in os.walk(src_dir):
    for fname in files:
        if not fname.endswith(('.ts', '.tsx')):
            continue
        fpath = os.path.join(root, fname)
        rel = os.path.relpath(fpath, src_dir).replace(os.sep, '/')
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
        
        # Without .js extension
        for m in re.finditer(r"from\s+['\"]([./]+)services/(\w+)['\"]", content):
            prefix, svc = m.group(1), m.group(2)
            no_ext.append((rel, prefix, svc))
        
        # With .js extension
        for m in re.finditer(r"from\s+['\"]([./]+)services/(\w+)\.js['\"]", content):
            prefix, svc = m.group(1), m.group(2)
            with_ext.append((rel, prefix, svc))

# Find files in no_ext that are NOT in with_ext
print("=== Imports WITHOUT .js extension (missed by barrel refactor) ===")
patterns_seen = set()
for rel, prefix, svc in sorted(set(no_ext)):
    key = (rel, prefix, svc)
    if key not in [(w[0], w[1], w[2]) for w in with_ext]:
        if key not in patterns_seen:
            print(f"  {rel}: from '{prefix}services/{svc}' (no .js)")
            patterns_seen.add(key)

print(f"\n=== {len(no_ext)} total no-ext imports, {len(with_ext)} with-ext imports ===")
print(f"\nUnique no-ext (not in with-ext): {len(patterns_seen)}")
