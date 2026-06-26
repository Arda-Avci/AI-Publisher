# Trigger rebuild of wan image
import os
import sys
import time
import threading
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "shared"))
from utils import upload_to_backblaze

OUTPUT_BASE = os.environ.get("RUNPOD_OUTPUT_PATH", "/workspace/outputs")

# Check if running in serverless mode
IS_SERVERLESS = os.environ.get("RUNPOD_SERVERLESS", "false").lower() == "true"

def run_flask():
    print("[WRAPPER] Starting Flask app...")
    import subprocess
    subprocess.run([sys.executable, "-u", "app.py"])

if not IS_SERVERLESS:
    # Local/Colab mode: block and run Flask in main thread
    run_flask()
else:
    # Serverless mode: run Flask in background and start RunPod loop
    import runpod

    # Start Flask in a daemon thread
    threading.Thread(target=run_flask, daemon=True).start()

    # Wait for local Flask app to be ready on port 5000
    ready = False
    for i in range(90):
        try:
            r = requests.get("http://localhost:5000/health", timeout=1)
            if r.status_code == 200:
                print(f"[WRAPPER] Flask app is ready on port 5000 after {i} seconds.")
                ready = True
                break
        except Exception:
            pass
        time.sleep(1)

    if not ready:
        print("[WRAPPER] Flask app failed to start within 90 seconds. Exiting.")
        sys.exit(1)

    def handler(job):
        job_input = job.get('input', {})
        b2_creds = job_input.get('b2_credentials', {})
        
        # Set environment variables from b2_credentials if present
        if b2_creds:
            if "endpoint_url" in b2_creds:
                os.environ["B2_ENDPOINT_URL"] = b2_creds["endpoint_url"]
            if "key_id" in b2_creds:
                os.environ["B2_KEY_ID"] = b2_creds["key_id"]
            if "application_key" in b2_creds:
                os.environ["B2_APPLICATION_KEY"] = b2_creds["application_key"]
            if "bucket_name" in b2_creds:
                os.environ["B2_BUCKET_NAME"] = b2_creds["bucket_name"]
        
        # Determine Flask endpoint path
        endpoint_path = os.environ.get("RUNPOD_ENDPOINT_PATH", "/generate-media")
        flask_port = os.environ.get("RUNPOD_FLASK_PORT", "5000")

        # If mode is passed or we need alternative routing
        if "mode" in job_input and job_input["mode"] == "kokoro_tts":
            endpoint_path = "/generate-media"
        elif "mode" in job_input and job_input["mode"] == "browser_use":
            endpoint_path = "/browser-task"
            flask_port = os.environ.get("RUNPOD_BROWSER_USE_PORT", "5017")

        print(f"[WRAPPER] Forwarding request to local Flask:{flask_port}{endpoint_path}")
        try:
            resp = requests.post(f"http://localhost:{flask_port}{endpoint_path}", json=job_input, timeout=600)
            result = resp.json()
        except Exception as e:
            return {"status": "error", "message": f"Flask forward failed: {str(e)}"}

        # Define file mapping for uploads
        job_id = job_input.get("job_id", "job")
        scene_num = job_input.get("scene_number", 1)
        
        upload_map = {
            f"{OUTPUT_BASE}/current_scene.mp4": f"outputs/{job_id}/scene_{scene_num}.mp4",
            f"{OUTPUT_BASE}/raw_video.mp4": f"outputs/{job_id}/scene_{scene_num}_raw.mp4",
            f"{OUTPUT_BASE}/speech.wav": f"outputs/{job_id}/scene_{scene_num}_speech.wav",
            f"{OUTPUT_BASE}/kokoro_speech.wav": f"outputs/{job_id}/scene_{scene_num}_kokoro.wav",
            f"{OUTPUT_BASE}/sfx.wav": f"outputs/{job_id}/scene_{scene_num}_sfx.wav",
            f"{OUTPUT_BASE}/subtitle.srt": f"outputs/{job_id}/scene_{scene_num}.srt",
            f"{OUTPUT_BASE}/generated_anchor.png": f"outputs/{job_id}/anchor_{scene_num}.png",
            f"{OUTPUT_BASE}/cover_0.jpg": f"outputs/{job_id}/cover_0.jpg",
            f"{OUTPUT_BASE}/cover_1.jpg": f"outputs/{job_id}/cover_1.jpg",
            f"{OUTPUT_BASE}/cover_2.jpg": f"outputs/{job_id}/cover_2.jpg"
        }
        
        # Check dynamic returned paths in the Flask JSON response
        for field in ["output_path", "video_path", "speech_path", "audio_path", "sfx_path", "subtitle_path"]:
            if field in result and isinstance(result[field], str) and os.path.exists(result[field]):
                local_file = result[field]
                ext = os.path.splitext(local_file)[1].lower()
                b2_key = f"outputs/{job_id}/scene_{scene_num}_dyn{ext}"
                if local_file not in upload_map:
                    upload_map[local_file] = b2_key

        b2_urls = {}
        for local_path, b2_key in upload_map.items():
            if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
                bucket = b2_creds.get("bucket_name") if b2_creds else None
                b2_url = upload_to_backblaze(local_path, b2_key, bucket)
                if b2_url:
                    b2_urls[local_path] = b2_url
                    try:
                        os.remove(local_path)
                    except:
                        pass
        
        # Map uploaded URLs to keys in JSON output for Node.js consumption
        content_keys = {
            "video_url": ["current_scene.mp4", "raw_video.mp4"],
            "speech_url": ["speech.wav", "kokoro_speech.wav"],
        }
        if b2_urls:
            result["b2_urls"] = b2_urls
            for url_key, filename_candidates in content_keys.items():
                if url_key not in result:
                    for fname in filename_candidates:
                        path = f"{OUTPUT_BASE}/{fname}"
                        if path in b2_urls:
                            result[url_key] = b2_urls[path]
                            break
            for key_suffix in ["sfx.wav", "subtitle.srt", "generated_anchor.png"]:
                path = f"{OUTPUT_BASE}/{key_suffix}"
                if path in b2_urls:
                    map_key = key_suffix.replace(".wav", "_url").replace(".srt", "_url").replace(".png", "_url").replace("generated_anchor", "image")
                    result[map_key] = b2_urls[path]

        return result

    runpod.serverless.start({"handler": handler})
