import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  BellRing,
  X,
  Check,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface Notification {
  id: number;
  user_id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  job_id?: number;
  is_read: boolean;
  created_at: string;
}

type FilterTab = 'all' | 'info' | 'success' | 'warning' | 'error';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'info', label: 'Bilgi' },
  { key: 'success', label: 'Başarılı' },
  { key: 'warning', label: 'Uyarı' },
  { key: 'error', label: 'Hata' },
];

const TYPE_ICONS: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#f43f5e',
};

const TYPE_BG: Record<string, string> = {
  info: 'rgba(6,182,212,0.1)',
  success: 'rgba(16,185,129,0.1)',
  warning: 'rgba(245,158,11,0.1)',
  error: 'rgba(244,63,94,0.1)',
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'şimdi';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dün';
  return `${days} gün önce`;
}

async function apiFetch<T = any>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, opts);
    const d = await r.json();
    return d as T;
  } catch {
    return null;
  }
}

function NotificationItem({
  n,
  onMarkRead,
  onDelete,
}: {
  n: Notification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const Icon = TYPE_ICONS[n.type] || Info;
  const color = TYPE_COLORS[n.type] || '#06b6d4';
  const bg = TYPE_BG[n.type] || 'rgba(6,182,212,0.1)';

  return (
    <div
      onClick={() => !n.is_read && onMarkRead(n.id)}
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 8,
        cursor: n.is_read ? 'default' : 'pointer',
        background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.03)',
        transition: 'background 0.15s',
        position: 'relative',
        borderLeft: n.is_read ? 'none' : `3px solid #60a5fa`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = n.is_read ? 'transparent' : 'rgba(255,255,255,0.03)';
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={14} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
          {n.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {n.message}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
          {relativeTime(n.created_at)}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(n.id);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.2)',
          padding: 2,
          borderRadius: 4,
          flexShrink: 0,
          alignSelf: 'flex-start',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.2)';
        }}
        title="Sil"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClose,
  onOpenHistory,
}: {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDelete: (id: number) => void;
  onClose: () => void;
  onOpenHistory: () => void;
}) {
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 380,
        maxHeight: 480,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        animation: 'notif-slide-down 0.2s ease',
      }}
    >
      <style>{`
        @keyframes notif-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Bildirimler
          {unreadCount > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 6 }}>
              ({unreadCount})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              style={{
                background: 'rgba(96,165,250,0.1)',
                border: 'none',
                color: '#60a5fa',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 10,
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.1)'; }}
            >
              <Check size={12} style={{ marginRight: 4, display: 'inline' }} />
              Tümünü Okundu İşaretle
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)',
              padding: 2,
              borderRadius: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflow: 'auto',
        }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: filter === tab.key ? 600 : 400,
              background: filter === tab.key ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: filter === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ overflow: 'auto', maxHeight: 300 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            Bildirim bulunamadı
          </div>
        ) : (
          filtered.map((n) => (
            <NotificationItem key={n.id} n={n} onMarkRead={onMarkRead} onDelete={onDelete} />
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 16px',
          textAlign: 'center',
        }}
      >
        <button
          onClick={onOpenHistory}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--accent)',
            fontWeight: 500,
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.1)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          Tümünü Gör
        </button>
      </div>
    </div>
  );
}

function NotificationHistoryModal({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onDelete: (id: number) => void;
}) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  if (!isOpen) return null;

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = displayed.length < filtered.length;

  const allDisplayedSelected = displayed.every((n) => selectedIds.has(n.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allDisplayedSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayed.map((n) => n.id)));
    }
  };

  const deleteSelected = async () => {
    for (const id of selectedIds) {
      await onDelete(id);
    }
    setSelectedIds(new Set());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 640,
          maxHeight: '80vh',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'modal-fade-in 0.2s ease',
        }}
      >
        <style>{`
          @keyframes modal-fade-in {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            Bildirim Geçmişi
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              ({notifications.length})
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {someSelected && (
              <button
                onClick={deleteSelected}
                style={{
                  background: 'rgba(244,63,94,0.1)',
                  border: 'none',
                  color: '#f43f5e',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Trash2 size={12} />
                Sil ({selectedIds.size})
              </button>
            )}
            <button
              onClick={onMarkAllRead}
              style={{
                background: 'rgba(96,165,250,0.1)',
                border: 'none',
                color: '#60a5fa',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <Check size={12} style={{ marginRight: 4, display: 'inline' }} />
              Tümünü Okundu İşaretle
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)',
                padding: 4,
                borderRadius: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter + Select All */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={allDisplayedSelected}
              onChange={toggleSelectAll}
              style={{ accentColor: '#6366f1' }}
            />
            Tümünü Seç
          </label>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setFilter(tab.key); setPage(1); }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: filter === tab.key ? 600 : 400,
                  background: filter === tab.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: filter === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {displayed.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              Bu kategoride bildirim bulunamadı
            </div>
          ) : (
            displayed.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Info;
              const color = TYPE_COLORS[n.type] || '#06b6d4';
              const bg = TYPE_BG[n.type] || 'rgba(6,182,212,0.1)';
              return (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '10px 16px',
                    background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.is_read ? 'transparent' : 'rgba(255,255,255,0.02)'; }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(n.id)}
                    onChange={() => toggleSelect(n.id)}
                    style={{ marginTop: 8, accentColor: '#6366f1' }}
                  />
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={14} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#60a5fa',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                      {relativeTime(n.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {!n.is_read && (
                      <button
                        onClick={() => onMarkRead(n.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'rgba(96,165,250,0.5)',
                          padding: 4,
                          borderRadius: 4,
                          transition: 'color 0.15s',
                        }}
                        title="Okundu işaretle"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(n.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.2)',
                        padding: 4,
                        borderRadius: 4,
                        transition: 'color 0.15s',
                      }}
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}
          >
            <button
              onClick={() => setPage((p) => p + 1)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-muted)',
                padding: '6px 20px',
                borderRadius: 6,
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            >
              Daha Fazla Yükle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationCenter({ t }: { t: (key: string, params?: any) => string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<any>(null);

  const fetchNotifications = useCallback(async () => {
    const data = await apiFetch<{ success: boolean; notifications: Notification[]; unreadCount: number }>(
      '/api/v1/notifications?limit=50',
    );
    if (data?.success) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const data = await apiFetch<{ success: boolean; unreadCount: number }>(
      '/api/v1/notifications/unread-count',
    );
    if (data?.success) {
      setUnreadCount(data.unreadCount);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchUnreadCount, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // Listen to SSE from NotificationToast's EventSource
  useEffect(() => {
    let es: EventSource | null = null;
    const connect = () => {
      es = new EventSource('/api/v1/notifications/stream');
      es.onmessage = (event) => {
        try {
          const n = JSON.parse(event.data);
          if (n && n.id) {
            setNotifications((prev) => [n, ...prev].slice(0, 200));
            setUnreadCount((prev) => prev + 1);
          }
        } catch {}
      };
      es.onerror = () => {
        if (es) { es.close(); }
        setTimeout(connect, 5000);
      };
    };
    connect();
    return () => { if (es) es.close(); };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: number) => {
    await apiFetch(`/api/v1/notifications/${id}/read`, { method: 'POST' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await apiFetch('/api/v1/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (id: number) => {
    const data = await apiFetch<{ success: boolean }>(`/api/v1/notifications/${id}`, { method: 'DELETE' });
    if (data?.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - (notifications.find((n) => n.id === id)?.is_read ? 0 : 1)));
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-muted)',
          padding: 6,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'none';
        }}
        title={t('Bildirimler', 'Notifications')}
      >
        {unreadCount > 0 ? <BellRing size={16} /> : <Bell size={16} />}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              transform: 'translate(25%, -25%)',
              background: '#f43f5e',
              color: 'white',
              fontSize: 9,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 8px rgba(244,63,94,0.5)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onDelete={handleDelete}
          onClose={() => setDropdownOpen(false)}
          onOpenHistory={() => {
            setDropdownOpen(false);
            setHistoryOpen(true);
          }}
        />
      )}

      <NotificationHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDelete}
      />
    </div>
  );
}
