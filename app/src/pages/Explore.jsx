import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, Film, Plus, Check, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import AffinityScore from '@/components/explore/AffinityScore';
import WatchProviderBadges from '@/components/explore/WatchProviderBadges';

const TMDB_KEY_LS = 'tmdb_api_key';

async function searchTMDB(query, tmdbKey) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}&language=es-ES`
  );
  const data = await res.json();
  return (data.results || []).filter(r => r.media_type !== 'person').slice(0, 6);
}

async function getDetails(id, type, tmdbKey) {
  const mt = type === 'tv' ? 'tv' : 'movie';
  const [detail, credits, providers] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/${mt}/${id}?api_key=${tmdbKey}&language=es-ES`).then(r => r.json()),
    fetch(`https://api.themoviedb.org/3/${mt}/${id}/credits?api_key=${tmdbKey}&language=es-ES`).then(r => r.json()),
    fetch(`https://api.themoviedb.org/3/${mt}/${id}/watch/providers?api_key=${tmdbKey}`).then(r => r.json()),
  ]);
  const director = credits.crew?.find(c => c.job === 'Director')?.name ||
    credits.crew?.find(c => c.department === 'Directing')?.name || null;
  const cast = (credits.cast || []).slice(0, 5).map(a => a.name);
  const esProviders = providers.results?.ES?.flatrate || [];
  return { detail, director, cast, esProviders };
}

export default function Explore() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [showAffinity, setShowAffinity] = useState(false);
  const debounceRef = useRef(null);
  const queryClient = useQueryClient();
  const tmdbKey = localStorage.getItem(TMDB_KEY_LS) || '';

  const { data: myItems = [] } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-rating', 500),
  });

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    setAdded(false);
    setShowAffinity(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() || val.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      if (!tmdbKey) { toast.error('Configura tu API Key de TMDB en Ajustes'); return; }
      setSearching(true);
      const res = await searchTMDB(val, tmdbKey);
      setResults(res);
      setSearching(false);
    }, 350);
  };

  const selectResult = async (r) => {
    setResults([]);
    setQuery(r.title || r.name || '');
    setLoadingDetail(true);
    setShowAffinity(false);
    setAdded(false);
    const { detail, director, cast, esProviders } = await getDetails(r.id, r.media_type, tmdbKey);
    const genres = (detail.genres || []).map(g => g.name);
    setSelected({
      tmdb_id: String(r.id),
      media_type: r.media_type,
      title: r.title || r.name || '',
      year: parseInt((r.release_date || r.first_air_date || '').substring(0, 4)) || null,
      poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
      synopsis: detail.overview || '',
      director,
      cast,
      genre1: genres[0] || '',
      genre2: genres[1] || '',
      esProviders,
      vote_average: detail.vote_average,
    });
    setLoadingDetail(false);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    await base44.entities.MediaItem.create({
      title: selected.title,
      year: selected.year,
      poster_url: selected.poster_url,
      synopsis: selected.synopsis,
      director: selected.director,
      genre1: selected.genre1,
      genre2: selected.genre2,
      tmdb_id: selected.tmdb_id,
      status: 'Pendiente',
      category: selected.media_type === 'tv' ? 'Serie' : 'Película',
    });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    setAdded(true);
    setAdding(false);
    toast.success(`"${selected.title}" añadida a Pendientes`);
  };

  if (!tmdbKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 text-center">
        <Search className="w-12 h-12 text-muted-foreground/20" />
        <p className="text-lg font-semibold text-foreground">Configura tu API Key de TMDB</p>
        <p className="text-sm text-muted-foreground max-w-xs">Ve a <strong>Ajustes</strong> e introduce tu clave gratuita de TMDB para usar Explorar.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Explorar</h1>
        <p className="text-sm text-muted-foreground mt-1">Busca cualquier película o serie en TMDB y descubre dónde verla</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Busca una película o serie... ej. Dune, The Wire"
          value={query}
          onChange={handleInput}
          className="pl-12 h-12 text-base rounded-xl border-border bg-card"
        />
        {searching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}

        {/* Dropdown results */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {results.map(r => (
              <button
                key={r.id}
                onClick={() => selectResult(r)}
                className="flex items-center gap-3 w-full p-3 hover:bg-muted/60 transition-colors text-left border-b border-border last:border-0"
              >
                {r.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                    className="w-10 h-14 object-cover rounded flex-shrink-0"
                    alt=""
                  />
                ) : (
                  <div className="w-10 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Film className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {r.title || r.name}
                    {(r.release_date || r.first_air_date) && (
                      <span className="font-normal text-muted-foreground ml-1">
                        ({(r.release_date || r.first_air_date).substring(0, 4)})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{r.media_type === 'tv' ? 'Serie' : 'Película'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading detail */}
      {loadingDetail && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Detail card */}
      {selected && !loadingDetail && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex gap-0 flex-col md:flex-row">
            {/* Poster */}
            {selected.poster_url ? (
              <img
                src={selected.poster_url}
                alt={selected.title}
                className="w-full md:w-56 md:min-w-56 object-cover max-h-72 md:max-h-none"
              />
            ) : (
              <div className="w-full md:w-56 md:min-w-56 bg-muted flex items-center justify-center min-h-48">
                <Film className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 p-6 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selected.title}</h2>
                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  {selected.year && <Badge variant="outline">{selected.year}</Badge>}
                  {selected.genre1 && <Badge variant="secondary">{selected.genre1}</Badge>}
                  {selected.genre2 && <Badge variant="secondary">{selected.genre2}</Badge>}
                  {selected.vote_average && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      ★ {selected.vote_average.toFixed(1)} TMDB
                    </Badge>
                  )}
                </div>
              </div>

              {selected.director && (
                <p className="text-sm"><span className="text-muted-foreground">Director:</span> <span className="font-medium">{selected.director}</span></p>
              )}

              {selected.cast?.length > 0 && (
                <p className="text-sm"><span className="text-muted-foreground">Reparto:</span> <span className="font-medium">{selected.cast.join(', ')}</span></p>
              )}

              {selected.synopsis && (
                <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{selected.synopsis}</p>
              )}

              {/* Watch Providers */}
              <WatchProviderBadges providers={selected.esProviders} />

              {/* Actions */}
              <div className="flex gap-3 flex-wrap pt-2">
                <Button
                  onClick={handleAdd}
                  disabled={adding || added}
                  className={cn("flex-1 md:flex-none", added && "bg-green-600 hover:bg-green-700")}
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : added ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {added ? '¡Añadida a Pendientes!' : 'Añadir a mis Pendientes'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowAffinity(true)}
                  disabled={showAffinity}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Calcular Índice de Afinidad
                </Button>
              </div>
            </div>
          </div>

          {/* Affinity Score */}
          {showAffinity && (
            <div className="border-t border-border p-6">
              <AffinityScore movie={selected} myItems={myItems} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}