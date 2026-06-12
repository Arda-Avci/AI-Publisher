import { LogOut, Moon, Sun, Sparkles, MessageSquare, RefreshCw } from 'lucide-react';
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
      style={{
        height: '56px', padding: '0 20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-mono)',
        }}>
          AP
        </div>
        <span className="gradient-text" style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>
          AI-PUBLISHER
        </span>
        <span
          style={{
            fontSize: '9px', background: 'var(--accent-light)', color: 'var(--accent)',
            padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontFamily: 'var(--font-mono)',
          }}
        >
          PRO v5
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {userCredits && (
          <div
            className="glass"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
              borderColor: 'rgba(99, 102, 241, 0.25)',
              fontFamily: 'var(--font-mono)',
            }}
            title={t('creditResetDate', { date: new Date(userCredits.resetDate).toLocaleDateString() })}
          >
            <RefreshCw size={10} className="pulse" />
            <span>{t('userCredits', { credits: userCredits.credits, limit: userCredits.limit })}</span>
          </div>
        )}

        <button
          onClick={() => onSetActiveTab('opportunities')}
          className="btn btn-secondary"
          style={{
            padding: '4px 10px', fontSize: '11px',
            background: activeTab === 'opportunities' ? 'var(--accent-light)' : undefined,
            borderColor: activeTab === 'opportunities' ? 'var(--accent)' : undefined,
          }}
        >
          <Sparkles size={12} style={{ color: 'var(--accent)' }} />
          {t('opportunities')}
        </button>

        <button
          onClick={() => onSetActiveTab('groupchat')}
          className="btn btn-secondary"
          style={{
            padding: '4px 10px', fontSize: '11px',
            background: activeTab === 'groupchat' ? 'var(--secondary-glow)' : undefined,
            borderColor: activeTab === 'groupchat' ? 'var(--secondary)' : undefined,
          }}
        >
          <MessageSquare size={12} style={{ color: 'var(--secondary)' }} />
          AI Talk-Show
        </button>

        <select
          value={theme}
          onChange={(e) => onSetTheme(e.target.value)}
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
        >
          <option value="default">Default</option>
          <option value="nebula">Nebula Purple</option>
          <option value="forest">Forest Green</option>
          <option value="corporate">Corporate Red</option>
          <option value="midnight">Midnight Gold</option>
          <option value="sunset">Sunset Orange</option>
          <option value="ocean">Ocean Cyan</option>
          <option value="cyberpunk">Cyberpunk Magenta</option>
          <option value="matrix">Matrix Green</option>
        </select>

        <button
          onClick={onToggleDark}
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
        </button>

        <button
          onClick={onToggleLanguage}
          className="btn btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}
        >
          {language.toUpperCase()}
        </button>

        <button onClick={onLogout} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '11px' }}>
          <LogOut size={12} /> {t('logout')}
        </button>
      </div>
    </header>
  );
}
