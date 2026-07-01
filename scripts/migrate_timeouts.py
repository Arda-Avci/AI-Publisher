"""Migrate hardcoded timeout values to TIMEOUT.* constants.

Each (value, file_path) → TIMEOUT constant mapping with import merging.
"""

import os, re

SRC = os.path.join(os.path.dirname(__file__), '..', 'src')

# value → TIMEOUT constant name (used as default for files)
VALUE_MAP = {
    3000: 'PIPECAT_HEALTH',
    5000: 'DOCKER_CHECK',   # overridden per-file below
    8000: 'HEALTH_CHECK',
    10000: 'API_FETCH',     # overridden per-file below
    15000: 'EXEC_QUICK',
    20000: 'BROWSER_WAIT',
    30000: 'AI_FAST',       # overridden per-file below (browser vs AI)
    40000: 'BROWSER_UPLOAD',
    45000: 'AI_MEDIUM',
    60000: 'AI_SLOW',
    90000: 'AI_STORYBOARD',
    120000: 'DOWNLOAD',
    180000: 'FFMPEG',
    300000: 'FFMPEG',
    600000: 'DOCKER_MUTEX', # overridden per-file below
    720000: 'HEAVY_POLL',
}

# Per-file overrides: (partial_filepath, value) → constant_name
# More specific patterns override VALUE_MAP
FILE_OVERRIDES = {
    # publisher.ts: all browser-specific
    ('publisher.ts', 10000): 'BROWSER_WAIT',
    ('publisher.ts', 20000): 'BROWSER_WAIT',
    ('publisher.ts', 30000): 'BROWSER_NAV',
    ('publisher.ts', 40000): 'BROWSER_UPLOAD',
    ('publisher.ts', 15000): 'BROWSER_WAIT',
    # trendAnalyzer.ts: browser nav
    ('trendAnalyzer.ts', 30000): 'BROWSER_NAV',
    # authSetup.ts: browser long wait
    ('authSetup.ts', 120000): 'BROWSER_TASK',
    # docker routes: health check
    ('routes\\docker.ts', 5000): 'DOCKER_CHECK',
    ('routes\\docker.ts', 10000): 'API_FETCH',
    # loraService: lora-specific
    ('loraService.ts', 5000): 'LORA_CHECK',
    ('loraService.ts', 120000): 'DOWNLOAD',
    ('loraService.ts', 600000): 'HEAVY_GEN',
    # splitScreen: ffprobe quick
    ('splitScreen.ts', 10000): 'EXEC_QUICK',
    # pipecatBridge: health
    ('pipecatBridge.ts', 3000): 'PIPECAT_HEALTH',
    # docker-host: health
    ('docker-host.ts', 5000): 'DOCKER_CHECK',
    ('docker-host.ts', 3000): 'PIPECAT_HEALTH',
    # neo4jService: specific
    ('neo4jService.ts', 5000): 'DOCKER_CHECK',
    # aiBroll: heavy AI
    ('aiBroll.ts', 600000): 'HEAVY_GEN',
    ('aiBroll.ts', 300000): 'FFMPEG',
    ('aiBroll.ts', 10000): 'POLL_TASK',
    # autoDubbing: various
    ('autoDubbing.ts', 300000): 'FFMPEG',
    ('autoDubbing.ts', 600000): 'HEAVY_GEN',
    ('autoDubbing.ts', 10000): 'POLL_TASK',
    # inpainting
    ('inpainting.ts', 600000): 'HEAVY_GEN',
    # museTalkService
    ('museTalkService.ts', 600000): 'HEAVY_GEN',
    ('museTalkService.ts', 300000): 'FFMPEG',
    # aiStudio
    ('aiStudio.ts', 300000): 'FFMPEG',
    ('aiStudio.ts', 600000): 'HEAVY_GEN',
    # beatSyncEditor
    ('beatSyncEditor.ts', 60000): 'EXEC_QUICK',
    # sceneComposer
    ('sceneComposer.ts', 300000): 'FFMPEG',
    # smartCropper
    ('smartCropper.ts', 15000): 'EXEC_QUICK',
    # orchestratorToVideo
    ('orchestratorToVideo.ts', 120000): 'DOWNLOAD',
    ('orchestratorToVideo.ts', 180000): 'FFMPEG',
    # characterGenerationService
    ('characterGenerationService.ts', 180000): 'FFMPEG',
    # download.ts
    ('lib\\download.ts', 120000): 'DOWNLOAD',
    # queue.ts download/ffmpeg
    ('queue.ts', 120000): 'DOWNLOAD',
    # queue-graph.ts download
    ('queue-graph.ts', 120000): 'DOWNLOAD',
    ('queue-graph.ts', 720000): 'HEAVY_POLL',
    # AdvancedVideoQueueManager
    ('AdvancedVideoQueueManager.ts', 10000): 'AI_FAST',
    ('AdvancedVideoQueueManager.ts', 15000): 'EXEC_QUICK',
    ('AdvancedVideoQueueManager.ts', 120000): 'DOWNLOAD',
    ('AdvancedVideoQueueManager.ts', 300000): 'FFMPEG',
    # avatarService
    ('avatarService.ts', 60000): 'AI_SLOW',
    # veo31
    ('veo31.ts', 30000): 'AI_FAST',
    ('veo31.ts', 10000): 'API_FETCH',
    # storyboardGenerator
    ('storyboardGenerator.ts', 60000): 'AI_SLOW',
    # characters.ts route
    ('routes\\characters.ts', 120000): 'AI_SLOW',
    # dynamicCaptions
    ('dynamicCaptions.ts', 300000): 'FFMPEG',
    # talkShow/apiFootballProvider
    ('apiFootballProvider.ts', 10000): 'API_FETCH',
    # pictureNarration
    ('pictureNarration.ts', 120000): 'DOWNLOAD',
    # clipper v2
    ('test_clipper_whisper.spec.ts', 10000): 'EXEC_QUICK',
    # test_documentParser
    ('test_documentParser.spec.ts', 15000): 'EXEC_QUICK',
}


def get_timeout_constant(rel_path, value):
    """Get the best TIMEOUT constant for a value in a given file."""
    # Check file-specific overrides first
    for (file_key, val), const in FILE_OVERRIDES.items():
        if val == value and (rel_path.endswith(file_key) or file_key in rel_path):
            return const
    # Fall back to value map
    return VALUE_MAP.get(value)


def update_import(content, rel_path):
    """Add TIMEOUT to existing constants import or create new import."""
    import_path = get_import_path(rel_path)
    
    # Check if constants already imported
    existing_match = re.search(
        r"import\s*\{([^}]+)\}\s*from\s*'" + re.escape(import_path) + r"'",
        content
    )
    
    if existing_match:
        imported_names = existing_match.group(1)
        if 'TIMEOUT' not in imported_names:
            new_imports = imported_names.strip() + ', TIMEOUT'
            new_line = f"import {{ {new_imports} }} from '{import_path}';"
            content = content.replace(existing_match.group(0), new_line)
        return content
    
    # No existing import — find last import line and add after
    lines = content.split('\n')
    last_import = -1
    for i, line in enumerate(lines):
        if line.startswith('import ') and ('from' in line or 'require' in line):
            if i < 50:  # only first 50 lines
                last_import = i
    
    insert_line = f"import {{ TIMEOUT }} from '{import_path}';"
    if last_import >= 0:
        lines.insert(last_import + 1, insert_line)
    else:
        lines.insert(0, insert_line)
    return '\n'.join(lines)


def get_import_path(rel_path):
    """Get the relative import path for constants.ts from a file."""
    depth = rel_path.count(os.sep)
    if depth == 0:
        return './constants.js'
    return '../' * depth + 'constants.js'


def count_timeout_occurrences(content):
    """Count non-constants timeout patterns in content."""
    return len(re.findall(
        r'(?<!\w)(?:timeout|time_out)\s*(?::|=|,)\s*(\d{4,})',
        content, re.IGNORECASE
    ))


def get_relative_path(root, f):
    """Get relative path from SRC."""
    return os.path.relpath(os.path.join(root, f), SRC)


def main():
    changed = 0
    total_files = 0
    
    for root, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if d != 'node_modules']
        for f in files:
            if f == 'constants.ts' or not (f.endswith('.ts') or f.endswith('.tsx')):
                continue
            
            fpath = os.path.join(root, f)
            rel = get_relative_path(root, f)
            
            with open(fpath, 'r', encoding='utf-8', errors='ignore') as fh:
                content = fh.read()
            
            original = content
            total_files += 1
            
            # Find all timeout values
            timeout_values = set()
            for m in re.finditer(
                r'(?<!\w)(?:timeout|time_out)\s*(?::|=|,)\s*(\d{4,})',
                content, re.IGNORECASE
            ):
                val = int(m.group(1))
                if val >= 1000:
                    timeout_values.add(val)
            
            if not timeout_values:
                continue
            
            # Map each value to a constant
            replacements = {}
            for val in timeout_values:
                const = get_timeout_constant(rel, val)
                if const:
                    replacements[val] = const
            
            if not replacements:
                continue
            
            # Apply replacements (replace most specific values first)
            for val in sorted(replacements.keys(), reverse=True):
                const_name = replacements[val]
                pattern = rf'(?<!\w)(?:timeout|time_out)\s*(?::|=|,)\s*{val}\b'
                content = re.sub(
                    pattern,
                    f'timeout: TIMEOUT.{const_name}',
                    content,
                    flags=re.IGNORECASE
                )
            
            # Update import
            if content != original:
                content = update_import(content, rel)
            
            if content != original:
                with open(fpath, 'w', encoding='utf-8') as fh:
                    fh.write(content)
                print(f'  UPDATED: {rel} ({len(timeout_values)} values)')
                changed += 1
    
    print(f'\n{changed}/{total_files} files updated.')


if __name__ == '__main__':
    main()
