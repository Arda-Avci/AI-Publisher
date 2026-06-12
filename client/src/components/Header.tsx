import { Film, LogOut, Moon, Sun, Sparkles, MessageSquare, RefreshCw } from 'lucide-react';
import type { Language, Tab, UserCredits } from '../types.js';

interface HeaderProps {
  language: Language;
  theme: string;
  isDark: boolean;
  activeTab: Tab;
  userCredits: UserCredits | null;
  onSetTheme: (t: string) => void;
  onToggleDark: () => void;
  onToggleLanguage: () => void;
  onSetActiveTab: (t: Tab) => void;
  onLogout: () => void;
  t: (key: string, params?: Record<string, any>) => string;
}

export function Header({
  language, theme, isDark, activeTab, userCredits,
  onSetTheme, onToggleDark, onToggleLanguage, onSetActiveTab, onLogout, t,
}: HeaderProps) {
  return (
    <header
      className="header glass"
      style={{
        height: '60px', padding: '0 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Film size={24} style={{ color: 'var(--primary)' }} />
        <span className="gradient-text" style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '1px' }}>
          AI-PUBLISHER
        </span>
        <span
          style={{
            fontSize: '10px', background: 'var(--secondary-glow)', color: 'var(--secondary)',
            padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold',
          }}
        >
          PRO v5
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {userCredits && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
              color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer',
            }}
            title={t('creditResetDate', { date: new Date(userCredits.resetDate).toLocaleDateString() })}
          >
            <RefreshCw size={12} className="pulse" />
            <span>{t('userCredits', { credits: userCredits.credits, limit: userCredits.limit })}</span>
          </div>
        )}

        <button
          onClick={() => onSetActiveTab('opportunities')}
          className="btn btn-secondary"
          style={{
            padding: '6px 12px', fontSize: '12px',
            background: activeTab === 'opportunities' ? 'var(--primary-glow)' : 'transparent',
            borderColor: activeTab === 'opportunities' ? 'var(--primary)' : 'var(--border)',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--primary)' }} />
          {t('opportunities')}
        </button>

        <button
          onClick={() => onSetActiveTab('groupchat')}
          className="btn btn-secondary"
          style={{
            padding: '6px 12px', fontSize: '12px',
            background: activeTab === 'groupchat' ? 'var(--secondary-glow)' : 'transparent',
            borderColor: activeTab === 'groupchat' ? 'var(--secondary)' : 'var(--border)',
          }}
        >
          <MessageSquare size={14} style={{ color: 'var(--secondary)' }} />
          AI Talk-Show
        </button>

        <select
          value={theme}
          onChange={(e) => onSetTheme(e.target.value)}
          style={{
            background: 'var(--card)', border: '1px solid var(--border)', color: 'white',
            padding: '5px 10px', borderRadius: '6px', fontSize: '12px', outline: 'none',
          }}
        >
          <option value="default">🌐 Default Cyan</option>
          <option value="nebula">🌌 Nebula Purple</option>
          <option value="forest">🌲 Forest Green</option>
          <option value="corporate">💼 Corporate Red</option>
          <option value="midnight">🌙 Midnight Gold</option>
          <option value="sunset">🌇 Sunset Orange</option>
          <option value="ocean">🌊 Ocean Cyan</option>
          <option value="cyberpunk">⚡ Cyberpunk Magenta</option>
          <option value="matrix">📟 Matrix Green</option>
        </select>

        <button
          onClick={onToggleDark}
          className="btn btn-secondary"
          style={{ padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <button
          onClick={onToggleLanguage}
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' }}
        >
          {language.toUpperCase()}
        </button>

        <button onClick={onLogout} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>
          <LogOut size={14} /> {t('logout')}
        </button>
      </div>
    </header>
  );
}
