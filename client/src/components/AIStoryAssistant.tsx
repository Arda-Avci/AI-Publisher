/**
 * AIStoryAssistant Component
 * Stateful chat interface for AI-assisted story/prompt development
 */

import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Plus, Sparkles, Copy, Check, MessageSquare } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: number;
  storyBibleId?: number;
  context: Record<string, any>;
  lastMessage?: string;
  messages: ChatMessage[];
  updatedAt?: string;
}

interface StoryBible {
  id: number;
  title: string;
  genre: string;
  description: string;
  characters?: any[];
  plotPoints?: any[];
}

interface AIStoryAssistantProps {
  language: 'tr' | 'en';
  onApplyPrompts?: (prompts: { masterPrompt: string; productionNotes: string; characterFeatures: string }) => void;
}

export function AIStoryAssistant({ language, onApplyPrompts: _onApplyPrompts }: AIStoryAssistantProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [storyBibles, setStoryBibles] = useState<StoryBible[]>([]);
  const [selectedBibleId, setSelectedBibleId] = useState<number | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => {
    const texts: Record<string, Record<string, string>> = {
      tr: {
        title: 'AI Hikaye Asistanı',
        newChat: 'Yeni Sohbet',
        sessions: 'Sohbet Geçmişi',
        noSessions: 'Henüz sohbet yok. Yeni bir sohbet başlatın.',
        typeMessage: 'Mesajınızı yazın...',
        send: 'Gönder',
        delete: 'Sil',
        storyBibles: 'Hikaye Kitapları',
        createBible: 'Yeni Hikaye Kitabı',
        selectBible: 'Hikaye Kitabı Seç',
        noBible: 'Hikaye bağlamı yok - sadece genel sohbet',
        suggestedPrompts: 'Önerilen Prompt\'lar',
        apply: 'Uygula',
        generating: 'Yanıt üretiliyor...',
      },
      en: {
        title: 'AI Story Assistant',
        newChat: 'New Chat',
        sessions: 'Chat History',
        noSessions: 'No chats yet. Start a new conversation.',
        typeMessage: 'Type your message...',
        send: 'Send',
        delete: 'Delete',
        storyBibles: 'Story Bibles',
        createBible: 'New Story Bible',
        selectBible: 'Select Story Bible',
        noBible: 'No story context - general chat only',
        suggestedPrompts: 'Suggested Prompts',
        apply: 'Apply',
        generating: 'Generating response...',
      },
    };
    return texts[language]?.[key] || key;
  };

  useEffect(() => {
    fetchSessions();
    fetchStoryBibles();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/v1/story/sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchStoryBibles = async () => {
    try {
      const res = await fetch('/api/v1/story/bibles');
      const data = await res.json();
      if (data.success) {
        setStoryBibles(data.bibles);
      }
    } catch (err) {
      console.error('Failed to fetch story bibles:', err);
    }
  };

  const createSession = async () => {
    try {
      const res = await fetch('/api/v1/story/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyBibleId: selectedBibleId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.session);
        fetchSessions();
        setShowNewSession(false);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/v1/story/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.session);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentSession || loading) return;

    const userMessage = message;
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/story/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          message: userMessage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Reload session to get updated messages
        await loadSession(currentSession.id);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: number) => {
    try {
      await fetch(`/api/v1/story/sessions/${sessionId}`, { method: 'DELETE' });
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      fetchSessions();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const copyMessage = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessage(index);
    setTimeout(() => setCopiedMessage(null), 2000);
  };



  return (
    <div style={{
      display: 'flex', flex: 1, minHeight: 0, background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border)',
    }}>
      {/* Sessions Sidebar */}
      <div style={{
        width: '280px', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)',
      }}>
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>{t('sessions')}</span>
          <button
            onClick={() => setShowNewSession(true)}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: '6px',
              padding: '6px 10px', cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px',
            }}
          >
            <Plus size={14} /> {t('newChat')}
          </button>
        </div>

        {/* New Session Modal */}
        {showNewSession && (
          <div style={{
            padding: '16px', borderBottom: '1px solid var(--border)',
            background: 'var(--bg-primary)',
          }}>
            <select
              value={selectedBibleId || ''}
              onChange={(e) => setSelectedBibleId(e.target.value ? parseInt(e.target.value) : null)}
              style={{
                width: '100%', padding: '8px', borderRadius: '6px',
                background: 'var(--bg-surface)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', marginBottom: '12px',
                fontSize: '12px',
              }}
            >
              <option value="">{t('noBible')}</option>
              {storyBibles.map((bible) => (
                <option key={bible.id} value={bible.id}>{bible.title}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={createSession}
                style={{
                  flex: 1, padding: '8px', background: 'var(--accent)',
                  border: 'none', borderRadius: '6px', color: 'white',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                }}
              >
                {t('newChat')}
              </button>
              <button
                onClick={() => setShowNewSession(false)}
                style={{
                  padding: '8px 12px', background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', borderRadius: '6px',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {sessions.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              {t('noSessions')}
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => loadSession(session.id)}
                style={{
                  padding: '12px', borderRadius: '8px', marginBottom: '4px',
                  cursor: 'pointer', background: currentSession?.id === session.id
                    ? 'var(--accent-light)' : 'transparent',
                  border: currentSession?.id === session.id
                    ? '1px solid var(--accent)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (currentSession?.id !== session.id) {
                    e.currentTarget.style.background = 'var(--bg-surface-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentSession?.id !== session.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{
                      fontSize: '13px', fontWeight: 600, margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      <MessageSquare size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {session.lastMessage?.slice(0, 30) || 'Yeni Sohbet'}...
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: '4px',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!currentSession ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '16px', color: 'var(--text-muted)',
          }}>
            <Sparkles size={48} style={{ opacity: 0.5 }} />
            <p style={{ fontSize: '14px' }}>
              {language === 'tr' ? 'Sohbet seçin veya yeni başlatın' : 'Select or start a conversation'}
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('title')}</span>
              {selectedBibleId && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                  background: 'var(--accent-light)', color: 'var(--accent)',
                }}>
                  {storyBibles.find(b => b.id === selectedBibleId)?.title || ''}
                </span>
              )}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
              {currentSession.messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '12px 16px', borderRadius: '12px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, var(--accent), var(--accent-600))'
                      : 'var(--bg-surface)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                    fontSize: '13px', lineHeight: 1.5,
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  }}>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => copyMessage(msg.content, idx)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: copiedMessage === idx ? 'var(--success)' : 'var(--text-muted)',
                          fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        {copiedMessage === idx ? <Check size={12} /> : <Copy size={12} />}
                        {copiedMessage === idx ? 'Kopyalandı' : 'Kopyala'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{
                  padding: '12px 16px', borderRadius: '12px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <div className="pulse" style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: 'var(--accent)',
                  }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {t('generating')}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '16px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: '12px',
            }}>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={t('typeMessage')}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: '12px',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', fontSize: '13px',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || loading}
                style={{
                  padding: '12px 20px', borderRadius: '12px',
                  background: message.trim() ? 'var(--accent)' : 'var(--bg-surface)',
                  border: 'none', color: 'white', cursor: message.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  fontSize: '13px', fontWeight: 600,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <Send size={16} />
                {t('send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}