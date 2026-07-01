import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Loader } from 'lucide-react';
export function LoginPage({ language, setLanguage, onLogin, authError, setAuthError, }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const isTR = language === 'tr';
    const t = (key) => {
        const dict = {
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAuthError('');
        try {
            await onLogin(username, password);
            navigate('/');
        }
        catch {
            // error handled by parent via authError
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "premium-loginpage-grid-container", children: [_jsxs("div", { className: "premium-loginpage-editorial-visual", children: [_jsxs("div", { className: "premium-loginpage-editorial-logo", children: ["AI ", _jsx("span", { children: "Publisher" })] }), _jsx("p", { className: "premium-loginpage-editorial-desc", children: t('loginSubtitle') })] }), _jsxs("div", { className: "premium-loginpage-grid-card", children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: 32 }, children: [_jsx("div", { style: {
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16,
                                    boxShadow: '0 0 20px var(--accent-glow)',
                                }, children: _jsx(Film, { size: 24, color: "white" }) }), _jsxs("h1", { style: {
                                    fontFamily: 'var(--font-serif)',
                                    fontSize: 28,
                                    fontWeight: 600,
                                    margin: 0,
                                    letterSpacing: '-0.02em',
                                }, children: ["AI ", _jsx("span", { style: { color: 'var(--accent)' }, children: "Publisher" })] }), _jsx("p", { style: { color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }, children: t('loginSubtitle') })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: {
                                            display: 'block',
                                            fontSize: 11,
                                            color: 'var(--text-muted)',
                                            marginBottom: 6,
                                            fontFamily: 'var(--font-mono)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }, children: t('usernameLabel') }), _jsx("input", { value: username, onChange: (e) => setUsername(e.target.value), style: {
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 14,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }, placeholder: t('loginPlaceholderUsername'), required: true })] }), _jsxs("div", { style: { marginBottom: 20 }, children: [_jsx("label", { style: {
                                            display: 'block',
                                            fontSize: 11,
                                            color: 'var(--text-muted)',
                                            marginBottom: 6,
                                            fontFamily: 'var(--font-mono)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                        }, children: t('passwordLabel') }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), style: {
                                            width: '100%',
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 14,
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true })] }), authError && (_jsx("div", { style: {
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    marginBottom: 16,
                                    background: 'rgba(239,68,68,0.1)',
                                    color: 'var(--danger)',
                                    fontSize: 13,
                                    textAlign: 'center',
                                }, children: authError })), _jsxs("button", { type: "submit", disabled: loading, style: {
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
                                }, children: [loading && _jsx(Loader, { size: 16, className: "spin" }), t('signInButton')] })] }), _jsx("div", { style: { marginTop: 20, textAlign: 'center' }, children: _jsx("button", { onClick: () => setLanguage(isTR ? 'en' : 'tr'), style: {
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: 12,
                            }, children: t('languageToggleEN') }) })] })] }));
}
