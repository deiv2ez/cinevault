import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImageIcon, Loader2, CheckCircle2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';

const TMDB_API_KEY = 'YOUR_TMDB_KEY'; // User must set this in Settings

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default function PosterEnrichment({ items, tmdbKey }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const queryClient = useQueryClient();

  const withoutPosters = items.filter(i => !i.poster_url && i.title);

  const run = async () => {
    if (!tmdbKey) return;
    setRunning(true);
    let done = 0, found = 0;
    const total = withoutPosters.length;

    for (const item of withoutPosters) {
      try {
        const query = encodeURIComponent(item.title);
        const yearParam = item.year ? `&year=${item.year}` : '';
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${query}${yearParam}&language=es-ES`
        );
        const data = await res.json();
        const hit = data.results?.[0];
        if (hit?.poster_path) {
          const posterUrl = `https://image.tmdb.org/t/p/w342${hit.poster_path}`;
          await base44.entities.MediaItem.update(item.id, { poster_url: posterUrl, tmdb_id: String(hit.id) });
          found++;
        }
      } catch (_) {}
      done++;
      setProgress({ done, total, found });
      // Rate limit: ~3 req/sec to be safe
      await sleep(350);
    }

    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    setRunning(false);
  };

  if (withoutPosters.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <CheckCircle2 className="w-4 h-4" />
        Todas las obras tienen póster asignado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{withoutPosters.length}</span> obras sin póster detectadas.
      </p>

      {running && progress && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.done}/{progress.total} procesadas · {progress.found} pósters encontrados
          </p>
        </div>
      )}

      {!running && progress && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="w-4 h-4" />
          Completado: {progress.found} pósters añadidos
        </div>
      )}

      <Button
        variant="outline"
        onClick={run}
        disabled={running || !tmdbKey}
        size="sm"
      >
        {running ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando pósters...</>
        ) : (
          <><ImageIcon className="w-4 h-4 mr-2" /> Enriquecer con pósters TMDB</>
        )}
      </Button>

      {!tmdbKey && (
        <p className="text-xs text-amber-600">Introduce tu API Key de TMDB arriba para activar esta función.</p>
      )}
    </div>
  );
}