import json, os

os.chdir('colab_docker')

with open('../colab_setup_v2.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

for cell in nb['cells']:
    if cell['cell_type'] == 'code':
        src = ''.join(cell['source'])
        if 'ALL_MODELS' in src and 'build_all.sh' in src:
            new_lines = []
            found = False
            for line in cell['source']:
                if 'lora-trainer' in line and not found:
                    new_lines.append(line)
                    new_lines.append('    # Faz 6 \u2014 Docker Hub Motorlari\n')
                    new_lines.append('    "sadtalker", "dynamicrafter", "zeroscope",\n')
                    new_lines.append('    "video-retalking", "geneface", "mochi", "pyramid-flow",\n')
                    found = True
                elif 'build_all.sh' in line:
                    new_lines.append(line.replace('build_all.sh', 'build_all_v2.sh'))
                else:
                    new_lines.append(line)

            if found:
                cell['source'] = new_lines
                print('Updated ALL_MODELS + build_all.sh reference')
            break

with open('../colab_setup_v2.ipynb', 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)
print('Done')
