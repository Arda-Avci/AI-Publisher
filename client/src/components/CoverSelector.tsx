interface CoverSelectorProps {
  coverImages: string[];
  selectedCover: string;
  onSelect: (path: string) => void;
}

export function CoverSelector({ coverImages, selectedCover, onSelect }: CoverSelectorProps) {
  if (!coverImages.length) return null;

  return (
    <div style={{ marginBottom: 16, marginTop: 8 }}>
      <h5 style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        🖼️ Kapak Fotoğrafı Seç
      </h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {coverImages.map((path, idx) => {
          const isSelected = path === selectedCover;
          return (
            <div
              key={idx}
              onClick={() => onSelect(path)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8,
                overflow: 'hidden',
                transition: 'all 0.2s',
                aspectRatio: '16/9',
                background: 'var(--bg-surface)',
              }}
            >
              <img
                src={path}
                alt={`Cover ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: 10,
                  padding: '2px 6px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {isSelected ? '✓ Seçili' : `Alternatif ${idx + 1}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
