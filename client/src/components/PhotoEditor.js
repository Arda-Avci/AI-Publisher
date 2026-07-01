import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useEffect } from 'react';
import { Eraser, Paintbrush, Scissors, Sparkles, RefreshCw, Wand2 } from 'lucide-react';
export const PhotoEditor = ({ imageUrl, onSave, onClose }) => {
    const canvasRef = useRef(null);
    const [brushSize, setBrushSize] = useState(20);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEraser, setIsEraser] = useState(false);
    const [inpaintPrompt, setInpaintPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [editorImage, setEditorImage] = useState(imageUrl);
    // Initialize canvas with correct dimensions matching the image
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Set canvas size to match visual display container
            const containerWidth = 500;
            const scale = containerWidth / img.width;
            canvas.width = containerWidth;
            canvas.height = img.height * scale;
            // Draw background image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // We will overlay a second transparent canvas for drawing masks,
            // or we can draw directly and keep a backup of the original image
            // Let's create an offscreen canvas for the mask
            createMaskCanvas(canvas.width, canvas.height);
        };
        img.src = editorImage;
    }, [editorImage]);
    // Mask drawing canvas state
    const maskCanvasRef = useRef(null);
    const createMaskCanvas = (width, height) => {
        const mCanvas = document.createElement('canvas');
        mCanvas.width = width;
        mCanvas.height = height;
        const mCtx = mCanvas.getContext('2d');
        if (mCtx) {
            mCtx.fillStyle = 'black';
            mCtx.fillRect(0, 0, width, height); // Default mask is black (unaltered)
        }
        maskCanvasRef.current = mCanvas;
    };
    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        if (!canvas)
            return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };
    const startDrawing = (e) => {
        setIsDrawing(true);
        draw(e);
    };
    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx)
            ctx.beginPath();
    };
    const draw = (e) => {
        if (!isDrawing)
            return;
        const canvas = canvasRef.current;
        const mCanvas = maskCanvasRef.current;
        if (!canvas || !mCanvas)
            return;
        const ctx = canvas.getContext('2d');
        const mCtx = mCanvas.getContext('2d');
        if (!ctx || !mCtx)
            return;
        const pos = getMousePos(e);
        // Draw on visual canvas (semi-transparent red for mask overlay)
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        mCtx.lineWidth = brushSize;
        mCtx.lineCap = 'round';
        mCtx.lineJoin = 'round';
        if (isEraser) {
            // Revert visual canvas back to original image
            // For simplicity, we just redraw the original image portion under brush
            // But to keep code simple, we can clear the mask on offscreen, and redraw base image
            mCtx.strokeStyle = 'black';
            mCtx.stroke();
            mCtx.lineTo(pos.x, pos.y);
            mCtx.stroke();
            // Redraw base image + mask overlay
            redrawAll();
        }
        else {
            // Draw white mask on mask canvas
            mCtx.strokeStyle = 'white';
            mCtx.lineTo(pos.x, pos.y);
            mCtx.stroke();
            mCtx.beginPath();
            mCtx.moveTo(pos.x, pos.y);
            // Draw red overlay on visual canvas
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // Transparent red
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    };
    const redrawAll = () => {
        const canvas = canvasRef.current;
        const mCanvas = maskCanvasRef.current;
        if (!canvas || !mCanvas)
            return;
        const ctx = canvas.getContext('2d');
        const mCtx = mCanvas.getContext('2d');
        if (!ctx || !mCtx)
            return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Overlay mask as red
            const maskData = mCtx.getImageData(0, 0, mCanvas.width, mCanvas.height);
            const visualData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < maskData.data.length; i += 4) {
                // If mask is white (drawn area), make it red overlay
                if (maskData.data[i] > 128) {
                    visualData.data[i] = 239; // R
                    visualData.data[i + 1] = 68; // G
                    visualData.data[i + 2] = 68; // B
                    visualData.data[i + 3] = 200; // Alpha
                }
            }
            ctx.putImageData(visualData, 0, 0);
        };
        img.src = editorImage;
    };
    // Convert canvas to Blob
    const canvasToBlob = (canvas, mimeType = 'image/png') => {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob)
                    resolve(blob);
                else
                    reject(new Error('Canvas conversion failed'));
            }, mimeType);
        });
    };
    // ✂️ Remove Background
    const handleRemoveBackground = async () => {
        setIsProcessing(true);
        setStatusMsg('Arka plan temizleniyor (Docker rembg)...');
        try {
            const response = await fetch(editorImage);
            const imageBlob = await response.blob();
            const formData = new FormData();
            formData.append('image', imageBlob, 'original.png');
            const res = await fetch('/api/v1/editor/remove-background', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setEditorImage(data.url);
                setStatusMsg('Arka plan başarıyla kaldırıldı!');
            }
            else {
                setStatusMsg(`Hata: ${data.error || 'Bilinmeyen hata'}`);
            }
        }
        catch (err) {
            setStatusMsg(`İletişim hatası: ${err.message}`);
        }
        finally {
            setIsProcessing(false);
        }
    };
    // 🎨 SD Inpaint
    const handleInpaint = async () => {
        if (!inpaintPrompt) {
            setStatusMsg('Lütfen düzenlemek istediğiniz alanı açıklayan bir prompt girin.');
            return;
        }
        if (!maskCanvasRef.current)
            return;
        setIsProcessing(true);
        setStatusMsg('Görsel inpaint ediliyor (Docker SD)...');
        try {
            // Get base image blob
            const response = await fetch(editorImage);
            const imageBlob = await response.blob();
            // Get mask image blob
            const maskBlob = await canvasToBlob(maskCanvasRef.current);
            const formData = new FormData();
            formData.append('image', imageBlob, 'original.png');
            formData.append('mask', maskBlob, 'mask.png');
            formData.append('prompt', inpaintPrompt);
            const res = await fetch('/api/v1/editor/inpaint', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setEditorImage(data.url);
                setStatusMsg('Maskelenen alan başarıyla yeniden çizildi!');
                setInpaintPrompt('');
            }
            else {
                setStatusMsg(`Hata: ${data.error || 'Bilinmeyen hata'}`);
            }
        }
        catch (err) {
            setStatusMsg(`İletişim hatası: ${err.message}`);
        }
        finally {
            setIsProcessing(false);
        }
    };
    const handleSave = () => {
        onSave(editorImage);
        onClose();
    };
    return (_jsx("div", { className: "photo-editor-modal glass", style: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(5, 7, 12, 0.9)',
        }, children: _jsxs("div", { className: "editor-card", style: {
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '900px',
                display: 'grid',
                gridTemplateColumns: '1fr 300px',
                gap: '20px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }, children: [_jsxs("div", { style: {
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }, children: [_jsxs("h3", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx(Wand2, { size: 18, style: { color: 'var(--primary)' } }), "Geli\u015Fmi\u015F G\u00F6rsel St\u00FCdyo & Edit\u00F6r"] }), _jsx("span", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "Odysseus tabanl\u0131 AI ara\u00E7lar\u0131" })] }), _jsx("div", { style: {
                                position: 'relative',
                                width: '500px',
                                background: '#070a14',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid var(--border)',
                                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                            }, children: _jsx("canvas", { ref: canvasRef, onMouseDown: startDrawing, onMouseUp: stopDrawing, onMouseOut: stopDrawing, onMouseMove: draw, style: { display: 'block', cursor: isEraser ? 'cell' : 'crosshair' } }) }), _jsxs("div", { style: {
                                display: 'flex',
                                gap: '15px',
                                alignItems: 'center',
                                width: '100%',
                                background: 'var(--bg-timeline)',
                                padding: '10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                            }, children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "F\u0131r\u00E7a Modu:" }), _jsxs("button", { onClick: () => setIsEraser(false), className: "btn", style: {
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        background: !isEraser ? 'var(--primary)' : 'var(--bg-surface-hover)',
                                        color: !isEraser ? '#0b0f19' : 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }, children: [_jsx(Paintbrush, { size: 12 }), " Maske \u00C7iz"] }), _jsxs("button", { onClick: () => setIsEraser(true), className: "btn", style: {
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        background: isEraser ? 'var(--primary)' : 'var(--bg-surface-hover)',
                                        color: isEraser ? '#0b0f19' : 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }, children: [_jsx(Eraser, { size: 12 }), " Silici (Erase)"] }), _jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        flexGrow: 1,
                                        marginLeft: '10px',
                                    }, children: [_jsx("span", { style: { fontSize: '12px', color: 'var(--text-muted)' }, children: "F\u0131r\u00E7a Boyutu:" }), _jsx("input", { type: "range", min: "5", max: "50", value: brushSize, onChange: (e) => setBrushSize(Number(e.target.value)), style: { flexGrow: 1, accentColor: 'var(--primary)' } }), _jsxs("span", { style: { fontSize: '12px', fontWeight: 'bold' }, children: [brushSize, "px"] })] })] })] }), _jsxs("div", { style: {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        borderLeft: '1px solid var(--border)',
                        paddingLeft: '20px',
                        justifyContent: 'space-between',
                    }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '15px' }, children: [_jsx("div", { style: {
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        borderBottom: '1px solid var(--border)',
                                        paddingBottom: '8px',
                                        color: 'var(--text-muted)',
                                    }, children: "AI ARA\u00C7LARI" }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }, children: "1. ARKA PLAN KALDIR (rembg)" }), _jsxs("button", { onClick: handleRemoveBackground, disabled: isProcessing, className: "btn btn-secondary", style: {
                                                width: '100%',
                                                justifyContent: 'flex-start',
                                                fontSize: '12px',
                                                gap: '8px',
                                                borderColor: 'var(--primary-glow)',
                                            }, children: [_jsx(Scissors, { size: 14, style: { color: 'var(--primary)' } }), isProcessing && statusMsg.includes('Arka plan')
                                                    ? 'Kaldırılıyor...'
                                                    : 'Arka Planı Temizle'] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px' }, children: [_jsx("span", { style: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }, children: "2. B\u00D6LGESEL YEN\u0130DEN \u00C7\u0130Z (Inpaint)" }), _jsx("textarea", { placeholder: "Maskeledi\u011Finiz alan\u0131n yerine \u00E7izilmesini istedi\u011Finiz nesneyi tarif edin...", value: inpaintPrompt, onChange: (e) => setInpaintPrompt(e.target.value), style: {
                                                width: '100%',
                                                height: '70px',
                                                background: 'var(--bg-timeline)',
                                                border: '1px solid var(--border)',
                                                color: 'white',
                                                borderRadius: '6px',
                                                padding: '8px',
                                                fontSize: '11px',
                                                resize: 'none',
                                                outline: 'none',
                                            } }), _jsxs("button", { onClick: handleInpaint, disabled: isProcessing, className: "btn btn-primary", style: { width: '100%', fontSize: '12px', gap: '8px' }, children: [_jsx(Sparkles, { size: 14 }), isProcessing && statusMsg.includes('Inpaint')
                                                    ? 'Sentezleniyor...'
                                                    : 'Seçili Alanı AI İle Çiz'] })] }), statusMsg && (_jsxs("div", { style: {
                                        background: 'rgba(234, 179, 8, 0.08)',
                                        border: '1px solid rgba(234, 179, 8, 0.2)',
                                        borderRadius: '6px',
                                        padding: '8px 12px',
                                        fontSize: '11px',
                                        color: 'var(--warning)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        wordBreak: 'break-all',
                                    }, children: [_jsx(RefreshCw, { size: 12, className: "pulse" }), statusMsg] }))] }), _jsxs("div", { style: {
                                display: 'flex',
                                gap: '10px',
                                marginTop: '20px',
                                borderTop: '1px solid var(--border)',
                                paddingTop: '15px',
                            }, children: [_jsx("button", { onClick: onClose, className: "btn btn-secondary", style: { flexGrow: 1 }, children: "\u0130ptal Et" }), _jsx("button", { onClick: handleSave, className: "btn btn-primary", style: { flexGrow: 1 }, children: "Kaydet ve Timeline'a Aktar" })] })] })] }) }));
};
