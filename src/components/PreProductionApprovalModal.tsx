import React, { useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: { title: string; transcript: string; };
  onApprove: (config: any) => void;
}

export const PreProductionApprovalModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, initialData, onApprove }) => {
  const { t } = useLanguage(); 
  const [editedTitle, setEditedTitle] = useState(initialData.title);
  const [editedTranscript, setEditedTranscript] = useState(initialData.transcript);
  const [durationOption, setDurationOption] = useState<'same' | 'trim' | 'extend'>('same');
  const [titlePosition, setTitlePosition] = useState<string>('bottom_center');

  if (!isOpen) return null;

  const positions = [
    { id: 'top_left', label: '↖' }, { id: 'top_center', label: '⬆' }, { id: 'top_right', label: '↗' },
    { id: 'middle_left', label: '⬅' }, { id: 'center', label: '☉' }, { id: 'middle_right', label: '➡' },
    { id: 'bottom_left', label: '↙' }, { id: 'bottom_center', label: '⬇' }, { id: 'bottom_right', label: '↘' }
  ];

  const handleSubmit = () => {
    onApprove({
      userTitle: editedTitle,
      transcript: editedTranscript,
      videoDurationOption: durationOption,
      titlePosition: titlePosition
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
      <div style={{ backgroundColor: '#1a1a1a', color: '#fff', borderRadius: '12px', width: '100%', maxWidth: '700px', padding: '24px', fontFamily: 'sans-serif' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>{t.approval_title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: '#aaa', marginBottom: '6px' }}>{t.label_title_text}</label>
          <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} style={{ width: '100%', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '6px', padding: '10px', color: '#fff' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: '#aaa', marginBottom: '6px' }}>{t.label_duration}</label>
          <select value={durationOption} onChange={(e: any) => setDurationOption(e.target.value)} style={{ width: '100%', backgroundColor: '#262626', border: '1px solid #404040', borderRadius: '6px', padding: '10px', color: '#fff' }}>
            <option value="same">{t.opt_same}</option>
            <option value="trim">{t.opt_trim}</option>
            <option value="extend">{t.opt_extend}</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: '#aaa', marginBottom: '8px' }}>{t.label_position}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '180px', margin: '0 auto' }}>
            {positions.map((pos) => (
              <button key={pos.id} onClick={() => setTitlePosition(pos.id)} style={{ padding: '12px', backgroundColor: titlePosition === pos.id ? '#eab308' : '#262626', color: titlePosition === pos.id ? '#000' : '#fff', border: '1px solid #404040', borderRadius: '6px', cursor: 'pointer' }}>
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #333', paddingTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '10px 16px', backgroundColor: '#404040', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} style={{ padding: '10px 20px', backgroundColor: '#eab308', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
            {t.btn_start}
          </button>
        </div>

      </div>
    </div>
  );
};
