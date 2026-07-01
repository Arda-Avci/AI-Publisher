const fs = require('fs');
const path = require('path');

// Proje yolları
const projectRoot = path.resolve(__dirname, '../../../../');
const clientRoot = path.join(projectRoot, 'client');
const clientSrc = path.join(clientRoot, 'src');
const componentsDir = path.join(clientSrc, 'components');
const appFile = path.join(clientSrc, 'App.tsx');
const indexCssFile = path.join(clientSrc, 'index.css');

console.log('[INFO] Tasarım Analiz Ajanı başlatıldı.');
console.log(`[INFO] Çalışma dizini: ${projectRoot}`);

function analyze() {
  const report = [];
  report.push('# AI-Publisher Arayüz ve Sayfa Tasarım Analiz Raporu');
  report.push(`Analiz Tarihi: ${new Date().toLocaleString('tr-TR')}\n`);

  // 1. App.tsx Analizi (Route'lar)
  report.push('## 🛣️ 1. Sayfa Yönlendirmeleri (Routes)');
  if (fs.existsSync(appFile)) {
    const appContent = fs.readFileSync(appFile, 'utf8');
    // Basit bir regex ile Route path ve element eşleşmelerini yakalayalım
    const routeRegex = /<Route[^>]*path=["']([^"']+)["'][^>]*element={([^}]+)}/g;
    let match;
    const routes = [];
    while ((match = routeRegex.exec(appContent)) !== null) {
      routes.push({ path: match[1], element: match[2].replace(/[\s<>]/g, '') });
    }

    if (routes.length > 0) {
      report.push('| Path | Bileşen (Component) |');
      report.push('| :--- | :--- |');
      routes.forEach(r => {
        report.push(`| \`${r.path}\` | \`${r.element}\` |`);
      });
    } else {
      report.push('App.tsx içerisinde standart React Router Route tanımları otomatik regex ile ayrıştırılamadı. Manuel kontrol edilebilir.');
    }
  } else {
    report.push('[WARN] App.tsx dosyası bulunamadı.');
  }
  report.push('');

  // 2. Kritik Sayfa Bileşenlerinin Tespiti ve Boyutları
  report.push('## 📦 2. Tespit Edilen Kritik Sayfalar ve Durumları');
  report.push('| Sayfa Adı | Yol (Path) | Boyut (KB) | Durum |');
  report.push('| :--- | :--- | :--- | :--- |');

  const criticalPages = [
    { name: 'LandingPage.tsx', desc: 'Ana Tanıtım / Karşılama Sayfası' },
    { name: 'LoginPage.tsx', desc: 'Giriş Ekranı' },
    { name: 'Dashboard.tsx', desc: 'Kullanıcı Kontrol Paneli' },
    { name: 'StudioPanel.tsx', desc: 'Video Düzenleme / Üretim Stüdyosu' },
    { name: 'GalleryPanel.tsx', desc: 'Üretilen Videolar Galerisi' },
    { name: 'ExamplesPanel.tsx', desc: 'Örnek Videolar ve Şablonlar' },
  ];

  criticalPages.forEach(page => {
    const filePath = path.join(componentsDir, page.name);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      report.push(`| **${page.name}** | \`components/${page.name}\` | ${sizeKB} KB | Entegre / Mevcut |`);
    } else {
      report.push(`| **${page.name}** | - | - | Bulunamadı veya farklı isimde |`);
    }
  });
  report.push('');

  // 3. Stiller ve CSS Dosyaları
  report.push('## 🎨 3. Stil ve CSS Yapı Analizi');
  if (fs.existsSync(indexCssFile)) {
    const cssContent = fs.readFileSync(indexCssFile, 'utf8');
    const stats = fs.statSync(indexCssFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    report.push(`- **Global CSS Dosyası:** \`client/src/index.css\` (${sizeKB} KB)`);
    
    // Değişkenleri arayalım (örn: --color-*, --font-*)
    const variables = [];
    const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = varRegex.exec(cssContent)) !== null) {
      variables.push(`  - \`${match[1]}\`: \`${match[2].trim()}\``);
    }
    
    if (variables.length > 0) {
      report.push('- **Tanımlı CSS Değişkenleri (Variables):**');
      report.push(variables.slice(0, 15).join('\n')); // İlk 15 tanesini göster
      if (variables.length > 15) {
        report.push(`  - ... ve diğer ${variables.length - 15} değişken.`);
      }
    } else {
      report.push('- Global CSS içinde CSS custom properties (değişkenler) bulunamadı.');
    }
  } else {
    report.push('[WARN] index.css dosyası bulunamadı.');
  }
  report.push('');

  // 4. Tasarım Değerlendirmesi
  report.push('## 📐 4. Mevcut Tasarım Değerlendirmesi');
  report.push('- **LandingPage.tsx:** Premium neon gradyanları, video player modalı ve modern özellik kartları içeriyor.');
  report.push('- **StudioPanel.tsx:** Çok kanallı timeline, video önizleme ve AI stüdyo araçlarını barındıran kompleks bir yapı.');
  report.push('- **Tasarım Dili:** Koyu mod odaklı, neon cyan/mor vurgulu, premium hissettirmeye çalışan bir tasarım var. Ancak "dark luxury" ve "editorial" hissiyatını artırmak için Cormorant Garamond yazı tipi entegrasyonu, daha sakin tipografi ve daha geniş minimalist boşluklar (white-space) eklenebilir.');

  const reportContent = report.join('\n');
  const reportPath = path.join(projectRoot, 'design_analysis_report.md');
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`[INFO] Analiz raporu oluşturuldu: ${reportPath}`);
}

analyze();
