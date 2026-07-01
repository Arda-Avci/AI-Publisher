const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../../');
const clientSrc = path.join(projectRoot, 'client', 'src');
const componentsDir = path.join(clientSrc, 'components');
const proposalsDir = path.join(projectRoot, 'design_proposals');

const componentName = process.argv[2];

if (!componentName) {
  console.error('[ERROR] Lütfen analiz edilecek bileşen adını belirtin. Örn: node generate_proposal.js LoginPage');
  process.exit(1);
}

let targetFile = path.join(componentsDir, `${componentName}.tsx`);
if (!fs.existsSync(targetFile)) {
  targetFile = path.join(componentsDir, `${componentName}.js`);
}

if (!fs.existsSync(targetFile)) {
  console.error(`[ERROR] Belirtilen bileşen dosyası bulunamadı: ${componentName}`);
  process.exit(1);
}

console.log(`[INFO] '${componentName}' için tasarım teklifi ve görsel önizleme oluşturuluyor...`);

if (!fs.existsSync(proposalsDir)) {
  fs.mkdirSync(proposalsDir, { recursive: true });
}

function generateProposal() {
  const proposalPath = path.join(proposalsDir, `${componentName}_proposal.md`);
  
  const report = [];
  report.push(`# 💎 Tasarım Teklifi: ${componentName}`);
  report.push('');
  report.push(`Bu dosya, **${componentName}** bileşeni için hazırlanan premium "dark luxury" ve "editorial" tasarım alternatiflerini içerir.`);
  report.push('');
  report.push(`> [!TIP]`);
  report.push(`> Bu tasarımları canlı ve görsel olarak test edebilmeniz için **interaktif bir HTML önizleme sayfası** oluşturuldu.`);
  report.push(`> Tarayıcınızda açıp test etmek için tıklayın: [Görsel Tasarım Önizleme Sayfası (Showcase)](file:///${proposalsDir.replace(/\\/g, '/')}/${componentName}_showcase.html)`);
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 🔍 Mevcut Durum Analizi');
  report.push(`- **Bileşen Yolu:** \`client/src/components/${path.basename(targetFile)}\``);
  report.push(`- **Dosya Boyutu:** ${(fs.statSync(targetFile).size / 1024).toFixed(2)} KB`);
  report.push('- **Ana Fonksiyonellikler:** Form yönetimi, durum (state) kontrolleri, event handler\'lar.');
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 🎨 Alternatif A: Sinematik & Minimalist Dark Luxury');
  report.push('Zarif, tırnaklı büyük başlıklar, derin arka plan gölgeleri ve üstte minimal sabit altın çizgisiyle oluşturulmuş modern bir görünüm.');
  report.push('');
  report.push('### 📐 Sayfa Düzeni (Layout)');
  report.push('- Ekran ortasında konumlandırılmış, geniş padding\'li ve oldukça ince sınırlara (`border: 1px solid rgba(255, 255, 255, 0.05)`) sahip kart tasarımı.');
  report.push('- Başlık: `font-family: \'Cormorant Garamond\', serif`, `font-weight: 300`, `color: hsl(var(--foreground))`, `font-size: 2.5rem`.');
  report.push('- Altın rengi hover efektli minimalist input alanları ve butonlar.');
  report.push('');
  report.push('### ✨ Animasyonlar');
  report.push('- Kartın yukarıya doğru yumuşak kayarak gelmesi (`fade-in-up` - 0.8s ease-out).');
  report.push('- Input alanlarına odaklanıldığında (focus) sınır renginin ve kutu gölgesinin yavaşça `#D4AF37` (altın) rengine dönmesi.');
  report.push('');
  report.push('### 💻 Taslak CSS / JSX Değişikliği');
  report.push('```css');
  report.push(`.premium-${componentName.toLowerCase()}-container {`);
  report.push('  background-color: hsl(var(--background)) !important;');
  report.push('  min-height: 100vh;');
  report.push('  display: flex;');
  report.push('  align-items: center;');
  report.push('  justify-content: center;');
  report.push('  font-family: \'Manrope\', sans-serif;');
  report.push('  color: hsl(var(--foreground)) !important;');
  report.push('}');
  report.push('');
  report.push(`.premium-${componentName.toLowerCase()}-card {`);
  report.push('  background: hsl(var(--card)) !important;');
  report.push('  border: 1px solid hsl(var(--border)) !important;');
  report.push('  padding: 3rem;');
  report.push('  border-radius: 4px;');
  report.push('  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);');
  report.push('  max-width: 450px;');
  report.push('  width: 100%;');
  report.push('  position: relative;');
  report.push('}');
  report.push('');
  report.push(`.premium-${componentName.toLowerCase()}-card::before {`);
  report.push('  content: \'\';');
  report.push('  position: absolute;');
  report.push('  top: 0; left: 0;');
  report.push('  width: 100%; height: 2px;');
  report.push('  background: linear-gradient(90deg, transparent, #D4AF37, transparent); /* Sabit Altın Çizgi */');
  report.push('}');
  report.push('```');
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 🎨 Alternatif B: Premium Editorial Grid');
  report.push('Asimetrik yerleşimler, büyük beyaz alanlar (white-space) ve yan yana konumlandırılmış bir grid yapısı ile gazete/dergi havası veren lüks tasarım.');
  report.push('');
  report.push('### 📐 Sayfa Düzeni (Layout)');
  report.push('- Sol tarafta büyük editorial bir görsel veya video oynatıcı (ya da projenin logosu ve sloganı), sağ tarafta ise giriş/işlem formu.');
  report.push('- İki sütunlu lüks grid yapısı (`grid-template-columns: 1.2fr 1fr`).');
  report.push('- Başlıklar: İtalik ve normal font ağırlıklarının bir arada kullanıldığı zarif tipografi.');
  report.push('');
  report.push('### ✨ Animasyonlar');
  report.push('- Sol ve sağ sütunların sırayla soldan ve sağdan süzülerek gelmesi.');
  report.push('- Buton üzerinde gezinildiğinde (hover) butondan yayılan hafif altın ışıltısı.');
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 🎨 Alternatif C: Sinematik Border Glow & Glassmorphism');
  report.push('Yumuşak, dönen veya yayılan bir kenarlık ışıltısı ve yarı şeffaf buzlu cam (glassmorphism) efektleriyle zenginleştirilmiş ultra-premium tasarım.');
  report.push('');
  report.push('### 📐 Sayfa Düzeni (Layout)');
  report.push('- Arka planda premium altın ve koyu mavi renklerin iç içe geçtiği soyut yavaş hareket eden bir gradyan.');
  report.push('- Kart: `backdrop-filter: blur(12px)`, `background: rgba(8, 17, 31, 0.7)`.');
  report.push('- İnce, parıldayan altın kenarlık sınır çizgisi.');
  report.push('');
  report.push('### ✨ Animasyonlar');
  report.push('- Kartın arka plan gradyanının yavaşça dönmesi veya dalgalanması.');
  report.push('- Yumuşak bir ışıltı (glow) efektiyle sayfanın derinlik kazanması.');
  report.push('');
  report.push('### 💻 Taslak CSS Değişikliği');
  report.push('```css');
  report.push(`.premium-${componentName.toLowerCase()}-glow-card {`);
  report.push('  background: rgba(8, 17, 31, 0.75) !important;');
  report.push('  backdrop-filter: blur(16px) !important;');
  report.push('  border: 1px solid rgba(212, 175, 55, 0.2) !important; /* Altın Glow Sınır */');
  report.push('  box-shadow: 0 0 30px rgba(212, 175, 55, 0.05) !important;');
  report.push('  border-radius: 8px;');
  report.push('  padding: 3rem;');
  report.push('}');
  report.push('```');
  report.push('');
  report.push('---');
  report.push('');
  report.push('## 🛠️ Nasıl Onaylarsınız ve Uygularsınız?');
  report.push('Lütfen bu alternatiflerden birini seçin:');
  report.push(`1. **Alternatif A**'yı uygulamak için: \`node .agents/skills/design-agent/scripts/apply_design.js ${componentName} A\``);
  report.push(`2. **Alternatif B**'yi uygulamak için: \`node .agents/skills/design-agent/scripts/apply_design.js ${componentName} B\``);
  report.push(`3. **Alternatif C**'yi uygulamak için: \`node .agents/skills/design-agent/scripts/apply_design.js ${componentName} C\``);
  report.push('');
  report.push('Bu komutlar, sayfanın JSX yapısını bozmadan stilleri premium class\'lar ile güncelleyecektir.');
  
  fs.writeFileSync(proposalPath, report.join('\n'), 'utf8');
  console.log(`[INFO] Tasarım teklif belgesi oluşturuldu: ${proposalPath}`);
  
  // HTML Önizleme Dosyasını Oluştur
  generateShowcaseHtml();
}

function generateShowcaseHtml() {
  const htmlPath = path.join(proposalsDir, `${componentName}_showcase.html`);
  
  const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>💎 ${componentName} Premium Tasarım Önizleme İstasyonu</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Manrope:wght@300;400;600;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    /* Proje CSS Değişkenleri Simulasyonu */
    :root {
      --background: 220 40% 6%;
      --foreground: 210 20% 98%;
      --card: 220 40% 9%;
      --card-foreground: 210 20% 98%;
      --primary: 45 100% 50%;
      --border: 220 40% 15%;
      --text-muted: #9AA3AF;
    }

    /* Light Theme Değişkenleri */
    .theme-light {
      --background: 210 20% 96%;
      --foreground: 220 40% 10%;
      --card: 0 0% 100%;
      --card-foreground: 220 40% 10%;
      --border: 210 20% 85%;
      --text-muted: #6B7280;
    }

    /* Green Theme Değişkenleri */
    .theme-green {
      --background: 140 30% 6%;
      --foreground: 140 20% 98%;
      --card: 140 30% 9%;
      --card-foreground: 140 20% 98%;
      --border: 140 30% 15%;
      --text-muted: #8F9E8F;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #0c0f16;
      color: #e2e8f0;
      font-family: 'Manrope', sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
    }

    /* Kontrol Paneli */
    .control-header {
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1rem 2rem;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 1000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .brand-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.8rem;
      font-weight: 600;
      color: #F2EBDD;
      letter-spacing: 0.05em;
    }

    .brand-title span {
      color: #D4AF37; /* Altın Rengi */
    }

    .switcher-group {
      display: flex;
      gap: 0.8rem;
      align-items: center;
    }

    .switcher-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #9AA3AF;
      padding: 0.6rem 1.2rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: all 0.3s ease;
    }

    .switcher-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .switcher-btn.active {
      background: #D4AF37;
      border-color: #D4AF37;
      color: #05070B;
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.3);
    }

    .theme-picker-title {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #9AA3AF;
    }

    .theme-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .theme-circle.active {
      border-color: #fff;
      transform: scale(1.1);
    }

    .theme-dark-circle { background-color: #0c0f16; }
    .theme-light-circle { background-color: #f3f4f6; }
    .theme-green-circle { background-color: #05140b; }

    /* Önizleme Alanı */
    .preview-stage {
      padding-top: 80px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all 0.5s ease;
    }

    /* ==========================================================================
       ALTERNATİF A: Sinematik & Minimalist Dark Luxury
       ========================================================================== */
    .preview-stage.alt-A {
      background-color: hsl(var(--background));
      background-image: radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.04) 0%, transparent 80%);
    }

    .alt-A .showcase-card {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      padding: 3.5rem;
      border-radius: 4px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
      max-width: 440px;
      width: 100%;
      backdrop-filter: blur(10px);
      position: relative;
      overflow: hidden;
      animation: premiumFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Değişmeyen Altın Çizgi */
    .alt-A .showcase-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, transparent, #D4AF37, transparent); /* Sabit Altın Çizgi */
    }

    .alt-A .showcase-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 2.4rem;
      font-weight: 300;
      text-align: center;
      color: hsl(var(--foreground));
      margin-bottom: 2rem;
      letter-spacing: -0.01em;
    }

    .alt-A .showcase-title span {
      color: #D4AF37; /* Sabit Altın Detay */
    }

    /* Input Alanları A */
    .alt-A .input-group {
      margin-bottom: 1.5rem;
    }

    .alt-A label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .alt-A input {
      width: 100%;
      padding: 0.8rem 1.2rem;
      background: transparent;
      border: 1px solid hsl(var(--border));
      color: hsl(var(--foreground));
      font-family: 'Manrope', sans-serif;
      font-size: 0.95rem;
      outline: none;
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    .alt-A input:focus {
      border-color: #D4AF37;
      box-shadow: 0 0 10px rgba(212, 175, 55, 0.15);
    }

    .alt-A button.submit-btn {
      width: 100%;
      padding: 0.9rem;
      background: #D4AF37;
      color: #05070B;
      border: none;
      border-radius: 4px;
      font-weight: 800;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 1rem;
    }

    .alt-A button.submit-btn:hover {
      background: #c5a880;
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.25);
    }

    /* ==========================================================================
       ALTERNATİF B: Premium Editorial Grid
       ========================================================================== */
    .preview-stage.alt-B {
      background-color: hsl(var(--background));
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      align-items: stretch;
      padding-top: 60px;
    }

    .alt-B .editorial-visual {
      background: linear-gradient(135deg, #08111F 0%, #05070B 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 4rem;
      border-right: 1px solid hsl(var(--border));
      position: relative;
    }

    .alt-B .editorial-logo {
      font-family: 'Cormorant Garamond', serif;
      font-size: 4rem;
      font-weight: 300;
      color: #F2EBDD;
      margin-bottom: 1.5rem;
      animation: premiumFadeInUp 0.8s ease both;
    }

    .alt-B .editorial-logo span {
      color: #D4AF37;
    }

    .alt-B .editorial-desc {
      color: var(--text-muted);
      font-size: 1.1rem;
      font-weight: 300;
      max-width: 400px;
      text-align: center;
      line-height: 1.6;
    }

    .alt-B .showcase-card {
      background: hsl(var(--card));
      padding: 4rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      max-width: 100%;
      width: 100%;
      position: relative;
      animation: premiumSlideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .alt-B .showcase-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 2px;
      height: 100%;
      background: linear-gradient(180deg, transparent, #D4AF37, transparent); /* Sabit Altın Çizgi */
    }

    .alt-B .showcase-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 2.6rem;
      font-weight: 400;
      color: hsl(var(--foreground));
      margin-bottom: 2.5rem;
    }

    .alt-B label {
      display: block;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-muted);
      margin-bottom: 0.6rem;
    }

    .alt-B input {
      width: 100%;
      padding: 0.9rem 0;
      background: transparent;
      border: none;
      border-bottom: 1px solid hsl(var(--border));
      color: hsl(var(--foreground));
      font-family: 'Manrope', sans-serif;
      font-size: 1rem;
      outline: none;
      transition: all 0.3s ease;
      margin-bottom: 2rem;
    }

    .alt-B input:focus {
      border-bottom-color: #D4AF37;
    }

    .alt-B button.submit-btn {
      width: 100%;
      padding: 1rem;
      background: transparent;
      color: hsl(var(--foreground));
      border: 1px solid #D4AF37;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 1.5rem;
    }

    .alt-B button.submit-btn:hover {
      background: #D4AF37;
      color: #05070B;
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
    }

    /* ==========================================================================
       ALTERNATİF C: Sinematik Border Glow & Glassmorphism
       ========================================================================== */
    .preview-stage.alt-C {
      background-color: hsl(var(--background));
      background-image: radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.04) 0%, transparent 60%),
                        radial-gradient(circle at 80% 80%, rgba(200, 26, 86, 0.03) 0%, transparent 60%);
    }

    .alt-C .showcase-card {
      background: rgba(8, 17, 31, 0.65);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(212, 175, 55, 0.18); /* Altın Glow Sınır */
      padding: 4rem;
      border-radius: 8px;
      box-shadow: 0 0 40px rgba(212, 175, 55, 0.03), 0 30px 60px rgba(0, 0, 0, 0.6);
      max-width: 450px;
      width: 100%;
      position: relative;
      overflow: hidden;
      animation: premiumFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Döner Altın Glow Işık Animasyonu */
    .alt-C .showcase-card::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: conic-gradient(from 0deg, transparent, rgba(212, 175, 55, 0.12), transparent 35%);
      animation: premiumGlowRotate 12s linear infinite;
      pointer-events: none;
    }

    @keyframes premiumGlowRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .alt-C .showcase-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 2.5rem;
      font-weight: 300;
      text-align: center;
      color: hsl(var(--foreground));
      margin-bottom: 2.2rem;
      position: relative;
      z-index: 2;
    }

    .alt-C .showcase-title span {
      font-style: italic;
      color: #D4AF37;
    }

    .alt-C .input-group {
      margin-bottom: 1.8rem;
      position: relative;
      z-index: 2;
    }

    .alt-C label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      font-family: 'Fira Code', monospace;
    }

    .alt-C input {
      width: 100%;
      padding: 0.85rem 1.2rem;
      background: rgba(5, 7, 11, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: hsl(var(--foreground));
      font-family: 'Manrope', sans-serif;
      font-size: 0.95rem;
      outline: none;
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .alt-C input:focus {
      border-color: rgba(212, 175, 55, 0.5);
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.1);
    }

    .alt-C button.submit-btn {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #D4AF37 0%, #C5A880 100%);
      color: #05070B;
      border: none;
      border-radius: 6px;
      font-weight: 800;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      cursor: pointer;
      position: relative;
      z-index: 2;
      transition: all 0.3s ease;
    }

    .alt-C button.submit-btn:hover {
      opacity: 0.9;
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
    }

    /* Keyframes */
    @keyframes premiumFadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes premiumSlideInRight {
      from { opacity: 0; transform: translateX(50px); }
      to { opacity: 1; transform: translateX(0); }
    }

    /* Info Area */
    .alternative-info-box {
      margin-top: 2rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1rem;
      border-radius: 4px;
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .alternative-info-box code {
      font-family: 'Fira Code', monospace;
      color: #D4AF37;
    }
  </style>
</head>
<body class="theme-dark">

  <!-- Kontrol Paneli -->
  <header class="control-header">
    <div class="brand-title">AI <span>Publisher</span> Showcase</div>
    
    <!-- Alternatif Seçimi -->
    <div class="switcher-group">
      <button class="switcher-btn active" onclick="switchAlt('A', this)">Alternatif A</button>
      <button class="switcher-btn" onclick="switchAlt('B', this)">Alternatif B</button>
      <button class="switcher-btn" onclick="switchAlt('C', this)">Alternatif C</button>
    </div>

    <!-- Tema Seçimi -->
    <div class="switcher-group">
      <span class="theme-picker-title">Tema:</span>
      <div class="theme-circle theme-dark-circle active" onclick="switchTheme('dark', this)"></div>
      <div class="theme-circle theme-light-circle" onclick="switchTheme('light', this)"></div>
      <div class="theme-circle theme-green-circle" onclick="switchTheme('green', this)"></div>
    </div>
  </header>

  <!-- Önizleme Sahnesi -->
  <main id="previewStage" class="preview-stage alt-A">
    
    <!-- Alternatif B için Sol Sütun Visual Area (Sadece B aktifken görünür) -->
    <div class="editorial-visual" id="editorialVisual" style="display: none;">
      <div class="editorial-logo">AI <span>Publisher</span></div>
      <div class="editorial-desc">Otonom Çoklu Sosyal Medya Destekli Video Üretim ve Pazarlama Platformu.</div>
    </div>

    <!-- Ana Kart / Form -->
    <div class="showcase-card" id="showcaseCard">
      <h1 class="showcase-title" id="showcaseTitle">Giriş <span>Yapın</span></h1>
      
      <form onsubmit="event.preventDefault();">
        <div class="input-group">
          <label for="username">E-Posta Adresi</label>
          <input type="email" id="username" placeholder="e-posta@adresiniz.com" required>
        </div>
        
        <div class="input-group">
          <label for="password">Şifre</label>
          <input type="password" id="password" placeholder="••••••••" required>
        </div>

        <button class="submit-btn" type="submit">Sisteme Giriş</button>
      </form>

      <!-- Bilgi Kutusu -->
      <div class="alternative-info-box" id="infoBox">
        <strong>Alternatif A: Sinematik Minimalizm</strong><br>
        - Cormorant Garamond zarif tipografisi.<br>
        - Üst kenarda sabit premium <strong>Altın Şerit (#D4AF37)</strong>.<br>
        - Tema değişimlerine uyumlu arka plan ve kart renkleri.<br>
        - Uygulamak için: <code>node .agents/skills/design-agent/scripts/apply_design.js ${componentName} A</code>
      </div>
    </div>

  </main>

  <script>
    function switchAlt(alt, btn) {
      // Aktif butonu güncelle
      document.querySelectorAll('.switcher-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const stage = document.getElementById('previewStage');
      const card = document.getElementById('showcaseCard');
      const title = document.getElementById('showcaseTitle');
      const infoBox = document.getElementById('infoBox');
      const editorialVisual = document.getElementById('editorialVisual');

      // Önceki sınıfları kaldır
      stage.className = 'preview-stage';

      if (alt === 'A') {
        stage.classList.add('alt-A');
        editorialVisual.style.display = 'none';
        title.innerHTML = 'Giriş <span>Yapın</span>';
        infoBox.innerHTML = \`<strong>Alternatif A: Sinematik Minimalizm</strong><br>
        - Cormorant Garamond zarif tipografisi.<br>
        - Üst kenarda sabit premium <strong>Altın Şerit (#D4AF37)</strong>.<br>
        - Tema değişimlerine uyumlu arka plan ve kart renkleri.<br>
        - Uygulamak için: <code>node .agents/skills/design-agent/scripts/apply_design.js ${componentName} A</code>\`;
      } else if (alt === 'B') {
        stage.classList.add('alt-B');
        editorialVisual.style.display = 'flex';
        title.innerHTML = 'Giriş Yapın';
        infoBox.innerHTML = \`<strong>Alternatif B: Premium Editorial Grid</strong><br>
        - İki sütunlu lüks asimetrik sayfa düzeni.<br>
        - Solda sabit editorial görsel/tanıtım alanı, sağda form kartı.<br>
        - Sol kenarda dikey konumlanmış premium <strong>Altın Şerit (#D4AF37)</strong>.<br>
        - Uygulamak için: <code>node .agents/skills/design-agent/scripts/apply_design.js ${componentName} B</code>\`;
      } else if (alt === 'C') {
        stage.classList.add('alt-C');
        editorialVisual.style.display = 'none';
        title.innerHTML = 'Giriş <span>İstasyonu</span>';
        infoBox.innerHTML = \`<strong>Alternatif C: Sinematik Glow & Glassmorphism</strong><br>
        - Yarı şeffaf <code>backdrop-filter</code> buzlu cam kartı.<br>
        - Kart etrafında yavaşça dönen sabit premium <strong>Altın Glow Işık Hareketi (#D4AF37)</strong>.<br>
        - Soyut, animasyonlu arka plan radial gradyanları.<br>
        - Uygulamak için: <code>node .agents/skills/design-agent/scripts/apply_design.js ${componentName} C</code>\`;
      }
    }

    function switchTheme(theme, circle) {
      document.querySelectorAll('.theme-circle').forEach(c => c.classList.remove('active'));
      circle.classList.add('active');

      document.body.className = '';
      if (theme !== 'dark') {
        document.body.classList.add('theme-' + theme);
      }
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`[INFO] Görsel önizleme (Showcase) sayfası oluşturuldu: ${htmlPath}`);
}

generateProposal();
