import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { Logger } from './logger.js';
import { dockerHost } from './docker-host.js';

const execFileAsync = util.promisify(execFile);

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
}

/**
 * Zaman damgalı deşifre motoru.
 * Öncelikli olarak Docker Whisper servisindeki /transcribe endpoint'ini kullanır.
 * Docker kapalı ise Gemini 2.5 Flash structured JSON fallback altyapısını tetikler.
 */
export async function transcribeVideoAudioWithTimestamps(
  videoPath: string,
  language = 'tr',
): Promise<TranscriptionResult> {
  const audioPath = videoPath.replace(/\.[^/.]+$/, '') + `_transcribe_${Date.now()}.mp3`;

  try {
    // 1. MP3 olarak sesi çıkar (16kHz, mono, 32k)
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      videoPath,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-b:a',
      '32k',
      audioPath,
    ]);

    // 2. Docker Whisper servisini çağır
    const transcribeUrl = dockerHost.getUrl('whisper');
    try {
      Logger.info(`Docker Whisper üzerinden deşifre başlatılıyor: ${transcribeUrl}/transcribe`);
      const fileBuffer = fs.readFileSync(audioPath);
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'audio/mp3' });
      formData.append('file', blob, path.basename(audioPath));
      formData.append('language', language);
      formData.append('model_size', 'small');

      const response = await fetch(`${transcribeUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const resData = (await response.json()) as any;
        if (resData && resData.status === 'success') {
          Logger.info(
            `Docker Whisper deşifresi başarıyla tamamlandı. Segment sayısı: ${resData.segments?.length}`,
          );
          const segments = (resData.segments || []).map((s: any) => ({
            start: s.start,
            end: s.end,
            text: s.text,
            words: s.words || undefined,
          }));
          return {
            text: resData.text,
            segments,
            language: resData.language || language,
          };
        }
      } else {
        Logger.warn(`Docker Whisper API yanıtı başarısız: ${response.status}`);
      }
    } catch (whisperErr: any) {
      Logger.warn(
        `Docker Whisper çağrısı başarısız oldu, Gemini fallback'e geçiliyor: ${whisperErr.message}`,
      );
    }

    // 3. GEMINI 2.5 FLASH FALLBACK (Structured JSON)
    Logger.info(`Gemini 2.5 Flash fallback deşifresi başlatılıyor...`);
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GOOGLE_GENERATIVE_AI_API_KEY bulunamadı, fallback deşifre gerçekleştirilemez.',
      );
    }

    const audioData = fs.readFileSync(audioPath).toString('base64');
    const payload = {
      contents: [
        {
          parts: [
            {
              text: 'Ses dosyasındaki konuşmaları deşifre et ve kelime/cümle bazlı zaman damgalarıyla (başlangıç/bitiş saniyeleri) birlikte JSON şemasına uygun biçimde dön.',
            },
            { inlineData: { mimeType: 'audio/mp3', data: audioData } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING' },
            segments: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  start: { type: 'NUMBER' },
                  end: { type: 'NUMBER' },
                  text: { type: 'STRING' },
                  words: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        word: { type: 'STRING' },
                        start: { type: 'NUMBER' },
                        end: { type: 'NUMBER' },
                        confidence: { type: 'NUMBER' },
                      },
                      required: ['word', 'start', 'end'],
                    },
                  },
                },
                required: ['start', 'end', 'text'],
              },
            },
            language: { type: 'STRING' },
          },
          required: ['text', 'segments'],
        },
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Fallback deşifre hatası: ${response.status} - ${errText}`);
    }

    const resJson = (await response.json()) as any;
    const jsonStr = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonStr) {
      throw new Error('Gemini fallback deşifre sonucundan boş veri döndü.');
    }

    const parsedResult = JSON.parse(jsonStr.trim()) as TranscriptionResult;
    Logger.info(
      `Gemini fallback deşifresi tamamlandı. Metin uzunluğu: ${parsedResult.text?.length}, Segment: ${parsedResult.segments?.length}`,
    );
    return parsedResult;
  } finally {
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
      } catch (e) {}
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
