"""Migrate remaining constants: FILE_LIMITS, RETRY, CREDIT_DEFAULTS, QUEUE, RATE_LIMIT, DOCKER_PORTS."""
import os, re

SRC = os.path.join(os.path.dirname(__file__), '..', 'src')

# Per-file replacements: list of (partial_rel_path, old_pattern, new_text)
REPLACEMENTS = [
    # ===== FILE_LIMITS =====
    (r'lib/upload\.ts', r'500\s*\*\s*1024\s*\*\s*1024', 'FILE_LIMITS.MAX_VIDEO_UPLOAD'),
    (r'routes/characterGeneration\.ts', r'10\s*\*\s*1024\s*\*\s*1024', 'FILE_LIMITS.MAX_CHARACTER_IMAGE'),
    (r'routes/characterLibrary\.ts', r'10\s*\*\s*1024\s*\*\s*1024', 'FILE_LIMITS.MAX_CHARACTER_IMAGE'),
    (r'routes/characters\.ts', r'10\s*\*\s*1024\s*\*\s*1024', 'FILE_LIMITS.MAX_CHARACTER_IMAGE'),
    (r'routes/documentUpload\.ts', r'10\s*\*\s*1024\s*\*\s*1024', 'FILE_LIMITS.MAX_CHARACTER_IMAGE'),

    # ===== RETRY =====
    (r'services/inpaintingService\.ts', r'maxRetries\s*=\s*60', 'maxRetries = RETRY.INPAINT_POLL'),
    (r'services/videoToVideoService\.ts', r'maxRetries\s*=\s*120', 'maxRetries = RETRY.V2V_POLL'),

    # ===== CREDIT_DEFAULTS =====
    (r'db\.ts$', r'credits\s*=\s*10000\b', 'credits = CREDIT_DEFAULTS.ADMIN_SEED_CREDITS'),

    # ===== RATE_LIMIT =====
    (r'middleware/rate-limit\.ts', r'windowMs:\s*60\s*\*\s*1000,\s*\n\s*max:\s*10',
     'windowMs: RATE_LIMIT.HEAVY_WINDOW_MS,\n  max: RATE_LIMIT.HEAVY_MAX'),
    (r'middleware/rate-limit\.ts', r'windowMs:\s*60\s*\*\s*1000,\s*\n\s*max:\s*30',
     'windowMs: RATE_LIMIT.MEDIUM_WINDOW_MS,\n  max: RATE_LIMIT.MEDIUM_MAX'),
    (r'middleware/rate-limit\.ts', r'windowMs:\s*60\s*\*\s*1000,\s*\n\s*max:\s*100',
     'windowMs: RATE_LIMIT.SSE_WINDOW_MS,\n  max: RATE_LIMIT.SSE_MAX'),
    (r'middleware/rate-limit\.ts', r'windowMs:\s*900\s*\*\s*1000,\s*\n\s*max:\s*5',
     'windowMs: RATE_LIMIT.AUTH_WINDOW_MS,\n  max: RATE_LIMIT.AUTH_MAX'),

    # ===== DOCKER_PORTS =====
    (r'lib/docker-host\.ts', r'port:\s*5001', 'port: DOCKER_PORTS.COGVIDEOX'),
    (r'lib/docker-host\.ts', r'port:\s*5002', 'port: DOCKER_PORTS.XTTS'),
    (r'lib/docker-host\.ts', r'port:\s*5003', 'port: DOCKER_PORTS.AUDIOLDM2'),
    (r'lib/docker-host\.ts', r'port:\s*5004', 'port: DOCKER_PORTS.WAV2LIP'),
    (r'lib/docker-host\.ts', r'port:\s*5005', 'port: DOCKER_PORTS.MUSETALK'),
    (r'lib/docker-host\.ts', r'port:\s*5006', 'port: DOCKER_PORTS.WHISPER'),
    (r'lib/docker-host\.ts', r'port:\s*5007', 'port: DOCKER_PORTS.STABLEDIFFUSION'),
    (r'lib/docker-host\.ts', r'port:\s*5008', 'port: DOCKER_PORTS.WAN'),
    (r'lib/docker-host\.ts', r'port:\s*5009', 'port: DOCKER_PORTS.LTX'),
    (r'lib/docker-host\.ts', r'port:\s*5010', 'port: DOCKER_PORTS.HUNYUAN'),
    (r'lib/docker-host\.ts', r'port:\s*5011', 'port: DOCKER_PORTS.KOKOROTTS'),
    (r'lib/docker-host\.ts', r'port:\s*5012', 'port: DOCKER_PORTS.SVD'),
    (r'lib/docker-host\.ts', r'port:\s*5013', 'port: DOCKER_PORTS.ANIMATEDIFF'),
    (r'lib/docker-host\.ts', r'port:\s*5014', 'port: DOCKER_PORTS.WAN25'),
    (r'lib/docker-host\.ts', r'port:\s*5015', 'port: DOCKER_PORTS.F5TTS'),
    (r'lib/docker-host\.ts', r'port:\s*5016', 'port: DOCKER_PORTS.LORA_TRAINER'),
    (r'lib/docker-host\.ts', r'port:\s*5017', 'port: DOCKER_PORTS.SADTALKER'),
    (r'lib/docker-host\.ts', r'port:\s*5018', 'port: DOCKER_PORTS.DYNAMICRAFTER'),
    (r'lib/docker-host\.ts', r'port:\s*5019', 'port: DOCKER_PORTS.ZEROSCOPE'),
    (r'lib/docker-host\.ts', r'port:\s*5020', 'port: DOCKER_PORTS.VIDEO_RETALKING'),
    (r'lib/docker-host\.ts', r'port:\s*5021', 'port: DOCKER_PORTS.GENEFACE'),
    (r'lib/docker-host\.ts', r'port:\s*5022', 'port: DOCKER_PORTS.MOCHI'),
    (r'lib/docker-host\.ts', r'port:\s*5023', 'port: DOCKER_PORTS.PYRAMID_FLOW'),
    (r'lib/docker-host\.ts', r'port:\s*5024', 'port: DOCKER_PORTS.VIDEOCRAFTER'),
    (r'lib/docker-host\.ts', r'port:\s*5025', 'port: DOCKER_PORTS.REALESRGAN'),
    (r'lib/docker-host\.ts', r'port:\s*5026', 'port: DOCKER_PORTS.BROWSER_USE'),
]

# Track which files need import merging
files_to_update = set()
changed_count = 0

for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for f in files:
        if not (f.endswith('.ts') or f.endswith('.tsx')):
            continue
        fpath = os.path.join(root, f)
        rel = os.path.relpath(fpath, SRC).replace(os.sep, '/')

        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fh:
            original = fh.read()

        content = original
        file_changed = False

        for file_pattern, old, new in REPLACEMENTS:
            if re.search(file_pattern, rel):
                new_content = re.sub(old, new, content)
                if new_content != content:
                    content = new_content
                    file_changed = True
                    files_to_update.add(rel)

        if file_changed:
            # Add constants import if needed
            if 'constants.js' not in content:
                # Find last import line
                lines = content.split('\n')
                last_import = -1
                for i, line in enumerate(lines):
                    if line.startswith('import ') and ('from' in line) and i < 50:
                        last_import = i

                # Determine import path
                depth = rel.count('/')
                import_path = './constants.js' if depth == 0 else '../' * depth + 'constants.js'

                # Figure out which groups to import
                needed_groups = set()
                for group_name in ['FILE_LIMITS', 'RETRY', 'CREDIT_DEFAULTS', 'RATE_LIMIT', 'DOCKER_PORTS', 'QUEUE']:
                    if group_name in content and 'constants.js' in content[:500]:
                        pass
                    elif group_name in content:
                        needed_groups.add(group_name)

                if needed_groups:
                    import_line = f"import {{ {', '.join(sorted(needed_groups))} }} from '{import_path}';"
                    if last_import >= 0:
                        lines.insert(last_import + 1, import_line)
                    else:
                        lines.insert(0, import_line)
                    content = '\n'.join(lines)
            else:
                # Merge missing group into existing constants import
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    m = re.match(r"import\s*\{([^}]+)\}\s*from\s*'([^']*constants\.js)'", line)
                    if m:
                        existing = set(m.group(1).split(','))
                        existing = {x.strip() for x in existing if x.strip()}
                        for group_name in ['FILE_LIMITS', 'RETRY', 'CREDIT_DEFAULTS', 'RATE_LIMIT', 'DOCKER_PORTS', 'QUEUE']:
                            # Only add if used in content but not already imported
                            if group_name in content and group_name not in existing and f' {group_name}' in content:
                                existing.add(group_name)
                        new_import = f"import {{ {', '.join(sorted(existing))} }} from '{m.group(2)}';"
                        if new_import != line:
                            lines[i] = new_import
                            content = '\n'.join(lines)
                        break

            with open(fpath, 'w', encoding='utf-8') as fh:
                fh.write(content)
            print(f'  UPDATED: {rel}')
            changed_count += 1

print(f'\n{changed_count} files updated.')
