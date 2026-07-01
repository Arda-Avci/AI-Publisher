"""Fix service imports without .js extension (add .js, switch to barrel where applicable)."""
import os

candidates = ['creditService', 'viralHook', 'aiService', 'splitScreen', 'colorGrader',
              'videoService', 'aiBroll', 'emotionCaptions', 'beatAnalyzer', 
              'beatSyncEditor', 'characterService']

fixes = {
    'src/routes/beatSync.ts': [
        ('../services/beatAnalyzer', '../services/index', True),  # -> barrel
        ('../services/beatSyncEditor', '../services/index', True),  # -> barrel
    ],
    'src/routes/templates.ts': [
        ('../services/templatePromptService', '../services/templatePromptService', False),  # just add .js
    ],
}

for rel, changes in fixes.items():
    fpath = os.path.join(os.path.dirname(__file__), '..', rel)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old_path, new_path, is_barrel in changes:
        # Old without .js
        old_import = f"from '{old_path}'"
        # New with .js 
        new_import = f"from '{new_path}.js'"
        
        if old_import in content:
            content = content.replace(old_import, new_import)
            dest = f"barrel ({new_path}.js)" if is_barrel else f"direct ({new_path}.js)"
            print(f'  {rel}: {os.path.basename(old_path)} -> {dest}')
        else:
            print(f'  {rel}: NOT FOUND -> {old_import}')
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)

print('\nDone. Run: npx tsc --noEmit && npx vitest run')
