import { initDatabase, db } from '../src/db.js';
import fs from 'fs-extra';
import path from 'path';
import { encryptUsername } from '../src/lib/crypto.js';
import { exec } from 'child_process';

// 10 saniye ile 1 dakika arasında (sahne başına 6 saniyeden 2-10 sahne) değişen 20 senaryo
const demoScenarios = [
  {
    title: "AI-Publisher SaaS Platform Tanıtım Videosu",
    desc: "Yapay zeka ile saniyeler içinde sosyal medya videoları üreten SaaS platformunun genel yetenekleri.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Yapay zeka ile sosyal medya videoları üretmek hiç bu kadar kolay olmamıştı.", sfx: "synth_wave", motion: "zoom_in" },
      { speech: "AI Publisher, tek bir master prompt ile dakikalar içinde yüksek kaliteli videolar sentezler.", sfx: "whoosh", motion: "pan_right" },
      { speech: "Kendi klonlanmış sesiniz @me ve karakterinizle sosyal medyada fark yaratın.", sfx: "chime", motion: "breathing" }
    ]
  },
  {
    title: "Pixar Estetiğinde Güzellik ve Bakım Tanıtımı",
    desc: "Pürüzsüz Pixar animasyon stiliyle kozmetik ürünlerinin dudak senkronizasyonlu anlatımı.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel",
    scenes: [
      { speech: "Cildiniz için en doğal bakımı Pixar dünyasının sevimli ışıltısıyla keşfedin.", sfx: "sparkle", motion: "zoom_in" },
      { speech: "Tamamen doğal özlerle hazırlanan yeni serimiz, cildinize ipeksi bir yumuşaklık kazandırıyor.", sfx: "soft_wind", motion: "pan_left" }
    ]
  },
  {
    title: "Haftalık Borsa ve Finans Analiz Bülteni",
    desc: "Borsa verileri ve yapay zeka analizleriyle haftalık finansal piyasa değerlendirmesi.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Haftalık borsa bültenine hoş geldiniz. Bu hafta piyasalarda hareketlilik oldukça yüksek.", sfx: "bell_ring", motion: "breathing" },
      { speech: "Yapay zeka algoritmalarımız, teknoloji hisselerinde yukarı yönlü bir ivme öngörüyor.", sfx: "data_beep", motion: "zoom_in" },
      { speech: "Yatırımlarınızı çeşitlendirirken risk analizlerini göz önünde bulundurmayı unutmayın.", sfx: "keyboard_click", motion: "zoom_out" }
    ]
  },
  {
    title: "İstanbul Boğazı Gezi Vlogu",
    desc: "@me ve @sibel karakterlerinin İstanbul Boğazı kenarında gezi deneyimi sohbeti.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel",
    scenes: [
      { speech: "Bugün İstanbul Boğazı'nın eşsiz manzarasında harika bir güne başladık.", sfx: "sea_waves", motion: "pan_right" },
      { speech: "Martı sesleri eşliğinde çayımızı yudumlarken Boğaz'ın tarihi yalılarını seyrediyoruz.", sfx: "birds_chirping", motion: "breathing" },
      { speech: "Bir sonraki gezi durağımızda görüşmek üzere, takipte kalın!", sfx: "camera_shutter", motion: "zoom_out" }
    ]
  },
  {
    title: "Premium Kutu Açılımı (Unboxing) Deneyimi",
    desc: "E-ticaret ürünlerinin 3D stüdyo ortamında ses efektleri ve müzikle kutu açılım bülteni.",
    template: "simple",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Bugün heyecanla beklediğimiz premium teknoloji kutusunu açıyoruz.", sfx: "box_opening", motion: "zoom_in" },
      { speech: "Kutudan çıkan şık metal gövde ve minimalist tasarım gerçekten göz kamaştırıcı.", sfx: "chime", motion: "pan_left" },
      { speech: "Ürünün detaylı performans testleri için bir sonraki sahnemize geçelim.", sfx: "whoosh", motion: "zoom_out" }
    ]
  },
  {
    title: "Yapay Zeka Destekli Siber Savunma Analizi",
    desc: "Geleceğin siber güvenlik teknolojileri ve sibernetik robot laboratuvarı tanıtımı.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Siber tehditler her geçen gün daha karmaşık hale geliyor.", sfx: "alarm_beep", motion: "zoom_in" },
      { speech: "Yapay zeka destekli otonom savunma sistemleri, saldırıları mikrosaniyeler içinde engelliyor.", sfx: "digital_sweep", motion: "pan_right" },
      { speech: "Geleceğin dijital dünyasında güvenli kalmak için şimdiden hazırlıklı olmalıyız.", sfx: "data_processing", motion: "breathing" }
    ]
  },
  {
    title: "Motivasyonel Fitness ve Sağlıklı Yaşam",
    desc: "Modern spor salonunda motive edici konuşma ve dumble egzersiz animasyonları.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Her gün yeni bir başlangıçtır. Bugün kendin için ne yapacaksın?", sfx: "heavy_breathing", motion: "zoom_in" },
      { speech: "Sınırlarını zorla, asla pes etme. Başarı, disiplinin arkasında saklıdır.", sfx: "metal_clank", motion: "pan_left" },
      { speech: "Hadi hemen bugün harekete geç ve hedeflerine doğru koş!", sfx: "cheers", motion: "zoom_out" }
    ]
  },
  {
    title: "Pixar Tarzı Çikolatalı Pasta Tarifi",
    desc: "Pixar mutfağında sevimli şef @sibel ile lezzetli pasta tarifi vlogu.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel",
    scenes: [
      { speech: "Merhaba sevgili dostlar! Bugün Pixar mutfağında nefis bir pasta yapıyoruz.", sfx: "magic_spark", motion: "zoom_in" },
      { speech: "Bol çikolatalı krema ve taze çileklerle pastamızı süslemeye başlayalım.", sfx: "cream_whipping", motion: "pan_right" },
      { speech: "İşte fırından yeni çıkan sıcak pastamız servise hazır!", sfx: "kitchen_timer", motion: "breathing" }
    ]
  },
  {
    title: "Yapay Zekanın Geleceği Kitap İncelemesi",
    desc: "Kütüphane stüdyosunda en son çıkan yapay zeka ve felsefe kitaplarının eleştirisi.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Bugün, insanlık tarihinin en büyük dönüşümünü konu alan yeni kitabı inceliyoruz.", sfx: "page_turning", motion: "breathing" },
      { speech: "Yapay zeka bilinci ve felsefi boyutları üzerine yazılmış oldukça sarsıcı bir eser.", sfx: "clock_ticking", motion: "zoom_in" }
    ]
  },
  {
    title: "Elektrikli Gelecek: Yeni Nesil Spor Otomobil İncelemesi",
    desc: "Geleceğin elektrikli spor arabalarının sürüş dinamikleri ve otonom teknolojileri.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Tamamen elektrikli ve otonom spor otomobilin kokpitindeyiz.", sfx: "engine_hum", motion: "zoom_in" },
      { speech: "Sıfırdan yüze sadece iki saniyede ulaşan bu teknoloji harikası adeta geleceği müjdeliyor.", sfx: "tires_screech", motion: "pan_right" },
      { speech: "Gelişmiş batarya teknolojisi sayesinde tek şarjla bin kilometre yol gidebiliyoruz.", sfx: "electric_spark", motion: "zoom_out" }
    ]
  },
  {
    title: "3D Avatar Sanal Moda Haftası",
    desc: "Pixar estetiğinde mankenlerin neon yeşil kıyafetleriyle podyumda sanal yürüyüşü.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel",
    scenes: [
      { speech: "Sanal moda haftasının açılış defilesinde neon yeşil esintisi podyumu kaplıyor.", sfx: "applause", motion: "pan_left" },
      { speech: "3D avatarlar tarafından sergilenen bu tasarımlar, geleceğin dijital gardırobunu oluşturuyor.", sfx: "camera_shutter", motion: "zoom_in" }
    ]
  },
  {
    title: "Timeline Müzik Miksajıyla Akustik Gitar Dersi",
    desc: "Gitar solo tekniklerini arka plan müziği seviyesi entegrasyonuyla anlatan ders.",
    template: "simple",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Bugün akustik gitarda temel solo tekniklerini uygulamalı olarak öğreneceğiz.", sfx: "guitar_pluck", motion: "zoom_in" },
      { speech: "Doğru parmak pozisyonu ve ritim takibiyle soloları daha pürüzsüz çalabilirsiniz.", sfx: "metronome", motion: "breathing" }
    ]
  },
  {
    title: "AI Agent'lar ile Kodlamanın Geleceği",
    desc: "Yapay zeka yazılım mühendislerinin sektörü nasıl dönüştürdüğüne dair analiz.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Yazılım geliştirme süreçleri yapay zeka ajanlarıyla tamamen değişiyor.", sfx: "keyboard_typing", motion: "zoom_in" },
      { speech: "Artık fikirlerimizi doğal dille ifade ederek dakikalar içinde çalışan uygulamalar üretebiliyoruz.", sfx: "chime", motion: "pan_left" },
      { speech: "Kodlama becerisi, yapay zekayı doğru yönlendirme yeteneğine evriliyor.", sfx: "computer_beep", motion: "zoom_out" }
    ]
  },
  {
    title: "Sanal Emlak: Lüks Villa Tanıtımı",
    desc: "Lüks bir villanın bahçesinde ve havuz başında detaylı gayrimenkul vlogu.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel",
    scenes: [
      { speech: "Akdeniz kıyısında, modern mimarinin ve lüksün birleştiği muhteşem bir villadayız.", sfx: "birds_singing", motion: "pan_right" },
      { speech: "Geniş yüzme havuzu ve yeşillikler içindeki bahçesiyle burası adeta bir cennet.", sfx: "water_splash", motion: "zoom_in" },
      { speech: "Evin iç tasarımındaki mermer ve ahşap detaylar şıklığı zirveye taşıyor.", sfx: "soft_wind", motion: "zoom_out" }
    ]
  },
  {
    title: "Pixar Tarzı Dijital Sanat ve Karakter Tasarımı",
    desc: "Grafik tablet yardımıyla dijital illüstrasyon çizen sanatçı kızın hikayesi.",
    template: "pixar",
    music: "uploads/test_bg_music.mp3",
    speaker: "@sibel",
    scenes: [
      { speech: "Dijital tuval üzerine çizdiğimiz her çizgi, yeni bir karakterin ruhunu yansıtıyor.", sfx: "stylus_scratch", motion: "zoom_in" },
      { speech: "Işık ve gölge oyunlarıyla karakterimize boyut kazandırıp onu hayata geçiriyoruz.", sfx: "magic_wand", motion: "pan_left" }
    ]
  },
  {
    title: "Yapay Zeka Destekli Evcil Hayvan Bakım İpuçları",
    desc: "Evcil hayvanların beslenmesi ve eğitimi için modern veterinerlik rehberi.",
    template: "simple",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Sevimli dostlarımızın sağlığı için yapay zeka analizli diyet planlarını denediniz mi?", sfx: "dog_bark", motion: "breathing" },
      { speech: "Hangi mamaların evcil hayvanınıza daha uygun olduğunu anlamak için veri analitiğinden yararlanıyoruz.", sfx: "chime", motion: "zoom_in" }
    ]
  },
  {
    title: "Hayallerinin Peşinden Koşmak",
    desc: "Radyo stüdyosunda mikrofon başında hayaller ve hedefler temalı motivasyon podcasti.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Büyük işler başarmak, büyük hayaller kurmakla başlar.", sfx: "mic_feedback", motion: "zoom_in" },
      { speech: "Karşına çıkan engeller seni durdurmasın, onlar sadece yolunu aydınlatan fenerlerdir.", sfx: "heartbeat", motion: "breathing" },
      { speech: "İnan, çalış ve asla pes etme. Kendi hikayeni kendin yaz.", sfx: "whoosh", motion: "zoom_out" }
    ]
  },
  {
    title: "Gladyatörler ve Roma İmparatorluğu Tarihi",
    desc: "Antik Roma stüdyosunda tarihi zırhlar eşliğinde antik dönem analizi.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Kolezyum'un tozlu arenalarından Roma İmparatorluğu'nun ihtişamlı günlerine gidiyoruz.", sfx: "swords_clashing", motion: "zoom_in" },
      { speech: "Gladyatörlerin yaşam mücadelesi ve Roma ordusunun stratejik dehasını inceliyoruz.", sfx: "shield_hit", motion: "pan_right" },
      { speech: "Tarihin bu büyüleyici dönemini birlikte keşfetmek için takipte kalın.", sfx: "fanfare", motion: "zoom_out" }
    ]
  },
  {
    title: "Web3 ve Kripto Dünyasının Geleceği",
    desc: "NFT ve blockchain teknolojilerinin gelecekteki kullanım senaryoları.",
    template: "dynamic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "Finansal sistemler blockchain teknolojisiyle merkeziyetsiz bir geleceğe doğru ilerliyor.", sfx: "coin_drop", motion: "zoom_in" },
      { speech: "NFT'ler sadece dijital sanat değil, aynı zamanda mülkiyet haklarının da yeni temsilcileridir.", sfx: "data_beep", motion: "pan_left" },
      { speech: "Geleceğin Web3 dünyasında yerinizi almak için şimdiden teknolojiye entegre olun.", sfx: "chime", motion: "zoom_out" }
    ]
  },
  {
    title: "Mars Kolonisi ve Gezegenler Arası Yolculuk",
    desc: "Kızıl gezegende kurulacak ilk insan koloni stüdyosu ve uzay gemisi teknolojileri.",
    template: "cinematic",
    music: "uploads/test_bg_music.mp3",
    speaker: "@me",
    scenes: [
      { speech: "İnsanlığın çok gezegenli bir türe dönüşme serüveni Mars'ta başlıyor.", sfx: "rocket_rumble", motion: "zoom_in" },
      { speech: "Mars'ta kurulacak ilk kubbeler ve yaşam destek üniteleri üzerinde çalışmalar sürüyor.", sfx: "oxygen_hiss", motion: "breathing" },
      { speech: "Bu büyüleyici yolculukta evrenin derinliklerini keşfetmeye devam edeceğiz.", sfx: "cosmic_ping", motion: "zoom_out" }
    ]
  }
];

async function generateBaseAssets() {
  const baseVideoPath = path.join(process.cwd(), 'videolar', 'demo_base.mp4');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const testMusicPath = path.join(uploadsDir, 'test_bg_music.mp3');

  await fs.ensureDir(path.join(process.cwd(), 'videolar'));
  await fs.ensureDir(uploadsDir);

  const runCmd = (cmd: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      exec(cmd, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  // 1. demo_base.mp4 üret
  if (!await fs.pathExists(baseVideoPath)) {
    console.log('[INFO] demo_base.mp4 bulunamadı, FFmpeg ile üretiliyor...');
    try {
      const cmd = `ffmpeg -y -f lavfi -i "color=c=0x08111F:s=1280x720:d=6:r=24" -c:v libx264 "${baseVideoPath}"`;
      await runCmd(cmd);
      console.log('[OK] demo_base.mp4 başarıyla üretildi.');
    } catch (e: any) {
      console.error('[ERROR] demo_base.mp4 üretilemedi:', e.message);
      process.exit(1);
    }
  }

  // 2. test_bg_music.mp3 üret
  if (!await fs.pathExists(testMusicPath)) {
    console.log('[INFO] test_bg_music.mp3 bulunamadı, FFmpeg ile üretiliyor...');
    try {
      const cmd = `ffmpeg -y -f lavfi -i "anullsrc=r=16000:cl=mono" -t 6 "${testMusicPath}"`;
      await runCmd(cmd);
      console.log('[OK] test_bg_music.mp3 başarıyla üretildi.');
    } catch (e: any) {
      console.error('[ERROR] test_bg_music.mp3 üretilemedi:', e.message);
    }
  }
}

async function seed() {
  console.log('[INFO] Temel medya kaynakları doğrulanıyor...');
  await generateBaseAssets();

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

  const baseVideoPath = path.join(process.cwd(), 'videolar', 'demo_base.mp4');

  console.log('[INFO] Eski demo videolar ve iş kayıtları temizleniyor...');
  // Eski tohumlanmış demoları temizleyebiliriz, ancak temizlik yaparken lokal testleri korumak için sadece 'demo_' ile başlayan final_filename içerenleri sileriz.
  const oldJobs = await db.all("SELECT id, final_filename FROM video_jobs WHERE final_filename LIKE 'demo_video_%'");
  for (const j of oldJobs) {
    await db.run('DELETE FROM video_scenes WHERE job_id = ?', [j.id]);
    await db.run('DELETE FROM video_jobs WHERE id = ?', [j.id]);
    const fPath = path.join(process.cwd(), 'videolar', j.final_filename);
    if (await fs.pathExists(fPath)) {
      await fs.remove(fPath);
    }
    // Kapakları da temizle
    for (let i = 0; i < 3; i++) {
      const coverPath = path.join(process.cwd(), 'uploads', `cover_${j.id}_${i}.jpg`);
      if (await fs.pathExists(coverPath)) await fs.remove(coverPath);
    }
  }

  console.log('[INFO] Demo videolar kopyalanıyor ve veritabanı kayıtları oluşturuluyor...');
  
  // 3. Demo videoları tohumla
  for (let i = 0; i < demoScenarios.length; i++) {
    const scenario = demoScenarios[i];
    const index = i + 1;
    const finalFilename = `demo_video_${index}.mp4`;
    const destVideoPath = path.join(process.cwd(), 'videolar', finalFilename);

    // Ana video dosyasını kopyala
    await fs.copy(baseVideoPath, destVideoPath, { overwrite: true });

    // 3 adet mock kapak resmi de yerel olarak üretelim
    const coverPaths: string[] = [];
    const colors = ['0x08111F', '0x1A2E40', '0x00F2FE'];
    for (let cIdx = 0; cIdx < 3; cIdx++) {
      // Geçici olarak tohumlama sırasında kapak resimleri de oluşturalım
      const cmd = `ffmpeg -y -f lavfi -i "color=c=${colors[cIdx]}:s=1280x720:d=1" -vframes 1 "${path.join(process.cwd(), 'uploads', `cover_demo_${index}_${cIdx}.jpg`)}"`;
      await new Promise<void>((r) => exec(cmd, () => r()));
      coverPaths.push(`/uploads/cover_demo_${index}_${cIdx}.jpg`);
    }

    // video_jobs kaydı oluştur
    const jobRes = await db.run(
      `INSERT INTO video_jobs (
        user_id, master_prompt, production_notes, character_features, status, 
        current_stage, progress_percent, final_filename, total_scenes, completed_scenes,
        production_template, background_music_path, tts_provider, cover_image_path, cover_images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        scenario.title,
        scenario.desc,
        `Avatar prompt of ${scenario.speaker}`,
        'completed',
        'Tamamlandı',
        100,
        finalFilename,
        scenario.scenes.length,
        scenario.scenes.length,
        scenario.template,
        scenario.music,
        'xtts',
        path.join(process.cwd(), 'uploads', `cover_demo_${index}_0.jpg`),
        JSON.stringify(coverPaths)
      ]
    );

    const jobId = jobRes.lastID;

    // video_scenes kayıtlarını oluştur
    for (let sIdx = 0; sIdx < scenario.scenes.length; sIdx++) {
      const scene = scenario.scenes[sIdx];
      await db.run(
        `INSERT INTO video_scenes (
          job_id, scene_number, video_prompt, speech_text, sfx_prompt, 
          camera_motion, status, sort_order, music_volume, speaker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          jobId,
          sIdx + 1,
          `${scenario.speaker} presenting: ${scenario.title} - Scene ${sIdx + 1}`,
          scene.speech,
          scene.sfx,
          scene.motion,
          'completed',
          sIdx + 1,
          0.15,
          scenario.speaker
        ]
      );
    }

    console.log(`[OK] Demo Job #${jobId} oluşturuldu: ${scenario.title} (${scenario.scenes.length} Sahne)`);
  }

  console.log('\n[SUCCESS] Tüm demo videoları, kapakları ve kayıtları başarıyla tohumlandı!');
  process.exit(0);
}

seed().catch(err => {
  console.error('[ERROR] Tohumlama başarısız:', err);
  process.exit(1);
});
