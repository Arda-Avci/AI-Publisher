import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child_process';
import { db } from './db.js';

export const clients = new Map<number, any>();
let isProcessing = false;

const StudioSchema = z.object({
  scenes: z.array(z.object({
    sceneNumber: z.number(),
    videoPrompt: z.string(),
    speechText: z.string(),
    sfxPrompt: z.string()
  })),
  marketing: z.object({
    ytTitle: z.string(),
    ytDesc: z.string(),
    ytTags: z.string(),
    ttDesc: z.string(),
    ttTags: z.string(),
    xDesc: z.string(),
    xTags: z.string(),
    metaDesc: z.string(),
    metaTags: z.string()
  })
});

function broadcast(jobId: number, data: object) {
  const res = clients.get(jobId);
  if (res) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

export async function checkQueue() {
  if (isProcessing) return;
  const nextJob = await db.get("SELECT * FROM video_jobs WHERE status = 'pending' ORDER BY id ASC");
  if (!nextJob) return;

  isProcessing = true;
  await startProduction(nextJob);
  isProcessing = false;
  // Sonraki işleri kontrol etmeye devam et
  setImmediate(checkQueue);
}

async function startProduction(job: any) {
  const COLAB_URL = process.env.COLAB_URL;
  const finalScenes: string[] = [];

  try {
    console.log(`[INFO] İş başladı: ID=${job.id}`);
    await db.run("UPDATE video_jobs SET status = 'processing', current_stage = 'Yönetmen Planlaması', progress_percent = 5 WHERE id = ?", [job.id]);
    broadcast(job.id, { stage: 'Yönetmen Planlaması', percent: 5 });

    // AI ile master promptu bölüp SEO verilerini üretelim
    // Arda Avcı 2026 kurallarına uyulmasını prompt ile garanti ediyoruz
    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      schema: StudioSchema,
      prompt: `Sen profesyonel bir film yönetmeni ve sosyal medya pazarlama uzmanısın.
Görevlerin:
1. Hikayeyi analiz et ve ardışık 6 saniyelik sahnelere böl.
2. Karakter tasviri ve üretim notlarını dikkate alarak her sahne için detaylı görsel prompt (videoPrompt), konuşma metni (speechText) ve ses efekti (sfxPrompt) tasarla.
3. Arda Avcı 2026 SEO ve İçerik Standartlarına uygun pazarlama metinleri tasarla.
   - YouTube Başlık Formatı: '2026: [Vurucu İfade] | [Ana Başlık]' olmalıdır.
   - İçerik yılı olarak daima 2026 referans alınmalı.
   - İlk 2 cümlede konunun teknik terimleri geçmelidir.
   - CTA: İzleyiciyi tartışmaya ve yorum yapmaya iten gizemli sorular içersin.
   - TikTok, X ve Meta için de viral kancalar ve hashtag'ler oluştur.

Giriş Verileri:
Master Prompt: ${job.master_prompt}
Üretim Notları: ${job.production_notes}
Karakter Özellikleri: ${job.character_features}
`
    });

    const totalScenes = object.scenes.length;
    const estMin = totalScenes * 4.5; // Sahne başına ortalama 4.5 dk render

    await db.run(
      `UPDATE video_jobs SET 
        total_scenes = ?, 
        estimated_minutes = ?, 
        yt_title = ?, 
        yt_desc = ?, 
        yt_tags = ?, 
        tt_desc = ?, 
        tt_tags = ?,
        x_desc = ?,
        x_tags = ?,
        meta_desc = ?,
        meta_tags = ?
      WHERE id = ?`,
      [
        totalScenes, 
        estMin, 
        object.marketing.ytTitle, 
        object.marketing.ytDesc, 
        object.marketing.ytTags, 
        object.marketing.ttDesc, 
        object.marketing.ttTags,
        object.marketing.xDesc,
        object.marketing.xTags,
        object.marketing.metaDesc,
        object.marketing.metaTags,
        job.id
      ]
    );

    broadcast(job.id, { 
      stage: 'Sahneler Hazırlanıyor', 
      percent: 10,
      totalScenes, 
      estimatedMinutes: estMin,
      ytTitle: object.marketing.ytTitle,
      ytDesc: object.marketing.ytDesc,
      ytTags: object.marketing.ytTags,
      ttDesc: object.marketing.ttDesc,
      ttTags: object.marketing.ttTags,
      xDesc: object.marketing.xDesc,
      xTags: object.marketing.xTags,
      metaDesc: object.marketing.metaDesc,
      metaTags: object.marketing.metaTags
    });

    for (const scene of object.scenes) {
      const pct = Math.floor((scene.sceneNumber / totalScenes) * 80) + 10;
      await db.run("UPDATE video_jobs SET current_stage = ?, progress_percent = ? WHERE id = ?", [`Sahne ${scene.sceneNumber} İşleniyor`, pct, job.id]);
      broadcast(job.id, { stage: `Sahne ${scene.sceneNumber} Üretiliyor`, percent: pct, completedScenes: scene.sceneNumber - 1 });

      console.log(`[INFO] Colab'a sahne ${scene.sceneNumber} gönderiliyor...`);
      // Colab'a generate isteği at
      await axios.post(`${COLAB_URL}/generate-media`, {
        scene_number: scene.sceneNumber,
        video_prompt: scene.videoPrompt,
        speech_text: scene.speechText,
        sfx_prompt: scene.sfxPrompt,
        character_features: job.character_features,
        user_image_path: job.material_path
      }, { timeout: 0 });

      // Dosyaları bilgisayara indir
      const tV = path.join(process.cwd(), 'videolar', `tv_${job.id}_${scene.sceneNumber}.mp4`);
      const tS = path.join(process.cwd(), 'videolar', `ts_${job.id}_${scene.sceneNumber}.wav`);
      const tE = path.join(process.cwd(), 'videolar', `te_${job.id}_${scene.sceneNumber}.wav`);
      const mS = path.join(process.cwd(), 'videolar', `ms_${job.id}_${scene.sceneNumber}.mp4`);

      const dl = async (url: string, dest: string) => {
        const res = await axios({ method: 'GET', url, responseType: 'stream' });
        const w = fs.createWriteStream(dest);
        res.data.pipe(w);
        return new Promise((resolve, reject) => {
          w.on('finish', resolve);
          w.on('error', reject);
        });
      };

      await dl(`${COLAB_URL}/download/video`, tV);
      await dl(`${COLAB_URL}/download/speech`, tS);
      await dl(`${COLAB_URL}/download/sfx`, tE);

      // FFmpeg ile miksleme ve Sarı/Neon Cyan renkli altyazı gömme
      await new Promise<void>((resolve, reject) => {
        const srt = path.join(process.cwd(), 'videolar', `s_${job.id}.srt`);
        
        if (scene.speechText) {
          // SRT formatına dönüştür (6 saniye için)
          fs.writeFileSync(srt, `1\n00:00:00,000 --> 00:00:05,800\n${scene.speechText}`);
        }

        // Altyazı gömme filtresi (Neon Cyan #00FFFF vurguları & Sarı renk stili)
        const vf = scene.speechText 
          ? `-vf "subtitles=${srt.replace(/\\/g, '/')}:force_style='Alignment=2,FontSize=18,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,Outline=1'" ` 
          : '';

        // Sesleri miksle (konuşma ve sfx) ve videoyla birleştir
        const cmd = `ffmpeg -y -i "${tV}" -i "${tS}" -i "${tE}" ${vf}-filter_complex "[1:a][2:a]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:a aac -shortest "${mS}"`;
        
        exec(cmd, (err) => {
          if (fs.existsSync(srt)) fs.removeSync(srt);
          if (err) {
            console.error(`[ERROR] FFmpeg sahne miks hatası:`, err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Geçici ham dosyaları sil
      await fs.remove(tV);
      await fs.remove(tS);
      await fs.remove(tE);

      finalScenes.push(mS);
      await db.run("UPDATE video_jobs SET completed_scenes = ? WHERE id = ?", [scene.sceneNumber, job.id]);
    }

    // Sahneleri concat (uç uca birleştirme) ile tek parçaya çevir
    await db.run("UPDATE video_jobs SET current_stage = 'Final Montaj', progress_percent = 95 WHERE id = ?", [job.id]);
    broadcast(job.id, { stage: 'Final Montaj', percent: 95 });

    const fName = `film_${job.id}_${Date.now()}.mp4`;
    const fPath = path.join(process.cwd(), 'videolar', fName);
    const txt = path.join(process.cwd(), 'videolar', `l_${job.id}.txt`);
    
    fs.writeFileSync(txt, finalScenes.map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`).join('\n'));

    await new Promise<void>((resolve, reject) => {
      exec(`ffmpeg -y -f concat -safe 0 -i "${txt}" -c copy "${fPath}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Temizlik
    fs.removeSync(txt);
    for (const f of finalScenes) {
      fs.removeSync(f);
    }

    await db.run(
      "UPDATE video_jobs SET status = 'completed', current_stage = 'Tamamlandı', progress_percent = 100, final_filename = ? WHERE id = ?", 
      [fName, job.id]
    );
    broadcast(job.id, { stage: 'Tamamlandı', percent: 100, finalFilename: fName });
    console.log(`[INFO] İş başarıyla tamamlandı: ID=${job.id}`);

  } catch (error) {
    console.error(`[ERROR] İş sırasında kritik hata (ID=${job.id}):`, error);
    await db.run("UPDATE video_jobs SET status = 'failed', current_stage = 'Hata Oluştu' WHERE id = ?", [job.id]);
    broadcast(job.id, { stage: 'Hata Oluştu', percent: 0 });
  }
}
