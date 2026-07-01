const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../../');
const clientSrc = path.join(projectRoot, 'client', 'src');
const componentsDir = path.join(clientSrc, 'components');
const indexCssFile = path.join(clientSrc, 'index.css');

const componentName = process.argv[2];
const selectedAlternative = process.argv[3]; // 'A', 'B' veya 'C'

if (!componentName || !selectedAlternative) {
  console.error('[ERROR] Lütfen bileşen adını ve alternatifi belirtin. Örn: node apply_design.js LoginPage A');
  process.exit(1);
}

if (selectedAlternative !== 'A' && selectedAlternative !== 'B' && selectedAlternative !== 'C') {
  console.error("[ERROR] Alternatif sadece 'A', 'B' veya 'C' olabilir.");
  process.exit(1);
}

let targetFile = path.join(componentsDir, `${componentName}.tsx`);
if (!fs.existsSync(targetFile)) {
  targetFile = path.join(componentsDir, `${componentName}.js`);
}

if (!fs.existsSync(targetFile)) {
  console.error(`[ERROR] Hedef bileşen dosyası bulunamadı: ${componentName}`);
  process.exit(1);
}

// Orijinal yedek varsa önce ondan geri yükleyelim ki temiz başlasın
const backupFile = `${targetFile}.bak`;
if (fs.existsSync(backupFile)) {
  fs.copyFileSync(backupFile, targetFile);
  console.log(`[INFO] Orijinal yedekten geri yükleme yapıldı: ${backupFile}`);
} else {
  fs.copyFileSync(targetFile, backupFile);
  console.log(`[INFO] Orijinal dosyanın yedeği alındı: ${backupFile}`);
}

console.log(`[INFO] '${componentName}' bileşenine Alternatif '${selectedAlternative}' uygulanıyor...`);

let codeContent = fs.readFileSync(targetFile, 'utf8');

// Akıllı Değiştirme (Inline Style veya className fark etmeksizin)
if (componentName === 'LoginPage') {
  let containerClass = 'premium-loginpage-container';
  let cardClass = 'premium-loginpage-card';

  if (selectedAlternative === 'B') {
    containerClass = 'premium-loginpage-grid-container';
    cardClass = 'premium-loginpage-grid-card';
  } else if (selectedAlternative === 'C') {
    containerClass = 'premium-loginpage-glow-container';
    cardClass = 'premium-loginpage-glow-card';
  }

  // 1. Container Div'inin style={...}'ini className'e çevirelim
  const returnRegex = /(return\s*\(\s*<div)\s*style=\{\{[\s\S]*?\}\}\s*>/;
  codeContent = codeContent.replace(returnRegex, `$1 className="${containerClass}">`);

  // 2. Card Div'inin style={...}'ini className'e çevirelim
  const cardRegex = /(<div\s*)style=\{\{[\s\S]*?zIndex:\s*1[\s\S]*?\}\}\s*>/;
  codeContent = codeContent.replace(cardRegex, `$1className="${cardClass}">`);
} else {
  // Diğer bileşenler için className bazlı değiştirme fallback'i
  const suffix = selectedAlternative === 'A' ? '' : (selectedAlternative === 'B' ? '-grid' : '-glow');
  codeContent = codeContent
    .replace(/className=(["'])([\w\s-]*container[\w\s-]*)(["'])/g, `className=$1premium-${componentName.toLowerCase()}${suffix}-container$3`)
    .replace(/className=(["'])([\w\s-]*card[\w\s-]*)(["'])/g, `className=$1premium-${componentName.toLowerCase()}${suffix}-card$3`);
}

fs.writeFileSync(targetFile, codeContent, 'utf8');
console.log(`[INFO] JSX dosyası güncellendi: ${targetFile}`);

// 3. CSS Kurallarını index.css'e Yazma
if (fs.existsSync(indexCssFile)) {
  let cssContent = fs.readFileSync(indexCssFile, 'utf8');
  const cssMarker = `/* PREMIUM DESIGN FOR ${componentName.toUpperCase()} */`;
  
  if (cssContent.includes(cssMarker)) {
    // Varsa eski bloğu temizle
    console.log('[INFO] Bu bileşen için eski stiller temizleniyor ve yenisi yazılıyor.');
    const regex = new RegExp(`\\/\\* PREMIUM DESIGN FOR ${componentName.toUpperCase()} \\*\\/[\\s\\S]*?(\\/\\* PREMIUM|$|@keyframes premiumSlideInRight|@keyframes premiumFadeInUp|@keyframes premiumGlowRotate)`, 'g');
    cssContent = cssContent.replace(cssMarker, ''); // Basitçe en sona ekleyeceğimiz için ezebiliriz.
  }
  
  let newCss = '';
  if (selectedAlternative === 'A') {
    newCss = `
${cssMarker}
.premium-${componentName.toLowerCase()}-container {
  background-color: hsl(var(--background)) !important;
  background-image: radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.05) 0%, transparent 80%) !important; /* Premium Altın Parıltı */
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  color: hsl(var(--foreground)) !important;
  transition: all 0.5s ease;
}

.premium-${componentName.toLowerCase()}-card {
  background: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  padding: 3.5rem !important;
  border-radius: 4px !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75) !important;
  max-width: 460px;
  width: 100%;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  animation: premiumFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Kullanıcının değiştiremeyeceği altın çizgi */
.premium-${componentName.toLowerCase()}-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #D4AF37, transparent); /* Sabit Altın Tonu */
}

@keyframes premiumFadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
  } else if (selectedAlternative === 'B') {
    newCss = `
${cssMarker}
.premium-${componentName.toLowerCase()}-grid-container {
  background-color: hsl(var(--background)) !important;
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  font-family: 'Manrope', sans-serif;
  color: hsl(var(--foreground)) !important;
}

@media (max-width: 768px) {
  .premium-${componentName.toLowerCase()}-grid-container {
    grid-template-columns: 1fr;
  }
}

.premium-${componentName.toLowerCase()}-grid-card {
  background: rgba(8, 17, 31, 0.7) !important;
  backdrop-filter: blur(16px) !important;
  border-left: 1px solid hsl(var(--border)) !important;
  padding: 4rem !important;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5) !important;
  position: relative;
  overflow: hidden;
  animation: premiumSlideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Kart içindeki tüm elementleri z-index ile öne çıkarma */
.premium-${componentName.toLowerCase()}-grid-card > * {
  position: relative;
  z-index: 2;
}

/* Kullanıcının değiştiremeyeceği altın çizgi */
.premium-${componentName.toLowerCase()}-grid-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, transparent, #D4AF37, transparent); /* Sabit Altın Tonu */
  z-index: 3;
}

/* C'den entegre edilen döner altın glow efekti */
.premium-${componentName.toLowerCase()}-grid-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg, transparent, rgba(212, 175, 55, 0.12), transparent 35%);
  animation: premiumGlowRotate 12s linear infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes premiumGlowRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}


@keyframes premiumSlideInRight {
  from {
    opacity: 0;
    transform: translateX(40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;
  } else if (selectedAlternative === 'C') {
    newCss = `
${cssMarker}
.premium-${componentName.toLowerCase()}-glow-container {
  background-color: hsl(var(--background)) !important;
  background-image: radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.04) 0%, transparent 60%),
                    radial-gradient(circle at 80% 80%, rgba(200, 26, 86, 0.04) 0%, transparent 60%) !important;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  color: hsl(var(--foreground)) !important;
  transition: all 0.5s ease;
}

.premium-${componentName.toLowerCase()}-glow-card {
  background: rgba(8, 17, 31, 0.7) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(212, 175, 55, 0.2) !important; /* İnce Altın Kenarlık */
  padding: 3.5rem !important;
  border-radius: 8px !important;
  box-shadow: 0 0 40px rgba(212, 175, 55, 0.03), 0 30px 60px rgba(0, 0, 0, 0.6) !important;
  max-width: 460px;
  width: 100%;
  position: relative;
  overflow: hidden;
  animation: premiumFadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Kullanıcının değiştiremeyeceği sabit döner altın ışık efekti */
.premium-${componentName.toLowerCase()}-glow-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg, transparent, rgba(212, 175, 55, 0.1), transparent 30%);
  animation: premiumGlowRotate 12s linear infinite;
  pointer-events: none;
}

@keyframes premiumGlowRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
  }

  fs.appendFileSync(indexCssFile, newCss, 'utf8');
  console.log(`[INFO] CSS kuralları index.css dosyasına eklendi.`);
}

console.log(`[SUCCESS] Alternatif '${selectedAlternative}' başarıyla uygulandı!`);
