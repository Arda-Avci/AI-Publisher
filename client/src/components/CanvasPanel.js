import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * CanvasPanel - Infinite Canvas Management Interface
 * Premium glassmorphism/cyberpunk design
 */
import { useState, useEffect, useCallback } from 'react';
const NODE_COLORS = {
    text: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
    image: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },
    video: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)' },
    character: { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)' },
    storyboard: {
        bg: 'rgba(59, 130, 246, 0.15)',
        border: '#3B82F6',
        glow: 'rgba(59, 130, 246, 0.4)',
    },
    keyframe: { bg: 'rgba(236, 72, 153, 0.15)', border: '#EC4899', glow: 'rgba(236, 72, 153, 0.4)' },
};
const STATUS_BADGES = {
    draft: { bg: 'rgba(107, 114, 128, 0.3)', text: '#9CA3AF' },
    pending: { bg: 'rgba(245, 158, 11, 0.3)', text: '#FBBF24' },
    generating: { bg: 'rgba(59, 130, 246, 0.3)', text: '#60A5FA' },
    completed: { bg: 'rgba(16, 185, 129, 0.3)', text: '#34D399' },
    failed: { bg: 'rgba(239, 68, 68, 0.3)', text: '#F87171' },
};
export function CanvasPanel({ language: _language, t, onShowToast }) {
    const [canvases, setCanvases] = useState([]);
    const [selectedCanvas, setSelectedCanvas] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newCanvasName, setNewCanvasName] = useState('');
    const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [taskQueueStatus, setTaskQueueStatus] = useState({
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
    });
    const [_draggedNode, setDraggedNode] = useState(null);
    const fetchCanvases = useCallback(async () => {
        try {
            const r = await fetch('/api/v1/canvas');
            const d = await r.json();
            if (d.canvases)
                setCanvases(d.canvases);
        }
        catch (err) {
            console.error('Failed to fetch canvases:', err);
        }
    }, []);
    const fetchCanvasDetails = useCallback(async (id) => {
        try {
            const r = await fetch(`/api/v1/canvas/${id}`);
            const d = await r.json();
            if (d.canvas)
                setSelectedCanvas(d.canvas);
        }
        catch (err) {
            console.error('Failed to fetch canvas:', err);
        }
    }, []);
    const fetchTaskStatus = useCallback(async (id) => {
        try {
            const r = await fetch(`/api/v1/canvas/${id}/tasks/status`);
            const d = await r.json();
            if (d.pending !== undefined)
                setTaskQueueStatus(d);
        }
        catch (err) {
            console.error('Failed to fetch task status:', err);
        }
    }, []);
    useEffect(() => {
        fetchCanvases();
    }, [fetchCanvases]);
    useEffect(() => {
        if (selectedCanvas) {
            fetchCanvasDetails(selectedCanvas.id);
            fetchTaskStatus(selectedCanvas.id);
            const interval = setInterval(() => fetchTaskStatus(selectedCanvas.id), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedCanvas, fetchCanvasDetails, fetchTaskStatus]);
    const createCanvas = async () => {
        if (!newCanvasName.trim())
            return;
        setIsLoading(true);
        try {
            const r = await fetch('/api/v1/canvas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCanvasName }),
            });
            const d = await r.json();
            if (d.canvas) {
                setCanvases((prev) => [...prev, d.canvas]);
                setSelectedCanvas(d.canvas);
                setShowNewCanvasModal(false);
                setNewCanvasName('');
                onShowToast?.(t('canvas_created', { name: newCanvasName }), 'success');
            }
        }
        catch (err) {
            onShowToast?.(t('canvas_create_failed'), 'error');
        }
        finally {
            setIsLoading(false);
        }
    };
    const addNode = async (type) => {
        if (!selectedCanvas)
            return;
        try {
            const r = await fetch(`/api/v1/canvas/${selectedCanvas.id}/nodes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 }),
            });
            const d = await r.json();
            if (d.node) {
                setSelectedCanvas((prev) => prev
                    ? {
                        ...prev,
                        nodes: [...prev.nodes, d.node],
                    }
                    : null);
            }
        }
        catch (err) {
            onShowToast?.(t('node_add_failed'), 'error');
        }
    };
    const deleteNode = async (nodeId) => {
        if (!selectedCanvas)
            return;
        try {
            const r = await fetch(`/api/v1/canvas/${selectedCanvas.id}/nodes/${nodeId}`, {
                method: 'DELETE',
            });
            if (r.ok) {
                setSelectedCanvas((prev) => prev
                    ? {
                        ...prev,
                        nodes: prev.nodes.filter((n) => n.id !== nodeId),
                        connections: prev.connections.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId),
                    }
                    : null);
                setSelectedNode(null);
                onShowToast?.(t('node_deleted'), 'success');
            }
        }
        catch (err) {
            onShowToast?.(t('node_delete_failed'), 'error');
        }
    };
    const startGeneration = async () => {
        if (!selectedCanvas)
            return;
        try {
            const r = await fetch(`/api/v1/canvas/${selectedCanvas.id}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks: selectedCanvas.nodes
                        .filter((n) => n.status === 'draft')
                        .map((n) => ({ type: 'generate', nodeId: n.id })),
                }),
            });
            const d = await r.json();
            if (d.tasks) {
                onShowToast?.(t('generation_started', { count: d.tasks.length }), 'success');
            }
        }
        catch (err) {
            onShowToast?.(t('generation_failed'), 'error');
        }
    };
    return (_jsxs("div", { style: {
            display: 'flex',
            flex: 1,
            minHeight: 0,
            gap: '12px',
            padding: '12px',
            background: 'rgba(10, 10, 20, 0.6)',
            borderRadius: '12px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
        }, children: [_jsxs("div", { style: {
                    width: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }, children: [_jsxs("div", { style: {
                            padding: '12px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                        }, children: [_jsx("h3", { style: {
                                    margin: '0 0 12px 0',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#A78BFA',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontFamily: 'var(--font-mono)',
                                }, children: t('canvases') }), _jsxs("button", { onClick: () => setShowNewCanvasModal(true), style: {
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(59, 130, 246, 0.6))',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                }, onMouseEnter: (e) => (e.currentTarget.style.transform = 'translateY(-1px)'), onMouseLeave: (e) => (e.currentTarget.style.transform = 'translateY(0)'), children: [_jsx("span", { style: { fontSize: '14px' }, children: "+" }), " ", t('new_canvas')] })] }), _jsxs("div", { style: {
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                        }, children: [canvases.map((canvas) => (_jsxs("button", { onClick: () => setSelectedCanvas(canvas), style: {
                                    padding: '10px 12px',
                                    background: selectedCanvas?.id === canvas.id
                                        ? 'rgba(139, 92, 246, 0.25)'
                                        : 'rgba(30, 30, 50, 0.6)',
                                    border: selectedCanvas?.id === canvas.id
                                        ? '1px solid rgba(139, 92, 246, 0.5)'
                                        : '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '6px',
                                    color: selectedCanvas?.id === canvas.id ? '#C4B5FD' : '#9CA3AF',
                                    fontSize: '13px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }, children: [_jsx("div", { style: { fontWeight: 500, marginBottom: '2px' }, children: canvas.name }), _jsxs("div", { style: { fontSize: '10px', opacity: 0.6, fontFamily: 'var(--font-mono)' }, children: [canvas.nodes?.length || 0, " nodes"] })] }, canvas.id))), canvases.length === 0 && (_jsx("div", { style: {
                                    padding: '20px',
                                    textAlign: 'center',
                                    color: '#6B7280',
                                    fontSize: '12px',
                                }, children: t('no_canvases') }))] }), selectedCanvas && (_jsxs("div", { style: {
                            padding: '10px',
                            background: 'rgba(30, 30, 50, 0.6)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                        }, children: [_jsx("div", { style: {
                                    fontSize: '10px',
                                    color: '#6B7280',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }, children: t('task_queue') }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }, children: [
                                    { label: t('pending'), value: taskQueueStatus.pending, color: '#FBBF24' },
                                    { label: t('running'), value: taskQueueStatus.running, color: '#60A5FA' },
                                    { label: t('completed'), value: taskQueueStatus.completed, color: '#34D399' },
                                    { label: t('failed'), value: taskQueueStatus.failed, color: '#F87171' },
                                ].map((stat) => (_jsxs("div", { style: {
                                        padding: '6px 8px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                    }, children: [_jsx("div", { style: {
                                                fontSize: '16px',
                                                fontWeight: 700,
                                                color: stat.color,
                                                fontFamily: 'var(--font-mono)',
                                            }, children: stat.value }), _jsx("div", { style: { fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }, children: stat.label })] }, stat.label))) })] }))] }), _jsx("div", { style: {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(15, 15, 25, 0.8)',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    overflow: 'hidden',
                }, children: selectedCanvas ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                padding: '10px 14px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '14px', fontWeight: 600, color: '#E5E7EB' }, children: selectedCanvas.name }), _jsxs("span", { style: {
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                background: 'rgba(139, 92, 246, 0.3)',
                                                borderRadius: '4px',
                                                color: '#A78BFA',
                                                fontFamily: 'var(--font-mono)',
                                            }, children: [selectedCanvas.nodes.length, " ", t('nodes')] })] }), _jsx("div", { style: { display: 'flex', gap: '6px' }, children: ['text', 'image', 'video', 'character', 'storyboard', 'keyframe'].map((type) => (_jsxs("button", { onClick: () => addNode(type), style: {
                                            padding: '6px 10px',
                                            background: NODE_COLORS[type].bg,
                                            border: `1px solid ${NODE_COLORS[type].border}`,
                                            borderRadius: '4px',
                                            color: NODE_COLORS[type].border,
                                            fontSize: '10px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }, onMouseEnter: (e) => (e.currentTarget.style.boxShadow = `0 0 12px ${NODE_COLORS[type].glow}`), onMouseLeave: (e) => (e.currentTarget.style.boxShadow = 'none'), children: ["+ ", type] }, type))) }), _jsxs("button", { onClick: startGeneration, disabled: !selectedCanvas.nodes.some((n) => n.status === 'draft'), style: {
                                        padding: '8px 16px',
                                        background: 'linear-gradient(135deg, #10B981, #059669)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: selectedCanvas.nodes.some((n) => n.status === 'draft')
                                            ? 'pointer'
                                            : 'not-allowed',
                                        opacity: selectedCanvas.nodes.some((n) => n.status === 'draft') ? 1 : 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }, children: [_jsx("span", { style: { fontSize: '14px' }, children: "\u25B6" }), " ", t('generate')] })] }), _jsxs("div", { style: {
                                flex: 1,
                                position: 'relative',
                                overflow: 'auto',
                                background: `
                radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.06) 0%, transparent 40%),
                linear-gradient(rgba(20, 20, 35, 0.9), rgba(10, 10, 20, 0.95))
              `,
                            }, children: [_jsx("div", { style: {
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: `
                  linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
                `,
                                        backgroundSize: '40px 40px',
                                        opacity: 0.3,
                                    } }), selectedCanvas.nodes.map((node) => {
                                    const colors = NODE_COLORS[node.type];
                                    const statusBadge = STATUS_BADGES[node.status];
                                    const isSelected = selectedNode?.id === node.id;
                                    return (_jsxs("div", { draggable: true, onDragStart: () => setDraggedNode(node.id), onDragEnd: () => setDraggedNode(null), onClick: () => setSelectedNode(node), style: {
                                            position: 'absolute',
                                            left: node.x,
                                            top: node.y,
                                            width: node.width,
                                            height: node.height,
                                            background: colors.bg,
                                            border: `2px solid ${isSelected ? '#fff' : colors.border}`,
                                            borderRadius: '8px',
                                            padding: '10px',
                                            cursor: 'move',
                                            boxShadow: isSelected
                                                ? `0 0 20px ${colors.glow}, 0 0 40px ${colors.glow}`
                                                : `0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px ${colors.glow}`,
                                            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                                            zIndex: isSelected ? 10 : 1,
                                        }, children: [_jsxs("div", { style: {
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '6px',
                                                }, children: [_jsx("span", { style: {
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            color: colors.border,
                                                            textTransform: 'uppercase',
                                                            fontFamily: 'var(--font-mono)',
                                                        }, children: node.type }), _jsx("span", { style: {
                                                            padding: '2px 5px',
                                                            background: statusBadge.bg,
                                                            borderRadius: '3px',
                                                            fontSize: '8px',
                                                            color: statusBadge.text,
                                                            fontFamily: 'var(--font-mono)',
                                                        }, children: node.status })] }), _jsx("div", { style: {
                                                    fontSize: '11px',
                                                    color: '#D1D5DB',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: 1.4,
                                                }, children: node.data?.prompt
                                                    ? String(node.data.prompt).substring(0, 50) + '...'
                                                    : `${node.type} node` }), node.dependencies.length > 0 && (_jsxs("div", { style: {
                                                    position: 'absolute',
                                                    bottom: '-8px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    padding: '2px 6px',
                                                    background: 'rgba(59, 130, 246, 0.3)',
                                                    borderRadius: '3px',
                                                    fontSize: '8px',
                                                    color: '#60A5FA',
                                                }, children: [node.dependencies.length, " deps"] })), isSelected && (_jsx("button", { onClick: (e) => {
                                                    e.stopPropagation();
                                                    deleteNode(node.id);
                                                }, style: {
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: 'rgba(239, 68, 68, 0.9)',
                                                    border: '2px solid #EF4444',
                                                    color: 'white',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }, children: "\u00D7" })), node.status === 'generating' && (_jsx("div", { style: {
                                                    position: 'absolute',
                                                    inset: 0,
                                                    borderRadius: '6px',
                                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                                    animation: 'shimmer 1.5s infinite',
                                                } }))] }, node.id));
                                }), _jsx("svg", { style: { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }, children: selectedCanvas.connections.map((conn) => {
                                        const fromNode = selectedCanvas.nodes.find((n) => n.id === conn.fromNodeId);
                                        const toNode = selectedCanvas.nodes.find((n) => n.id === conn.toNodeId);
                                        if (!fromNode || !toNode)
                                            return null;
                                        const x1 = fromNode.x + fromNode.width / 2;
                                        const y1 = fromNode.y + fromNode.height / 2;
                                        const x2 = toNode.x + toNode.width / 2;
                                        const y2 = toNode.y + toNode.height / 2;
                                        return (_jsxs("g", { children: [_jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: "rgba(139, 92, 246, 0.6)", strokeWidth: "2", strokeDasharray: "4 2" }), _jsx("circle", { cx: x1, cy: y1, r: "4", fill: "#8B5CF6" }), _jsx("circle", { cx: x2, cy: y2, r: "4", fill: "#8B5CF6" })] }, conn.id));
                                    }) })] })] })) : (_jsxs("div", { style: {
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6B7280',
                    }, children: [_jsx("div", { style: {
                                width: '64px',
                                height: '64px',
                                marginBottom: '16px',
                                opacity: 0.3,
                                background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px',
                            }, children: "\u229E" }), _jsx("div", { style: { fontSize: '14px', marginBottom: '4px' }, children: t('select_canvas') }), _jsx("div", { style: { fontSize: '12px', opacity: 0.6 }, children: t('or_create_new') })] })) }), showNewCanvasModal && (_jsx("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    backdropFilter: 'blur(4px)',
                }, onClick: () => setShowNewCanvasModal(false), children: _jsxs("div", { style: {
                        background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(15, 15, 35, 0.98))',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        width: '320px',
                        boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)',
                    }, onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { style: {
                                margin: '0 0 16px 0',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#E5E7EB',
                            }, children: t('create_new_canvas') }), _jsx("input", { type: "text", value: newCanvasName, onChange: (e) => setNewCanvasName(e.target.value), placeholder: t('canvas_name_placeholder'), autoFocus: true, style: {
                                width: '100%',
                                padding: '10px 12px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '13px',
                                outline: 'none',
                                marginBottom: '12px',
                                boxSizing: 'border-box',
                            }, onKeyDown: (e) => e.key === 'Enter' && createCanvas() }), _jsxs("div", { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' }, children: [_jsx("button", { onClick: () => setShowNewCanvasModal(false), style: {
                                        padding: '8px 16px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '6px',
                                        color: '#9CA3AF',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                    }, children: t('cancel') }), _jsx("button", { onClick: createCanvas, disabled: isLoading || !newCanvasName.trim(), style: {
                                        padding: '8px 16px',
                                        background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: newCanvasName.trim() ? 'pointer' : 'not-allowed',
                                        opacity: newCanvasName.trim() ? 1 : 0.5,
                                    }, children: isLoading ? t('creating') : t('create') })] })] }) })), _jsx("style", { children: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      ` })] }));
}
