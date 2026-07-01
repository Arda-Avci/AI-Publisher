"""
Test all 25 Modal models with 5-minute timeout.
Usage: python scripts/test_modal_all.py [group|model_name]
       python scripts/test_modal_all.py audio    # only audio models
       python scripts/test_modal_all.py f5tts    # single model
"""
import modal, sys, json, time, traceback
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout

MODELS = {
    # Audio
    "kokoro":    {"params": {"text": "Merhaba dünya, test konuşması."}},
    "xtts":      {"params": {"text": "Merhaba dünya, test konuşması."}},
    "whisper":   {"params": {"audio_base64": "", "language": "tr"}},  # placeholder
    "f5tts":     {"params": {"text": "Merhaba dünya, test konuşması."}},
    "audioldm2": {"params": {"prompt": "rain sound effects"}},
    # Face
    "wav2lip":   {"params": {"video_path": "", "audio_path": ""}},
    "sadtalker": {"params": {"image_path": "", "audio_path": ""}},
    "musetalk":  {"params": {"video_path": "", "audio_path": ""}},
    "geneface":  {"params": {"audio_path": ""}},
    "videoretalking": {"params": {"video_path": "", "audio_path": ""}},
    # Image
    "stablediffusion": {"params": {"prompt": "a cute cat"}},
    "realesrgan": {"params": {"image_path": ""}},
    # Video
    "wan":       {"params": {"prompt": "a cat walking"}},
    "wan25":     {"params": {"prompt": "a cat walking"}},
    "cogvideox": {"params": {"prompt": "a cat walking"}},
    "hunyuan":   {"params": {"prompt": "a cat walking"}},
    "ltx":       {"params": {"prompt": "a cat walking"}},
    "mochi":     {"params": {"prompt": "a cat walking"}},
    "animatediff": {"params": {"prompt": "a cat walking"}},
    "dynamicrafter": {"params": {"prompt": "a cat walking"}},
    "pyramidflow": {"params": {"prompt": "a cat walking"}},
    "svd":       {"params": {"image_path": ""}},
    "videocrafter": {"params": {"prompt": "a cat walking"}},
    "zeroscope": {"params": {"prompt": "a cat walking"}},
    # Browser
    "browseruse": {"params": {"url": "https://example.com", "task": "screenshot"}},
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

TEST_TIMEOUT = 300  # 5 minutes max per model

def test_model(name, params):
    print(f"\n{'='*60}")
    print(f"[TEST] {name} — starting...")
    print(f"{'='*60}")
    t0 = time.time()
    try:
        f = modal.Function.from_name(f"ai-publisher-{name}", "generate")
        call = f.spawn(**params)
        result = call.get(timeout=TEST_TIMEOUT)
        elapsed = time.time() - t0
        status = result.get("status", "unknown")
        if status == "completed":
            result_data = result.get("result", {})
            print(f"  ✅ {name} — OK ({elapsed:.0f}s)")
            print(f"     result: {json.dumps(result_data, ensure_ascii=False)[:200]}")
            return {"name": name, "status": "PASS", "time": f"{elapsed:.0f}s"}
        else:
            err = result.get("error", "unknown error")
            print(f"  ❌ {name} — FAIL ({elapsed:.0f}s): {err}")
            return {"name": name, "status": "FAIL", "time": f"{elapsed:.0f}s", "error": err}
    except Exception as e:
        elapsed = time.time() - t0
        if isinstance(e, (TimeoutError, FutureTimeout)) or "timeout" in str(e).lower():
            try: call.cancel()
            except: pass
            print(f"  ⏰ {name} — TIMEOUT ({elapsed:.0f}s) — cancelled")
            return {"name": name, "status": "TIMEOUT", "time": f"{elapsed:.0f}s"}
        print(f"  💥 {name} — EXCEPTION ({elapsed:.0f}s): {e}")
        return {"name": name, "status": "ERROR", "time": f"{elapsed:.0f}s", "error": str(e)}

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in GROUPS:
        models_to_test = GROUPS[target]
    elif target in MODELS:
        models_to_test = [target]
    elif target == "all":
        models_to_test = list(MODELS.keys())
    else:
        print(f"Unknown target: {target}")
        print(f"Groups: {list(GROUPS.keys())}")
        print(f"Models: {list(MODELS.keys())}")
        sys.exit(1)

    print(f"\n🧪 Testing {len(models_to_test)} models (timeout: {TEST_TIMEOUT}s each)")
    results = []
    for name in models_to_test:
        params = MODELS[name]["params"]
        r = test_model(name, params)
        results.append(r)

    print(f"\n{'='*60}")
    print(f"📊 RESULTS: {len(results)} models")
    print(f"{'='*60}")
    for r in results:
        icon = {"PASS": "✅", "FAIL": "❌", "TIMEOUT": "⏰", "ERROR": "💥"}.get(r["status"], "❓")
        err_info = f" — {r.get('error','')}" if "error" in r else ""
        print(f"  {icon} {r['name']:20s} {r['status']:8s} {r['time']:8s}{err_info}")

if __name__ == "__main__":
    main()
