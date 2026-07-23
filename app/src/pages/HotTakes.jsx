import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Flame, TrendingUp, TrendingDown, Film, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const WATCHED_STATUSES = ['Visto', 'Visto muchas veces', 'Favorito'];

// Fila comparativa: tu nota vs la del público (TMDB).
function TakeRow({ item }) {
  const diff = item._diff;
  const up = diff > 0;
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:shadow-md transition-all">
      <div className="w-11 h-16 rounded-md bg-muted overflow-hidden flex-shrink-0">
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-5 h-5 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground truncate">{item.director || '—'} · {item.year || '—'}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="font-bold text-foreground">{Number(item.rating).toFixed(1)}</span>
            <span className="text-muted-foreground">tú</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            <Users className="w-3 h-3 text-amber-500" />
            <span className="font-bold text-foreground">{Number(item.tmdb_rating).toFixed(1)}</span>
            <span className="text-muted-foreground">público</span>
          </span>
        </div>
      </div>
      <Badge
        className={cn(
          'flex items-center gap-1 text-xs font-bold border-0 flex-shrink-0',
          up ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
        )}
      >
        {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {up ? '+' : ''}{diff.toFixed(1)}
      </Badge>
    </div>
  );
}

export default function HotTakes() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items-hottakes'],
    queryFn: async () => {
      const results = await Promise.all(
        WATCHED_STATUSES.map(status =>
          base44.entities.MediaItem.filter({ status }, '-rating', 5000)
        )
      );
      return results.flat();
    },
  });

  const { comparable, underrated, overrated, avgBias, agreed } = useMemo(() => {
    const comparable = items
      // Excluye las que no tienen nota pública real (0.0 = sin votos en TMDB)
      .filter(i => i.rating != null && i.tmdb_rating != null && Number(i.tmdb_rating) > 0)
      .map(i => ({ ...i, _diff: Number(i.rating) - Number(i.tmdb_rating) }));

    const underrated = comparable
      // Excluye tus notas altísimas (>9.3): son tu top, no una "defensa" contra el público
      .filter(i => i._diff > 0 && Number(i.rating) <= 9.3)
      .sort((a, b) => b._diff - a._diff)
      .slice(0, 15);

    const overrated = comparable
      .filter(i => i._diff < 0)
      .sort((a, b) => a._diff - b._diff)
      .slice(0, 15);

    const agreed = comparable.filter(i => Math.abs(i._diff) <= 0.5).length;

    const avgBias = comparable.length
      ? comparable.reduce((s, i) => s + i._diff, 0) / comparable.length
      : 0;

    return { comparable, underrated, overrated, avgBias, agreed };
  }, [items]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Tus hot takes</h1>
            <p className="text-sm text-muted-foreground">Dónde tu nota se aleja más de la del público</p>
          </div>
        </div>
      </div>

      {comparable.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-center mb-6">
            <Flame className="w-10 h-10 text-rose-500/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Aún no hay comparativas</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Necesitas la nota pública (TMDB) en tus obras. Ve a <span className="font-medium text-foreground">Ajustes → Enriquecer datos con TMDB</span> y ejecuta el proceso para traer las notas del público.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold text-foreground">{comparable.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">obras comparables</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className={cn('text-2xl font-bold', avgBias >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {avgBias >= 0 ? '+' : ''}{avgBias.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                tu sesgo medio {avgBias >= 0 ? '(más generoso)' : '(más exigente)'}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-2xl font-bold text-foreground">{agreed}</p>
              <p className="text-xs text-muted-foreground mt-0.5">coincidís (±0.5)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Infravaloradas por el público */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h2 className="text-base font-semibold text-foreground">Las defiendes tú</h2>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                  tú &gt; público
                </Badge>
              </div>
              <div className="space-y-2.5">
                {underrated.length > 0
                  ? underrated.map(i => <TakeRow key={i.id} item={i} />)
                  : <p className="text-sm text-muted-foreground">Ninguna: nunca puntúas por encima del público.</p>}
              </div>
            </div>

            {/* Sobrevaloradas por el público */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <h2 className="text-base font-semibold text-foreground">No te convencen</h2>
                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs">
                  tú &lt; público
                </Badge>
              </div>
              <div className="space-y-2.5">
                {overrated.length > 0
                  ? overrated.map(i => <TakeRow key={i.id} item={i} />)
                  : <p className="text-sm text-muted-foreground">Ninguna: nunca puntúas por debajo del público.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
