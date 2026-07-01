"""
Sequential Modal model test — stops on first failure.
Usage:
  python scripts/test_modal_sequential.py          # all models
  python scripts/test_modal_sequential.py audio    # group
  python scripts/test_modal_sequential.py kokoro   # single
"""
import modal, sys, time

SERVICE_MAP = {
    "kokoro":  ("ai-publisher-audio", "kokoro"),
    "xtts":    ("ai-publisher-audio", "xtts"),
    "whisper": ("ai-publisher-audio", "whisper"),
    "f5tts":   ("ai-publisher-audio", "f5tts"),
    "audioldm2": ("ai-publisher-audio", "audioldm2"),
    "wav2lip": ("ai-publisher-audio", "wav2lip"),
    "sadtalker": ("ai-publisher-audio", "sadtalker"),
    "musetalk": ("ai-publisher-audio", "musetalk"),
    "geneface": ("ai-publisher-audio", "geneface"),
    "videoretalking": ("ai-publisher-audio", "videoretalking"),
    "browseruse": ("ai-publisher-audio", "browseruse"),
    "stablediffusion": ("ai-publisher-image", "stablediffusion"),
    "realesrgan": ("ai-publisher-image", "realesrgan"),
    "wan": ("ai-publisher-video", "wan"),
    "wan25": ("ai-publisher-video", "wan25"),
    "cogvideox": ("ai-publisher-video", "cogvideox"),
    "hunyuan": ("ai-publisher-video", "hunyuan"),
    "ltx": ("ai-publisher-video", "ltx"),
    "mochi": ("ai-publisher-video", "mochi"),
    "animatediff": ("ai-publisher-video", "animatediff"),
    "dynamicrafter": ("ai-publisher-video", "dynamicrafter"),
    "pyramidflow": ("ai-publisher-video", "pyramidflow"),
    "svd": ("ai-publisher-video", "svd"),
    "videocrafter": ("ai-publisher-video", "videocrafter"),
    "zeroscope": ("ai-publisher-video", "zeroscope"),
}

GROUPS = {
    "audio": ["kokoro", "xtts", "whisper", "f5tts", "audioldm2"],
    "face":  ["wav2lip", "sadtalker", "musetalk", "geneface", "videoretalking"],
    "image": ["stablediffusion", "realesrgan"],
    "video": ["wan", "wan25", "cogvideox", "hunyuan", "ltx", "mochi",
              "animatediff", "dynamicrafter", "pyramidflow", "svd",
              "videocrafter", "zeroscope"],
    "browser": ["browseruse"],
}

PARAMS = {
    "kokoro":  {"text": "Merhaba dünya, test konuşması."},
    "xtts":    {"text": "Merhaba dünya, test konuşması."},
    "f5tts":   {"text": "Merhaba dünya, test konuşması."},
    "whisper": {"text": ""},
    "audioldm2": {"text": "rain sound effects"},
    "wav2lip": {"text": ""},
    "sadtalker": {"text": ""},
    "musetalk": {"text": ""},
    "geneface": {"text": ""},
    "videoretalking": {"text": ""},
    "browseruse": {"text": "https://example.com"},
    "stablediffusion": {"prompt": "a cute cat"},
    "realesrgan": {"prompt": ""},
    "wan": {"prompt": "a cat walking"},
    "wan25": {"prompt": "a cat walking"},
    "cogvideox": {"prompt": "a cat walking"},
    "hunyuan": {"prompt": "a cat walking"},
    "ltx": {"prompt": "a cat walking"},
    "mochi": {"prompt": "a cat walking"},
    "animatediff": {"prompt": "a cat walking"},
    "dynamicrafter": {"prompt": "a cat walking"},
    "pyramidflow": {"prompt": "a cat walking"},
    "svd": {"prompt": ""},
    "videocrafter": {"prompt": "a cat walking"},
    "zeroscope": {"prompt": "a cat walking"},
}

TIMEOUT = 600 # GPU model cold-start may take >5min

def test(name):
    app_name, func_name = SERVICE_MAP[name]
    print(f"\n{'='*60}")
    print(f"[TEST] {name} ({app_name}.{func_name})")
    print(f"{'='*60}")
    t0 = time.time()
    try:
        f = modal.Function.from_name(app_name, func_name)
        params = dict(PARAMS.get(name, {}))
        params["b2_key_id"] = ""
        params["b2_key"] = ""
        call = f.spawn(**params)
        result = call.get(timeout=TIMEOUT)
        elapsed = time.time() - t0
        status = result.get("status", "unknown")
        if status in ("completed", "success"):
            print(f"  [OK] {name} — ({elapsed:.0f}s)")
            return True
        else:
            err = result.get("error", result)
            print(f"  [FAIL] {name} — ({elapsed:.0f}s): {err}")
            return False
    except Exception as e:
        elapsed = time.time() - t0
        if "timeout" in str(e).lower():
            try: call.cancel()
            except: pass
            print(f"  [TIMEOUT] {name} — ({elapsed:.0f}s)")
        else:
            err_msg = str(e) or repr(e) or type(e).__name__
            print(f"  [ERROR] {name} — ({elapsed:.0f}s): {err_msg}")
        return False

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in GROUPS:
        models = GROUPS[target]
    elif target in SERVICE_MAP:
        models = [target]
    elif target == "all":
        models = list(SERVICE_MAP.keys())
    else:
        print(f"Unknown: {target}")
        print(f"Groups: {list(GROUPS.keys())}")
        sys.exit(1)

    print(f"\nTesting {len(models)} model(s) (sequential, stop on fail)")
    for name in models:
        ok = test(name)
        if not ok:
            print(f"\n[FAIL] {name} FAILED — stopping.")
            sys.exit(1)
    print(f"\n[OK] All {len(models)} model(s) passed.")

if __name__ == "__main__":
    main()
