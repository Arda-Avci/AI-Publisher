import json

with open('colab_setup.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        src = ''.join(cell['source'])
        if 'ALL_MODELS' in src and 'DRIVE_IMAGES_DIR' in src:
            new_lines = []
            for line in cell['source']:
                new_lines.append(line)
                if 'os.makedirs(DRIVE_IMAGES_DIR' in line:
                    new_lines.append('\n')
                    new_lines.append('# Force-rebuild: Drive\'dan silinip yeniden build edilecek modeller\n')
                    new_lines.append('FORCE_REBUILD = {\"wan25\"}  # Buraya model adi ekleyerek zorla rebuild edebilirsiniz\n')
                    new_lines.append('for model in FORCE_REBUILD:\n')
                    new_lines.append('    fpath = os.path.join(DRIVE_IMAGES_DIR, f\"{model}.tar.gz\")\n')
                    new_lines.append('    if os.path.exists(fpath):\n')
                    new_lines.append('        os.remove(fpath)\n')
                    new_lines.append('        print(f\"\\u26a0\\ufe0f Force rebuild: {model}.tar.gz silindi, yeniden build edilecek\")\n')
                    new_lines.append('\n')
                if 'docker load atlandi' in line:
                    # update comment about build_all
                    pass
            cell['source'] = new_lines
            print('Updated: added FORCE_REBUILD logic')
            break

with open('colab_setup.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)
print('Done')
