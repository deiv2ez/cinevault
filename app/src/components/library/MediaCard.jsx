import React from 'react';
import { Star, Film } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useWatchProviders } from '@/hooks/useWatchProviders';

const statusColors = {
  'Visto': 'bg-chart-2/15 text-chart-2 border-chart-2/30',
  'Visto muchas veces': 'bg-chart-1/15 text-chart-1 border-chart-1/30',
  'Pendiente': 'bg-chart-3/15 text-chart-3 border-chart-3/30',
  'Abandono': 'bg-destructive/15 text-destructive border-destructive/30',
  'Favorito': 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  'En progreso': 'bg-chart-4/15 text-chart-4 border-chart-4/30',
};

export default function MediaCard({ item, onClick }) {
  const tmdbKey = localStorage.getItem('tmdb_api_key') || '';
  const providers = useWatchProviders(item.tmdb_id, tmdbKey);

  return (
    <button
      onClick={() => onClick?.(item)}
      className="group text-left w-full rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300"
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-muted relative overflow-hidden">
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        {item.rating != null && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-white">{item.rating.toFixed(1)}</span>
          </div>
        )}
        {providers && providers.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {providers.map(p => (
              <span key={p.name} className={cn('text-[9px] font-bold text-white px-1.5 py-0.5 rounded', p.color)}>
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm md:text-sm font-semibold text-foreground truncate leading-tight">{item.title}</h3>
        <p className="text-xs text-muted-foreground">
          {[item.director, item.year].filter(Boolean).join(' · ') || '—'}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.status && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', statusColors[item.status])}>
              {item.status}
            </Badge>
          )}
          {item.genre1 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {item.genre1}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}