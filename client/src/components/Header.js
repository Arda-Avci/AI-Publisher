import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Header({ language: _language, theme: _theme, isDark: _isDark, activeTab: _activeTab, userCredits, onSetTheme: _onSetTheme, onToggleDark: _onToggleDark, onToggleLanguage: _onToggleLanguage, onSetActiveTab: _onSetActiveTab, onLogout: _onLogout, t: _t, isAdmin, onNavigateAdmin, }) {
    const creditsStr = userCredits ? userCredits.credits.toLocaleString() : '0';
    return (_jsxs("header", { style: {
            height: '56px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [_jsx("div", { style: {
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--accent), var(--secondary))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: 'white',
                            fontFamily: 'var(--font-mono)',
                            boxShadow: '0 0 12px var(--accent-glow)',
                        }, children: "AP" }), _jsx("span", { style: { fontWeight: 600, fontSize: '14px', fontFamily: 'var(--font-sans)' }, children: "AI-Publisher" }), _jsx("span", { style: { color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'var(--font-sans)' }, children: "/ Studio" })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx("div", { className: "pulse", style: {
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: 'var(--success)',
                                    boxShadow: '0 0 8px var(--success-glow)',
                                } }), _jsx("span", { style: {
                                    color: 'var(--text-muted)',
                                    fontSize: '12px',
                                    fontFamily: 'var(--font-mono)',
                                }, children: "Engine: v2.4 (Online)" })] }), isAdmin && (_jsx("button", { onClick: onNavigateAdmin, style: {
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            cursor: 'pointer',
                            fontSize: 11,
                            background: 'rgba(212, 175, 55, 0.08)',
                            color: '#D4AF37',
                            fontFamily: 'var(--font-mono)',
                        }, children: "ADMIN" })), _jsx("div", { style: {
                            width: '1px',
                            height: '16px',
                            background: 'rgba(255, 255, 255, 0.1)',
                        } }), _jsxs("span", { style: {
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                            fontFamily: 'var(--font-mono)',
                        }, children: ["Kredi: ", _jsx("span", { style: { color: 'var(--text-primary)' }, children: creditsStr })] })] })] }));
}
