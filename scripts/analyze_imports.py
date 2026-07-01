"""Analyze import patterns across src/ to understand barrel export viability."""
import os, re
from collections import defaultdict

src_dir = os.path.join(os.path.dirname(__file__), '..', 'src')
imports = defaultdict(list)

for root, dirs, files in os.walk(src_dir):
    for f in files:
        if not f.endswith(('.ts', '.tsx')):
            continue
        fpath = os.path.join(root, f)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fh:
            content = fh.read()
        # Match from './services/xxx' patterns
        for m in re.finditer(
            r"""from\s+['"]([./]+/services/([^'"]+))['"]""",
            content,
        ):
            target = m.group(2).replace('.ts', '').replace('.js', '')
            if target == 'index':
                continue
            rel = os.path.relpath(fpath, src_dir).replace('\\', '/')
            imports[target].append(rel)

sorted_imports = sorted(imports.items(), key=lambda x: len(x[1]), reverse=True)
print('Services with 3+ consumers:')
for svc, consumers in sorted_imports:
    if len(consumers) >= 3:
        print(f'  {svc}: {len(consumers)} imports')

print(f'\nTotal services imported: {len(imports)}')
print(f'Total import statements: {sum(len(v) for v in imports.values())}')
