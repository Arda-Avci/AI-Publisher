import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader, AlertCircle, Download, CheckCircle, Copy, Check } from 'lucide-react';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  text: string;
  uploadedAt: number;
  wordCount: number;
}

export function DocumentUploadPanel({ language }: { language: 'tr' | 'en' }) {
  const isTr = language === 'tr';
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useCallback((tr: string, en: string) => isTr ? tr : en, [isTr]);

  const uploadDocument = async (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError(t('Yalnızca PDF, DOCX veya TXT dosyaları desteklenir', 'Only PDF, DOCX, or TXT files are supported'));
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const result = await new Promise<{ id: string; text: string; wordCount: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const d = JSON.parse(xhr.responseText);
            if (d.status === 'success') resolve(d.data);
            else reject(new Error(d.error || t('Yükleme başarısız', 'Upload failed')));
          } else {
            try { const d = JSON.parse(xhr.responseText); reject(new Error(d.error || t('Yükleme başarısız', 'Upload failed'))); }
            catch { reject(new Error(t('Yükleme başarısız', 'Upload failed'))); }
          }
        };
        xhr.onerror = () => reject(new Error(t('Bağlantı hatası', 'Connection error')));
        xhr.open('POST', '/api/v1/document/upload');
        xhr.send(formData);
      });

      const newDoc: UploadedDocument = {
        id: result.id,
        name: file.name,
        type: ext,
        size: file.size,
        text: result.text,
        uploadedAt: Date.now(),
        wordCount: result.wordCount,
      };
      setDocuments(prev => [...prev, newDoc]);
    } catch (err: any) {
      setError(err.message || t('Yükleme başarısız', 'Upload failed'));
    }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadDocument(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDocument(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDoc === id) setSelectedDoc(null);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case '.pdf': return '📄';
      case '.docx': return '📝';
      case '.txt': return '📃';
      default: return '📎';
    }
  };

  const s: Record<string, React.CSSProperties> = {
    panel: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 1,
      maxWidth: 960,
      margin: '0 auto',
    },
    card: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 20,
    },
    label: {
      display: 'block',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--text-muted)',
      marginBottom: 6,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
    },
    btn: {
      padding: '10px 24px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'all 0.2s',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
      color: 'white',
    },
    btnSecondary: {
      background: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
    },
    chip: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 10px',
      borderRadius: 6,
      fontSize: 11,
      background: 'hsla(var(--primary),0.08)',
      color: 'hsl(var(--primary))',
      border: '1px solid hsla(var(--primary),0.2)',
    },
  };

  return (
    <div style={s.panel} role="region" aria-label={t('Doküman Yükleme', 'Document Upload')}>
      {/* Header Card */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('Doküman Yükleme', 'Document Upload')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('Senaryo üretimi için dokümanları yükleyin', 'Upload documents for script generation')}
            </div>
          </div>
        </div>

        {/* Upload Area */}
        {uploading ? (
          <div style={{
            padding: 24,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {t('Yükleniyor...', 'Uploading...')}
            </div>
            <div style={{
              width: '100%',
              height: 6,
              background: 'var(--border)',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
                borderRadius: 3,
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{uploadProgress}%</div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: 32,
              border: `2px dashed ${dragOver ? 'hsl(var(--primary))' : 'var(--border)'}`,
              borderRadius: 8,
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
              transition: 'all 0.15s',
            }}
            role="button"
            aria-label={t('Doküman yüklemek için tıklayın veya sürükleyin', 'Click or drag to upload document')}
          >
            <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {t('Dokümanınızı yükleyin', 'Upload your document')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {t('PDF, DOCX veya TXT dosyasını sürükleyin veya tıklayın', 'Drag & drop a PDF, DOCX, or TXT file, or click to browse')}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{ padding: '10px 14px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
            role="alert"
          >
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            {t('Yüklenmiş Dokümanlar', 'Uploaded Documents')} ({documents.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map(doc => {
              const isSelected = selectedDoc === doc.id;
              return (
                <div
                  key={doc.id}
                  style={{
                    border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: isSelected ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onClick={() => setSelectedDoc(isSelected ? null : doc.id)}
                  role="button"
                  aria-expanded={isSelected}
                  aria-label={`${doc.name} - ${doc.wordCount} ${t('kelime', 'words')}`}
                >
                  <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{getFileIcon(doc.type)}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatSize(doc.size)} · {doc.wordCount.toLocaleString()} {t('kelime', 'words')}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={s.chip}>
                        <CheckCircle size={10} />
                        {t('Yüklendi', 'Uploaded')}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <div style={{
                        padding: 16,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        maxHeight: 200,
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {doc.text.slice(0, 1000)}
                        {doc.text.length > 1000 && <span style={{ color: 'hsl(var(--primary))' }}>...</span>}
                      </div>
                      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          style={{ ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }}
                          onClick={(e) => { e.stopPropagation(); copyText(doc.text); }}
                          aria-label={t('Metni Kopyala', 'Copy Text')}
                        >
                          {copied ? <Check size={12} color="green" /> : <Copy size={12} />}
                          {t('Kopyala', 'Copy')}
                        </button>
                        <button
                          style={{ ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px', color: 'hsl(0,70%,60%)', borderColor: 'hsla(0,70%,50%,0.2)' }}
                          onClick={(e) => { e.stopPropagation(); removeDocument(doc.id); }}
                          aria-label={t('Dokümanı Kaldır', 'Remove Document')}
                        >
                          <X size={12} />
                          {t('Kaldır', 'Remove')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Supported Formats Info */}
      <div style={s.card}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong>{t('Desteklenen Formatlar:', 'Supported Formats:')}</strong>
          <br />
          • <strong>PDF</strong> — {t('Adobe PDF dokümanları', 'Adobe PDF documents')}
          <br />
          • <strong>DOCX</strong> — {t('Microsoft Word dosyaları', 'Microsoft Word files')}
          <br />
          • <strong>TXT</strong> — {t('Düz metin dosyaları', 'Plain text files')}
          <br />
          <strong>{t('Not:', 'Note:')}</strong> {t('Doküman metni otomatik olarak çıkarılır ve senaryo üretimi için kullanılır.', 'Document text is automatically extracted and used for script generation.')}
        </div>
      </div>
    </div>
  );
}
