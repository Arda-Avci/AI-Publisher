import os
import sys
import time
import threading
import requests

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
    import boto3
    from botocore.client import Config

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

    def upload_to_b2(local_path, key, b2_creds):
        endpoint = b2_creds.get("endpoint_url") or os.environ.get("B2_ENDPOINT_URL") or "https://s3.us-west-004.backblazeb2.com"
        key_id = b2_creds.get("key_id") or os.environ.get("B2_KEY_ID")
        app_key = b2_creds.get("application_key") or os.environ.get("B2_APPLICATION_KEY")
        bucket_name = b2_creds.get("bucket_name") or os.environ.get("B2_BUCKET_NAME") or "ai-publisher-models"

        if not key_id or not app_key:
            print("[WRAPPER] B2 credentials missing. Skipping upload.")
            return None

        try:
            s3 = boto3.client(
                's3',
                endpoint_url=endpoint,
                aws_access_key_id=key_id,
                aws_secret_access_key=app_key,
                config=Config(signature_version='s3v4'),
                region_name='us-west-004'
            )
            s3.upload_file(local_path, bucket_name, key)
            print(f"[WRAPPER] Uploaded: {local_path} -> {key}")
            return f"{endpoint.rstrip('/')}/{bucket_name}/{key}"
        except Exception as e:
            print(f"[WRAPPER] B2 upload failed for {local_path}: {e}")
            return None

    def handler(job):
        job_input = job.get('input', {})
        b2_creds = job_input.get('b2_credentials', {})
        
        # Determine Flask endpoint path
        endpoint_path = os.environ.get("RUNPOD_ENDPOINT_PATH", "/generate-media")
        
        # If mode is passed or we need alternative routing
        if "mode" in job_input and job_input["mode"] == "kokoro_tts":
            endpoint_path = "/generate-media"
            
        print(f"[WRAPPER] Forwarding request to local Flask: {endpoint_path}")
        try:
            resp = requests.post(f"http://localhost:5000{endpoint_path}", json=job_input, timeout=600)
            result = resp.json()
        except Exception as e:
            return {"status": "error", "message": f"Flask forward failed: {str(e)}"}

        # Define file mapping for uploads
        job_id = job_input.get("job_id", "job")
        scene_num = job_input.get("scene_number", 1)
        
        upload_map = {
            "/content/current_scene.mp4": f"outputs/{job_id}/scene_{scene_num}.mp4",
            "/content/raw_video.mp4": f"outputs/{job_id}/scene_{scene_num}_raw.mp4",
            "/content/speech.wav": f"outputs/{job_id}/scene_{scene_num}_speech.wav",
            "/content/kokoro_speech.wav": f"outputs/{job_id}/scene_{scene_num}_kokoro.wav",
            "/content/sfx.wav": f"outputs/{job_id}/scene_{scene_num}_sfx.wav",
            "/content/subtitle.srt": f"outputs/{job_id}/scene_{scene_num}.srt",
            "/content/generated_anchor.png": f"outputs/{job_id}/anchor_{scene_num}.png",
            "/content/cover_0.jpg": f"outputs/{job_id}/cover_0.jpg",
            "/content/cover_1.jpg": f"outputs/{job_id}/cover_1.jpg",
            "/content/cover_2.jpg": f"outputs/{job_id}/cover_2.jpg"
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
                b2_url = upload_to_b2(local_path, b2_key, b2_creds)
                if b2_url:
                    b2_urls[local_path] = b2_url
                    # Try to clean up local file
                    try:
                        os.remove(local_path)
                    except:
                        pass
        
        # Map uploaded URLs to keys in JSON output for Node.js consumption
        if b2_urls:
            result["b2_urls"] = b2_urls
            if "/content/current_scene.mp4" in b2_urls:
                result["video_url"] = b2_urls["/content/current_scene.mp4"]
            elif "/content/raw_video.mp4" in b2_urls:
                result["video_url"] = b2_urls["/content/raw_video.mp4"]
            if "/content/speech.wav" in b2_urls:
                result["speech_url"] = b2_urls["/content/speech.wav"]
            elif "/content/kokoro_speech.wav" in b2_urls:
                result["speech_url"] = b2_urls["/content/kokoro_speech.wav"]
            if "/content/sfx.wav" in b2_urls:
                result["sfx_url"] = b2_urls["/content/sfx.wav"]
            if "/content/subtitle.srt" in b2_urls:
                result["subtitle_url"] = b2_urls["/content/subtitle.srt"]
            if "/content/generated_anchor.png" in b2_urls:
                result["image_url"] = b2_urls["/content/generated_anchor.png"]

        return result

    runpod.serverless.start({"handler": handler})
