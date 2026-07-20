import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useDeduplicatedItems } from '@/lib/useDeduplicatedItems';
import { Star, TrendingUp, TrendingDown, Film } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function RankingList({ items, title, emptyText = 'No hay datos' }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:bg-muted/30 transition-colors">
            <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
              {i + 1}
            </span>
            {item.poster_url ? (
              <img src={item.poster_url} className="w-9 h-13 rounded object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-9 h-13 rounded bg-muted flex items-center justify-center flex-shrink-0">
                <Film className="w-4 h-4 text-muted-foreground/30" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {[item.director, item.year, item.category].filter(Boolean).join(' · ')}
              </p>
            </div>
            {item.rating != null && (
              <div className="flex items-center gap-1">
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

  const topAll = [...deduped].filter(i => i.rating != null).sort((a, b) => b.rating - a.rating).slice(0, 10);
  const topMovies = [...deduped].filter(i => i.category === 'Película' && i.rating != null).sort((a, b) => b.rating - a.rating).slice(0, 10);
  const topSeries = [...deduped].filter(i => i.category === 'Serie' && i.rating != null && (i.status === 'Visto' || i.status === 'Favorito' || i.status === 'Visto muchas veces')).sort((a, b) => b.rating - a.rating).slice(0, 10);
  const topDocs = [...deduped].filter(i => i.category === 'Documental' && i.rating != null).sort((a, b) => b.rating - a.rating).slice(0, 10);
  const overrated = deduped.filter(i => i.overrated);
  const underrated = deduped.filter(i => i.underrated);
  const favorites = deduped.filter(i => i.status === 'Favorito').sort((a, b) => (b.rating || 0) - (a.rating || 0));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Listas & Rankings</h1>
        <p className="text-sm text-muted-foreground mt-1">Tus rankings personales y listas curadas</p>
      </div>

      <Tabs defaultValue="top10">
        <TabsList className="mb-6">
          <TabsTrigger value="top10">Top 10</TabsTrigger>
          <TabsTrigger value="favorites">Favoritos</TabsTrigger>
          <TabsTrigger value="versus">Sobre vs Infra</TabsTrigger>
          <TabsTrigger value="category">Por Categoría</TabsTrigger>
        </TabsList>

        <TabsContent value="top10">
          <RankingList items={topAll} title="Top 10 Global" />
        </TabsContent>

        <TabsContent value="favorites">
          <RankingList items={favorites} title="Mis Favoritos" />
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

        <TabsContent value="category">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <RankingList items={topMovies} title="Top Películas" />
            <RankingList items={topSeries} title="Top Series" />
            <RankingList items={topDocs} title="Top Documentales" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}