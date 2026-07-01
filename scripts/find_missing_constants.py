"""Search for hardcoded patterns matching remaining constants groups."""
import os, re

SRC = os.path.join(os.path.dirname(__file__), '..', 'src')

patterns = {
    'FILE_LIMITS': [
        (r'500\s*\*\s*1024\s*\*\s*1024', 'FILE_LIMITS.MAX_VIDEO_UPLOAD'),
        (r'10\s*\*\s*1024\s*\*\s*1024', 'FILE_LIMITS.MAX_CHARACTER_IMAGE'),
    ],
    'RETRY': [
        (r'[Mm]ax[_-]?[Rr]etr(?:y|ies)\s*[=:]\s*3\b', 'RETRY.CLIP_QUEUE'),
        (r'[Rr]etr(?:y|ies)\s*[=:]\s*2\b', 'RETRY.AI_CALL'),
        (r'[Rr]etr(?:y|ies)\s*[=:]\s*60\b', 'RETRY.INPAINT_POLL'),
        (r'[Rr]etr(?:y|ies)\s*[=:]\s*120\b', 'RETRY.V2V_POLL'),
    ],
    'CREDIT_DEFAULTS': [
        (r'(?<!\w)(?:DEFAULT_)?[Cc]redits?\s*[=:]\s*100\b(?!\s*\*)', 'CREDIT_DEFAULTS.DEFAULT_USER_CREDITS'),
        (r'[Cc]redits?\s*[=:]\s*10000\b', 'CREDIT_DEFAULTS.ADMIN_SEED_CREDITS'),
        (r'S[Cc]ENE_COST\s*[=:]\s*10\b|scene_cost\s*[=:]\s*10\b|DEFAULT_SCENE_COST\s*[=:]\s*10\b', 'CREDIT_DEFAULTS.DEFAULT_SCENE_COST'),
        (r'COVER_COST\s*[=:]\s*5\b|cover_cost\s*[=:]\s*5\b', 'CREDIT_DEFAULTS.DEFAULT_COVER_COST'),
    ],
    'QUEUE': [
        (r'prefetch\s*[=:]\s*1\b|PREFETCH\s*[=:]\s*1\b', 'QUEUE.PREFETCH'),
        (r'priority\s*[=:]\s*5\b|PRIORITY\s*[=:]\s*5\b', 'QUEUE.PRIORITY_DEFAULT'),
    ],
    'DOCKER_PORTS': [
        (r':5001', 'DOCKER_PORTS.COGVIDEOX'),
        (r':5002', 'DOCKER_PORTS.XTTS'),
        (r':5003', 'DOCKER_PORTS.AUDIOLDM2'),
        (r':5004', 'DOCKER_PORTS.WAV2LIP'),
        (r':5005', 'DOCKER_PORTS.MUSETALK'),
        (r':5006', 'DOCKER_PORTS.WHISPER'),
        (r':5007', 'DOCKER_PORTS.STABLEDIFFUSION'),
    ],
    'RATE_LIMIT': [
        (r'windowMs?\s*[=:]\s*60\s*\*\s*1000', 'RATE_LIMIT.HEAVY_WINDOW_MS'),
        (r'max\s*[=:]\s*10\b(?!\s*\*)', 'RATE_LIMIT.HEAVY_MAX'),
        (r'max\s*[=:]\s*30\b(?!\s*\*)', 'RATE_LIMIT.MEDIUM_MAX'),
        (r'max\s*[=:]\s*100\b(?!\s*\*)', 'RATE_LIMIT.SSE_MAX'),
        (r'max\s*[=:]\s*5\b(?!\s*\*)', 'RATE_LIMIT.AUTH_MAX'),
        (r'windowMs?\s*[=:]\s*900\s*\*\s*1000', 'RATE_LIMIT.AUTH_WINDOW_MS'),
    ],
}

for group, pattern_list in patterns.items():
    print(f'\n=== {group} ===')
    for pat, desc in pattern_list:
        found = False
        for root, dirs, files in os.walk(SRC):
            dirs[:] = [d for d in dirs if d != 'node_modules']
            for f in files:
                if f == 'constants.ts' or not (f.endswith('.ts') or f.endswith('.tsx')):
                    continue
                fpath = os.path.join(root, f)
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as fh:
                    content = fh.read()
                for m in re.finditer(pat, content):
                    found = True
                    line_start = max(0, m.start() - 30)
                    ctx = content[line_start:m.start() + 40].replace('\n', ' ')
                    rel = os.path.relpath(fpath, SRC)
                    print(f'  {desc}: {rel}: ...{ctx.strip()[:120]}...')
        if not found:
            print(f'  {desc}: NOT FOUND')

print('\nDone')
