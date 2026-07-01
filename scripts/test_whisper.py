"""Test Whisper with real audio from Kokoro. 5-min timeout."""
import modal, json, time, sys, traceback
TEST_TIMEOUT = 300

def test():
    # Step 1: generate audio with Kokoro
    f_kokoro = modal.Function.from_name("ai-publisher-kokoro", "generate")
    call1 = f_kokoro.spawn(text="Merhaba dünya, bugün hava çok güzel.", _return_file=True)
    r1 = call1.get(timeout=TEST_TIMEOUT)
    audio_b64 = r1.get("result", {}).get("_file_base64", "")
    if not audio_b64:
        print("FAIL: Kokoro no audio")
        return False
    
    print(f"Kokoro audio: {len(audio_b64)} chars")
    
    # Step 2: transcribe with Whisper
    f_whisper = modal.Function.from_name("ai-publisher-whisper", "generate")
    call2 = f_whisper.spawn(_file_base64=audio_b64, _file_ext=".wav", language="tr")
    r2 = call2.get(timeout=TEST_TIMEOUT)
    text = r2.get("result", {}).get("segments", [{}])[0].get("text", "")
    print(f"Whisper transcription: {text}")
    
    if "merhaba" in text.lower():
        print("PASS: Whisper correctly transcribed Turkish audio")
        return True
    print(f"FAIL: Unexpected transcription: {text}")
    return False

if __name__ == "__main__":
    t0 = time.time()
    try:
        ok = test()
        print(f"Total: {time.time()-t0:.0f}s {'✅ PASS' if ok else '❌ FAIL'}")
    except Exception as e:
        print(f"EXCEPTION: {e}")
        traceback.print_exc()
        sys.exit(1)
