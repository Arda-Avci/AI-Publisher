import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * BatchUpload - Batch Video Upload Interface
 * Premium glassmorphism/cyberpunk design
 */
import { useState, useEffect, useCallback, useRef } from 'react';
const PLATFORM_COLORS = {
    youtube: { accent: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: '▶' },
    tiktok: { accent: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)', icon: '♪' },
    x: { accent: '#1DA1F2', bg: 'rgba(29, 161, 242, 0.15)', icon: '✕' },
    meta: { accent: '#1877F2', bg: 'rgba(24, 119, 242, 0.15)', icon: '◉' },
};
const STATUS_STYLES = {
    pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', label: 'Bekliyor' },
    processing: { bg: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', label: 'İşleniyor' },
    completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#34D399', label: 'Tamamlandı' },
    failed: { bg: 'rgba(239, 68, 68, 0.2)', color: '#F87171', label: 'Başarısız' },
    cancelled: { bg: 'rgba(107, 114, 128, 0.2)', color: '#9CA3AF', label: 'İptal Edildi' },
};
export function BatchUpload({ language: _language, t, onShowToast, onUploadComplete, }) {
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upload');
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [selectedPlatforms, setSelectedPlatforms] = useState(['youtube']);
    const [scheduleDate, setScheduleDate] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [folderPath, setFolderPath] = useState('');
    const fileInputRef = useRef(null);
    const fetchJobs = useCallback(async () => {
        try {
            const r = await fetch('/api/v1/batch');
            const d = await r.json();
            if (d.jobs)
                setJobs(d.jobs);
        }
        catch (err) {
            console.error('Failed to fetch batch jobs:', err);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, [fetchJobs]);
    const handleFileSelect = (files) => {
        if (files && files.length > 0) {
            setSelectedFiles(files);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };
    const handleDragLeave = () => {
        setDragActive(false);
    };
    const togglePlatform = (platform) => {
        setSelectedPlatforms((prev) => prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]);
    };
    const uploadFiles = async () => {
        if (!selectedFiles || selectedFiles.length === 0)
            return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            Array.from(selectedFiles).forEach((file, i) => {
                formData.append(`files[${i}]`, file);
            });
            formData.append('platform', selectedPlatforms.join(','));
            if (scheduleDate)
                formData.append('schedule', scheduleDate);
            const r = await fetch('/api/v1/batch/upload', {
                method: 'POST',
                body: formData,
            });
            if (r.ok) {
                const d = await r.json();
                onShowToast?.(t('batch_upload_started', { count: selectedFiles.length }), 'success');
                setSelectedFiles(null);
                if (fileInputRef.current)
                    fileInputRef.current.value = '';
                fetchJobs();
                onUploadComplete?.(d.job.id);
            }
            else {
                throw new Error('Upload failed');
            }
        }
        catch (err) {
            onShowToast?.(t('batch_upload_failed'), 'error');
        }
        finally {
            setIsUploading(false);
        }
    };
    const uploadFromFolder = async () => {
        if (!folderPath.trim())
            return;
        setIsUploading(true);
        try {
            const r = await fetch('/api/v1/batch/from-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folderPath,
                    platform: selectedPlatforms.join(','),
                    schedule: scheduleDate || undefined,
                }),
            });
            if (r.ok) {
                const d = await r.json();
                onShowToast?.(t('batch_folder_started'), 'success');
                setFolderPath('');
                fetchJobs();
                onUploadComplete?.(d.job.id);
            }
            else {
                throw new Error('Folder upload failed');
            }
        }
        catch (err) {
            onShowToast?.(t('batch_folder_failed'), 'error');
        }
        finally {
            setIsUploading(false);
        }
    };
    const cancelJob = async (jobId) => {
        try {
            const r = await fetch(`/api/v1/batch/${jobId}/cancel`, { method: 'POST' });
            if (r.ok) {
                onShowToast?.(t('batch_cancelled'), 'success');
                fetchJobs();
            }
        }
        catch (err) {
            onShowToast?.(t('batch_cancel_failed'), 'error');
        }
    };
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleString('tr-TR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const getProgressPercent = (job) => {
        if (job.totalVideos === 0)
            return 0;
        return Math.round((job.processedVideos / job.totalVideos) * 100);
    };
    return (_jsxs("div", { style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '20px',
            background: 'rgba(10, 10, 20, 0.6)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            minHeight: '450px',
        }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                }, children: [_jsx("h2", { style: {
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #E5E7EB, #60A5FA)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }, children: t('batch_upload') }), _jsx("div", { style: {
                            display: 'flex',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '8px',
                            padding: '4px',
                            gap: '4px',
                        }, children: [
                            { key: 'upload', label: t('file_upload') },
                            { key: 'folder', label: t('folder_watch') },
                            { key: 'history', label: t('history') },
                        ].map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.key), style: {
                                padding: '8px 16px',
                                background: activeTab === tab.key ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                                border: activeTab === tab.key
                                    ? '1px solid rgba(59, 130, 246, 0.5)'
                                    : '1px solid transparent',
                                borderRadius: '6px',
                                color: activeTab === tab.key ? '#60A5FA' : '#9CA3AF',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }, children: tab.label }, tab.key))) })] }), activeTab === 'upload' && (_jsxs("div", { children: [_jsxs("div", { onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onClick: () => fileInputRef.current?.click(), style: {
                            padding: '40px',
                            border: `2px dashed ${dragActive ? '#60A5FA' : 'rgba(59, 130, 246, 0.3)'}`,
                            borderRadius: '12px',
                            background: dragActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0, 0, 0, 0.2)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            marginBottom: '20px',
                        }, children: [_jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: "video/*", onChange: (e) => handleFileSelect(e.target.files), style: { display: 'none' } }), _jsx("div", { style: {
                                    width: '56px',
                                    height: '56px',
                                    margin: '0 auto 16px',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '24px',
                                }, children: "\uD83D\uDCC1" }), selectedFiles ? (_jsxs("div", { children: [_jsxs("div", { style: { fontSize: '14px', color: '#E5E7EB', marginBottom: '4px' }, children: [selectedFiles.length, " ", t('files_selected')] }), _jsxs("div", { style: { fontSize: '12px', color: '#6B7280' }, children: [Array.from(selectedFiles)
                                                .map((f) => f.name)
                                                .join(', ')
                                                .substring(0, 100), "..."] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '14px', color: '#E5E7EB', marginBottom: '4px' }, children: t('drop_files_here') }), _jsx("div", { style: { fontSize: '12px', color: '#6B7280' }, children: t('or_click_to_select') })] }))] }), selectedFiles && selectedFiles.length > 0 && (_jsxs("div", { style: {
                            padding: '12px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            maxHeight: '120px',
                            overflowY: 'auto',
                        }, children: [_jsxs("div", { style: {
                                    fontSize: '11px',
                                    color: '#6B7280',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                }, children: [t('selected_files'), " (", selectedFiles.length, ")"] }), Array.from(selectedFiles)
                                .slice(0, 5)
                                .map((file, i) => (_jsxs("div", { style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '6px 0',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                }, children: [_jsx("span", { style: { fontSize: '14px' }, children: "\uD83C\uDFAC" }), _jsx("span", { style: {
                                            fontSize: '12px',
                                            color: '#D1D5DB',
                                            flex: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }, children: file.name }), _jsxs("span", { style: { fontSize: '10px', color: '#6B7280', fontFamily: 'var(--font-mono)' }, children: [(file.size / (1024 * 1024)).toFixed(1), " MB"] })] }, i))), selectedFiles.length > 5 && (_jsxs("div", { style: { fontSize: '11px', color: '#6B7280', paddingTop: '8px' }, children: ["+", selectedFiles.length - 5, " ", t('more_files')] }))] })), _jsxs("div", { style: { marginBottom: '16px' }, children: [_jsx("label", { style: {
                                    display: 'block',
                                    fontSize: '11px',
                                    color: '#9CA3AF',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }, children: t('target_platforms') }), _jsx("div", { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' }, children: Object.keys(PLATFORM_COLORS).map((platform) => {
                                    const p = PLATFORM_COLORS[platform];
                                    const isSelected = selectedPlatforms.includes(platform);
                                    return (_jsxs("button", { onClick: () => togglePlatform(platform), style: {
                                            padding: '8px 14px',
                                            background: isSelected ? p.bg : 'rgba(0, 0, 0, 0.3)',
                                            border: `1px solid ${isSelected ? p.accent : 'rgba(255, 255, 255, 0.1)'}`,
                                            borderRadius: '6px',
                                            color: isSelected ? p.accent : '#9CA3AF',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s ease',
                                        }, children: [_jsx("span", { children: p.icon }), _jsx("span", { style: { textTransform: 'capitalize' }, children: platform })] }, platform));
                                }) })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsxs("label", { style: {
                                    display: 'block',
                                    fontSize: '11px',
                                    color: '#9CA3AF',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }, children: [t('schedule_publish'), " (", t('optional'), ")"] }), _jsx("input", { type: "datetime-local", value: scheduleDate, onChange: (e) => setScheduleDate(e.target.value), style: {
                                    padding: '10px 12px',
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '13px',
                                    outline: 'none',
                                } })] }), _jsx("button", { onClick: uploadFiles, disabled: !selectedFiles || selectedFiles.length === 0 || isUploading, style: {
                            width: '100%',
                            padding: '14px',
                            background: selectedFiles && selectedFiles.length > 0
                                ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                                : 'rgba(59, 130, 246, 0.3)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: selectedFiles && selectedFiles.length > 0 && !isUploading
                                ? 'pointer'
                                : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                        }, children: isUploading ? (_jsxs(_Fragment, { children: [_jsx("span", { style: { animation: 'spin 1s linear infinite' }, children: "\u25CC" }), t('uploading')] })) : (_jsxs(_Fragment, { children: [_jsx("span", { style: { fontSize: '18px' }, children: "\u2191" }), t('start_batch_upload'), " (", selectedFiles?.length || 0, ")"] })) })] })), activeTab === 'folder' && (_jsxs("div", { children: [_jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("label", { style: {
                                    display: 'block',
                                    fontSize: '11px',
                                    color: '#9CA3AF',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }, children: t('folder_path') }), _jsx("input", { type: "text", value: folderPath, onChange: (e) => setFolderPath(e.target.value), placeholder: "C:\\Videos\\BatchUpload", style: {
                                    width: '100%',
                                    padding: '12px 14px',
                                    background: 'rgba(0, 0, 0, 0.4)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                } })] }), _jsx("div", { style: {
                            padding: '20px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '8px',
                            marginBottom: '20px',
                        }, children: _jsx("div", { style: { fontSize: '12px', color: '#6B7280' }, children: t('folder_watch_description') }) }), _jsx("button", { onClick: uploadFromFolder, disabled: !folderPath.trim() || isUploading, style: {
                            width: '100%',
                            padding: '14px',
                            background: folderPath.trim()
                                ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                                : 'rgba(139, 92, 246, 0.3)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: folderPath.trim() && !isUploading ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                        }, children: isUploading ? t('processing') : t('start_folder_watch') })] })), activeTab === 'history' && (_jsx("div", { children: isLoading ? (_jsxs("div", { style: { textAlign: 'center', padding: '40px', color: '#6B7280' }, children: [t('loading'), "..."] })) : jobs.length === 0 ? (_jsx("div", { style: {
                        textAlign: 'center',
                        padding: '40px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '10px',
                    }, children: _jsx("div", { style: { fontSize: '14px', color: '#9CA3AF' }, children: t('no_batch_jobs') }) })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: jobs.map((job) => {
                        const status = STATUS_STYLES[job.status];
                        const progress = getProgressPercent(job);
                        return (_jsxs("div", { style: {
                                padding: '16px',
                                background: 'rgba(20, 20, 35, 0.6)',
                                borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                            }, children: [_jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '12px',
                                    }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        color: '#E5E7EB',
                                                        marginBottom: '2px',
                                                    }, children: job.name }), _jsx("div", { style: { fontSize: '11px', color: '#6B7280' }, children: formatDate(job.createdAt) })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: {
                                                        padding: '4px 10px',
                                                        background: status.bg,
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        color: status.color,
                                                        fontFamily: 'var(--font-mono)',
                                                    }, children: status.label }), job.status === 'pending' || job.status === 'processing' ? (_jsx("button", { onClick: () => cancelJob(job.id), style: {
                                                        width: '28px',
                                                        height: '28px',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        borderRadius: '6px',
                                                        color: '#F87171',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                    }, children: "\u00D7" })) : null] })] }), _jsxs("div", { style: { marginBottom: '8px' }, children: [_jsxs("div", { style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '10px',
                                                color: '#6B7280',
                                                marginBottom: '4px',
                                            }, children: [_jsxs("span", { children: [job.processedVideos, " / ", job.totalVideos, " ", t('videos')] }), _jsxs("span", { children: [progress, "%"] })] }), _jsx("div", { style: {
                                                height: '6px',
                                                background: 'rgba(0, 0, 0, 0.4)',
                                                borderRadius: '3px',
                                                overflow: 'hidden',
                                            }, children: _jsx("div", { style: {
                                                    height: '100%',
                                                    width: `${progress}%`,
                                                    background: job.status === 'failed'
                                                        ? '#EF4444'
                                                        : 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                                                    borderRadius: '3px',
                                                    transition: 'width 0.3s ease',
                                                } }) })] }), job.failedVideos > 0 && (_jsxs("div", { style: { fontSize: '10px', color: '#F87171' }, children: [job.failedVideos, " ", t('failed')] }))] }, job.id));
                    }) })) })), _jsx("style", { children: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` })] }));
}
