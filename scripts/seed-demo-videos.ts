import { initDatabase, db } from '../src/db.js';
import fs from 'fs-extra';
import path from 'path';
import { encryptUsername } from '../src/lib/crypto.js';

const demoScenarios = [
  {
    title: "AI-Publisher SaaS Platform Tanıtım Videosu",
    desc: "Yapay zeka ile saniyeler içinde sosyal medya videoları üreten SaaS platformunun genel yetenekleri.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Pixar Estetiğinde Güzellik ve Bakım Tanıtımı",
    desc: "Pürüzsüz Pixar animasyon stiliyle kozmetik ürünlerinin dudak senkronizasyonlu anlatımı.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel"
  },
  {
    title: "Haftalık Borsa ve Finans Analiz Bülteni",
    desc: "Borsa verileri ve yapay zeka analizleriyle haftalık finansal piyasa değerlendirmesi.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "İstanbul Boğazı Gezi Vlogu",
    desc: "@me ve @sibel karakterlerinin İstanbul Boğazı kenarında gezi deneyimi sohbeti.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel"
  },
  {
    title: "Premium Kutu Açılımı (Unboxing) Deneyimi",
    desc: "E-ticaret ürünlerinin 3D stüdyo ortamında ses efektleri ve müzikle kutu açılım bülteni.",
    template: "simple",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Yapay Zeka Destekli Siber Savunma Analizi",
    desc: "Geleceğin siber güvenlik teknolojileri ve sibernetik robot laboratuvarı tanıtımı.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Motivasyonel Fitness ve Sağlıklı Yaşam",
    desc: "Modern spor salonunda motive edici konuşma ve dumble egzersiz animasyonları.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Pixar Tarzı Çikolatalı Pasta Tarifi",
    desc: "Pixar mutfağında sevimli şef @sibel ile lezzetli pasta tarifi vlogu.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel"
  },
  {
    title: "Yapay Zekanın Geleceği Kitap İncelemesi",
    desc: "Kütüphane stüdyosunda en son çıkan yapay zeka ve felsefe kitaplarının eleştirisi.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Elektrikli Gelecek: Yeni Nesil Spor Otomobil İncelemesi",
    desc: "Geleceğin elektrikli spor arabalarının sürüş dinamikleri ve otonom teknolojileri.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "3D Avatar Sanal Moda Haftası",
    desc: "Pixar estetiğinde mankenlerin neon yeşil kıyafetleriyle podyumda sanal yürüyüşü.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel"
  },
  {
    title: "Timeline Müzik Miksajıyla Akustik Gitar Dersi",
    desc: "Gitar solo tekniklerini arka plan müziği seviyesi entegrasyonuyla anlatan ders.",
    template: "simple",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "AI Agent'lar ile Kodlamanın Geleceği",
    desc: "Yapay zeka yazılım mühendislerinin sektörü nasıl dönüştürdüğüne dair analiz.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Sanal Emlak: Lüks Villa Tanıtımı",
    desc: "Lüks bir villanın bahçesinde ve havuz başında detaylı gayrimenkul vlogu.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel"
  },
  {
    title: "Pixar Tarzı Dijital Sanat ve Karakter Tasarımı",
    desc: "Grafik tablet yardımıyla dijital illüstrasyon çizen sanatçı kızın hikayesi.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel"
  },
  {
    title: "Yapay Zeka Destekli Evcil Hayvan Bakım İpuçları",
    desc: "Evcil hayvanların beslenmesi ve eğitimi için modern veterinerlik rehberi.",
    template: "simple",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Hayallerinin Peşinden Koşmak",
    desc: "Radyo stüdyosunda mikrofon başında hayaller ve hedefler temalı motivasyon podcasti.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Gladyatörler ve Roma İmparatorluğu Tarihi",
    desc: "Antik Roma stüdyosunda tarihi zırhlar eşliğinde antik dönem analizi.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Web3 ve Kripto Dünyasının Geleceği",
    desc: "NFT ve blockchain teknolojilerinin gelecekteki kullanım senaryoları.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  },
  {
    title: "Mars Kolonisi ve Gezegenler Arası Yolculuk",
    desc: "Kızıl gezegende kurulacak ilk insan kolonisi ve uzay gemisi teknolojileri.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me"
  }
];

async function seed() {
  console.log('[INFO] Veritabanı başlatılıyor...');
  await initDatabase();

  // 1. Yönetici kullanıcısını bulalım
  const defaultUsername = encryptUsername('arda.avci@gmail.com');
  let user = await db.get('SELECT * FROM users WHERE username = ?', [defaultUsername]);
  if (!user) {
    console.log('[WARN] arda.avci@gmail.com kullanıcısı bulunamadı, oluşturuluyor...');
    await db.run('INSERT INTO users (username, password, credits) VALUES (?, ?, ?)', [defaultUsername, 'adminpass', 10000]);
    user = await db.get('SELECT * FROM users WHERE username = ?', [defaultUsername]);
  } else {
    // Krediyi 10,000 yapalım
    await db.run('UPDATE users SET credits = 10000 WHERE id = ?', [user.id]);
    console.log(`[OK] Kullanıcı kredisi 10000 olarak güncellendi: ID=${user.id}`);
  }

  // 2. demo_base.mp4 kontrolü
  const baseVideoPath = path.join(process.cwd(), 'videolar', 'demo_base.mp4');
  if (!await fs.pathExists(baseVideoPath)) {
    console.error('[ERROR] demo_base.mp4 bulunamadı! Lütfen önce indirildiğinden emin olun.');
    process.exit(1);
  }

  console.log('[INFO] Demo videolar kopyalanıyor ve veritabanı kayıtları oluşturuluyor...');
  
  // 3. Demo videoları tohumla
  for (let i = 0; i < demoScenarios.length; i++) {
    const scenario = demoScenarios[i];
    const index = i + 1;
    const finalFilename = `demo_video_${index}.mp4`;
    const destVideoPath = path.join(process.cwd(), 'videolar', finalFilename);

    // Dosyayı kopyala
    await fs.copy(baseVideoPath, destVideoPath, { overwrite: true });

    // video_jobs kaydı oluştur
    const jobRes = await db.run(
      `INSERT INTO video_jobs (
        user_id, master_prompt, production_notes, character_features, status, 
        current_stage, progress_percent, final_filename, total_scenes, completed_scenes,
        production_template, background_music_path, tts_provider
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        scenario.title,
        scenario.desc,
        `Avatar prompt of ${scenario.speaker}`,
        'completed',
        'Tamamlandı',
        100,
        finalFilename,
        1,
        1,
        scenario.template,
        scenario.music,
        'xtts'
      ]
    );

    const jobId = jobRes.lastID;

    // video_scenes kaydı oluştur
    await db.run(
      `INSERT INTO video_scenes (
        job_id, scene_number, video_prompt, speech_text, sfx_prompt, 
        camera_motion, status, sort_order, music_volume, speaker
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        1,
        `${scenario.speaker} presenting: ${scenario.title}`,
        scenario.desc,
        'sfx_effect',
        'breathing',
        'completed',
        1,
        0.15,
        scenario.speaker
      ]
    );

    console.log(`[OK] Demo Job #${jobId} oluşturuldu: ${scenario.title}`);
  }

  console.log('\n[SUCCESS] Tüm demo videoları ve kayıtları başarıyla tohumlandı!');
  process.exit(0);
}

seed().catch(err => {
  console.error('[ERROR] Tohumlama başarısız:', err);
  process.exit(1);
});
