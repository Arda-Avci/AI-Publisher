/**
 * CanvasPanel - Infinite Canvas Management Interface
 * Premium glassmorphism/cyberpunk design
 */

import { useState, useEffect, useCallback } from 'react';
import type { Language } from '../types.js';

interface CanvasNode {
  id: string;
  type: 'text' | 'image' | 'video' | 'character' | 'storyboard' | 'keyframe';
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'draft' | 'pending' | 'generating' | 'completed' | 'failed';
  data: Record<string, unknown>;
  dependencies: string[];
}

interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
}

interface Canvas {
  id: string;
  name: string;
  nodes: CanvasNode[];
  connections: CanvasConnection[];
}

interface CanvasPanelProps {
  language: Language;
  t: (key: string, params?: Record<string, unknown>) => string;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const NODE_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  text: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10B981', glow: 'rgba(16, 185, 129, 0.4)' },
  image: { bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)' },
  video: { bg: 'rgba(239, 68, 68, 0.15)', border: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)' },
  character: { bg: 'rgba(139, 92, 246, 0.15)', border: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.4)' },
  storyboard: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3B82F6', glow: 'rgba(59, 130, 246, 0.4)' },
  keyframe: { bg: 'rgba(236, 72, 153, 0.15)', border: '#EC4899', glow: 'rgba(236, 72, 153, 0.4)' },
};

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'rgba(107, 114, 128, 0.3)', text: '#9CA3AF' },
  pending: { bg: 'rgba(245, 158, 11, 0.3)', text: '#FBBF24' },
  generating: { bg: 'rgba(59, 130, 246, 0.3)', text: '#60A5FA' },
  completed: { bg: 'rgba(16, 185, 129, 0.3)', text: '#34D399' },
  failed: { bg: 'rgba(239, 68, 68, 0.3)', text: '#F87171' },
};

export function CanvasPanel({ language, t, onShowToast }: CanvasPanelProps) {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [selectedCanvas, setSelectedCanvas] = useState<Canvas | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [showNewCanvasModal, setShowNewCanvasModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [taskQueueStatus, setTaskQueueStatus] = useState({ pending: 0, running: 0, completed: 0, failed: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  const fetchCanvases = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/canvas');
      const d = await r.json();
      if (d.canvases) setCanvases(d.canvases);
    } catch (err) {
      console.error('Failed to fetch canvases:', err);
    }
  }, []);

  const fetchCanvasDetails = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/v1/canvas/${id}`);
      const d = await r.json();
      if (d.canvas) setSelectedCanvas(d.canvas);
    } catch (err) {
      console.error('Failed to fetch canvas:', err);
    }
  }, []);

  const fetchTaskStatus = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/v1/canvas/${id}/tasks/status`);
      const d = await r.json();
      if (d.pending !== undefined) setTaskQueueStatus(d);
    } catch (err) {
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
    if (!newCanvasName.trim()) return;
    setIsLoading(true);
    try {
      const r = await fetch('/api/v1/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCanvasName }),
      });
      const d = await r.json();
      if (d.canvas) {
        setCanvases(prev => [...prev, d.canvas]);
        setSelectedCanvas(d.canvas);
        setShowNewCanvasModal(false);
        setNewCanvasName('');
        onShowToast?.(t('canvas_created', { name: newCanvasName }), 'success');
      }
    } catch (err) {
      onShowToast?.(t('canvas_create_failed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addNode = async (type: CanvasNode['type']) => {
    if (!selectedCanvas) return;
    try {
      const r = await fetch(`/api/v1/canvas/${selectedCanvas.id}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 }),
      });
      const d = await r.json();
      if (d.node) {
        setSelectedCanvas(prev => prev ? {
          ...prev,
          nodes: [...prev.nodes, d.node],
        } : null);
      }
    } catch (err) {
      onShowToast?.(t('node_add_failed'), 'error');
    }
  };

  const deleteNode = async (nodeId: string) => {
    if (!selectedCanvas) return;
    try {
      const r = await fetch(`/api/v1/canvas/${selectedCanvas.id}/nodes/${nodeId}`, {
        method: 'DELETE',
      });
      if (r.ok) {
        setSelectedCanvas(prev => prev ? {
          ...prev,
          nodes: prev.nodes.filter(n => n.id !== nodeId),
          connections: prev.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId),
        } : null);
        setSelectedNode(null);
        onShowToast?.(t('node_deleted'), 'success');
      }
    } catch (err) {
      onShowToast?.(t('node_delete_failed'), 'error');
    }
  };

  const startGeneration = async () => {
    if (!selectedCanvas) return;
    try {
      const r = await fetch(`/api/v1/canvas/${selectedCanvas.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: selectedCanvas.nodes
            .filter(n => n.status === 'draft')
            .map(n => ({ type: 'generate', nodeId: n.id })),
        }),
      });
      const d = await r.json();
      if (d.tasks) {
        onShowToast?.(t('generation_started', { count: d.tasks.length }), 'success');
      }
    } catch (err) {
      onShowToast?.(t('generation_failed'), 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      gap: '12px',
      padding: '12px',
      background: 'rgba(10, 10, 20, 0.6)',
      borderRadius: '12px',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
    }}>
      {/* Canvas List Sidebar */}
      <div style={{
        width: '240px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{
          padding: '12px',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
        }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '12px',
            fontWeight: 600,
            color: '#A78BFA',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-mono)',
          }}>
            {t('canvases')}
          </h3>

          <button
            onClick={() => setShowNewCanvasModal(true)}
            style={{
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
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span style={{ fontSize: '14px' }}>+</span> {t('new_canvas')}
          </button>
        </div>

        {/* Canvas List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {canvases.map(canvas => (
            <button
              key={canvas.id}
              onClick={() => setSelectedCanvas(canvas)}
              style={{
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
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: '2px' }}>{canvas.name}</div>
              <div style={{ fontSize: '10px', opacity: 0.6, fontFamily: 'var(--font-mono)' }}>
                {canvas.nodes?.length || 0} nodes
              </div>
            </button>
          ))}

          {canvases.length === 0 && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '12px',
            }}>
              {t('no_canvases')}
            </div>
          )}
        </div>

        {/* Task Queue Status */}
        {selectedCanvas && (
          <div style={{
            padding: '10px',
            background: 'rgba(30, 30, 50, 0.6)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            <div style={{
              fontSize: '10px',
              color: '#6B7280',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {t('task_queue')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
              {[
                { label: t('pending'), value: taskQueueStatus.pending, color: '#FBBF24' },
                { label: t('running'), value: taskQueueStatus.running, color: '#60A5FA' },
                { label: t('completed'), value: taskQueueStatus.completed, color: '#34D399' },
                { label: t('failed'), value: taskQueueStatus.failed, color: '#F87171' },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: stat.color, fontFamily: 'var(--font-mono)' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '9px', color: '#6B7280', textTransform: 'uppercase' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Canvas Workspace */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(15, 15, 25, 0.8)',
        borderRadius: '8px',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        overflow: 'hidden',
      }}>
        {selectedCanvas ? (
          <>
            {/* Toolbar */}
            <div style={{
              padding: '10px 14px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB' }}>
                  {selectedCanvas.name}
                </span>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  background: 'rgba(139, 92, 246, 0.3)',
                  borderRadius: '4px',
                  color: '#A78BFA',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {selectedCanvas.nodes.length} {t('nodes')}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['text', 'image', 'video', 'character', 'storyboard', 'keyframe'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    style={{
                      padding: '6px 10px',
                      background: NODE_COLORS[type].bg,
                      border: `1px solid ${NODE_COLORS[type].border}`,
                      borderRadius: '4px',
                      color: NODE_COLORS[type].border,
                      fontSize: '10px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 12px ${NODE_COLORS[type].glow}`}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    + {type}
                  </button>
                ))}
              </div>

              <button
                onClick={startGeneration}
                disabled={!selectedCanvas.nodes.some(n => n.status === 'draft')}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: selectedCanvas.nodes.some(n => n.status === 'draft') ? 'pointer' : 'not-allowed',
                  opacity: selectedCanvas.nodes.some(n => n.status === 'draft') ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '14px' }}>▶</span> {t('generate')}
              </button>
            </div>

            {/* Canvas Area */}
            <div style={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              background: `
                radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(59, 130, 246, 0.06) 0%, transparent 40%),
                linear-gradient(rgba(20, 20, 35, 0.9), rgba(10, 10, 20, 0.95))
              `,
            }}>
              {/* Grid Pattern */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                  linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                opacity: 0.3,
              }} />

              {/* Nodes */}
              {selectedCanvas.nodes.map(node => {
                const colors = NODE_COLORS[node.type];
                const statusBadge = STATUS_BADGES[node.status];
                const isSelected = selectedNode?.id === node.id;

                return (
                  <div
                    key={node.id}
                    draggable
                    onDragStart={() => setDraggedNode(node.id)}
                    onDragEnd={() => setDraggedNode(null)}
                    onClick={() => setSelectedNode(node)}
                    style={{
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
                    }}
                  >
                    {/* Node Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: colors.border,
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {node.type}
                      </span>
                      <span style={{
                        padding: '2px 5px',
                        background: statusBadge.bg,
                        borderRadius: '3px',
                        fontSize: '8px',
                        color: statusBadge.text,
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {node.status}
                      </span>
                    </div>

                    {/* Node Content */}
                    <div style={{
                      fontSize: '11px',
                      color: '#D1D5DB',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.4,
                    }}>
                      {node.data?.prompt ? String(node.data.prompt).substring(0, 50) + '...' : `${node.type} node`}
                    </div>

                    {/* Dependencies indicator */}
                    {node.dependencies.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '2px 6px',
                        background: 'rgba(59, 130, 246, 0.3)',
                        borderRadius: '3px',
                        fontSize: '8px',
                        color: '#60A5FA',
                      }}>
                        {node.dependencies.length} deps
                      </div>
                    )}

                    {/* Delete button */}
                    {isSelected && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                        style={{
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
                        }}
                      >
                        ×
                      </button>
                    )}

                    {/* Generating animation */}
                    {node.status === 'generating' && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '6px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                        animation: 'shimmer 1.5s infinite',
                      }} />
                    )}
                  </div>
                );
              })}

              {/* Connections */}
              <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                {selectedCanvas.connections.map(conn => {
                  const fromNode = selectedCanvas.nodes.find(n => n.id === conn.fromNodeId);
                  const toNode = selectedCanvas.nodes.find(n => n.id === conn.toNodeId);
                  if (!fromNode || !toNode) return null;

                  const x1 = fromNode.x + fromNode.width / 2;
                  const y1 = fromNode.y + fromNode.height / 2;
                  const x2 = toNode.x + toNode.width / 2;
                  const y2 = toNode.y + toNode.height / 2;

                  return (
                    <g key={conn.id}>
                      <line
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="rgba(139, 92, 246, 0.6)"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      <circle cx={x1} cy={y1} r="4" fill="#8B5CF6" />
                      <circle cx={x2} cy={y2} r="4" fill="#8B5CF6" />
                    </g>
                  );
                })}
              </svg>
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280',
          }}>
            <div style={{
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
            }}>
              ⊞
            </div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>{t('select_canvas')}</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>{t('or_create_new')}</div>
          </div>
        )}
      </div>

      {/* New Canvas Modal */}
      {showNewCanvasModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}
          onClick={() => setShowNewCanvasModal(false)}
        >
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 30, 60, 0.95), rgba(15, 15, 35, 0.98))',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            width: '320px',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: '#E5E7EB',
            }}>
              {t('create_new_canvas')}
            </h3>

            <input
              type="text"
              value={newCanvasName}
              onChange={e => setNewCanvasName(e.target.value)}
              placeholder={t('canvas_name_placeholder')}
              autoFocus
              style={{
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
              }}
              onKeyDown={e => e.key === 'Enter' && createCanvas()}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewCanvasModal(false)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#9CA3AF',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={createCanvas}
                disabled={isLoading || !newCanvasName.trim()}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: newCanvasName.trim() ? 'pointer' : 'not-allowed',
                  opacity: newCanvasName.trim() ? 1 : 0.5,
                }}
              >
                {isLoading ? t('creating') : t('create')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}