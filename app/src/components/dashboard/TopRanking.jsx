import React from 'react';
import { Star } from 'lucide-react';

export default function TopRanking({ items, title = 'Top 10 Global' }) {
  const ranked = [...items]
    .filter(i => i.rating != null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-2.5">
        {ranked.map((item, i) => (
          <div key={item.id} className="flex items-center gap-3">
            <span className="w-6 text-xs font-bold text-muted-foreground text-right">
              {i + 1}.
            </span>
            {item.poster_url ? (
              <img src={item.poster_url} className="w-8 h-11 rounded object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-8 h-11 rounded bg-muted flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {item.director || 'Sin director'} · {item.year || '—'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold">{item.rating?.toFixed(1)}</span>
            </div>
          </div>
        ))}
        {ranked.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay datos</p>
        )}
      </div>
    </div>
  );
}