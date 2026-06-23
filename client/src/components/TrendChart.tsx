import { useMemo } from 'react';

interface TrendChartPoint {
  date: string;
  count: number;
  platform: string;
}

interface TrendChartProps {
  data: TrendChartPoint[];
  platforms: string[];
  height?: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: '#FF0050',
  youtube: '#FF0000',
  x: '#1DA1F2',
  instagram: '#E4405F',
};

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: '🎵',
  youtube: '▶️',
  x: '𝕏',
  instagram: '📸',
};

export function TrendChart({ data, platforms, height = 220 }: TrendChartProps) {
  const { paths, yMax, xLabels, yLabels, grouped } = useMemo(() => {
    if (!data.length) return { paths: [], yMax: 0, xLabels: [], yLabels: [], grouped: {} };

    const grouped: Record<string, TrendChartPoint[]> = {};
    for (const p of platforms) {
      grouped[p] = data.filter((d) => d.platform === p);
    }

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const yMax = Math.ceil(maxCount / 5) * 5 || 5;

    const uniqueDates = [...new Set(data.map((d) => d.date))].sort();
    const xLabels = uniqueDates.length > 10
      ? uniqueDates.filter((_, i) => i % Math.ceil(uniqueDates.length / 10) === 0)
      : uniqueDates;

    const yStep = yMax / 4;
    const yLabels: number[] = [];
    for (let i = 0; i <= 4; i++) {
      yLabels.push(Math.round(i * yStep));
    }

    const pad = { top: 16, right: 16, bottom: 28, left: 36 };
    const chartW = 400;
    const chartH = height;

    const plotW = chartW - pad.left - pad.right;
    const plotH = chartH - pad.top - pad.bottom;

    function xPos(date: string): number {
      const idx = uniqueDates.indexOf(date);
      if (uniqueDates.length <= 1) return pad.left + plotW / 2;
      return pad.left + (idx / (uniqueDates.length - 1)) * plotW;
    }

    function yPos(val: number): number {
      return pad.top + plotH - (val / yMax) * plotH;
    }

    const paths = platforms.map((platform) => {
      const points = grouped[platform] || [];
      if (points.length < 1) return null;

      const sorted = points.sort(
        (a, b) => uniqueDates.indexOf(a.date) - uniqueDates.indexOf(b.date),
      );

      let d = '';
      for (let i = 0; i < sorted.length; i++) {
        const x = xPos(sorted[i].date);
        const y = yPos(sorted[i].count);
        if (i === 0) {
          d += `M${x},${y}`;
        } else {
          const prevX = xPos(sorted[i - 1].date);
          const prevY = yPos(sorted[i - 1].count);
          const cx1 = prevX + (x - prevX) / 2;
          const cx2 = prevX + (x - prevX) / 2;
          d += ` C${cx1},${prevY} ${cx2},${y} ${x},${y}`;
        }
      }

      return {
        platform,
        path: d,
        color: PLATFORM_COLORS[platform] || '#666',
        points: sorted,
      };
    }).filter(Boolean) as { platform: string; path: string; color: string; points: TrendChartPoint[] }[];

    return { paths, yMax, xLabels, yLabels, grouped };
  }, [data, platforms, height]);

  if (!data.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
        Grafik için yeterli veri yok
      </div>
    );
  }

  return (
    <div>
      <svg
        viewBox={`0 0 400 ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {platforms.map((p) => (
            <linearGradient key={p} id={`gradient-${p}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PLATFORM_COLORS[p] || '#666'} stopOpacity="0.2" />
              <stop offset="100%" stopColor={PLATFORM_COLORS[p] || '#666'} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis labels */}
        {yLabels.map((label) => {
          const pad = { top: 16, right: 16, bottom: 28, left: 36 };
          const plotH = height - pad.top - pad.bottom;
          const yRatio = yMax > 0 ? label / yMax : 0;
          const y = pad.top + plotH - yRatio * plotH;
          return (
            <g key={label}>
              <line
                x1={36}
                y1={y}
                x2={384}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
                strokeDasharray="3,3"
              />
              <text x={34} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9">
                {label >= 1000 ? `${(label / 1000).toFixed(0)}K` : label}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map((label) => {
          const uniqueDates = [...new Set(data.map((d) => d.date))].sort();
          const idx = uniqueDates.indexOf(label);
          const pad = { top: 16, right: 16, bottom: 28, left: 36 };
          const plotW = 400 - pad.left - pad.right;
          const x = uniqueDates.length <= 1
            ? pad.left + plotW / 2
            : pad.left + (idx / (uniqueDates.length - 1)) * plotW;
          const display = label.length > 10 ? label.slice(5, 10) : label;
          return (
            <text
              key={label}
              x={x}
              y={height - 6}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="9"
            >
              {display}
            </text>
          );
        })}

        {/* Lines */}
        {paths.map(({ platform, path, color }) => (
          <g key={platform}>
            {/* Area fill */}
            <path
              d={`${path} L${path.split(' ').slice(-1)[0].split(',')[0]},${height - 28} L36,${height - 28} Z`}
              fill={`url(#gradient-${platform})`}
            />
            {/* Line */}
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}

        {/* Dots */}
        {paths.map(({ platform, points, color }) =>
          points.map((p, i) => {
            const uniqueDates = [...new Set(data.map((d) => d.date))].sort();
            const pad = { top: 16, right: 16, bottom: 28, left: 36 };
            const plotW = 400 - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const idx = uniqueDates.indexOf(p.date);
            const x = uniqueDates.length <= 1
              ? pad.left + plotW / 2
              : pad.left + (idx / (uniqueDates.length - 1)) * plotW;
            const y = pad.top + plotH - (p.count / yMax) * plotH;
            return (
              <g key={`${platform}-${i}`}>
                <circle cx={x} cy={y} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
                <title>{`${platform}: ${p.count} (${p.date})`}</title>
              </g>
            );
          }),
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
        {platforms.map((p) => {
          const total = (grouped[p] || []).reduce((sum, pt) => sum + pt.count, 0);
          if (total === 0) return null;
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: PLATFORM_COLORS[p] || '#666' }} />
              <span>{PLATFORM_ICONS[p] || p}</span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
