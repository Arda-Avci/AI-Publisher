import { generateText } from 'ai'; // Vercel AI SDK Entegrasyonu
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ProjectTask {
  id: string;
  videoUrl: string;
  userLanguage: 'tr' | 'en';
  status: 'pending' | 'awaiting_approval' | 'processing' | 'success' | 'failed';
  videoDurationOption: 'same' | 'trim' | 'extend';
  titlePosition: 'top_left' | 'top_center' | 'top_right' | 'middle_left' | 'center' | 'middle_right' | 'bottom_left' | 'bottom_center' | 'bottom_right';
  userTitle?: string;
  customCoverImage?: string; 
  logoBase64?: string;
}

export class AdvancedVideoQueueManager {
  private colabNgrokUrl: string;

  constructor(colabNgrokUrl: string) {
    this.colabNgrokUrl = colabNgrokUrl;
  }

  /**
   * FAZ 2: OTONOM TRANSKRİPT FALLBACK ZİNCİRİ (VİDEOYU İNDİRMEDEN)
   */
  public async fetchTranscriptWithFallback(videoUrl: string): Promise<string> {
    // 1. ADIM: Lightweight Scraper (youtube-transcript)
    try {
      console.log("ℹ️ [TRANSCRIPT] 1. Adım: youtube-transcript baslatiliyor...");
      const { YoutubeTranscript } = require('youtube-transcript');
      const pieces = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: 'tr' });
      if (pieces && pieces.length > 0) {
        return pieces.map((p: any) => p.text).join(' ');
      }
      throw new Error("Scraper bos icerik dondu.");
    } catch (scraperError: any) {
      console.warn(`⚠️ [TRANSCRIPT] Scraper basarisiz: ${scraperError.message}. 2. Adım: Resmi YouTube API deneniyor...`);
      
      // 2. ADIM: Resmi YouTube Data API v3 (Captions) Fallback
      try {
        return await this.getResmiYouTubeCaption(videoUrl);
      } catch (apiError: any) {
        console.error(`🚨 [TRANSCRIPT] Resmi API kotasi bitti veya hata alindi: ${apiError.message}. Son Çare: Gemini 2.5 Flash Audio Transcribe...`);
        
        // 3. ADIM: Sadece ses stream edilip RAM Buffer uzerinden Gemini 2.5 Flash'a fırlatilir
        return await this.transcribeAudioWithGeminiFlash(videoUrl);
      }
    }
  }

  /**
   * FAZ 3: LLM ÖZGÜNLEŞTİRME, ÇEVİRİ VE SÜRE UZATMA/KISALTMA ZİNCİRİ
   */
  public async generateScenariosWithFallback(task: ProjectTask, targetLang: string): Promise<any> {
    const rawTranscript = await this.fetchTranscriptWithFallback(task.videoUrl);
    const cleanText = rawTranscript.replace(/\[.*?\]/g, '').trim();
    
    let durationInstruction = "Metnin orijinal suresini ve uzunlugunu kesinlikle koru.";
    if (task.videoDurationOption === 'trim') {
      durationInstruction = "Metni daha vurucu, kisa, ozet ve dinamik bir Shorts formuna getir (Sureyi kisalt, gereksiz yerleri buda).";
    } else if (task.videoDurationOption === 'extend') {
      durationInstruction = "Metne yeni dikkat cekici kancalar (hooks), dramatik detaylar ve viral alt hikayeler ekleyerek metni genislet (Sureyi otonom olarak uzat).";
    }

    const prompt = `
      GÖREV: Sana verilen ham transkript metnini viral dinamiklerini (Hook, Body, CTA) koruyarak tamamen ÖZGÜNLEŞTİR (intihal filtrelerini kir).
      SÜRE AYARI: ${durationInstruction}
      DİL AYARI: Ozgunlestirdigin bu yeni metni, kulturel kalip ve deyimlerine dikkat ederek puruzsuz bir sekilde '${targetLang}' diline yerellestirere ÇEVİR.
      SAHNELEME: Son ciktida metni ardisik 6 saniyelik mantiksal parcalara bol.
      
      Ham Transkript: "${cleanText}"
      
      KESİNLİKLE su JSON formatinda cikti ver:
      {
        "userTitle": "Uretilen Viral Baslik",
        "scenes": [
          { "index": 1, "text": "6 saniyelik hedef dildeki konusma metni", "visualPrompt": "Pixar tarzinda sahne gorsel tanimi" }
        ]
      }
    `;

    // 1. TERCİH: Zen Free LLM Modelleri
    try {
      return await this.callLLM('zen-free', prompt);
    } catch (e: any) {
      console.warn(`⚠️ [LLM] Zen Free limiti asildi veya hata verdi: ${e.message}. 2. Tercih (MiniMax-M3) devreye giriyor...`);
      
      // 2. TERCİH (SİGORTA): MiniMax-M3 (Token planli guvenli liman, hata donmez)
      try {
        return await this.callLLM('minimax-m3', prompt);
      } catch (m3Error: any) {
        console.error(`🚨 [LLM] MiniMax-M3 tarafında hata/gecikme olustu: ${m3Error.message}. Son Kale (Gemini 2.5 Flash) cagriliyor...`);
        
        // 3. TERCİH (SON KALE): Gemini 2.5 Flash
        return await this.callLLM('gemini-2.5-flash', prompt);
      }
    }
  }

  /**
   * FAZ 4: MİKRO-PARÇA (278 / 542) VE KARE SÜREKLİLİK MOTORU (COLAB İLETİŞİMİ)
   */
  public async runColabRenderLoop(projectId: string, scenes: any[]) {
    let lastFrameBase64: string | null = null;
    const totalChunks = scenes.length;

    console.log(`🚀 [RENDER] Mikro-Parca Render Dongusu basladi. Toplam Parca Sayisi: ${totalChunks}`);

    for (let i = 0; i < totalChunks; i++) {
      const currentChunkIndex = i + 1;
      
      // Next.js SSE Canli Ilerleme Cubuguna tam sayac bilgisi basiliyor (278 / 542 gibi)
      this.emitSSEProgress(projectId, {
        stage: 'COGVIDEO_RENDERING',
        stagePercent: Math.round((currentChunkIndex / totalChunks) * 100),
        counter: `${currentChunkIndex} / ${totalChunks}`,
        sceneText: scenes[i].text
      });

      const payload = {
        scene: scenes[i],
        init_image: lastFrameBase64, // Akilli sahne surekliligi kilit karesi
        chunk_info: `${currentChunkIndex}/${totalChunks}`,
        callback_url: process.env.PUBLIC_URL 
          ? `${process.env.PUBLIC_URL}/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}` 
          : `http://localhost:3010/api/v1/video/callback?token=${process.env.CALLBACK_TOKEN || 'local_callback_secure_token_2026'}`
      };

      try {
        const renderResult = await this.postToColabNgrok(payload); 
        lastFrameBase64 = await this.extractLastFrameAsBase64(renderResult.videoPath);
      } catch (renderError: any) {
        console.error(`🚨 [RENDER] Parca ${currentChunkIndex} uretilirken kritik hata: ${renderError.message}`);
        throw renderError;
      }
    }
    console.log("✅ [RENDER] Tum mikro parcalar basariyla tamamlandi.");
  }

  private async callLLM(provider: string, prompt: string): Promise<any> {
    console.log(`[LLM CALL] Provider: ${provider}`);
    return {
      userTitle: "Harika Bir Otonom Video Basligi",
      scenes: [{ index: 1, text: "Merhaba Dunya", visualPrompt: "A cute Pixar style robot" }]
    };
  }

  private async getResmiYouTubeCaption(url: string): Promise<string> {
    return "Resmi YouTube API uzerinden cekilen ham altyazi metni.";
  }

  private async transcribeAudioWithGeminiFlash(url: string): Promise<string> {
    return "Gemini 2.5 Flash ile sesten donusturulen otonom transkript metni.";
  }

  private emitSSEProgress(id: string, data: any) {
    console.log(`📡 [SSE PUSH] Project: ${id} -> Status: ${JSON.stringify(data)}`);
  }

  private async postToColabNgrok(payload: any): Promise<{ videoPath: string }> {
    return { videoPath: path.join(__dirname, 'temp_chunk.mp4') };
  }

  private extractLastFrameAsBase64(videoPath: string): Promise<string> {
    return new Promise((resolve) => {
      resolve("data:image/jpeg;base64,...extracted_frame_data...");
    });
  }
}
