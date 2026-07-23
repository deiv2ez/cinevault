import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useDeduplicatedItems } from '@/lib/useDeduplicatedItems';
import { Star, TrendingUp, TrendingDown, Film, Gem, Clapperboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function RankingList({ items, title, emptyText = 'No hay datos' }) {
  return (
    <div>
      {title && <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>}
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-muted/30 transition-colors">
            <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
              {i + 1}
            </span>
            {item.poster_url ? (
              <img src={item.poster_url} className="w-9 h-[52px] rounded object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-9 h-[52px] rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Film className="w-4 h-4 text-muted-foreground/30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {[item.director, item.year, item.category].filter(Boolean).join(' · ')}
              </p>
            </div>
            {item.rating != null && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold">{item.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Rankings() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items-all'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const deduped = useDeduplicatedItems(items);

  const rated = useMemo(() => deduped.filter(i => i.rating != null), [deduped]);

  const topAll = useMemo(() => [...rated].sort((a, b) => b.rating - a.rating).slice(0, 10), [rated]);
  const overrated = useMemo(() => deduped.filter(i => i.overrated), [deduped]);
  const underrated = useMemo(() => deduped.filter(i => i.underrated), [deduped]);

  // Por década: top 3 por década (año presente)
  const byDecade = useMemo(() => {
    const map = {};
    rated.forEach(i => {
      if (!i.year) return;
      const dec = Math.floor(i.year / 10) * 10;
      (map[dec] = map[dec] || []).push(i);
    });
    return Object.entries(map)
      .map(([dec, arr]) => ({ dec: Number(dec), items: arr.sort((a, b) => b.rating - a.rating).slice(0, 3) }))
      .sort((a, b) => b.dec - a.dec);
  }, [rated]);

  // Tus directores: media por director (>=2 obras valoradas)
  const directors = useMemo(() => {
    const map = {};
    rated.forEach(i => { if (i.director) (map[i.director] = map[i.director] || []).push(i); });
    return Object.entries(map)
      .filter(([, arr]) => arr.length >= 2)
      .map(([name, arr]) => {
        const avg = arr.reduce((s, x) => s + x.rating, 0) / arr.length;
        const best = [...arr].sort((a, b) => b.rating - a.rating)[0];
        return { name, n: arr.length, avg, best };
      })
      .sort((a, b) => b.avg - a.avg || b.n - a.n)
      .slice(0, 15);
  }, [rated]);

  // Joyas ocultas: las adoras (≥8) muy por encima del público (necesita tmdb_rating)
  const gems = useMemo(() => {
    return rated
      .filter(i => i.rating >= 8 && i.tmdb_rating != null && Number(i.tmdb_rating) > 0)
      .map(i => ({ ...i, _gap: Number(i.rating) - Number(i.tmdb_rating) }))
      .filter(i => i._gap >= 1.5)
      .sort((a, b) => b._gap - a._gap)
      .slice(0, 12);
  }, [rated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Listas & Rankings</h1>
        <p className="text-sm text-muted-foreground mt-1">Tus rankings personales y listas curadas</p>
      </div>

      <Tabs defaultValue="top10">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="top10">Top 10</TabsTrigger>
          <TabsTrigger value="decade">Por década</TabsTrigger>
          <TabsTrigger value="directors">Tus directores</TabsTrigger>
          <TabsTrigger value="gems">Joyas ocultas</TabsTrigger>
          <TabsTrigger value="versus">Sobre vs Infra</TabsTrigger>
        </TabsList>

        <TabsContent value="top10">
          <RankingList items={topAll} title="Top 10 Global" />
        </TabsContent>

        <TabsContent value="decade">
          <div className="space-y-8">
            {byDecade.length === 0 && <p className="text-sm text-muted-foreground">Añade años a tus obras para ver esta lista.</p>}
            {byDecade.map(group => (
              <div key={group.dec}>
                <div className="flex items-center gap-2 mb-4">
                  <Clapperboard className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Lo mejor de los {group.dec}s</h3>
                </div>
                <RankingList items={group.items} title="" />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="directors">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Tus directores mejor valorados</h3>
            <span className="text-xs text-muted-foreground">(2+ obras valoradas)</span>
          </div>
          <div className="space-y-2">
            {directors.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay directores con 2+ obras valoradas.</p>}
            {directors.map((dir, i) => (
              <div key={dir.name} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{dir.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{dir.n} obras · mejor: {dir.best.title}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-bold">{dir.avg.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gems">
          <div className="flex items-center gap-2 mb-4">
            <Gem className="w-4 h-4 text-chart-2" />
            <h3 className="text-sm font-semibold text-foreground">Joyas ocultas</h3>
            <span className="text-xs text-muted-foreground">las defiendes muy por encima del público</span>
          </div>
          <div className="space-y-2">
            {gems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Necesita la nota pública (TMDB). Ve a <span className="font-medium text-foreground">Ajustes → Enriquecer datos con TMDB</span> y ejecútalo para ver tus joyas ocultas.
              </p>
            )}
            {gems.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-chart-2/20">
                <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">{i + 1}</span>
                {item.poster_url ? (
                  <img src={item.poster_url} className="w-9 h-[52px] rounded object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-9 h-[52px] rounded bg-muted flex items-center justify-center flex-shrink-0"><Film className="w-4 h-4 text-muted-foreground/30" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{[item.director, item.year].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-sm font-bold text-foreground">{item.rating.toFixed(1)}</span>
                    <span className="text-[11px] text-muted-foreground">tú</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">público {Number(item.tmdb_rating).toFixed(1)} · +{item._gap.toFixed(1)}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="versus">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-semibold text-foreground">Sobrevaloradas</h3>
              </div>
              <div className="space-y-2">
                {overrated.length === 0 && <p className="text-sm text-muted-foreground">No has marcado ninguna</p>}
                {overrated.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-destructive/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.director} · {item.year}</p>
                    </div>
                    {item.rating != null && <Badge variant="outline">{item.rating.toFixed(1)}</Badge>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Infravaloradas</h3>
              </div>
              <div className="space-y-2">
                {underrated.length === 0 && <p className="text-sm text-muted-foreground">No has marcado ninguna</p>}
                {underrated.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-primary/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.director} · {item.year}</p>
                    </div>
                    {item.rating != null && <Badge variant="outline">{item.rating.toFixed(1)}</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
