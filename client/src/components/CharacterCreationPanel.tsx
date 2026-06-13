import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { UserPlus, User, Edit3, Trash2, Image as ImageIcon, Loader } from 'lucide-react';
import type { Character } from '../types.js';

const ARCHETYPES = ['protagonist', 'mentor', 'comic_relief', 'antagonist', 'supporting', 'narrator'] as const;
const VOICE_PROVIDERS = ['edge', 'openai', 'xtts'] as const;

const VOICE_DEFAULTS: Record<string, string> = {
  edge: 'tr-TR-AhmetNeural',
  openai: 'alloy',
  xtts: '',
};

const s: Record<string, React.CSSProperties> = {
  panel: {
    background: 'var(--card)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--primary)',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '10px',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '2px',
  },
  cardDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '4px',
  },
  cardMeta: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '12px',
  },
  cardActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
  },
  input: {
    width: '100%',
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'white',
    padding: '7px 10px',
    fontSize: '12px',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'white',
    padding: '7px 10px',
    fontSize: '12px',
    outline: 'none',
    resize: 'none' as const,
    minHeight: '60px',
  },
  select: {
    width: '100%',
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'white',
    padding: '7px 10px',
    fontSize: '12px',
    outline: 'none',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fileBtn: {
    background: 'rgba(0, 242, 254, 0.08)',
    border: '1px dashed var(--border)',
    borderRadius: '4px',
    color: 'var(--primary)',
    padding: '6px 12px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  btnPrimary: {
    flex: 1,
    background: 'var(--primary)',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  btnCancel: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '24px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  thread: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    background: 'rgba(0, 242, 254, 0.05)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
};

interface CharacterCreationPanelProps {
  csrfToken: string;
  onCharactersChange?: (characters: Character[]) => void;
}

export function CharacterCreationPanel({ csrfToken, onCharactersChange }: CharacterCreationPanelProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleArchetype, setRoleArchetype] = useState<string>('protagonist');
  const [voiceProvider, setVoiceProvider] = useState<string>('edge');
  const [voiceId, setVoiceId] = useState(VOICE_DEFAULTS.edge);
  const [referenceImage, setReferenceImage] = useState<string>('');

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/characters', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setCharacters(json.data);
          onCharactersChange?.(json.data);
        }
      }
    } catch {
      /* server may be offline */
    } finally {
      setLoading(false);
    }
  }, [onCharactersChange]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setRoleArchetype('protagonist');
    setVoiceProvider('edge');
    setVoiceId(VOICE_DEFAULTS.edge);
    setReferenceImage('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (char: Character) => {
    setName(char.name);
    setDescription(char.description);
    setRoleArchetype(char.role_archetype);
    setVoiceProvider(char.voice_provider);
    setVoiceId(char.voice_id);
    setReferenceImage(char.reference_image || '');
    setEditingId(char.id);
    setShowForm(true);
  };

  const handleProviderChange = (provider: string) => {
    setVoiceProvider(provider);
    if (!editingId) {
      setVoiceId(VOICE_DEFAULTS[provider] || '');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        role_archetype: roleArchetype,
        voice_provider: voiceProvider,
        voice_id: voiceId,
      };
      if (referenceImage) {
        body.reference_image = referenceImage;
      }

      const url = editingId ? `/api/v1/characters/${editingId}` : '/api/v1/characters';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        resetForm();
        await fetchCharacters();
      }
    } catch {
      /* handle silently */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu karakteri silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/v1/characters/${id}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken },
        credentials: 'include',
      });
      if (res.ok) {
        await fetchCharacters();
      }
    } catch {
      /* handle silently */
    }
  };

  return (
    <div style={s.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={s.sectionTitle}>
          <User size={14} />
          KARAKTERLER
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={s.iconBtn}
            title="Yeni Karakter"
          >
            <UserPlus size={16} style={{ color: 'var(--primary)' }} />
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Karakter Adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Miki Fare"
              required
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Fiziksel / Kişisel Tasvir</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="small brown mouse with big ears, blue overalls"
              style={s.textarea}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Rol / Arketip</label>
            <select
              value={roleArchetype}
              onChange={(e) => setRoleArchetype(e.target.value)}
              style={s.select}
            >
              {ARCHETYPES.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Ses Sağlayıcı</label>
            <select
              value={voiceProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              style={s.select}
            >
              {VOICE_PROVIDERS.map((vp) => (
                <option key={vp} value={vp}>
                  {vp === 'edge' ? 'Edge Speech' : vp === 'openai' ? 'OpenAI TTS' : 'XTTS'}
                </option>
              ))}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Ses ID</label>
            <input
              type="text"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder={VOICE_DEFAULTS[voiceProvider] || 'Ses ID girin...'}
              style={s.input}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Referans Görseli</label>
            <div style={s.fileRow}>
              <label style={s.fileBtn}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={12} />
                  {referenceImage ? 'Değiştir' : 'Yükle'}
                </span>
              </label>
              {referenceImage && (
                <span style={{ fontSize: '10px', color: 'var(--success)' }}>✓ Yüklendi</span>
              )}
            </div>
          </div>

          <div style={s.formActions}>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{
                ...s.btnPrimary,
                opacity: saving || !name.trim() ? 0.5 : 1,
              }}
            >
              {saving ? <Loader size={12} className="pulse" /> : null}
              {editingId ? 'Güncelle' : 'Oluştur'}
            </button>
            <button type="button" onClick={resetForm} style={s.btnCancel}>
              İptal
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={s.empty}>
          <Loader size={14} className="pulse" style={{ marginRight: 6 }} />
          Yükleniyor...
        </div>
      ) : characters.length === 0 ? (
        <div style={s.empty}>
          Henüz karakter eklenmemiş. "Yeni Karakter" butonuna tıklayarak başlayın.
        </div>
      ) : (
        <div style={s.list}>
          {characters.map((char) => (
            <div key={char.id} style={s.card}>
              <div style={s.thread}>
                {char.reference_image ? (
                  <img src={char.reference_image} alt={char.name} style={s.thumb} />
                ) : (
                  <User size={18} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                )}
              </div>
              <div style={s.cardBody}>
                <div style={s.cardName}>{char.name}</div>
                <div style={s.cardDesc}>{char.description}</div>
                <div style={s.cardMeta}>
                  <span>{char.role_archetype.replace(/_/g, ' ')}</span>
                  <span>{char.voice_provider} / {char.voice_id}</span>
                </div>
              </div>
              <div style={s.cardActions}>
                <button
                  onClick={() => handleEdit(char)}
                  style={{ ...s.iconBtn, color: 'var(--primary)' }}
                  title="Düzenle"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(char.id)}
                  style={{ ...s.iconBtn, color: 'rgba(239, 68, 68, 0.7)' }}
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
