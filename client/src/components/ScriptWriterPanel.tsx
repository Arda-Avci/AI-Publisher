import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, Clock, Copy, Check, ChevronDown, ChevronUp, Loader, BookOpen, User, RefreshCw, FileText, Upload, Palette } from 'lucide-react';
import { StoryboardGrid } from './StoryboardGrid.js';

type Quality = 'low' | 'medium' | 'high';
type WriterTier = 'professional' | 'creative' | 'assistant';

interface ArtStylePreset {
  id: string;
  name: string;
  description: string;
  style: string;
  moodTags: string[];
  colorPalette: string[];
  referenceDirectors?: string[];
}

interface ScriptOutput {
  id?: number;
  logline: string;
  theme: string;
  genre: string;
  characters: Array<{ name: string; age?: number; motivation: string; flaw: string; description?: string }>;
  synopsis: string;
  scenes: Array<{ sceneNumber: number; location: string; timeOfDay: string; interior: boolean; purpose: string; characters: string[]; plot: string }>;
  fullScript: string;
  revisionCount: number;
  status: string;
}

interface ScriptListItem {
  id: number;
  topic: string;
  status: string;
  revision_count: number;
  created_at: string;
}

interface LibraryCharacter {
  id: number;
  name: string;
  freeform_description?: string;
  role?: string;
  age?: number;
  gender?: string;
}

export function ScriptWriterPanel({ language }: { language: 'tr' | 'en' }) {
  const isTr = language === 'tr';
  const [topic, setTopic] = useState('');
  const [characterProfiles, setCharacterProfiles] = useState('');
  const [quality, setQuality] = useState<Quality>('medium');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [script, setScript] = useState<ScriptOutput | null>(null);
  const [scriptsList, setScriptsList] = useState<ScriptListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [expandedScript, setExpandedScript] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [editorText, setEditorText] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [characters, setCharacters] = useState<LibraryCharacter[]>([]);
  const [showCharDropdown, setShowCharDropdown] = useState(false);
  const [charSearch, setCharSearch] = useState('');
  const [writerTier, setWriterTier] = useState<WriterTier>('professional');
  const [artStyles, setArtStyles] = useState<ArtStylePreset[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [selectedArtStyle, setSelectedArtStyle] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedText, setUploadedText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charInputRef = useRef<HTMLTextAreaElement>(null);
  const charDropdownRef = useRef<HTMLDivElement>(null);

  const t = useCallback((tr: string, en: string) => isTr ? tr : en, [isTr]);

  useEffect(() => { fetchScripts(); fetchCharacters(); fetchArtStyles(); }, []);

  useEffect(() => {
    if (!showCharDropdown) return;
    const handler = (e: MouseEvent) => {
      if (charDropdownRef.current && !charDropdownRef.current.contains(e.target as Node)) {
        setShowCharDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCharDropdown]);

  const fetchScripts = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/v1/crew/scripts');
      const d = await res.json();
      if (d.status === 'success') setScriptsList(d.data);
    } catch { /* ignore */ }
    setLoadingList(false);
  };

  const fetchCharacters = async () => {
    try {
      const res = await fetch('/api/v1/character-library');
      const d = await res.json();
      if (d.status === 'success') setCharacters(d.data || []);
    } catch { /* ignore */ }
  };

  const fetchArtStyles = async () => {
    setLoadingStyles(true);
    try {
      const res = await fetch('/api/v1/crew/art-styles');
      const d = await res.json();
      if (d.status === 'success') setArtStyles(d.data || []);
    } catch { /* ignore */ }
    setLoadingStyles(false);
  };

  const uploadDocument = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });
      const result = await new Promise<{ text: string; fullLength: number }>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const d = JSON.parse(xhr.responseText);
            if (d.status === 'success') resolve(d.data);
            else reject(new Error(d.error || 'Upload failed'));
          } else {
            try { const d = JSON.parse(xhr.responseText); reject(new Error(d.error || 'Upload failed')); }
            catch { reject(new Error('Upload failed')); }
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', '/api/v1/crew/upload-doc');
        xhr.send(formData);
      });
      setUploadedFileName(file.name);
      setUploadedText(result.text);
    } catch (err: any) {
      setError(err.message || t('Dosya yüklenemedi.', 'File upload failed.'));
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadDocument(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDocument(file);
  };

  const clearUploadedDoc = () => {
    setUploadedText('');
    setUploadedFileName('');
    setUploadProgress(0);
  };

  const loadScriptDetail = async (id: number) => {
    if (expandedScript === id) {
      setExpandedScript(null);
      return;
    }
    try {
      const res = await fetch(`/api/v1/crew/scripts/${id}`);
      const d = await res.json();
      if (d.status === 'success' && d.data) {
        const parsed = typeof d.data.full_script === 'string'
          ? JSON.parse(d.data.full_script)
          : d.data.full_script;
        setScript(parsed);
        setExpandedScript(id);
      }
    } catch { /* ignore */ }
  };

  const handleCharInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCharacterProfiles(val);
    const cursorPos = e.target.selectionStart;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setCharSearch(atMatch[1].toLowerCase());
      setShowCharDropdown(true);
    } else {
      setShowCharDropdown(false);
    }
  };

  const insertCharName = (name: string) => {
    const ta = charInputRef.current;
    if (!ta) return;
    const cursorPos = ta.selectionStart;
    const textBefore = ta.value.slice(0, cursorPos);
    const atIdx = textBefore.lastIndexOf('@', cursorPos - 1);
    if (atIdx === -1) return;
    const newVal = ta.value.slice(0, atIdx) + `@${name} ` + ta.value.slice(cursorPos);
    setCharacterProfiles(newVal);
    setShowCharDropdown(false);
    ta.focus();
    const newPos = atIdx + name.length + 2;
    setTimeout(() => ta.setSelectionRange(newPos, newPos), 0);
  };

  const filteredChars = characters.filter(c =>
    c.name.toLowerCase().includes(charSearch)
  );

  const generateScript = async () => {
    if (!topic.trim() || topic.trim().length < 3) {
      setError(t('Konu en az 3 karakter olmalıdır.', 'Topic must be at least 3 characters.'));
      return;
    }
    setError('');
    setGenerating(true);
    setScript(null);
    let enrichedTopic = topic.trim();
    if (uploadedText) enrichedTopic += '\n\n[Doküman Metni]\n' + uploadedText;
    try {
      const res = await fetch('/api/v1/crew/write-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: enrichedTopic,
          characterProfiles: characterProfiles.trim() || undefined,
          writerTier,
          artStyle: selectedArtStyle || undefined,
        }),
      });
      const d = await res.json();
      if (d.status === 'success') {
        setScript(d.data);
        setEditorText(d.data.fullScript || '');
        setShowEditor(false);
        fetchScripts();
      } else {
        setError(d.error || t('Senaryo üretilemedi.', 'Failed to generate script.'));
      }
    } catch (err: any) {
      setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
    }
    setGenerating(false);
  };

  const copyFullScript = () => {
    if (!script?.fullScript) return;
    navigator.clipboard.writeText(script.fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return d; }
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return { label: t('ONAYLANDI', 'APPROVED'), color: 'hsl(142,60%,50%)', bg: 'hsla(142,60%,50%,0.12)' };
    if (s === 'revised') return { label: t('DÜZENLENDİ', 'REVISED'), color: 'hsl(38,90%,50%)', bg: 'hsla(38,90%,50%,0.12)' };
    if (s === 'max_revisions') return { label: t('MAKS REVİZYON', 'MAX REVISIONS'), color: 'hsl(0,70%,50%)', bg: 'hsla(0,70%,50%,0.12)' };
    return { label: s, color: 'var(--text-muted)', bg: 'transparent' };
  };

  const sectionTitle = (icon: React.ReactNode, text: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
      {icon}
      <span>{text}</span>
    </div>
  );

  const s: Record<string, React.CSSProperties> = {
    panel: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 1,
      maxWidth: 960,
      margin: '0 auto',
    },
    card: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-muted)',
      marginBottom: 6,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    },
    input: {
      width: '100%',
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      fontFamily: 'var(--font-sans)',
      resize: 'vertical' as const,
      boxSizing: 'border-box' as const,
    },
    select: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none',
      cursor: 'pointer',
    },
    btn: {
      padding: '10px 24px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.2s',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
      color: 'white',
    },
    btnSecondary: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
    },
    divider: {
      height: 1,
      background: 'var(--border)',
      margin: '24px 0',
      opacity: 0.5,
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
    },
    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 11,
      background: 'hsla(var(--primary),0.08)',
      color: 'hsl(var(--primary))',
      border: '1px solid hsla(var(--primary),0.2)',
    },
  };

  return (
    <div style={s.panel}>
      {/* Generator Card */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('AI Senaryo Yazma', 'AI Script Writer')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('CrewAI multi-agent pipeline ile endüstriyel senaryo üretimi', 'Industrial-grade script generation via CrewAI multi-agent pipeline')}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>
            {t('KONU / KONSEPT', 'TOPIC / CONCEPT')}
          </label>
          <textarea
            style={{ ...s.input, minHeight: 80 }}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={t(
              'Hikayenizin ana konusunu yazın...',
              'Write the main concept of your story...'
            )}
          />
        </div>

        <div style={{ marginBottom: 16, position: 'relative' }}>
          <label style={s.label}>
            {t('KARAKTER REFERANSLARI (OPSİYONEL)', 'CHARACTER REFERENCES (OPTIONAL)')}
          </label>
          <textarea
            ref={charInputRef}
            style={{ ...s.input, minHeight: 60 }}
            value={characterProfiles}
            onChange={handleCharInput}
            placeholder={t(
              '@karakter_adı yazarak kütüphaneden karakter ekleyin ve/veya elle tanımlayın...\nÖrn: @elif 25 yaşında cesur bir gazeteci',
              'Type @char_name to reference library characters and/or describe manually...\nE.g: @elif 25yo brave journalist'
            )}
          />
          {characters.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {characters.slice(0, 8).map(c => (
                <button
                  key={c.id}
                  onClick={() => insertCharName(c.name)}
                  style={s.chip}
                  type="button"
                >
                  <User size={10} /> @{c.name}
                </button>
              ))}
            </div>
          )}
          {showCharDropdown && filteredChars.length > 0 && (
            <div
              ref={charDropdownRef}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                maxHeight: 200,
                overflowY: 'auto',
                marginTop: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              {filteredChars.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => insertCharName(c.name)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <User size={12} style={{ opacity: 0.5 }} />
                  <span style={{ fontWeight: 600 }}>@{c.name}</span>
                  {c.role && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({c.role})</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Art Style Presets */}
        <div style={{ marginBottom: 16 }}>
          {sectionTitle(<Palette size={13} />, t('GÖRSEL STİL', 'ART STYLE'))}
          {loadingStyles ? (
            <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>
              <Loader size={14} className="spin" />
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              maxHeight: 320,
              overflowY: 'auto',
            }}>
              {artStyles.map(p => {
                const selected = selectedArtStyle === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedArtStyle(selected ? '' : p.id)}
                    style={{
                      minHeight: 200,
                      background: selected ? 'hsla(var(--primary),0.1)' : 'var(--bg-primary)',
                      border: selected ? '2px solid hsl(var(--primary))' : '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {p.description.length > 100 ? p.description.slice(0, 100) + '...' : p.description}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.colorPalette.map((c, i) => (
                        <div
                          key={i}
                          title={c}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            background: c,
                            border: '1px solid var(--border)',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
                      {p.moodTags.slice(0, 4).map(m => (
                        <span key={m} style={s.chip}>{m}</span>
                      ))}
                    </div>
                    {p.referenceDirectors && p.referenceDirectors.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {p.referenceDirectors.join(', ')}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Document Upload */}
        <div style={{ marginBottom: 16 }}>
          {sectionTitle(<FileText size={13} />, t('DOKÜMAN YÜKLE (OPSİYONEL)', 'DOCUMENT UPLOAD (OPTIONAL)'))}
          {uploading ? (
            <div style={{
              padding: 20,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                {t('Yükleniyor...', 'Uploading...')}
              </div>
              <div style={{
                width: '100%',
                height: 6,
                background: 'var(--border)',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{uploadProgress}%</div>
            </div>
          ) : uploadedText ? (
            <div style={{
              padding: 14,
              background: 'var(--bg-primary)',
              border: '1px solid hsl(var(--primary))',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  <FileText size={12} />
                  {uploadedFileName}
                </div>
                <button
                  type="button"
                  onClick={clearUploadedDoc}
                  style={{
                    ...s.btn,
                    padding: '4px 10px',
                    fontSize: 11,
                    color: 'hsl(0,70%,60%)',
                    background: 'transparent',
                    border: '1px solid hsla(0,70%,50%,0.2)',
                  }}
                >
                  {t('Kaldır', 'Remove')}
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }}>
                {uploadedText.slice(0, 200)}
                {uploadedText.length > 200 && <span style={{ color: 'hsl(var(--primary))' }}>...</span>}
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                padding: 28,
                border: `2px dashed ${dragOver ? 'hsl(var(--primary))' : 'var(--border)'}`,
                borderRadius: 8,
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                transition: 'all 0.15s',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} style={{ color: 'var(--text-muted)', marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {t('PDF, DOCX veya TXT dosyasını sürükleyin veya tıklayın', 'Drag & drop a PDF, DOCX or TXT file, or click to browse')}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <label style={s.label}>
              {t('KALİTE', 'QUALITY')}
            </label>
            <select
              style={s.select}
              value={quality}
              onChange={e => setQuality(e.target.value as Quality)}
            >
              <option value="low">{t('Düşük (Hızlı)', 'Low (Fast)')}</option>
              <option value="medium">{t('Orta (Dengeli)', 'Medium (Balanced)')}</option>
              <option value="high">{t('Yüksek (Detaylı)', 'High (Detailed)')}</option>
            </select>
          </div>
          <div>
            <label style={s.label}>
              {t('YAZAR SEVİYESİ', 'WRITER TIER')}
            </label>
            <select
              style={s.select}
              value={writerTier}
              onChange={e => setWriterTier(e.target.value as WriterTier)}
            >
              <option value="professional">{t('Profesyonel (3 revizyon)', 'Professional (3 revisions)')}</option>
              <option value="creative">{t('Yaratıcı (5 revizyon)', 'Creative (5 revisions)')}</option>
              <option value="assistant">{t('Asistan (1 revizyon)', 'Assistant (1 revision)')}</option>
            </select>
          </div>
          <button
            style={{ ...s.btn, ...s.btnPrimary }}
            onClick={generateScript}
            disabled={generating || topic.trim().length < 3}
          >
            {generating ? (
              <><Loader size={14} className="spin" /> {t('Üretiliyor...', 'Generating...')}</>
            ) : (
              <><Send size={14} /> {t('Senaryo Üret', 'Generate Script')}</>
            )}
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)' }}>
            {error}
          </div>
        )}
      </div>

      {/* Generated Script Preview */}
      {script && (
        <div style={s.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {t('Üretilen Senaryo', 'Generated Script')}
              </span>
              <span style={{
                ...s.chip,
                background: statusBadge(script.status).bg,
                color: statusBadge(script.status).color,
                borderColor: statusBadge(script.status).color,
              }}>
                {statusBadge(script.status).label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {script.id && (
                <button
                  style={{ ...s.btn, ...s.btnSecondary }}
                  onClick={() => {
                    const item = scriptsList.find(s => s.id === script.id);
                    if (item) { setTopic(item.topic); }
                  }}
                >
                  <RefreshCw size={12} />
                </button>
              )}
              <button
                style={{ ...s.btn, ...s.btnSecondary }}
                onClick={copyFullScript}
              >
                {copied ? <Check size={12} color="green" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{script.logline}"</span>
          </div>

          <div style={s.grid2}>
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('Tema', 'Theme')}</span>
              <div style={{ fontSize: 13, marginTop: 2 }}>{script.theme}</div>
            </div>
            <div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('Tür', 'Genre')}</span>
              <div style={{ fontSize: 13, marginTop: 2 }}>{script.genre}</div>
            </div>
          </div>

          <div style={s.divider} />

          {/* Characters */}
          {sectionTitle(<User size={13} />, t('Karakterler', 'Characters'))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {script.characters.map((ch, i) => (
              <div key={i} style={{
                padding: '10px 14px',
                background: 'var(--bg-primary)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  {ch.name}
                  {ch.age && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>({ch.age})</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong>{t('Motivasyon', 'Motivation')}:</strong> {ch.motivation}
                  <br />
                  <strong>{t('Zayıflık', 'Flaw')}:</strong> {ch.flaw}
                </div>
              </div>
            ))}
          </div>

          {/* Synopsis */}
          {sectionTitle(<BookOpen size={13} />, t('Özet', 'Synopsis'))}
          <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
            {script.synopsis}
          </div>

          {/* Scene Plan */}
          {sectionTitle(<Clock size={13} />, t('Sahne Planı', 'Scene Plan'))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {script.scenes.map(sc => (
              <div key={sc.sceneNumber} style={{
                padding: '8px 12px',
                background: 'var(--bg-primary)',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 11, color: 'hsl(var(--primary))' }}>
                    #{sc.sceneNumber}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {sc.interior ? 'İÇ' : 'DIŞ'} · {sc.location} · {sc.timeOfDay}
                  </span>
                  {sc.characters.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      🎭 {sc.characters.join(', ')}
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--text-primary)' }}>
                  <strong>{sc.purpose}</strong>: {sc.plot}
                </div>
              </div>
            ))}
          </div>

          {/* Full Script */}
          {sectionTitle(<Sparkles size={13} />, t('Tam Senaryo', 'Full Script'))}
          {showEditor ? (
            <textarea
              style={{ ...s.input, minHeight: 300, fontFamily: 'var(--font-mono)', fontSize: 12 }}
              value={editorText}
              onChange={e => setEditorText(e.target.value)}
            />
          ) : (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-mono)',
              maxHeight: 400,
              overflowY: 'auto',
              color: 'var(--text-primary)',
            }}>
              {script.fullScript}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              style={{ ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 14px' }}
              onClick={() => setShowEditor(!showEditor)}
            >
              {showEditor ? t('Önizle', 'Preview') : t('Düzenle', 'Edit')}
            </button>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {t('Revizyon', 'Revision')} #{script.revisionCount}
            </span>
          </div>

          {/* Storyboard */}
          {script.id && script.scenes && script.scenes.length > 0 && (
            <>
              <div style={{ marginTop: 24 }}>
                <StoryboardGrid scriptId={script.id} scenes={script.scenes} language={language} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Script History */}
      <div style={s.card}>
        {sectionTitle(<Clock size={13} />, t('Geçmiş Senaryolar', 'Script History'))}
        {loadingList ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
            <Loader size={16} className="spin" />
          </div>
        ) : scriptsList.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {t('Henüz senaryo üretilmedi.', 'No scripts generated yet.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {scriptsList.map(item => {
              const isExpanded = expandedScript === item.id;
              return (
                <div key={item.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}>
                  <button
                    type="button"
                    onClick={() => loadScriptDetail(item.id)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.topic.slice(0, 60)}
                      </span>
                      <span style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: statusBadge(item.status).bg,
                        color: statusBadge(item.status).color,
                        whiteSpace: 'nowrap',
                      }}>
                        {statusBadge(item.status).label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {formatDate(item.created_at)}
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
