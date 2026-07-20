import React from 'react';

export default function HighlightsCloud({ items }) {
  const counts = {};
  items.forEach(item => {
    [item.highlight1, item.highlight2, item.highlight3].forEach(h => {
      if (h && h.trim()) {
        const key = h.trim();
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Aspectos Destacados</h3>
      <div className="flex flex-wrap gap-2">
        {sorted.map(([tag, count]) => {
          const ratio = count / max;
          const size = ratio > 0.7 ? 'text-base font-semibold' : ratio > 0.4 ? 'text-sm font-medium' : 'text-xs';
          const opacity = 0.5 + ratio * 0.5;
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary ${size}`}
              style={{ opacity }}
            >
              {tag}
              <span className="text-[10px] text-muted-foreground">({count})</span>
            </span>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay datos todavía</p>
        )}
      </div>
    </div>
  );
}