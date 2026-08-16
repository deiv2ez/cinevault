import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Trophy, X, CheckCircle2, Circle, Loader2, Film } from 'lucide-react';
import { HOF_LISTS } from '@/lib/halloffame-data';
import { getTmdbKey } from '@/lib/tmdb';

// Caché en memoria + localStorage de títulos por tmdb_id (para el detalle).
let movieCache = {};
try { movieCache = JSON.parse(localStorage.getItem('hof_movie_cache') || '{}') || {}; } catch { movieCache = {}; }

async function fetchTitlesFor(ids, key, onProgress) {
  const need = ids.filter(id => !movieCache[id]);
  let done = 0;
  if (onProgress) onProgress(0, need.length);
  if (!need.length) return;
  let idx = 0;
  const CONC = 12;
  async function worker() {
    while (idx < need.length) {
      const id = need[idx++];
      try {
        const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${key}&language=es-ES`);
        if (r.ok) {
          const d = await r.json();
          movieCache[id] = { t: d.title || d.original_title || ('#' + id), y: d.release_date ? parseInt(d.release_date.slice(0, 4)) : null };
        } else { movieCache[id] = { t: '#' + id, y: null }; }
      } catch { movieCache[id] = { t: '#' + id, y: null }; }
      done++; if (onProgress) onProgress(done, need.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, need.length) }, worker));
  try { localStorage.setItem('hof_movie_cache', JSON.stringify(movieCache)); } catch { /* noop */ }
}

// Anillo de progreso grande, con la etiqueta debajo. Toda la tarjeta es clicable.
function RingCard({ label, matched, total, onClick }) {
  const pct = total ? Math.round((matched / total) * 100) : 0;
  const R = 70;
  const C = 2 * Math.PI * R;
  const arc = (pct / 100) * C;
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="relative w-[168px] h-[168px]">
        <svg viewBox="0 0 168 168" className="w-full h-full -rotate-90">
          <circle cx="84" cy="84" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="11" />
          <circle
            cx="84" cy="84" r={R} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${arc} ${C}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-bold text-foreground leading-none">{pct}%</p>
          <p className="text-sm text-muted-foreground mt-1.5">{matched} / {total}</p>
        </div>
      </div>
      <p className="text-[15px] font-semibold text-foreground text-center leading-snug group-hover:text-primary transition-colors">{label}</p>
    </button>
  );
}

// Modal con las películas de una lista y cuáles has visto.
function ListDetail({ list, userIds, onClose }) {
  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;
    const key = getTmdbKey();
    (async () => {
      setLoading(true);
      if (key) {
        await fetchTitlesFor(list.ids, key, (done, total) => { if (!cancelled) setProgress({ done, total }); });
      }
      if (cancelled) return;
      const arr = list.ids.map(id => {
        const m = movieCache[id] || { t: '#' + id, y: null };
        return { id, title: m.t, year: m.y, seen: userIds.has(id) };
      });
      // Vistas primero, luego por año descendente.
      arr.sort((a, b) => (b.seen - a.seen) || ((b.year || 0) - (a.year || 0)));
      setFilms(arr);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [list, userIds]);

  const seenCount = films.filter(f => f.seen).length || list.ids.filter(id => userIds.has(id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">{list.label}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Has visto <span className="text-primary font-semibold">{seenCount}</span> de {list.ids.length}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Cargando películas… {progress.total ? `${progress.done}/${progress.total}` : ''}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {films.map(f => (
                <div key={f.id} className="flex items-center gap-2.5 py-1">
                  {f.seen
                    ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />}
                  <span className={f.seen ? 'text-sm text-foreground' : 'text-sm text-muted-foreground/70'}>
                    {f.title}{f.year ? <span className="text-muted-foreground/50 ml-1">({f.year})</span> : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HallOfFame() {
  const [openList, setOpenList] = useState(null);
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
      return { list, matched, total: list.ids.length };
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
          <p className="text-sm text-muted-foreground">Tu progreso en las grandes listas del cine · toca una para ver las películas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-8">
        {cards.map(c => (
          <RingCard key={c.list.key} label={c.list.label} matched={c.matched} total={c.total} onClick={() => setOpenList(c.list)} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground/70 text-center mt-10 max-w-lg mx-auto">
        El progreso se calcula cruzando el identificador TMDB de tus obras con cada lista.
        Las listas son una instantánea y se pueden actualizar.
      </p>

      {openList && <ListDetail list={openList} userIds={userIds} onClose={() => setOpenList(null)} />}
    </div>
  );
}
