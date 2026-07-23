import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Clock, Film, Star, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// "Vistas" = terminadas (igual que en Mi Biblioteca): excluye Pendiente, En progreso y Abandono.
const WATCHED = ['Visto', 'Visto muchas veces', 'Favorito'];

function extractYear(watchedAt) {
  if (!watchedAt) return null;
  const yearMatch = String(watchedAt).match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return parseInt(yearMatch[0]);
  return null;
}

export default function Timeline() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items-all'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const timelineData = useMemo(() => {
    const watched = items.filter(i => WATCHED.includes(i.status));

    const grouped = {};
    watched.forEach(item => {
      // Priority: year from "watched_at", then item.year
      const year = extractYear(item.watched_at) || item.year || null;
      if (!year) return;
      if (!grouped[year]) grouped[year] = { year, items: [] };
      grouped[year].items.push(item);
    });

    return Object.values(grouped)
      .sort((a, b) => b.year - a.year)
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => (b.rating || 0) - (a.rating || 0)),
      }));
  }, [items]);

  const noDate = useMemo(() => {
    return items.filter(i =>
      WATCHED.includes(i.status) &&
      !extractYear(i.watched_at) && !i.year
    );
  }, [items]);

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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-chart-4" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Diario de Visionado</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Tu historia cinematográfica año por año · {items.filter(i => WATCHED.includes(i.status)).length} obras vistas
        </p>
      </div>

      {timelineData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Clock className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">Añade años o fechas en el campo "Vista en" de tus obras para construir tu timeline</p>
        </div>
      )}

      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-12">
          {timelineData.map((group) => (
            <div key={group.year} className="relative pl-16">
              {/* Timeline dot */}
              <div className="absolute left-3.5 top-1 w-5 h-5 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>

              {/* Year label */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-bold text-foreground">{group.year}</h2>
                <Badge variant="outline" className="text-xs">{group.items.length} obra{group.items.length !== 1 ? 's' : ''}</Badge>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {group.items.map(item => (
                  <TimelineItem key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {noDate.length > 0 && (
        <div className="relative pl-16">
          <div className="absolute left-3.5 top-1 w-5 h-5 rounded-full bg-muted border-2 border-muted-foreground/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
          </div>
          <h2 className="text-base font-semibold text-muted-foreground mb-4">Sin fecha registrada</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {noDate.map(item => (
              <TimelineItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ item }) {
  const statusColors = {
    'Favorito': 'ring-amber-400/50',
    'Visto muchas veces': 'ring-primary/50',
  };

  return (
    <div className={cn(
      "group relative bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer",
      statusColors[item.status] && `ring-2 ${statusColors[item.status]}`
    )}>
      <div className="aspect-[2/3] bg-muted overflow-hidden">
        {item.poster_url ? (
          <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8 text-muted-foreground/20" />
          </div>
        )}
        {item.rating != null && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 rounded-md px-1.5 py-0.5">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-bold text-white">{item.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium text-foreground truncate leading-tight">{item.title}</p>
        {item.watched_at && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <MapPin className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
            <p className="text-[10px] text-muted-foreground truncate">{item.watched_at}</p>
          </div>
        )}
      </div>
    </div>
  );
}