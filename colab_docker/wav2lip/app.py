import os
import sys
import gc
import cv2
import numpy as np
import base64
import face_recognition
import torch
from flask import Flask, request, jsonify

# Add Wav2Lip to sys.path
WAV2LIP_DIR = "/app/Wav2Lip"
if WAV2LIP_DIR not in sys.path:
    sys.path.insert(0, WAV2LIP_DIR)

app = Flask(__name__)

WAV2LIP_MODEL = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def load_wav2lip():
    global WAV2LIP_MODEL
    if WAV2LIP_MODEL is not None:
        return WAV2LIP_MODEL if WAV2LIP_MODEL else None

    try:
        from Wav2Lip.inference import load_model as _w2l_load_model
        # Check checkpoints directory in mounted /content or local /app
        ckpt_path = "/content/Wav2Lip/checkpoints/wav2lip.pth"
        if not os.path.exists(ckpt_path):
            ckpt_path = "/app/Wav2Lip/checkpoints/wav2lip.pth"
            
        if not os.path.exists(ckpt_path):
            print(f"[CONTAINER] Wav2Lip checkpoint not found at {ckpt_path}")
            WAV2LIP_MODEL = False
            return None

        print("[CONTAINER] Loading Wav2Lip model...")
        WAV2LIP_MODEL = _w2l_load_model(ckpt_path)
        print("[CONTAINER] Wav2Lip model loaded successfully.")
        return WAV2LIP_MODEL
    except Exception as e:
        print(f"[CONTAINER] Wav2Lip load failed: {e}")
        WAV2LIP_MODEL = False
        return None

def load_image_from_base64(b64_str):
    if not b64_str:
        return None
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]
    img_bytes = base64.b64decode(b64_str)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def make_custom_face_detect(ref_encoding=None):
    def custom_face_detect(images):
        pady1, pady2, padx1, padx2 = [0, 10, 0, 0]
        results = []
        
        for idx, img in enumerate(images):
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_img)
            
            if len(face_locations) == 0:
                h, w, _ = img.shape
                results.append([0, 0, w, h])
                continue
                
            best_rect = face_locations[0]
            if ref_encoding is not None and len(face_locations) > 1:
                face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
                min_dist = 999.0
                for f_idx, enc in enumerate(face_encodings):
                    dist = face_recognition.face_distance([ref_encoding], enc)[0]
                    if dist < min_dist:
                        min_dist = dist
                        best_rect = face_locations[f_idx]
            
            top, right, bottom, left = best_rect
            y1 = max(0, top - pady1)
            y2 = min(img.shape[0], bottom + pady2)
            x1 = max(0, left - padx1)
            x2 = min(img.shape[1], right + padx2)
            
            results.append([x1, y1, x2, y2])
            
        boxes = np.array(results)
        final_results = [[images[i][y1:y2, x1:x2], (y1, y2, x1, x2)] for i, (x1, y1, x2, y2) in enumerate(boxes)]
        return final_results
        
    return custom_face_detect

@app.route("/apply-lipsync", methods=["POST"])
def apply_lipsync():
    data = request.get_json(force=True) or {}
    video_path = data.get("video_path")
    audio_path = data.get("audio_path")
    speaker = data.get("speaker")
    character_images = data.get("character_images") # dict of speaker -> base64 img

    if not video_path or not audio_path:
        return jsonify({"error": "video_path and audio_path are required"}), 400

    if not os.path.exists(video_path):
        return jsonify({"error": f"Video path not found: {video_path}"}), 404
    if not os.path.exists(audio_path):
        return jsonify({"error": f"Audio path not found: {audio_path}"}), 404

    model = load_wav2lip()
    if not model:
        return jsonify({"success": False, "skipped": True, "error": "Wav2Lip model load failed"}), 500

    ref_encoding = None
    if speaker and character_images and speaker in character_images:
        try:
            ref_img = load_image_from_base64(character_images[speaker])
            if ref_img is not None:
                rgb_ref = cv2.cvtColor(ref_img, cv2.COLOR_BGR2RGB)
                ref_encs = face_recognition.face_encodings(rgb_ref)
                if len(ref_encs) > 0:
                    ref_encoding = ref_encs[0]
                    print(f"[CONTAINER] Speaker '{speaker}' encoding extracted.")
        except Exception as ex:
            print(f"[CONTAINER] Failed extracting reference face: {ex}")

    output_path = video_path.replace('.mp4', '_lipsync.mp4')
    try:
        from Wav2Lip import inference as _w2l_inference
        
        # Override face detect with custom face recognition logic
        _w2l_inference.face_detect = make_custom_face_detect(ref_encoding)
        
        _w2l_inference.inference(
            model,
            face=video_path,
            audio=audio_path,
            outfile=output_path,
            static=False,
            fps=8.0,
            pads=[0, 10, 0, 0],
            face_det_batch_size=4,
            wav2lip_batch_size=4,
            resize_factor=1,
            crop=[0, -1, 0, -1],
            box=[-1, -1, -1, -1],
            rotate=False,
            nosmooth=True
        )
        flush_memory()
        return jsonify({
            "success": True, 
            "output_path": output_path, 
            "original_path": video_path
        }), 200
    except Exception as e:
        flush_memory()
        print(f"[CONTAINER] Wav2Lip inference failed: {e}")
        return jsonify({
            "success": False, 
            "skipped": True, 
            "error": str(e), 
            "original_path": video_path
        }), 200 # Return 200 so supervisor can fall back to original video

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
