import json, re

with open('colab_setup_v2.ipynb', 'r') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        src = ''.join(cell['source'])
        if 'ALL_MODELS' in src:
            pat = re.compile(r'"([a-z0-9_-]+)"')
            models = pat.findall(src)
            print(f'ALL_MODELS count: {len(models)}')
            for m in models:
                print(f'  {m}')
        if 'build_all_v2' in src:
            print('build_all_v2.sh referenced: YES')
