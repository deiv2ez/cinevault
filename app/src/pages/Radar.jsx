import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Radar as RadarIcon, Star, Plus, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getTmdbKey, fetchRadarReleases } from '@/lib/tmdb';

const CURRENT_YEAR = new Date().getFullYear();

export default function Radar() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const myDirectors = useMemo(() => {
    return [...new Set(items.filter(i => i.director).map(i => i.director.toLowerCase()))];
  }, [items]);

  const myFavoriteTitles = useMemo(() => {
    return items.filter(i => i.status === 'Favorito').map(i => i.title.toLowerCase());
  }, [items]);

  const existingTitles = useMemo(() => {
    return items.map(i => i.title.toLowerCase());
  }, [items]);

  const isMyDirector = (director) => {
    if (!director) return false;
    return myDirectors.some(d => director.toLowerCase().includes(d) || d.includes(director.toLowerCase()));
  };

  const isSequel = (title) => {
    return myFavoriteTitles.some(t => {
      const base = t.replace(/\s+\d+$/, '').replace(/\s+part\s+\d+$/i, '').trim();
      return base.length > 3 && title.toLowerCase().includes(base);
    });
  };

  const fetchRadar = async () => {
    const key = getTmdbKey();
    if (!key) {
      toast.error('Configura tu API Key de TMDB en Ajustes para usar el Radar.');
      return;
    }
    setLoading(true);
    try {
      // Datos reales y actuales desde TMDB (próximos estrenos + populares del año).
      const list = await fetchRadarReleases(key, CURRENT_YEAR);
      const enriched = list.map(r => ({
        ...r,
        isMyDirector: isMyDirector(r.director),
        isSequel: isSequel(r.title),
        alreadyAdded: existingTitles.includes((r.title || '').toLowerCase()),
      }));

      enriched.sort((a, b) => {
        const aScore = (a.isMyDirector ? 2 : 0) + (a.isSequel ? 1 : 0);
        const bScore = (b.isMyDirector ? 2 : 0) + (b.isSequel ? 1 : 0);
        return bScore - aScore;
      });

      setReleases(enriched);
    } catch (e) {
      toast.error('No se pudieron cargar los estrenos de TMDB.');
    }
    setLoading(false);
  };

  const addToPending = async (release) => {
    setAddingId(release.title);
    await base44.entities.MediaItem.create({
      title: release.title,
      director: release.director,
      year: release.year,
      genre1: release.genres?.[0] || '',
      genre2: release.genres?.[1] || '',
      category: release.category || 'Película',
      status: 'Pendiente',
      synopsis: release.synopsis || '',
      poster_url: release.poster_url || '',
    });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    setReleases(prev => prev.map(r => r.title === release.title ? { ...r, alreadyAdded: true } : r));
    setAddingId(null);
  };

  const highlighted = releases.filter(r => r.isMyDirector || r.isSequel);
  const rest = releases.filter(r => !r.isMyDirector && !r.isSequel);

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <RadarIcon className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Radar {CURRENT_YEAR}</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg">
            Los estrenos más esperados del año. Los de tus directores favoritos y secuelas de tus películas se resaltan.
          </p>
        </div>
        <Button onClick={fetchRadar} disabled={loading} size="lg" className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Escaneando...</>
          ) : (
            <><RadarIcon className="w-4 h-4" /> {releases.length > 0 ? 'Actualizar' : 'Escanear Estrenos'}</>
          )}
        </Button>
      </div>

      {!loading && releases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-center mb-6">
            <RadarIcon className="w-10 h-10 text-amber-500/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">El radar está en silencio</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Activa el radar para descubrir los estrenos de {CURRENT_YEAR} y encontrar los que coincidan con tus gustos.
          </p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
              <div className="h-48 bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && releases.length > 0 && (
        <>
          {highlighted.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h2 className="text-base font-semibold text-foreground">Destacados para ti</h2>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                  {highlighted.length} coincidencias
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {highlighted.map((r, i) => <ReleaseCard key={i} release={r} onAdd={addToPending} adding={addingId === r.title} />)}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-4">Todos los estrenos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((r, i) => <ReleaseCard key={i} release={r} onAdd={addToPending} adding={addingId === r.title} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReleaseCard({ release, onAdd, adding }) {
  return (
    <div className={cn(
      "bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col",
      (release.isMyDirector || release.isSequel) ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-border"
    )}>
      <div className="relative h-48 bg-muted overflow-hidden">
        {release.poster_url ? (
          <img src={release.poster_url} alt={release.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <RadarIcon className="w-10 h-10 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {(release.isMyDirector || release.isSequel) && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5 border-0">
              <Star className="w-3 h-3 mr-1 fill-white" />
              {release.isMyDirector ? 'Tu director' : 'Secuela'}
            </Badge>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-white font-bold">{release.title}</p>
          <p className="text-white/70 text-xs">{release.director} · {release.year}</p>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1">
          {release.genres?.slice(0, 3).map(g => (
            <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>
          ))}
          {release.release_date && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="w-2.5 h-2.5" /> {release.release_date}
            </Badge>
          )}
        </div>
        {release.synopsis && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{release.synopsis}</p>
        )}
        <Button
          size="sm"
          variant={release.alreadyAdded ? "secondary" : "outline"}
          disabled={release.alreadyAdded || adding}
          onClick={() => onAdd(release)}
          className="mt-auto w-full"
        >
          {release.alreadyAdded ? (
            <><Clock className="w-3.5 h-3.5 mr-1.5" /> En Pendientes</>
          ) : adding ? (
            <div className="w-4 h-4 border-2 border-current/40 border-t-current rounded-full animate-spin" />
          ) : (
            <><Plus className="w-3.5 h-3.5 mr-1.5" /> Añadir recordatorio</>
          )}
        </Button>
      </div>
    </div>
  );
}