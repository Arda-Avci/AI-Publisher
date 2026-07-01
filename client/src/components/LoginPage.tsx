import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Loader } from 'lucide-react';
import type { Language } from '../types.js';

interface LoginPageProps {
  language: Language;
  setLanguage: (l: Language) => void;
  onLogin: (username: string, password: string) => Promise<void>;
  authError: string;
  setAuthError: (e: string) => void;
}

export function LoginPage({
  language,
  setLanguage,
  onLogin,
  authError,
  setAuthError,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isTR = language === 'tr';
  const t = (key: string) => {
    const dict: Record<string, Record<string, string>> = {
      tr: {
        loginSubtitle: 'Otonom Video Üretim & Pazarlama İstasyonu',
        usernameLabel: 'E-Posta Adresi',
        passwordLabel: 'Şifre',
        loginPlaceholderUsername: 'e-posta@adresiniz.com',
        signInButton: 'Giriş Yap',
        languageToggleEN: 'Switch to English',
      },
      en: {
        loginSubtitle: 'Autonomous Video Production & Marketing Station',
        usernameLabel: 'Email Address',
        passwordLabel: 'Password',
        loginPlaceholderUsername: 'you@example.com',
        signInButton: 'Sign In',
        languageToggleEN: "Türkçe'ye Geç",
      },
    };
    return dict[language]?.[key] || key;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      await onLogin(username, password);
      navigate('/');
    } catch {
      // error handled by parent via authError
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-loginpage-grid-container">
      <div className="premium-loginpage-editorial-visual">
        <div className="premium-loginpage-editorial-logo">
          AI <span>Publisher</span>
        </div>
        <p className="premium-loginpage-editorial-desc">
          {t('loginSubtitle')}
        </p>
      </div>
      <div className="premium-loginpage-grid-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 0 20px var(--accent-glow)',
            }}
          >
            <Film size={24} color="white" />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              fontWeight: 600,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            AI <span style={{ color: 'var(--accent)' }}>Publisher</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
            {t('loginSubtitle')}
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 6,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('usernameLabel')}
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder={t('loginPlaceholderUsername')}
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 6,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t('passwordLabel')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
              required
            />
          </div>
          {authError && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 16,
                background: 'rgba(239,68,68,0.1)',
                color: 'var(--danger)',
                fontSize: 13,
                textAlign: 'center',
              }}
            >
              {authError}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'var(--accent)',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading && <Loader size={16} className="spin" />}
            {t('signInButton')}
          </button>
        </form>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            onClick={() => setLanguage(isTR ? 'en' : 'tr')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {t('languageToggleEN')}
          </button>
        </div>
      </div>
    </div>
  );
}
