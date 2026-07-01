import { useState } from 'react';
import { Mic, Download, Loader, FileAudio, Check } from 'lucide-react';

interface EpisodeDisplay {
  speaker: string;
  text: string;
  emotion: string;
  sfxPrompt: string;
}

export function PodcastPanel({
  language: _language,
}: {
  language: string;
}) {
  const [prompt, setPrompt] = useState('');
  const [characters, setCharacters] = useState('');
  const [voice, setVoice] = useState('af_bella');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    podcastTitle: string;
    episodes: EpisodeDisplay[];
    downloadUrl: string;
  } | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await fetch('/api/v1/podcast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          characters: characters.trim() || undefined,
          voice: voice || undefined,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setResult(d);
      } else {
        setError(d.error || 'Bilinmeyen hata');
      }
    } catch (e: any) {
      setError(e.message || 'Sunucu hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
        <Mic size={18} /> Podcast Seslendirme
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Video açıklaması / Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Videonun içeriğini, sahnelenmesini ve anlatıcının ses tonunu açıkla..."
          rows={4}
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-sans)',
            resize: 'vertical',
          }}
        />

        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Karakterler / Anlatıcılar (opsiyonel)</label>
        <input
          value={characters}
          onChange={(e) => setCharacters(e.target.value)}
          placeholder="Örn: &quot;Sıcak bir erkek anlatıcı (Ahmet), enerjik kadın yorumcu (Zeynep)&quot;"
          style={{
            width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 12,
          }}
        />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Ses</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            style={{
              padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)',
              background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 11,
            }}
          >
            <option value="af_bella">Bella (Kadın, Doğal)</option>
            <option value="af_nicole">Nicole (Kadın, Sakin)</option>
            <option value="af_sarah">Sarah (Kadın, Profesyonel)</option>
            <option value="am_adam">Adam (Erkek, Doğal)</option>
            <option value="am_michael">Michael (Erkek, Derin)</option>
            <option value="bf_emma">Emma (Kadın, İngilizce)</option>
            <option value="bm_george">George (Erkek, İngilizce)</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 6, border: 'none',
            background: loading ? 'var(--text-muted)' : 'var(--accent)', color: 'white',
            cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', fontSize: 12,
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {loading ? <Loader size={14} className="spin" /> : <FileAudio size={14} />}
          {loading ? 'Oluşturuluyor...' : 'Podcast Seslendirme Oluştur'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ef4444', fontSize: 11, padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              <Check size={14} style={{ color: '#22c55e', marginRight: 6 }} />
              {result.podcastTitle}
            </div>
            <a
              href={result.downloadUrl}
              download
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid var(--accent)', color: 'var(--accent)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Download size={14} /> İndir (.wav)
            </a>
          </div>

          <audio controls style={{ width: '100%', height: 36 }}>
            <source src={result.downloadUrl} type="audio/wav" />
          </audio>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            {result.episodes.length} bölüm — Video düzenleyicide ses dosyası olarak kullanabilirsin.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflow: 'auto' }}>
            {result.episodes.map((ep, i) => (
              <div key={i} style={{
                fontSize: 10, padding: '6px 8px', borderRadius: 4,
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{ep.speaker}</span>
                {ep.emotion !== 'neutral' && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({ep.emotion})</span>
                )}
                <span style={{ marginLeft: 6, color: 'var(--text-primary)' }}>{ep.text}</span>
                {ep.sfxPrompt && ep.sfxPrompt !== 'none' && (
                  <div style={{ color: '#a855f7', marginTop: 2 }}>🔊 {ep.sfxPrompt}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
