import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function CoverSelector({ coverImages, selectedCover, onSelect }) {
    if (!coverImages.length)
        return null;
    return (_jsxs("div", { style: { marginBottom: 16, marginTop: 8 }, children: [_jsx("h5", { style: { marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }, children: "\uD83D\uDDBC\uFE0F Kapak Foto\u011Fraf\u0131 Se\u00E7" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }, children: coverImages.map((path, idx) => {
                    const isSelected = path === selectedCover;
                    return (_jsxs("div", { onClick: () => onSelect(path), style: {
                            position: 'relative', cursor: 'pointer',
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 8, overflow: 'hidden', transition: 'all 0.2s',
                            aspectRatio: '16/9', background: 'var(--bg-surface)',
                        }, children: [_jsx("img", { src: path, alt: `Cover ${idx + 1}`, style: { width: '100%', height: '100%', objectFit: 'cover' } }), _jsx("div", { style: {
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                                    fontSize: 10, padding: '2px 6px', textAlign: 'center',
                                    fontFamily: 'var(--font-mono)',
                                }, children: isSelected ? '✓ Seçili' : `Alternatif ${idx + 1}` })] }, idx));
                }) })] }));
}
