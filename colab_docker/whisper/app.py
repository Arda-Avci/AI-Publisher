import os
import gc
import uuid
import torch
from flask import Flask, request, jsonify

app = Flask(__name__)

_whisper_model = None
_openai_whisper_model = None
_current_model_size = None

def flush_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()

def load_faster_whisper(model_size="small", compute_type="float16"):
    global _whisper_model, _current_model_size
    if _whisper_model is None or _current_model_size != model_size:
        from faster_whisper import WhisperModel
        print(f"[CONTAINER] Loading faster-whisper model ({model_size}, compute={compute_type})...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
        _current_model_size = model_size
    return _whisper_model

def load_openai_whisper(model_size="small"):
    global _openai_whisper_model
    if _openai_whisper_model is None:
        import whisper
        print(f"[CONTAINER] Loading OpenAI Whisper model ({model_size})...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _openai_whisper_model = whisper.load_model(model_size, device=device)
    return _openai_whisper_model

def transcribe_audio_internal(audio_path, language="tr", model_size="small", compute_type="float16", beam_size=5):
    # Try faster-whisper first
    try:
        model = load_faster_whisper(model_size, compute_type)
        segments, info = model.transcribe(
            audio_path,
            beam_size=beam_size,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
            language=language
        )
        
        result_segments = []
        full_text = []
        for seg in segments:
            word_list = []
            if hasattr(seg, 'words') and seg.words:
                for w in seg.words:
                    word_list.append({
                        "word": w.word,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "confidence": round(getattr(w, 'probability', 1.0), 3)
                    })
            result_segments.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "words": word_list if word_list else None
            })
            full_text.append(seg.text.strip())
            
        return {
            "status": "success",
            "text": " ".join(full_text),
            "segments": result_segments,
            "language": info.language
        }
    except Exception as fw_err:
        print(f"[CONTAINER] faster-whisper failed: {fw_err}, trying OpenAI Whisper fallback...")
        
    # Try OpenAI Whisper fallback
    try:
        model = load_openai_whisper(model_size)
        result = model.transcribe(audio_path, language=language)
        
        result_segments = []
        for seg in result.get("segments", []):
            result_segments.append({
                "start": round(seg.get("start", 0.0), 2),
                "end": round(seg.get("end", 0.0), 2),
                "text": seg.get("text", "").strip()
            })
            
        return {
            "status": "success",
            "text": result.get("text", "").strip(),
            "segments": result_segments,
            "language": result.get("language", language)
        }
    except Exception as ow_err:
        raise RuntimeError(f"Whisper transcription failed completely. Last error: {ow_err}")

@app.route("/transcribe", methods=["POST"])
def transcribe():
    language = request.form.get("language", "tr")
    model_size = request.form.get("model_size", "small")
    compute_type = request.form.get("compute_type", "float16" if torch.cuda.is_available() else "int8")
    beam_size = int(request.form.get("beam_size", 5))
    file_path = request.form.get("file_path", "")

    if request.is_json:
        data = request.get_json() or {}
        language = data.get("language", language)
        model_size = data.get("model_size", model_size)
        compute_type = data.get("compute_type", compute_type)
        beam_size = int(data.get("beam_size", beam_size))
        file_path = data.get("file_path", file_path)

    temp_file_path = None
    try:
        if "file" in request.files:
            uploaded_file = request.files["file"]
            ext = os.path.splitext(uploaded_file.filename)[1] or ".mp3"
            temp_file_path = f"/tmp/fw_temp_{uuid.uuid4()}{ext}"
            uploaded_file.save(temp_file_path)
            target_path = temp_file_path
        elif file_path:
            if not os.path.exists(file_path):
                return jsonify({"status": "error", "message": f"File not found: {file_path}"}), 404
            target_path = file_path
        else:
            return jsonify({"status": "error", "message": "file or file_path parameter is required"}), 400

        result = transcribe_audio_internal(
            target_path, 
            language=language, 
            model_size=model_size, 
            compute_type=compute_type, 
            beam_size=beam_size
        )

        # Build SRT content
        def _fmt(secs):
            h = int(secs // 3600)
            m = int((secs % 3600) // 60)
            s = int(secs % 60)
            ms = int((secs - int(secs)) * 1000)
            return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

        srt_lines = []
        for idx, seg in enumerate(result.get("segments", []), 1):
            srt_lines.append(str(idx))
            srt_lines.append(f"{_fmt(seg['start'])} --> {_fmt(seg['end'])}")
            srt_lines.append(seg['text'].strip())
            srt_lines.append("")

        result["srt"] = "\n".join(srt_lines)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try: os.unlink(temp_file_path)
            except: pass
        flush_memory()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
