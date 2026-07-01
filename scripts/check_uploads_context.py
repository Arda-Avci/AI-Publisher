"""Check that 'uploads' string replacements are in the right context."""
import os

files = ['src/lib/upload.ts', 'src/routes/upload.ts', 'src/routes/characterLibrary.ts',
         'src/routes/characterGeneration.ts', 'src/routes/characters.ts',
         'src/routes/documentUpload.ts', 'src/constants.ts']

for f in files:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
    for i, line in enumerate(content.split('\n'), 1):
        for q in ["'uploads'", '"uploads"', "'videolar'", '"videolar"']:
            if q in line:
                print(f'{f}:{i}: {line.strip()[:120]}')
