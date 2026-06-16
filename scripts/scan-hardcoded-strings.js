"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const srcDir = (0, path_1.join)(__dirname, '..', 'src');
const clientSrcDir = (0, path_1.join)(__dirname, '..', 'client', 'src');
const turkishStrings = [
    'fırsat', 'hunis', 'yayın', 'video', 'kuyruk', 'onay', 'ret', 'işleniyor', 'tamamlandı',
    'hata', 'başarılı', 'başarısız', 'bekle', 'hazır', 'senaryo', ' sahne', 'oynat', 'durdur',
    'gönder', 'sil', 'düzenle', 'ekle', 'kaldır', 'kaydet', 'yükle', 'indir', 'izle', 'beğen',
    'yorum', 'abone', 'takip', 'paylaş', 'kopyala', 'yapıştır', 'geri al', 'ileri al',
    'ayarlar', 'profil', 'şifre', 'kullanıcı', 'oturum', 'çıkış', 'giriş', 'kayıt',
    'dil', 'tema', 'renk', 'yazı', 'boyut', 'konum', 'kenar', 'dolgu', 'kenarlık',
    'oluştur', 'oluşturuldu', 'güncelle', 'güncellendi', 'silindi', 'bulunamadı',
    'zaten var', 'devam et', 'iptal', 'tamam', 'evet', 'hayır', 'geri', 'ileri',
    'sonraki', 'önceki', 'ilk', 'son', 'sayfa', 'liste', 'tablo', 'grid',
    'başlık', 'açıklama', 'etiket', 'kategori', 'tür', 'tip', 'durum', 'statu',
    'kullanılabilir', 'kullanılamaz', 'aktif', 'pasif', 'ücretli', 'ücretsiz',
    'premium', 'standart', 'basic', 'pro', 'enterprise', 'trial', 'deneme',
    'lisans', 'anahtar', 'api', 'token', 'secret', 'key',
    'izleyici', 'görüntülenme', 'beğeni', 'yorum sayısı', 'abone sayısı',
    'kanal', 'playlist', 'albüm', 'koleksiyon', 'galeri',
    '倍', '倍', '倍', '倍', '倍', '倍', '倍', '倍', '倍', '倍'
];
const englishStrings = [
    'success', 'failed', 'error', 'loading', 'processing', 'completed', 'pending',
    'queue', 'approve', 'reject', 'retry', 'cancel', 'confirm', 'delete', 'edit',
    'create', 'update', 'read', 'write', 'copy', 'paste', 'undo', 'redo',
    'login', 'logout', 'register', 'settings', 'profile', 'password', 'username',
    'email', 'phone', 'name', 'surname', 'first name', 'last name',
    'submit', 'save', 'load', 'download', 'upload', 'preview', 'view',
    'add', 'remove', 'clear', 'reset', 'search', 'filter', 'sort', 'order',
    'home', 'about', 'contact', 'help', 'faq', 'terms', 'privacy', 'policy',
    'account', 'settings', 'preferences', 'language', 'theme', 'color', 'font',
    'size', 'width', 'height', 'margin', 'padding', 'border', 'radius',
    'active', 'inactive', 'enabled', 'disabled', 'visible', 'hidden',
    'basic', 'pro', 'premium', 'enterprise', 'trial', 'free', 'paid',
    'video', 'audio', 'image', 'text', 'subtitle', 'caption', 'thumbnail',
    'title', 'description', 'tag', 'category', 'type', 'status',
    'subscribers', 'views', 'likes', 'comments', 'shares', 'watch time',
    'channel', 'playlist', 'collection', 'gallery', 'library',
    'license', 'key', 'token', 'secret', 'api', 'webhook', 'endpoint',
    'follow', 'following', 'followers', 'unfollow', 'block', 'unblock', 'report',
    'notification', 'alert', 'warning', 'info', 'message', 'chat', 'support'
];
const ignorePatterns = [
    /https?:\/\//,
    /\.\/|\.\.\//,
    /console\.(log|error|warn|info)/,
    /catch\s*\(\s*\w*\s*\)/,
    /throw\s+new\s+Error/,
    /Error\s*\(/,
    /['"`]\//,
    /process\.env/,
    /__dirname|__filename/,
    /\.json$/,
    /^\s*\/\//,
    /^\s*\*\s/,
    /^\s*\/\*/,
];
function shouldIgnore(line, col, text) {
    const substring = line.substring(Math.max(0, col - 20), col + text.length + 20);
    for (const pattern of ignorePatterns) {
        if (pattern.test(substring))
            return true;
    }
    return false;
}
function scanFile(filePath) {
    const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const col = line.indexOf('t(');
        if (col !== -1)
            continue;
        for (const str of turkishStrings) {
            const regex = new RegExp(`['"\`]${str}[='"\`]`, 'i');
            const match = line.match(regex);
            if (match && !shouldIgnore(line, line.indexOf(match[0]), match[0])) {
                console.log(`${filePath}:${i + 1}:[TR] "${match[0]}"`);
            }
        }
        for (const str of englishStrings) {
            const regex = new RegExp(`['"\`]${str}[='"\`]`, 'gi');
            let match;
            while ((match = regex.exec(line)) !== null) {
                if (!shouldIgnore(line, match.index, match[0])) {
                    console.log(`${filePath}:${i + 1}:[EN] "${match[0]}"`);
                }
            }
        }
    }
}
function scanDir(dir) {
    try {
        const entries = (0, fs_1.readdirSync)(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = (0, path_1.join)(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                scanDir(fullPath);
            }
            else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                scanFile(fullPath);
            }
        }
    }
    catch (e) {
        // ignore
    }
}
console.log('=== Hardcoded String Scanner ===');
scanDir(srcDir);
scanDir(clientSrcDir);
console.log('=== Scan Complete ===');
