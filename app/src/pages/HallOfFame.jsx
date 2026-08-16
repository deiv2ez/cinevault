import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { HOF_LISTS } from '@/lib/halloffame-data';

// Anillo de progreso circular (estilo "list progress").
function ProgressRing({ label, matched, total }) {
  const pct = total ? Math.round((matched / total) * 100) : 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  const arc = (pct / 100) * C;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[136px] h-[136px]">
        <svg viewBox="0 0 136 136" className="w-full h-full -rotate-90">
          <circle cx="68" cy="68" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="68" cy="68" r={R} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[11px] font-medium text-muted-foreground leading-tight mb-0.5 line-clamp-2">{label}</p>
          <p className="text-2xl font-bold text-foreground leading-none">{pct}%</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{matched} de {total}</p>
        </div>
      </div>
    </div>
  );
}

export default function HallOfFame() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const userIds = useMemo(() => {
    const s = new Set();
    items.forEach(i => { const n = Number(i.tmdb_id); if (Number.isFinite(n) && n > 0) s.add(n); });
    return s;
  }, [items]);

  const cards = useMemo(() => {
    return HOF_LISTS.map(list => {
      const matched = list.ids.reduce((acc, id) => acc + (userIds.has(id) ? 1 : 0), 0);
      return { key: list.key, label: list.label, matched, total: list.ids.length };
    }).sort((a, b) => (b.matched / b.total) - (a.matched / a.total));
  }, [userIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Hall of Fame</h1>
          <p className="text-sm text-muted-foreground">Tu progreso en las grandes listas del cine</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-8 gap-x-4 mt-8">
        {cards.map(c => (
          <ProgressRing key={c.key} label={c.label} matched={c.matched} total={c.total} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground/70 text-center mt-10 max-w-lg mx-auto">
        El progreso se calcula cruzando el identificador TMDB de tus obras con cada lista.
        Las listas son una instantánea (Letterboxd, IMDb, Óscar, Cannes, Box Office Mojo, AFI, Sight &amp; Sound, 1001 Películas) y se pueden actualizar.
      </p>
    </div>
  );
}
