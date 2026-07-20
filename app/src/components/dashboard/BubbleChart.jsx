import React, { useMemo, useState, useRef, useEffect } from 'react';

// Color scale: cold blue (low rating) → warm red (high rating)
function ratingToColor(avg, min = 4, max = 9.5) {
  const t = Math.max(0, Math.min(1, (avg - min) / (max - min)));
  // Blue → Green → Yellow → Red
  if (t < 0.33) {
    const s = t / 0.33;
    return `hsl(${210 - s * 50}, ${55 + s * 15}%, ${50 + s * 5}%)`;
  } else if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    return `hsl(${160 - s * 60}, ${70}%, ${52}%)`;
  } else {
    const s = (t - 0.66) / 0.34;
    return `hsl(${100 - s * 100}, ${75}%, ${48}%)`;
  }
}

function packBubbles(bubbles, width, height) {
  // Simple force-directed packing approximation
  const placed = [];
  const sorted = [...bubbles].sort((a, b) => b.r - a.r);

  for (const b of sorted) {
    let bestX = width / 2, bestY = height / 2;
    let placed_ok = false;

    for (let attempt = 0; attempt < 200; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(width, height) * 0.45;
      const cx = width / 2 + Math.cos(angle) * dist;
      const cy = height / 2 + Math.sin(angle) * dist;

      if (cx - b.r < 4 || cx + b.r > width - 4 || cy - b.r < 4 || cy + b.r > height - 4) continue;

      let overlaps = false;
      for (const p of placed) {
        const dx = cx - p.x, dy = cy - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < b.r + p.r + 3) { overlaps = true; break; }
      }
      if (!overlaps) { bestX = cx; bestY = cy; placed_ok = true; break; }
    }
    placed.push({ ...b, x: bestX, y: bestY });
  }
  return placed;
}

export default function BubbleChart({ items, mode = 'director' }) {
  const [tooltip, setTooltip] = useState(null);
  const [activeMode, setActiveMode] = useState(mode);
  const svgRef = useRef();
  const W = 640, H = 380;

  const bubbles = useMemo(() => {
    const map = {};
    items.forEach(item => {
      const keys = activeMode === 'director'
        ? [item.director].filter(Boolean)
        : [item.genre1, item.genre2].filter(Boolean);

      keys.forEach(key => {
        if (!map[key]) map[key] = { name: key, count: 0, ratings: [] };
        map[key].count++;
        if (item.rating != null) map[key].ratings.push(item.rating);
      });
    });

    const entries = Object.values(map).filter(e => e.count >= 1);
    const maxCount = Math.max(...entries.map(e => e.count), 1);
    const minR = 18, maxR = 72;

    return entries.map(e => ({
      ...e,
      avg: e.ratings.length > 0 ? e.ratings.reduce((s, v) => s + v, 0) / e.ratings.length : 0,
      r: minR + ((e.count / maxCount) ** 0.55) * (maxR - minR),
    }));
  }, [items, activeMode]);

  const placed = useMemo(() => packBubbles(bubbles, W, H), [bubbles]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Burbujas de Influencia</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tamaño = nº obras · Color = nota media (azul frío → rojo fuego)</p>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
          {['director', 'genre'].map(m => (
            <button
              key={m}
              onClick={() => setActiveMode(m)}
              className={`text-xs px-3 py-1 rounded-md transition-all ${activeMode === m ? 'bg-card shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {m === 'director' ? 'Directores' : 'Géneros'}
            </button>
          ))}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Nota baja</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: 'linear-gradient(to right, hsl(210,55%,50%), hsl(145,70%,52%), hsl(50,75%,48%), hsl(0,75%,48%))' }} />
        <span className="text-[10px] text-muted-foreground">Nota alta</span>
      </div>

      <div className="relative overflow-hidden rounded-lg" style={{ height: H }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full"
          onMouseLeave={() => setTooltip(null)}
        >
          {placed.map((b) => (
            <g
              key={b.name}
              onMouseEnter={(e) => {
                const rect = svgRef.current?.getBoundingClientRect();
                setTooltip({
                  name: b.name,
                  count: b.count,
                  avg: b.avg,
                  x: (b.x / W) * (rect?.width || W),
                  y: (b.y / H) * (rect?.height || H),
                });
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={b.x} cy={b.y} r={b.r}
                fill={ratingToColor(b.avg)}
                fillOpacity={0.82}
                stroke={ratingToColor(b.avg)}
                strokeWidth={1.5}
                strokeOpacity={0.5}
                className="transition-all duration-200 hover:fill-opacity-100"
              />
              {b.r > 28 && (
                <text
                  x={b.x} y={b.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(11, b.r / 3.5)}
                  fill="white"
                  fontWeight="600"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {b.name.length > 14 ? b.name.slice(0, 13) + '…' : b.name}
                </text>
              )}
              {b.r > 22 && (
                <text
                  x={b.x} y={b.y + Math.min(11, b.r / 3.5) + 3}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(9, b.r / 5)}
                  fill="rgba(255,255,255,0.75)"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  ★{b.avg.toFixed(1)}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-card border border-border rounded-xl shadow-lg p-3 text-xs min-w-[140px]"
            style={{
              left: Math.min(tooltip.x + 12, (svgRef.current?.clientWidth || W) - 160),
              top: Math.max(tooltip.y - 60, 8),
            }}
          >
            <p className="font-bold text-foreground text-sm mb-1">{tooltip.name}</p>
            <p className="text-muted-foreground">{tooltip.count} obra{tooltip.count !== 1 ? 's' : ''}</p>
            {tooltip.avg > 0 && (
              <p className="text-muted-foreground">Nota media: <span className="font-semibold text-foreground">★{tooltip.avg.toFixed(2)}</span></p>
            )}
          </div>
        )}
      </div>

      {placed.length === 0 && (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          No hay suficientes datos para mostrar
        </div>
      )}
    </div>
  );
}