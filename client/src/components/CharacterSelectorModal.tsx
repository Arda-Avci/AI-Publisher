import { useState, useEffect } from 'react';
import type React from 'react';
import { Users, Sparkles, Check, X, AlertTriangle, Loader } from 'lucide-react';

export function extractCharacterNames(text: string): string[] {
  const matches = text.match(/@(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

interface CharacterSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (characterMap: Record<string, { name: string; description: string; isNew: boolean }>) => void;
  detectedNames: string[];
  existingCharacters: Array<{ id: number; name: string; description: string; slug: string }>;
  csrfToken: string;
}

interface AssignState {
  sourceName: string;
  type: 'existing' | 'new' | 'ai' | null;
  existingId: number | null;
  newName: string;
  newDescription: string;
  generating: boolean;
  error: string;
  aiName: string;
  aiDescription: string;
}

const sty: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: 'linear-gradient(135deg, rgba(7,10,20,0.97), rgba(15,20,40,0.95))',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    width: '90%', maxWidth: '700px', maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  title: {
    fontSize: '16px', fontWeight: 700, color: 'white',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '12px',
    flex: 1,
  },
  item: {
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  itemHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  itemName: {
    fontSize: '14px', fontWeight: 600, color: 'white',
    display: 'flex', alignItems: 'center', gap: '8px',
    fontFamily: 'monospace',
  },
  badge: {
    fontSize: '10px', padding: '2px 10px', borderRadius: '10px',
    fontWeight: 600, whiteSpace: 'nowrap' as const,
  },
  badgeAssigned: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: 'rgb(34, 197, 94)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  badgePending: {
    background: 'rgba(234, 179, 8, 0.15)',
    color: 'rgb(234, 179, 8)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
  },
  select: {
    width: '100%',
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '6px', color: 'white',
    padding: '8px 12px', fontSize: '12px', outline: 'none',
  },
  input: {
    flex: 1, minWidth: '120px',
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '6px', color: 'white',
    padding: '8px 12px', fontSize: '12px', outline: 'none',
  },
  textarea: {
    flex: 2, minWidth: '180px',
    background: '#070a14',
    border: '1px solid var(--border)',
    borderRadius: '6px', color: 'white',
    padding: '8px 12px', fontSize: '12px', outline: 'none',
    resize: 'vertical' as const, minHeight: '48px',
    fontFamily: 'inherit',
  },
  btnAi: {
    background: 'rgba(168, 85, 247, 0.12)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '6px',
    color: 'rgb(168, 85, 247)',
    padding: '8px 14px',
    fontSize: '11px', fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s ease',
  },
  btnAiDisabled: {
    opacity: 0.5, cursor: 'not-allowed',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '12px', flexShrink: 0,
  },
  btnPrimary: {
    background: 'var(--primary)',
    border: 'none', borderRadius: '8px',
    color: 'white', padding: '10px 20px',
    fontSize: '13px', fontWeight: 600,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px',
    transition: 'all 0.15s ease',
  },
  btnDisabled: {
    opacity: 0.4, cursor: 'not-allowed',
  },
  btnCancel: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-muted)',
    padding: '10px 20px',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px',
    transition: 'all 0.15s ease',
  },
  errorText: {
    fontSize: '11px', color: 'rgba(239, 68, 68, 0.85)',
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  empty: {
    padding: '40px 24px', textAlign: 'center' as const,
    fontSize: '13px', color: 'var(--text-muted)',
  },
};

export function CharacterSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  detectedNames,
  existingCharacters,
  csrfToken,
}: CharacterSelectorModalProps) {
  const [assignments, setAssignments] = useState<AssignState[]>([]);
  const [globalGenerating, setGlobalGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAssignments(
        detectedNames.map((n) => ({
          sourceName: n,
          type: null,
          existingId: null,
          newName: '',
          newDescription: '',
          generating: false,
          error: '',
          aiName: '',
          aiDescription: '',
        }))
      );
    }
  }, [isOpen, detectedNames]);

  const update = (sourceName: string, patch: Partial<AssignState>) => {
    setAssignments((prev) =>
      prev.map((a) => (a.sourceName === sourceName ? { ...a, ...patch } : a))
    );
  };

  const handleSelectExisting = (sourceName: string, value: string) => {
    if (!value) {
      update(sourceName, { type: null, existingId: null });
      return;
    }
    update(sourceName, {
      type: 'existing', existingId: Number(value),
      error: '', newName: '', newDescription: '',
    });
  };

  const handleNewName = (sourceName: string, val: string) => {
    const a = assignments.find((x) => x.sourceName === sourceName);
    if (a?.type !== 'new') {
      update(sourceName, { type: 'new', existingId: null, newName: val, error: '' });
    } else {
      update(sourceName, { newName: val });
    }
  };

  const handleNewDesc = (sourceName: string, val: string) => {
    const a = assignments.find((x) => x.sourceName === sourceName);
    if (a?.type !== 'new') {
      update(sourceName, { type: 'new', existingId: null, newDescription: val, error: '' });
    } else {
      update(sourceName, { newDescription: val });
    }
  };

  const handleGenerateOne = async (sourceName: string) => {
    update(sourceName, { generating: true, error: '' });
    try {
      const res = await fetch('/api/v1/characters/generate-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ prompt: sourceName, name: sourceName }),
      });
      if (!res.ok) throw new Error('AI üretimi başarısız');
      const data = await res.json();
      update(sourceName, {
        type: 'ai', generating: false,
        aiName: data.name || sourceName,
        aiDescription: data.description || '',
        existingId: null,
      });
    } catch (err: any) {
      update(sourceName, {
        generating: false,
        error: err.message || 'AI üretimi başarısız',
      });
    }
  };

  const handleGenerateAll = async () => {
    setGlobalGenerating(true);
    const unassigned = assignments.filter((a) => a.type === null);
    for (const a of unassigned) {
      update(a.sourceName, { generating: true, error: '' });
    }
    const results = await Promise.allSettled(
      unassigned.map(async (a) => {
        const res = await fetch('/api/v1/characters/generate-avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({ prompt: a.sourceName, name: a.sourceName }),
        });
        if (!res.ok) throw new Error(`AI failed for ${a.sourceName}`);
        const data = await res.json();
        return { sourceName: a.sourceName, data };
      })
    );
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const name = unassigned[i].sourceName;
      if (r.status === 'fulfilled') {
        update(name, {
          type: 'ai', generating: false,
          aiName: r.value.data.name || name,
          aiDescription: r.value.data.description || '',
          existingId: null,
        });
      } else {
        update(name, { generating: false, error: 'AI üretimi başarısız' });
      }
    }
    setGlobalGenerating(false);
  };

  const buildMap = (): Record<string, { name: string; description: string; isNew: boolean }> => {
    const map: Record<string, { name: string; description: string; isNew: boolean }> = {};
    for (const a of assignments) {
      if (a.type === 'existing' && a.existingId) {
        const found = existingCharacters.find((c) => c.id === a.existingId);
        if (found) {
          map[a.sourceName] = { name: found.name, description: found.description, isNew: false };
        }
      } else if (a.type === 'new') {
        map[a.sourceName] = { name: a.newName || a.sourceName, description: a.newDescription, isNew: true };
      } else if (a.type === 'ai') {
        map[a.sourceName] = { name: a.aiName || a.sourceName, description: a.aiDescription, isNew: true };
      }
    }
    return map;
  };

  const allAssigned = assignments.every((a) => a.type !== null);
  const hasUnassigned = assignments.some((a) => a.type === null);
  const isGenerating = assignments.some((a) => a.generating) || globalGenerating;

  if (!isOpen) return null;

  return (
    <div
      style={sty.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={sty.modal}>
        <div style={sty.header}>
          <div style={sty.title}>
            <Users size={18} style={{ color: 'var(--primary)' }} />
            Karakter Ataması
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
          >
            <X size={18} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {detectedNames.length === 0 ? (
          <div style={sty.empty}>
            <Users size={24} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <div>Prompt'ta hiç @karakter etiketi bulunamadı.</div>
          </div>
        ) : (
          <div style={sty.body}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Aşağıdaki karakterler prompt'unuzda <code style={{ background: 'rgba(0,242,254,0.08)', padding: '1px 4px', borderRadius: '3px' }}>@</code> ile işaretlendi.
              Her birini var olan bir karakterle eşleştirin, yeni karakter tanımlayın veya AI'ya oluşturtun.
            </p>
            {assignments.map((a) => {
              const assigned = a.type !== null;

              let assignedLabel = '';
              if (a.type === 'existing' && a.existingId) {
                const found = existingCharacters.find((c) => c.id === a.existingId);
                if (found) assignedLabel = found.name;
              } else if (a.type === 'new') {
                assignedLabel = a.newName || a.sourceName;
              } else if (a.type === 'ai') {
                assignedLabel = a.aiName || a.sourceName;
              }

              return (
                <div key={a.sourceName} style={sty.item}>
                  <div style={sty.itemHeader}>
                    <div style={sty.itemName}>
                      <Users size={14} style={{ color: 'var(--primary)' }} />
                      <span>@{a.sourceName}</span>
                    </div>
                    <span style={{
                      ...sty.badge,
                      ...(assigned ? sty.badgeAssigned : sty.badgePending),
                    }}>
                      {assigned ? `Atandı: ${assignedLabel}` : 'Bekliyor'}
                    </span>
                  </div>

                  {!assigned && (
                    <>
                      <select
                        style={sty.select}
                        value=""
                        onChange={(e) => handleSelectExisting(a.sourceName, e.target.value)}
                      >
                        <option value="">Mevcut karakter seç...</option>
                        {existingCharacters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <input
                          type="text"
                          placeholder="Yeni karakter adı"
                          style={sty.input}
                          value={a.type === 'new' ? a.newName : ''}
                          onChange={(e) => handleNewName(a.sourceName, e.target.value)}
                        />
                        <textarea
                          placeholder="Karakter tasviri (opsiyonel)"
                          style={sty.textarea}
                          value={a.type === 'new' ? a.newDescription : ''}
                          onChange={(e) => handleNewDesc(a.sourceName, e.target.value)}
                          rows={2}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleGenerateOne(a.sourceName)}
                          disabled={a.generating}
                          style={{ ...sty.btnAi, ...(a.generating ? sty.btnAiDisabled : {}) }}
                        >
                          {a.generating ? (
                            <Loader size={12} className="pulse" />
                          ) : (
                            <Sparkles size={12} />
                          )}
                          AI Oluştursun
                        </button>
                      </div>
                    </>
                  )}

                  {assigned && (
                    <div style={{
                      fontSize: '11px', color: 'rgb(34, 197, 94)',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <Check size={12} />
                      {a.type === 'existing'
                        ? `${assignedLabel} karakterine eşleştirildi`
                        : `Yeni karakter oluşturulacak: ${assignedLabel}`}
                    </div>
                  )}

                  {a.error && (
                    <div style={sty.errorText}>
                      <AlertTriangle size={11} />
                      {a.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={sty.footer}>
          <div>
            {hasUnassigned && detectedNames.length > 0 && (
              <button
                onClick={handleGenerateAll}
                disabled={isGenerating}
                style={{ ...sty.btnAi, ...(isGenerating ? sty.btnAiDisabled : {}) }}
              >
                {globalGenerating ? (
                  <Loader size={12} className="pulse" />
                ) : (
                  <Sparkles size={12} />
                )}
                Tüm Karakterleri AI Oluştursun
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={sty.btnCancel}>
              <X size={14} />
              İptal
            </button>
            <button
              onClick={() => onConfirm(buildMap())}
              disabled={!allAssigned || isGenerating}
              style={{
                ...sty.btnPrimary,
                ...((!allAssigned || isGenerating) ? sty.btnDisabled : {}),
              }}
            >
              <Check size={14} />
              Onayla ve Devam Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
