import json
import os

notebook_path = "Google_Colab_AI_Publisher.ipynb"

if not os.path.exists(notebook_path):
    print(f"Error: {notebook_path} not found.")
    exit(1)

with open(notebook_path, "r", encoding="utf-8") as f:
    data = json.load(f)

patched = False
for cell in data.get("cells", []):
    if cell.get("cell_type") == "code":
        source = cell.get("source", [])
        for i, line in enumerate(source):
            if '["dockerd", "--iptables=0"' in line and '"-b", "none"' not in line:
                source[i] = line.replace('["dockerd",', '["dockerd", "-b", "none",')
                patched = True
                print(f"Patched line: {line.strip()} -> {source[i].strip()}")

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully updated.")
else:
    print("Notebook was already patched or target line not found.")
