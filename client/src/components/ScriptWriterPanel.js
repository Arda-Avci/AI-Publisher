import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Sparkles, Clock, Copy, Check, ChevronDown, ChevronUp, Loader, BookOpen, User, RefreshCw, FileText, Upload, Palette, Image } from 'lucide-react';
import { StoryboardGrid } from './StoryboardGrid.js';
export function ScriptWriterPanel({ language }) {
    const isTr = language === 'tr';
    const [topic, setTopic] = useState('');
    const [characterProfiles, setCharacterProfiles] = useState('');
    const [quality, setQuality] = useState('medium');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [script, setScript] = useState(null);
    const [scriptsList, setScriptsList] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [expandedScript, setExpandedScript] = useState(null);
    const [copied, setCopied] = useState(false);
    const [editorText, setEditorText] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [characters, setCharacters] = useState([]);
    const [showCharDropdown, setShowCharDropdown] = useState(false);
    const [charSearch, setCharSearch] = useState('');
    const [writerTier, setWriterTier] = useState('professional');
    const [artStyles, setArtStyles] = useState([]);
    const [loadingStyles, setLoadingStyles] = useState(false);
    const [selectedArtStyle, setSelectedArtStyle] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadedText, setUploadedText] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const charInputRef = useRef(null);
    const charDropdownRef = useRef(null);
    const t = useCallback((tr, en) => isTr ? tr : en, [isTr]);
    useEffect(() => { fetchScripts(); fetchCharacters(); fetchArtStyles(); }, []);
    useEffect(() => {
        if (!showCharDropdown)
            return;
        const handler = (e) => {
            if (charDropdownRef.current && !charDropdownRef.current.contains(e.target)) {
                setShowCharDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCharDropdown]);
    const fetchScripts = async () => {
        setLoadingList(true);
        try {
            const res = await fetch('/api/v1/crew/scripts');
            const d = await res.json();
            if (d.status === 'success')
                setScriptsList(d.data);
        }
        catch { /* ignore */ }
        setLoadingList(false);
    };
    const fetchCharacters = async () => {
        try {
            const res = await fetch('/api/v1/character-library');
            const d = await res.json();
            if (d.status === 'success')
                setCharacters(d.data || []);
        }
        catch { /* ignore */ }
    };
    const fetchArtStyles = async () => {
        setLoadingStyles(true);
        try {
            const res = await fetch('/api/v1/crew/art-styles');
            const d = await res.json();
            if (d.status === 'success')
                setArtStyles(d.data || []);
        }
        catch { /* ignore */ }
        setLoadingStyles(false);
    };
    const uploadDocument = async (file) => {
        setUploading(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('document', file);
        try {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable)
                    setUploadProgress(Math.round((e.loaded / e.total) * 100));
            });
            const result = await new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const d = JSON.parse(xhr.responseText);
                        if (d.status === 'success')
                            resolve(d.data);
                        else
                            reject(new Error(d.error || 'Upload failed'));
                    }
                    else {
                        try {
                            const d = JSON.parse(xhr.responseText);
                            reject(new Error(d.error || 'Upload failed'));
                        }
                        catch {
                            reject(new Error('Upload failed'));
                        }
                    }
                };
                xhr.onerror = () => reject(new Error('Upload failed'));
                xhr.open('POST', '/api/v1/crew/upload-doc');
                xhr.send(formData);
            });
            setUploadedFileName(file.name);
            setUploadedText(result.text);
        }
        catch (err) {
            setError(err.message || t('Dosya yüklenemedi.', 'File upload failed.'));
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
    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file)
            uploadDocument(file);
    };
    const clearUploadedDoc = () => {
        setUploadedText('');
        setUploadedFileName('');
        setUploadProgress(0);
    };
    const loadScriptDetail = async (id) => {
        if (expandedScript === id) {
            setExpandedScript(null);
            return;
        }
        try {
            const res = await fetch(`/api/v1/crew/scripts/${id}`);
            const d = await res.json();
            if (d.status === 'success' && d.data) {
                const parsed = typeof d.data.full_script === 'string'
                    ? JSON.parse(d.data.full_script)
                    : d.data.full_script;
                setScript(parsed);
                setExpandedScript(id);
            }
        }
        catch { /* ignore */ }
    };
    const handleCharInput = (e) => {
        const val = e.target.value;
        setCharacterProfiles(val);
        const cursorPos = e.target.selectionStart;
        const textBefore = val.slice(0, cursorPos);
        const atMatch = textBefore.match(/@(\w*)$/);
        if (atMatch) {
            setCharSearch(atMatch[1].toLowerCase());
            setShowCharDropdown(true);
        }
        else {
            setShowCharDropdown(false);
        }
    };
    const insertCharName = (name) => {
        const ta = charInputRef.current;
        if (!ta)
            return;
        const cursorPos = ta.selectionStart;
        const textBefore = ta.value.slice(0, cursorPos);
        const atIdx = textBefore.lastIndexOf('@', cursorPos - 1);
        if (atIdx === -1)
            return;
        const newVal = ta.value.slice(0, atIdx) + `@${name} ` + ta.value.slice(cursorPos);
        setCharacterProfiles(newVal);
        setShowCharDropdown(false);
        ta.focus();
        const newPos = atIdx + name.length + 2;
        setTimeout(() => ta.setSelectionRange(newPos, newPos), 0);
    };
    const filteredChars = characters.filter(c => c.name.toLowerCase().includes(charSearch));
    const generateScript = async () => {
        if (!topic.trim() || topic.trim().length < 3) {
            setError(t('Konu en az 3 karakter olmalıdır.', 'Topic must be at least 3 characters.'));
            return;
        }
        setError('');
        setGenerating(true);
        setScript(null);
        let enrichedTopic = topic.trim();
        if (uploadedText)
            enrichedTopic += '\n\n[Doküman Metni]\n' + uploadedText;
        try {
            const res = await fetch('/api/v1/crew/write-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: enrichedTopic,
                    characterProfiles: characterProfiles.trim() || undefined,
                    writerTier,
                    artStyle: selectedArtStyle || undefined,
                }),
            });
            const d = await res.json();
            if (d.status === 'success') {
                setScript(d.data);
                setEditorText(d.data.fullScript || '');
                setShowEditor(false);
                fetchScripts();
            }
            else {
                setError(d.error || t('Senaryo üretilemedi.', 'Failed to generate script.'));
            }
        }
        catch (err) {
            setError(err.message || t('Bağlantı hatası.', 'Connection error.'));
        }
        setGenerating(false);
    };
    const copyFullScript = () => {
        if (!script?.fullScript)
            return;
        navigator.clipboard.writeText(script.fullScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const formatDate = (d) => {
        try {
            return new Date(d).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }
        catch {
            return d;
        }
    };
    const statusBadge = (s) => {
        if (s === 'approved')
            return { label: t('ONAYLANDI', 'APPROVED'), color: 'hsl(142,60%,50%)', bg: 'hsla(142,60%,50%,0.12)' };
        if (s === 'revised')
            return { label: t('DÜZENLENDİ', 'REVISED'), color: 'hsl(38,90%,50%)', bg: 'hsla(38,90%,50%,0.12)' };
        if (s === 'max_revisions')
            return { label: t('MAKS REVİZYON', 'MAX REVISIONS'), color: 'hsl(0,70%,50%)', bg: 'hsla(0,70%,50%,0.12)' };
        return { label: s, color: 'var(--text-muted)', bg: 'transparent' };
    };
    const sectionTitle = (icon, text) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }, children: [icon, _jsx("span", { children: text })] }));
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
        input: {
            width: '100%',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            resize: 'vertical',
            boxSizing: 'border-box',
        },
        select: {
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            cursor: 'pointer',
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
        divider: {
            height: 1,
            background: 'var(--border)',
            margin: '24px 0',
            opacity: 0.5,
        },
        grid2: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
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
    return (_jsxs("div", { style: s.panel, children: [_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }, children: [_jsx("div", { style: { width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #7F00FF, #FF007F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Sparkles, { size: 16, color: "white" }) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }, children: t('AI Senaryo Yazma', 'AI Script Writer') }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)' }, children: t('CrewAI multi-agent pipeline ile endüstriyel senaryo üretimi', 'Industrial-grade script generation via CrewAI multi-agent pipeline') })] })] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: s.label, children: t('KONU / KONSEPT', 'TOPIC / CONCEPT') }), _jsx("textarea", { style: { ...s.input, minHeight: 80 }, value: topic, onChange: e => setTopic(e.target.value), placeholder: t('Hikayenizin ana konusunu yazın...', 'Write the main concept of your story...') })] }), _jsxs("div", { style: { marginBottom: 16, position: 'relative' }, children: [_jsx("label", { style: s.label, children: t('KARAKTER REFERANSLARI (OPSİYONEL)', 'CHARACTER REFERENCES (OPTIONAL)') }), _jsx("textarea", { ref: charInputRef, style: { ...s.input, minHeight: 60 }, value: characterProfiles, onChange: handleCharInput, placeholder: t('@karakter_adı yazarak kütüphaneden karakter ekleyin ve/veya elle tanımlayın...\nÖrn: @elif 25 yaşında cesur bir gazeteci', 'Type @char_name to reference library characters and/or describe manually...\nE.g: @elif 25yo brave journalist') }), characters.length > 0 && (_jsx("div", { style: { marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }, children: characters.slice(0, 8).map(c => (_jsxs("button", { onClick: () => insertCharName(c.name), style: s.chip, type: "button", children: [_jsx(User, { size: 10 }), " @", c.name] }, c.id))) })), showCharDropdown && filteredChars.length > 0 && (_jsx("div", { ref: charDropdownRef, style: {
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 100,
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    maxHeight: 200,
                                    overflowY: 'auto',
                                    marginTop: 4,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                }, children: filteredChars.map(c => (_jsxs("button", { type: "button", onClick: () => insertCharName(c.name), style: {
                                        width: '100%',
                                        padding: '8px 14px',
                                        textAlign: 'left',
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        color: 'var(--text-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        borderBottom: '1px solid var(--border)',
                                    }, onMouseEnter: e => (e.currentTarget.style.background = 'var(--accent-light)'), onMouseLeave: e => (e.currentTarget.style.background = 'transparent'), children: [_jsx(User, { size: 12, style: { opacity: 0.5 } }), _jsxs("span", { style: { fontWeight: 600 }, children: ["@", c.name] }), c.role && _jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }, children: ["(", c.role, ")"] })] }, c.id))) }))] }), _jsxs("div", { style: { marginBottom: 16 }, children: [sectionTitle(_jsx(Palette, { size: 13 }), t('GÖRSEL STİL', 'ART STYLE')), loadingStyles ? (_jsx("div", { style: { textAlign: 'center', padding: 16, color: 'var(--text-muted)' }, children: _jsx(Loader, { size: 14, className: "spin" }) })) : (_jsx("div", { style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 10,
                                    maxHeight: 320,
                                    overflowY: 'auto',
                                }, children: artStyles.map(p => {
                                    const selected = selectedArtStyle === p.id;
                                    return (_jsxs("button", { type: "button", onClick: () => setSelectedArtStyle(selected ? '' : p.id), style: {
                                            minHeight: 200,
                                            background: selected ? 'hsla(var(--primary),0.1)' : 'var(--bg-primary)',
                                            border: selected ? '2px solid hsl(var(--primary))' : '1px solid var(--border)',
                                            borderRadius: 10,
                                            padding: 14,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 8,
                                            transition: 'all 0.15s',
                                        }, children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }, children: p.name }), _jsx("div", { style: { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }, children: p.description.length > 100 ? p.description.slice(0, 100) + '...' : p.description }), _jsx("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap' }, children: p.colorPalette.map((c, i) => (_jsx("div", { title: c, style: {
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: '50%',
                                                        background: c,
                                                        border: '1px solid var(--border)',
                                                    } }, i))) }), _jsx("div", { style: { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }, children: p.moodTags.slice(0, 4).map(m => (_jsx("span", { style: s.chip, children: m }, m))) }), p.referenceDirectors && p.referenceDirectors.length > 0 && (_jsx("div", { style: { fontSize: 10, color: 'var(--text-muted)' }, children: p.referenceDirectors.join(', ') }))] }, p.id));
                                }) }))] }), _jsxs("div", { style: { marginBottom: 16 }, children: [sectionTitle(_jsx(FileText, { size: 13 }), t('DOKÜMAN YÜKLE (OPSİYONEL)', 'DOCUMENT UPLOAD (OPTIONAL)')), uploading ? (_jsxs("div", { style: {
                                    padding: 20,
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
                                            } }) }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }, children: [uploadProgress, "%"] })] })) : uploadedText ? (_jsxs("div", { style: {
                                    padding: 14,
                                    background: 'var(--bg-primary)',
                                    border: '1px solid hsl(var(--primary))',
                                    borderRadius: 8,
                                }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }, children: [_jsx(FileText, { size: 12 }), uploadedFileName] }), _jsx("button", { type: "button", onClick: clearUploadedDoc, style: {
                                                    ...s.btn,
                                                    padding: '4px 10px',
                                                    fontSize: 11,
                                                    color: 'hsl(0,70%,60%)',
                                                    background: 'transparent',
                                                    border: '1px solid hsla(0,70%,50%,0.2)',
                                                }, children: t('Kaldır', 'Remove') })] }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto' }, children: [uploadedText.slice(0, 200), uploadedText.length > 200 && _jsx("span", { style: { color: 'hsl(var(--primary))' }, children: "..." })] })] })) : (_jsxs("div", { onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave, style: {
                                    padding: 28,
                                    border: `2px dashed ${dragOver ? 'hsl(var(--primary))' : 'var(--border)'}`,
                                    borderRadius: 8,
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: dragOver ? 'hsla(var(--primary),0.05)' : 'var(--bg-primary)',
                                    transition: 'all 0.15s',
                                }, onClick: () => fileInputRef.current?.click(), children: [_jsx(Upload, { size: 20, style: { color: 'var(--text-muted)', marginBottom: 6 } }), _jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)' }, children: t('PDF, DOCX veya TXT dosyasını sürükleyin veya tıklayın', 'Drag & drop a PDF, DOCX or TXT file, or click to browse') }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".pdf,.docx,.txt", style: { display: 'none' }, onChange: handleFileSelect })] }))] }), _jsxs("div", { style: { display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("label", { style: s.label, children: t('KALİTE', 'QUALITY') }), _jsxs("select", { style: s.select, value: quality, onChange: e => setQuality(e.target.value), children: [_jsx("option", { value: "low", children: t('Düşük (Hızlı)', 'Low (Fast)') }), _jsx("option", { value: "medium", children: t('Orta (Dengeli)', 'Medium (Balanced)') }), _jsx("option", { value: "high", children: t('Yüksek (Detaylı)', 'High (Detailed)') })] })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: t('YAZAR SEVİYESİ', 'WRITER TIER') }), _jsxs("select", { style: s.select, value: writerTier, onChange: e => setWriterTier(e.target.value), children: [_jsx("option", { value: "professional", children: t('Profesyonel (3 revizyon)', 'Professional (3 revisions)') }), _jsx("option", { value: "creative", children: t('Yaratıcı (5 revizyon)', 'Creative (5 revisions)') }), _jsx("option", { value: "assistant", children: t('Asistan (1 revizyon)', 'Assistant (1 revision)') })] })] }), _jsx("button", { style: { ...s.btn, ...s.btnPrimary }, onClick: generateScript, disabled: generating || topic.trim().length < 3, children: generating ? (_jsxs(_Fragment, { children: [_jsx(Loader, { size: 14, className: "spin" }), " ", t('Üretiliyor...', 'Generating...')] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { size: 14 }), " ", t('Senaryo Üret', 'Generate Script')] })) })] }), error && (_jsx("div", { style: { padding: '10px 14px', background: 'hsla(0,70%,50%,0.1)', border: '1px solid hsla(0,70%,50%,0.2)', borderRadius: 8, fontSize: 12, color: 'hsl(0,70%,60%)' }, children: error }))] }), script && (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(BookOpen, { size: 16, style: { color: 'var(--text-muted)' } }), _jsx("span", { style: { fontSize: 14, fontWeight: 700 }, children: t('Üretilen Senaryo', 'Generated Script') }), _jsx("span", { style: {
                                            ...s.chip,
                                            background: statusBadge(script.status).bg,
                                            color: statusBadge(script.status).color,
                                            borderColor: statusBadge(script.status).color,
                                        }, children: statusBadge(script.status).label })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [script.id && (_jsx("button", { style: { ...s.btn, ...s.btnSecondary }, onClick: () => {
                                            const item = scriptsList.find(s => s.id === script.id);
                                            if (item) {
                                                setTopic(item.topic);
                                            }
                                        }, children: _jsx(RefreshCw, { size: 12 }) })), _jsx("button", { style: { ...s.btn, ...s.btnSecondary }, onClick: copyFullScript, children: copied ? _jsx(Check, { size: 12, color: "green" }) : _jsx(Copy, { size: 12 }) })] })] }), _jsx("div", { style: { marginBottom: 12 }, children: _jsxs("span", { style: { fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }, children: ["\"", script.logline, "\""] }) }), _jsxs("div", { style: s.grid2, children: [_jsxs("div", { children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: t('Tema', 'Theme') }), _jsx("div", { style: { fontSize: 13, marginTop: 2 }, children: script.theme })] }), _jsxs("div", { children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }, children: t('Tür', 'Genre') }), _jsx("div", { style: { fontSize: 13, marginTop: 2 }, children: script.genre })] })] }), _jsx("div", { style: s.divider }), sectionTitle(_jsx(User, { size: 13 }), t('Karakterler', 'Characters')), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }, children: script.characters.map((ch, i) => (_jsxs("div", { style: {
                                padding: '10px 14px',
                                background: 'var(--bg-primary)',
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                            }, children: [_jsxs("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 }, children: [ch.name, ch.age && _jsxs("span", { style: { fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }, children: ["(", ch.age, ")"] })] }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }, children: [_jsxs("strong", { children: [t('Motivasyon', 'Motivation'), ":"] }), " ", ch.motivation, _jsx("br", {}), _jsxs("strong", { children: [t('Zayıflık', 'Flaw'), ":"] }), " ", ch.flaw] })] }, i))) }), sectionTitle(_jsx(BookOpen, { size: 13 }), t('Özet', 'Synopsis')), _jsx("div", { style: { fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 16, whiteSpace: 'pre-wrap' }, children: script.synopsis }), sectionTitle(_jsx(Clock, { size: 13 }), t('Sahne Planı', 'Scene Plan')), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }, children: script.scenes.map(sc => (_jsxs("div", { style: {
                                padding: '8px 12px',
                                background: 'var(--bg-primary)',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                fontSize: 12,
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }, children: [_jsxs("span", { style: { fontWeight: 700, fontSize: 11, color: 'hsl(var(--primary))' }, children: ["#", sc.sceneNumber] }), _jsxs("span", { style: { color: 'var(--text-muted)' }, children: [sc.interior ? 'İÇ' : 'DIŞ', " \u00B7 ", sc.location, " \u00B7 ", sc.timeOfDay] }), sc.characters.length > 0 && (_jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)' }, children: ["\uD83C\uDFAD ", sc.characters.join(', ')] }))] }), _jsxs("div", { style: { color: 'var(--text-primary)' }, children: [_jsx("strong", { children: sc.purpose }), ": ", sc.plot] })] }, sc.sceneNumber))) }), sectionTitle(_jsx(Sparkles, { size: 13 }), t('Tam Senaryo', 'Full Script')), showEditor ? (_jsx("textarea", { style: { ...s.input, minHeight: 300, fontFamily: 'var(--font-mono)', fontSize: 12 }, value: editorText, onChange: e => setEditorText(e.target.value) })) : (_jsx("div", { style: {
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: 16,
                            fontSize: 12,
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'var(--font-mono)',
                            maxHeight: 400,
                            overflowY: 'auto',
                            color: 'var(--text-primary)',
                        }, children: script.fullScript })), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { style: { ...s.btn, ...s.btnSecondary, fontSize: 11, padding: '6px 14px' }, onClick: () => setShowEditor(!showEditor), children: showEditor ? t('Önizle', 'Preview') : t('Düzenle', 'Edit') }), _jsxs("span", { style: { fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }, children: [t('Revizyon', 'Revision'), " #", script.revisionCount] })] }), script.id && script.scenes && script.scenes.length > 0 && (_jsx(_Fragment, { children: _jsx("div", { style: { marginTop: 24 }, children: _jsx(StoryboardGrid, { scriptId: script.id, scenes: script.scenes, language: language }) }) }))] })), _jsxs("div", { style: s.card, children: [sectionTitle(_jsx(Clock, { size: 13 }), t('Geçmiş Senaryolar', 'Script History')), loadingList ? (_jsx("div", { style: { textAlign: 'center', padding: 20, color: 'var(--text-muted)' }, children: _jsx(Loader, { size: 16, className: "spin" }) })) : scriptsList.length === 0 ? (_jsx("div", { style: { fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }, children: t('Henüz senaryo üretilmedi.', 'No scripts generated yet.') })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: scriptsList.map(item => {
                            const isExpanded = expandedScript === item.id;
                            return (_jsx("div", { style: {
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                }, children: _jsxs("button", { type: "button", onClick: () => loadScriptDetail(item.id), style: {
                                        width: '100%',
                                        padding: '10px 14px',
                                        textAlign: 'left',
                                        border: 'none',
                                        background: 'var(--bg-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: 13,
                                        color: 'var(--text-primary)',
                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }, children: [_jsx("span", { style: { fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: item.topic.slice(0, 60) }), _jsx("span", { style: {
                                                        fontSize: 10,
                                                        padding: '2px 6px',
                                                        borderRadius: 4,
                                                        background: statusBadge(item.status).bg,
                                                        color: statusBadge(item.status).color,
                                                        whiteSpace: 'nowrap',
                                                    }, children: statusBadge(item.status).label })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }, children: [_jsx("span", { style: { fontSize: 10, color: 'var(--text-muted)' }, children: formatDate(item.created_at) }), isExpanded ? _jsx(ChevronUp, { size: 14 }) : _jsx(ChevronDown, { size: 14 })] })] }) }, item.id));
                        }) }))] })] }));
}
