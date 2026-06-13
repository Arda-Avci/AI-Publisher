import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = util.promisify(execFile);

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
}

/**
 * Zaman damgalı deşifre motoru.
 * Öncelikli olarak Google Colab sunucusundaki /transcribe endpoint'ini kullanır (faster-whisper & whisper fallback).
 * Colab kapalı ise Gemini 2.5 Flash structured JSON fallback altyapısını tetikler.
 */
export async function transcribeVideoAudioWithTimestamps(
  videoPath: string,
  language = 'tr'
): Promise<TranscriptionResult> {
  const audioPath = videoPath.replace(/\.[^/.]+$/, "") + `_transcribe_${Date.now()}.mp3`;

  try {
    // 1. MP3 olarak sesi çıkar (16kHz, mono, 32k)
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', videoPath,
      '-vn',
      '-acodec', 'libmp3lame',
      '-ar', '16000',
      '-ac', '1',
      '-b:a', '32k',
      audioPath
    ]);

    // 2. Colab sunucusunu çağır (eklenti tanımlıysa)
    const colabUrl = process.env.COLAB_URL;
    if (colabUrl && colabUrl !== 'https://ngrok-free.app') {
      try {
        console.log(`[INFO] Colab üzerinden deşifre başlatılıyor: ${colabUrl}/transcribe`);
        const fileBuffer = fs.readFileSync(audioPath);
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'audio/mp3' });
        formData.append('file', blob, path.basename(audioPath));
        formData.append('language', language);
        formData.append('model_size', 'small');

        const response = await fetch(`${colabUrl}/transcribe`, {
          method: 'POST',
          body: formData,
          headers: {
            'ngrok-skip-browser-warning': 'any-value',
            'bypass-tunnel-reminder': 'true'
          }
        });

        if (response.ok) {
          const resData = await response.json() as any;
          if (resData && resData.status === 'success') {
            console.log(`[INFO] Colab deşifresi başarıyla tamamlandı. Segment sayısı: ${resData.segments?.length}`);
            return {
              text: resData.text,
              segments: resData.segments || [],
              language: resData.language || language
            };
          }
        } else {
          console.warn(`[WARN] Colab deşifre API yanıtı başarısız: ${response.status}`);
        }
      } catch (colabErr: any) {
        console.warn(`[WARN] Colab deşifre çağrısı başarısız oldu, Gemini fallback'e geçiliyor: ${colabErr.message}`);
      }
    }

    // 3. GEMINI 2.5 FLASH FALLBACK (Structured JSON)
    console.log(`[INFO] Gemini 2.5 Flash fallback deşifresi başlatılıyor...`);
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY bulunamadı, fallback deşifre gerçekleştirilemez.');
    }

    const audioData = fs.readFileSync(audioPath).toString('base64');
    const payload = {
      contents: [{
        parts: [
          { text: 'Ses dosyasındaki konuşmaları deşifre et ve kelime/cümle bazlı zaman damgalarıyla (başlangıç/bitiş saniyeleri) birlikte JSON şemasına uygun biçimde dön.' },
          { inlineData: { mimeType: 'audio/mp3', data: audioData } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            segments: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  start: { type: "NUMBER" },
                  end: { type: "NUMBER" },
                  text: { type: "STRING" }
                },
                required: ["start", "end", "text"]
              }
            },
            language: { type: "STRING" }
          },
          required: ["text", "segments"]
        }
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Fallback deşifre hatası: ${response.status} - ${errText}`);
    }

    const resJson = await response.json() as any;
    const jsonStr = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonStr) {
      throw new Error('Gemini fallback deşifre sonucundan boş veri döndü.');
    }

    const parsedResult = JSON.parse(jsonStr.trim()) as TranscriptionResult;
    console.log(`[INFO] Gemini fallback deşifresi tamamlandı. Metin uzunluğu: ${parsedResult.text?.length}, Segment: ${parsedResult.segments?.length}`);
    return parsedResult;

  } finally {
    if (fs.existsSync(audioPath)) {
      try { fs.unlinkSync(audioPath); } catch (e) {}
    }
  }
}

/**
 * Geriye dönük uyumluluk için düz metin deşifre fonksiyonu
 */
export async function transcribeVideoAudio(videoPath: string): Promise<string> {
  const result = await transcribeVideoAudioWithTimestamps(videoPath);
  return result.text;
}
