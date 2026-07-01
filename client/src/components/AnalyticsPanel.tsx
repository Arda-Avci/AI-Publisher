import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Video,
  Film,
  TrendingUp,
  Download,
  Zap,
  RefreshCw,
  Loader,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface DashboardData {
  jobsByStatus: Record<string, number>;
  totalScenes: number;
  completedScenes: number;
  avgViralScore: number | null;
  exportCount: number;
  creditUsage: number;
  recentActivity: Array<{
    id: number;
    action: string;
    entity_type: string;
    entity_id: number;
    details: string;
    created_at: string;
  }>;
}

interface DailyHistory {
  date: string;
  total: number;
  completed: number;
  processing: number;
  failed: number;
  pending: number;
}

interface HistoryData {
  daily: DailyHistory[];
  avgScenesPerJob: number | null;
  estimatedDurationSeconds: number | null;
}

interface PlatformStats {
  youtube: { published: number; failed: number };
  tiktok: { published: number; failed: number };
  x: { published: number; failed: number };
  meta: { published: number; failed: number };
}

interface AnalyticsPanelProps {
  t: (key: string, params?: Record<string, any>) => string;
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  meta: 'Meta',
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  tiktok: '#FF0050',
  x: '#1DA1F2',
  meta: '#1877F2',
};

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

function BarChart({
  data,
  height = 200,
}: {
  data: DailyHistory[];
  height?: number;
}) {
  const chartWidth = 400;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const plotW = chartWidth - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { maxTotal, yLabels, xLabels, bars, barW, gap } = useMemo(() => {
    if (!data.length) return { maxTotal: 0, yLabels: [], xLabels: [], bars: [] };

    const maxVal = Math.max(...data.map((d) => d.completed + d.processing + d.failed), 1);
    const maxT = Math.ceil(maxVal / 5) * 5 || 5;

    const yStep = maxT / 4;
    const yLbls: number[] = [];
    for (let i = 0; i <= 4; i++) yLbls.push(Math.round(i * yStep));

    const xLbls =
      data.length > 10
        ? data.filter((_, i) => i % Math.ceil(data.length / 10) === 0).map((d) => d.date)
        : data.map((d) => d.date);

    const barW = Math.min(14, (plotW - data.length * 2) / data.length);
    const gap = (plotW - barW * data.length) / (data.length + 1);

    const barElements = data.map((day, i) => {
      const x = pad.left + gap + i * (barW + gap);
      const totalH = ((day.completed + day.processing + day.failed) / maxT) * plotH;
      const completedH = (day.completed / maxT) * plotH;
      const processingH = (day.processing / maxT) * plotH;
      const failedH = (day.failed / maxT) * plotH;
      const baseY = pad.top + plotH;

      return {
        x,
        barW,
        completedH,
        processingH,
        failedH,
        baseY,
        totalH,
        day,
      };
    });

    return { maxTotal: maxT, yLabels: yLbls, xLabels: xLbls, bars: barElements, barW, gap };
  }, [data, plotW, plotH, pad]);

  if (!data.length) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '32px 0',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        No job history available
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${height}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {yLabels.map((label) => {
        const yRatio = maxTotal > 0 ? label / maxTotal : 0;
        const y = pad.top + plotH - yRatio * plotH;
        return (
          <g key={label}>
            <line
              x1={pad.left}
              y1={y}
              x2={pad.left + plotW}
              y2={y}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="3,3"
            />
            <text
              x={pad.left - 2}
              y={y + 3}
              textAnchor="end"
              fill="var(--text-muted)"
              fontSize="9"
            >
              {label}
            </text>
          </g>
        );
      })}

      {xLabels.map((label) => {
        const idx = data.findIndex((d) => d.date === label);
        const currentGap = gap || 0;
        const currentBarW = barW || 0;
        const x =
          pad.left +
          currentGap +
          idx * (currentBarW + currentGap) +
          currentBarW / 2;
        return (
          <text
            key={label}
            x={x}
            y={height - 6}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="8"
          >
            {label.length > 10 ? label.slice(5, 10) : label}
          </text>
        );
      })}

      {bars.map((bar) => (
        <g key={bar.day.date}>
          {/* Completed (bottom) */}
          <rect
            x={bar.x}
            y={bar.baseY - bar.completedH}
            width={bar.barW}
            height={bar.completedH}
            fill="#22c55e"
            rx="2"
          >
            <title>
              {bar.day.date}: {bar.day.completed} completed
            </title>
          </rect>
          {/* Processing (middle) */}
          <rect
            x={bar.x}
            y={bar.baseY - bar.completedH - bar.processingH}
            width={bar.barW}
            height={bar.processingH}
            fill="#f59e0b"
            rx="2"
          >
            <title>
              {bar.day.date}: {bar.day.processing} processing
            </title>
          </rect>
          {/* Failed (top) */}
          <rect
            x={bar.x}
            y={bar.baseY - bar.completedH - bar.processingH - bar.failedH}
            width={bar.barW}
            height={bar.failedH}
            fill="#ef4444"
            rx="2"
          >
            <title>
              {bar.day.date}: {bar.day.failed} failed
            </title>
          </rect>
        </g>
      ))}
    </svg>
  );
}

export function AnalyticsPanel({ t: _t }: AnalyticsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [platforms, setPlatforms] = useState<PlatformStats | null>(null);
  const [historyDays, setHistoryDays] = useState(30);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, histRes, platRes] = await Promise.all([
        fetch('/api/v1/analytics/dashboard'),
        fetch('/api/v1/analytics/jobs/history'),
        fetch('/api/v1/analytics/platforms'),
      ]);

      if (!dashRes.ok) throw new Error('Dashboard data failed');
      if (!histRes.ok) throw new Error('History data failed');
      if (!platRes.ok) throw new Error('Platform data failed');

      const dashData = await dashRes.json();
      const histData = await histRes.json();
      const platData = await platRes.json();

      setDashboard(dashData.data);
      setHistory(histData.data);
      setPlatforms(platData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalVideos = useMemo(() => {
    if (!dashboard) return 0;
    const jbs = dashboard.jobsByStatus;
    return (jbs.completed || 0) + (jbs.processing || 0) + (jbs.failed || 0) + (jbs.pending || 0);
  }, [dashboard]);

  const avgViralDisplay = useMemo(() => {
    if (dashboard?.avgViralScore == null) return '—';
    return dashboard.avgViralScore.toFixed(1);
  }, [dashboard]);

  const platformKeys = useMemo(() => {
    if (!platforms) return [];
    return Object.keys(platforms) as Array<keyof PlatformStats>;
  }, [platforms]);

  if (loading && !dashboard) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '60px 0',
          color: 'var(--text-muted)',
        }}
      >
        <Loader size={24} className="spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '0.5px' }}>
          Analytics & Stats
        </span>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-primary)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Stats Cards Row */}
      {dashboard && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
            gap: 10,
          }}
        >
          <StatCard
            icon={<Video size={16} />}
            label="Total Videos"
            value={totalVideos}
            color="#7F00FF"
          />
          <StatCard
            icon={<Film size={16} />}
            label="Total Scenes"
            value={`${dashboard.completedScenes} / ${dashboard.totalScenes}`}
            sub={`${dashboard.completedScenes} completed`}
            color="#3b82f6"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Avg Viral Score"
            value={avgViralDisplay}
            color="#22c55e"
          />
          <StatCard
            icon={<Download size={16} />}
            label="Exports"
            value={dashboard.exportCount}
            color="#f59e0b"
          />
          <StatCard
            icon={<Zap size={16} />}
            label="Credits Used"
            value={dashboard.creditUsage}
            color="#ef4444"
          />
        </div>
      )}

      {/* Job History Bar Chart */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Job History</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
            (Last {historyDays} days)
          </span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setHistoryDays(d)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: historyDays === d ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: historyDays === d ? 'var(--accent-light)' : 'transparent',
                  color: historyDays === d ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: historyDays === d ? 600 : 400,
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {history && history.daily.length > 0 && (
          <BarChart data={history.daily} height={180} />
        )}

        {history && history.daily.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 0',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}
          >
            No job activity in the last 30 days
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <LegendItem color="#22c55e" label="Completed" />
          <LegendItem color="#f59e0b" label="Processing" />
          <LegendItem color="#ef4444" label="Failed" />
        </div>

        {history?.avgScenesPerJob != null && (
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            Avg {history.avgScenesPerJob.toFixed(1)} scenes per job
            {history.estimatedDurationSeconds != null &&
              ` · ~${Math.round(history.estimatedDurationSeconds / 60)} min avg duration`}
          </div>
        )}
      </div>

      {/* Platform Publish Stats */}
      {platforms && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Platform Publish Stats</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: 8,
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              padding: '0 8px',
            }}
          >
            <span>Platform</span>
            <span style={{ textAlign: 'center' }}>Published</span>
            <span style={{ textAlign: 'center' }}>Failed</span>
            <span style={{ textAlign: 'center' }}>Rate</span>
          </div>

          {platformKeys.map((key) => {
            const p = platforms[key];
            const total = p.published + p.failed;
            const rate = total > 0 ? Math.round((p.published / total) * 100) : 0;
            return (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 8px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: PLATFORM_COLORS[key] || '#666',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600 }}>
                    {PLATFORM_LABELS[key] || key}
                  </span>
                </div>
                <span style={{ textAlign: 'center', fontWeight: 600, color: '#22c55e' }}>
                  {p.published}
                </span>
                <span style={{ textAlign: 'center', color: '#ef4444' }}>
                  {p.failed}
                </span>
                <span style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  {rate}%
                </span>
              </div>
            );
          })}

          {platformKeys.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '16px 0',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              No platform publish data yet
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {dashboard && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Recent Activity</span>
          </div>

          {dashboard.recentActivity.length > 0 ? (
            dashboard.recentActivity.map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'var(--bg-primary)',
                  fontSize: 12,
                }}
              >
                <ActivityIcon action={activity.action} />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatAction(activity.action)}
                  </div>
                  {activity.entity_type && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        marginTop: 1,
                      }}
                    >
                      {activity.entity_type} #{activity.entity_id}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  {formatTimeAgo(activity.created_at)}
                </span>
              </div>
            ))
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '16px 0',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              No recent activity
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: 'var(--text-muted)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: color,
          flexShrink: 0,
        }}
      />
      {label}
    </div>
  );
}

function ActivityIcon({ action }: { action: string }) {
  if (action.includes('export')) return <Download size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />;
  if (action.includes('publish') || action.includes('upload'))
    return <TrendingUp size={14} style={{ color: '#22c55e', flexShrink: 0 }} />;
  if (action.includes('fail') || action.includes('error'))
    return <XCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />;
  if (action.includes('complete'))
    return <CheckCircle size={14} style={{ color: '#22c55e', flexShrink: 0 }} />;
  return <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
}
