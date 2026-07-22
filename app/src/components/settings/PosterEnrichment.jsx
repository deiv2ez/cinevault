import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { searchBest, fetchDetails, posterFrom, genreMap } from '@/lib/tmdb';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ¿A esta obra le faltan datos que TMDB puede rellenar?
const needsEnrich = (i) =>
  !i.poster_url || !i.director || !i.year || !i.genre1 ||
  !i.country || !i.tmdb_id || i.tmdb_rating == null;

export default function PosterEnrichment({ items, tmdbKey }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const queryClient = useQueryClient();

  const pending = items.filter(i => i.title && needsEnrich(i));

  const run = async () => {
    if (!tmdbKey) return;
    setRunning(true);
    let done = 0, updated = 0;
    const total = pending.length;
    const gmap = await genreMap(tmdbKey);

    for (const item of pending) {
      try {
        const hit = await searchBest(item.title, item.year, tmdbKey);
        if (hit) {
          const patch = {};
          if (hit.id) patch.tmdb_id = String(hit.id);
          if (item.tmdb_rating == null && typeof hit.vote_average === 'number') {
            patch.tmdb_rating = Math.round(hit.vote_average * 10) / 10;
          }
          if (!item.poster_url && hit.poster_path) patch.poster_url = posterFrom(hit.poster_path, 'w342');
          if (!item.year && hit.release_date) patch.year = parseInt(hit.release_date.slice(0, 4));
          if (!item.synopsis && hit.overview) patch.synopsis = hit.overview;
          if (!item.genre1 && (hit.genre_ids || []).length) {
            const names = hit.genre_ids.map(id => gmap[id]).filter(Boolean);
            if (names[0]) patch.genre1 = names[0];
            if (!item.genre2 && names[1]) patch.genre2 = names[1];
          }

          // Solo pedimos detalles (llamada extra) si aún falta director o país.
          if ((!item.director || !item.country) && hit.id) {
            const det = await fetchDetails(hit.id, tmdbKey);
            if (det) {
              if (!item.director && det.director) patch.director = det.director;
              if (!item.country && det.country) patch.country = det.country;
            }
          }

          if (Object.keys(patch).length) {
            await base44.entities.MediaItem.update(item.id, patch);
            updated++;
          }
        }
      } catch (_) {}
      done++;
      setProgress({ done, total, updated });
      await sleep(280);
    }

    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    queryClient.invalidateQueries({ queryKey: ['media-items-all'] });
    queryClient.invalidateQueries({ queryKey: ['media-items-library'] });
    setRunning(false);
  };

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <CheckCircle2 className="w-4 h-4" />
        Todas tus obras tienen sus datos completos
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{pending.length}</span> obras con datos incompletos (póster, director, año, género, país o nota pública).
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
            {progress.done}/{progress.total} procesadas · {progress.updated} obras actualizadas
          </p>
        </div>
      )}

      {!running && progress && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="w-4 h-4" />
          Completado: {progress.updated} obras enriquecidas
        </div>
      )}

      <Button
        variant="outline"
        onClick={run}
        disabled={running || !tmdbKey}
        size="sm"
      >
        {running ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enriqueciendo datos...</>
        ) : (
          <><ImageIcon className="w-4 h-4 mr-2" /> Enriquecer datos faltantes con TMDB</>
        )}
      </Button>

      {!tmdbKey && (
        <p className="text-xs text-amber-600">Introduce tu API Key de TMDB arriba para activar esta función.</p>
      )}
    </div>
  );
}
