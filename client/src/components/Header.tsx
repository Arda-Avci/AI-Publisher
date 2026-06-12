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
  language: _language, theme: _theme, isDark: _isDark, activeTab: _activeTab, userCredits,
  onSetTheme: _onSetTheme, onToggleDark: _onToggleDark, onToggleLanguage: _onToggleLanguage,
  onSetActiveTab: _onSetActiveTab, onLogout: _onLogout, t: _t,
}: HeaderProps) {
  const creditsStr = userCredits ? userCredits.credits.toLocaleString() : '0';

  return (
    <header
      style={{
        height: '56px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-primary)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 'bold', color: 'white',
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 0 12px var(--accent-glow)',
        }}>
          AP
        </div>
        <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-sans)' }}>
          AI-Publisher
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'var(--font-sans)' }}>
          / Studio
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            className="pulse"
            style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: 'var(--success)',
              boxShadow: '0 0 8px var(--success-glow)',
            }}
          />
          <span style={{
            color: 'var(--text-muted)', fontSize: '12px',
            fontFamily: 'var(--font-mono)',
          }}>
            Engine: v2.4 (Online)
          </span>
        </div>

        <div style={{
          width: '1px', height: '16px',
          background: 'rgba(255, 255, 255, 0.1)',
        }} />

        <span style={{
          color: 'var(--text-muted)', fontSize: '12px',
          fontFamily: 'var(--font-mono)',
        }}>
          Kredi: <span style={{ color: 'var(--text-primary)' }}>{creditsStr}</span>
        </span>
      </div>
    </header>
  );
}
