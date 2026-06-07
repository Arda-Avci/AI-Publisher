import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';

const execFileAsync = util.promisify(execFile);

/**
 * Fallback AI Transcriber
 * Extracts a 16kHz mono mp3 from the given video file using FFmpeg,
 * then uploads it directly to Gemini 2.5 Flash API using inlineData 
 * to extract the raw transcript.
 */
export async function transcribeVideoAudio(videoPath: string): Promise<string> {
  const audioPath = videoPath.replace(/\.[^/.]+$/, "") + `_${Date.now()}.mp3`;
  
  try {
    // 1. Extract audio: 16kHz, mono, 32k bitrate (sufficient for speech-to-text, keeps size small)
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
    
    // 2. Read as base64
    const audioData = fs.readFileSync(audioPath).toString('base64');
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set for fallback transcription.');
    }

    const payload = {
      contents: [{
        parts: [
          { text: 'Sen profesyonel bir transkripsiyon uzmanısın. Lütfen bu sesteki konuşmaları deşifre et ve sadece düz metin (paragraflar) halinde ver. Herhangi bir ekstra yorum yapma.' },
          { inlineData: { mimeType: 'audio/mp3', data: audioData } }
        ]
      }]
    };

    // 3. Request Gemini API (v1beta for inline audio support)
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errData}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('No transcript returned from Gemini.');
    }
    
    return text.trim();
  } finally {
    // Cleanup temporary MP3 file
    if (fs.existsSync(audioPath)) {
      try { fs.unlinkSync(audioPath); } catch(e) {}
    }
  }
}
