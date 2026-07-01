"""Fix rate-limit.ts: add correct RATE_LIMIT import."""
import os

fpath = os.path.join(os.path.dirname(__file__), '..', 'src', 'middleware', 'rate-limit.ts')
with open(fpath, 'r', encoding='utf-8') as f:
    content = f.read()

# Check for actual import statement, not just usage
if "import { RATE_LIMIT }" not in content:
    lines = content.split('\n')
    # Find first import line
    for i, line in enumerate(lines):
        if line.startswith('import ') and 'from' in line:
            lines.insert(i + 1, "import { RATE_LIMIT } from '../constants.js';")
            break
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('rate-limit.ts: import added')
else:
    print('rate-limit.ts: import already present')
