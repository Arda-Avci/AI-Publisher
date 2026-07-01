import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader, AlertCircle, Download, CheckCircle, Copy, Check } from 'lucide-react';
export function DocumentUploadPanel({ language }) {
    const isTr = language === 'tr';
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);
    const t = useCallback((tr, en) => isTr ? tr : en, [isTr]);
    const uploadDocument = async (file) => {
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
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable)
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                });
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const d = JSON.parse(xhr.responseText);
                        if (d.status === 'success')
                            resolve(d.data);
                        else
                            reject(new Error(d.error || t('Yükleme başarısız', 'Upload failed')));
                    }
                    else {
                        try {
                            const d = JSON.parse(xhr.responseText);
                            reject(new Error(d.error || t('Yükleme başarısız', 'Upload failed')));
                        }
                        catch {
                            reject(new Error(t('Yükleme başarısız', 'Upload failed')));
                        }
                    }
                };
                xhr.onerror = () => reject(new Error(t('Bağlantı hatası', 'Connection error')));
                xhr.open('POST', '/api/v1/document/upload');
                xhr.send(formData);
            });
            const newDoc = {
                id: result.id,
                name: file.name,
                type: ext,
                size: file.size,
                text: result.text,
                uploadedAt: Date.now(),
                wordCount: result.wordCount,
            };
            setDocuments(prev => [...prev, newDoc]);
        }
        catch (err) {
            setError(err.message || t('Yükleme başarısız', 'Upload failed'));
        }
        setUploading(false);
        setUploadProgress(0);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file)
            uploadDocument(file);
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file)
            uploadDocument(file);
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    };
    const removeDocument = (id) => {
        setDocuments(prev => prev.filter(d => d.id !== id));
        if (selectedDoc === id)
            setSelectedDoc(null);
    };
    const copyText = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const formatSize = (bytes) => {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    const getFileIcon = (type) => {
        switch (type) {
            case '.pdf': return '📄';
            case '.docx': return '📝';
            case '.txt': return '📃';
            default: return '📎';
        }
    };
    const s = {
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
            textTransform: 'uppercase',
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
    return (_jsxs("div", { style: s.panel, role: "region", "aria-label": t('Doküman Yükleme', 'Document Upload'), children: [_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(FileText, { size: 16, color: "white" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }, children: t('Doküman Yükleme', 'Document Upload') }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: t('Senaryo üretimi için dokümanları yükleyin', 'Upload documents for script generation') })] })] }), uploading ? (_jsxs("div", { style: {
                            padding: 24,
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            textAlign: 'center',
                        }, children: [_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }, children: t('Yükleniyor...', 'Uploading...') }), _jsx("div", { style: {
                                    width: '100%',
                                    height: 6,
                                    background: 'var(--border)',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                }, children: _jsx("div", { style: {
                                        width: `${uploadProgress}%`,
                                        height: '100%',
                                        background: 'linear-gradient(135deg, #7F00FF, #FF007F)',
                                        borderRadius: 3,
                                        transition: 'width 0.3s',
                                    } }) }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: [uploadProgress, "%"] })] })) : (_jsxs("div", { onDrop: handleDrop, onDragOver: e => { e.preventDefault(); setDragOver(true); }, onDragLeave: e => { e.preventDefault(); setDragOver(false); }, onClick: () => fileInputRef.current?.click(), style: {
                            padding: 32,
                            border: `2px dashed ${dragOver ? 'hsl(var(--primary))' : 'var(--border)'}`,
                            borderRadius: 8,
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: dragOver ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                            transition: 'all 0.15s',
                        }, role: "button", "aria-label": t('Doküman yüklemek için tıklayın veya sürükleyin', 'Click or drag to upload document'), children: [_jsx(Upload, { size: 24, style: { color: 'var(--text-muted)', marginBottom: 8 } }), _jsx("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }, children: t('Dokümanınızı yükleyin', 'Upload your document') }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: t('PDF, DOCX veya TXT dosyasını sürükleyin veya tıklayın', 'Drag & drop a PDF, DOCX, or TXT file, or click to browse') }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".pdf,.docx,.txt", style: { display: 'none' }, onChange: handleFileSelect })] })), error && (_jsxs("div", { style: { padding: '10px 14px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)', marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }, role: "alert", children: [_jsx(AlertCircle, { size: 14 }), error] }))] }), documents.length > 0 && (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }, children: [t('Yüklenmiş Dokümanlar', 'Uploaded Documents'), " (", documents.length, ")"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: documents.map(doc => {
                            const isSelected = selectedDoc === doc.id;
                            return (_jsxs("div", { style: {
                                    border: isSelected ? '2px solid hsl(var(--primary))' : '1px solid var(--border)',
                                    borderRadius: 10,
                                    overflow: 'hidden',
                                    background: isSelected ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }, onClick: () => setSelectedDoc(isSelected ? null : doc.id), role: "button", "aria-expanded": isSelected, "aria-label": `${doc.name} - ${doc.wordCount} ${t('kelime', 'words')}`, children: [_jsxs("div", { style: { padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("span", { style: { fontSize: 20 }, children: getFileIcon(doc.type) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }, children: doc.name }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: [formatSize(doc.size), " \u00B7 ", doc.wordCount.toLocaleString(), " ", t('kelime', 'words')] })] })] }), _jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: _jsxs("span", { style: s.chip, children: [_jsx(CheckCircle, { size: 10 }), t('Yüklendi', 'Uploaded')] }) })] }), isSelected && (_jsxs("div", { style: { borderTop: '1px solid var(--border)' }, children: [_jsxs("div", { style: {
                                                    padding: 16,
                                                    fontSize: 12,
                                                    lineHeight: 1.6,
                                                    color: 'var(--text-primary)',
                                                    maxHeight: 200,
                                                    overflowY: 'auto',
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'var(--font-mono)',
                                                }, children: [doc.text.slice(0, 1000), doc.text.length > 1000 && _jsx("span", { style: { color: 'hsl(var(--primary))' }, children: "..." })] }), _jsxs("div", { style: { padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }, children: [_jsxs("button", { style: { ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px' }, onClick: (e) => { e.stopPropagation(); copyText(doc.text); }, "aria-label": t('Metni Kopyala', 'Copy Text'), children: [copied ? _jsx(Check, { size: 12, color: "green" }) : _jsx(Copy, { size: 12 }), t('Kopyala', 'Copy')] }), _jsxs("button", { style: { ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 12px', color: 'hsl(0,70%,60%)', borderColor: 'hsla(0,70%,50%,0.2)' }, onClick: (e) => { e.stopPropagation(); removeDocument(doc.id); }, "aria-label": t('Dokümanı Kaldır', 'Remove Document'), children: [_jsx(X, { size: 12 }), t('Kaldır', 'Remove')] })] })] }))] }, doc.id));
                        }) })] })), _jsx("div", { style: s.card, children: _jsxs("div", { style: { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }, children: [_jsx("strong", { children: t('Desteklenen Formatlar:', 'Supported Formats:') }), _jsx("br", {}), "\u2022 ", _jsx("strong", { children: "PDF" }), " \u2014 ", t('Adobe PDF dokümanları', 'Adobe PDF documents'), _jsx("br", {}), "\u2022 ", _jsx("strong", { children: "DOCX" }), " \u2014 ", t('Microsoft Word dosyaları', 'Microsoft Word files'), _jsx("br", {}), "\u2022 ", _jsx("strong", { children: "TXT" }), " \u2014 ", t('Düz metin dosyaları', 'Plain text files'), _jsx("br", {}), _jsx("strong", { children: t('Not:', 'Note:') }), " ", t('Doküman metni otomatik olarak çıkarılır ve senaryo üretimi için kullanılır.', 'Document text is automatically extracted and used for script generation.')] }) })] }));
}
