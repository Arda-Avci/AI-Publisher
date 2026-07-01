"""Discover Flask routes for all model images once, store mapping."""
import modal
import json
import sys

MODELS = [
    ('kokoro','kokorotts'), ('whisper','whisper'), ('f5tts','f5tts'), ('xtts','xtts'),
    ('wav2lip','wav2lip',True), ('sadtalker','sadtalker',True),
    ('musetalk','musetalk',True), ('geneface','geneface',True),
    ('videoretalking','video-retalking',True), ('audioldm2','audioldm2',True),
    ('browseruse','browser-use',True),
    ('wan','wan',True,'H100'), ('wan25','wan25',True,'H100'),
    ('cogvideox','cogvideox',True,'A100'), ('hunyuan','hunyuan',True,'A100'),
    ('ltx','ltx',True,'A100'), ('mochi','mochi',True,'A100'),
    ('animatediff','animatediff',True,'A10'), ('dynamicrafter','dynamicrafter',True,'A10'),
    ('pyramidflow','pyramid-flow',True,'A100'), ('svd','svd',True,'A10'),
    ('videocrafter','videocrafter',True,'A10'), ('zeroscope','zeroscope',True,'A10'),
    ('stablediffusion','stablediffusion',True,'A10'), ('realesrgan','realesrgan',True,'A10'),
]

ENDPOINT_MAP = {}

for entry in MODELS:
    name = entry[0]
    img_name = entry[1]
    gpu = entry[3] if len(entry) > 3 else None

    print(f"\n=== Inspecting {name} ({img_name}) ===", flush=True)

    IMAGE = f"ghcr.io/arda-avci/{img_name}:latest"
    SEC = modal.Secret.from_name("ghcr-secret")

    app = modal.App(f"ai-publisher-{name}-scan")
    img = modal.Image.from_registry(IMAGE, secret=SEC)

    @app.function(image=img, secrets=[SEC], gpu=gpu or None, timeout=120, min_containers=0)
    def scan():
        import subprocess, importlib.util, sys
        sys.path.insert(0, "/app")

        # Check what's in /app
        result = {"files": [], "routes": [], "importable": False}

        import os
        for f in os.listdir("/app"):
            result["files"].append(f)

        # Try to import app.py and read Flask routes
        try:
            spec = importlib.util.spec_from_file_location("app_mod", "/app/app.py")
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)

            if hasattr(mod, "app"):
                for rule in mod.app.url_map.iter_rules():
                    if 'POST' in rule.methods and rule.endpoint != 'static':
                        result["routes"].append({"path": rule.rule, "methods": list(rule.methods)})
                result["importable"] = True
        except Exception as e:
            result["import_error"] = str(e)

        # Check for generate() function in app.py
        try:
            if hasattr(mod, "generate"):
                result["has_generate"] = True
        except:
            result["has_generate"] = False

        return result

    with app.run():
        data = scan.remote()
        print(json.dumps(data, indent=2), flush=True)
        ENDPOINT_MAP[name] = data

# Save mapping
with open("/tmp/modal_routes.json", "w") as f:
    json.dump(ENDPOINT_MAP, f, indent=2)
print("\n\n=== FINAL MAPPING ===")
print(json.dumps(ENDPOINT_MAP, indent=2))
