import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Film, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

async function fetchFromTMDB(query, tmdbKey) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(query)}&language=es-ES`
  );
  const data = await res.json();
  const items = (data.results || []).filter(r => r.media_type !== 'person').slice(0, 6);

  return items.map(r => ({
    title: r.title || r.name || '',
    year: parseInt((r.release_date || r.first_air_date || '').substring(0, 4)) || null,
    poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w92${r.poster_path}` : '',
    tmdb_id: String(r.id),
    media_type: r.media_type,
  }));
}

async function enrichFromTMDB(tmdb_id, media_type, tmdbKey) {
  const mt = media_type === 'tv' ? 'tv' : 'movie';
  const [detail, credits] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/${mt}/${tmdb_id}?api_key=${tmdbKey}&language=es-ES`).then(r => r.json()),
    fetch(`https://api.themoviedb.org/3/${mt}/${tmdb_id}/credits?api_key=${tmdbKey}&language=es-ES`).then(r => r.json()),
  ]);
  const director = credits.crew?.find(c => c.job === 'Director')?.name || '';
  const genres = (detail.genres || []).map(g => g.name);
  const originCountry = detail.origin_country?.[0] || (detail.production_countries?.[0]?.iso_3166_1 ?? '');
  return {
    director,
    genre1: genres[0] || '',
    genre2: genres[1] || '',
    country: originCountry,
    synopsis: detail.overview || '',
    poster_url: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : '',
  };
}

async function fetchFromLLM(query) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Search for the movie or series titled "${query}". Return the top 5 results with accurate real data. For each: title, year, director, genre1, genre2, country, synopsis (2-3 sentences in Spanish), and poster_url (real TMDB URL: https://image.tmdb.org/t/p/w500/PATH or empty).`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' }, year: { type: 'number' },
              director: { type: 'string' }, genre1: { type: 'string' },
              genre2: { type: 'string' }, country: { type: 'string' },
              synopsis: { type: 'string' }, poster_url: { type: 'string' },
              tmdb_id: { type: 'string' }
            }
          }
        }
      }
    },
    model: 'gemini_3_flash'
  });
  return (res.results || []).map(r => ({ ...r, _full: true }));
}

export default function TmdbSearch({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrichingId, setEnrichingId] = useState(null);
  const debounceRef = useRef(null);
  const tmdbKey = localStorage.getItem('tmdb_api_key') || '';

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() || val.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const res = tmdbKey
        ? await fetchFromTMDB(val, tmdbKey)
        : await fetchFromLLM(val);
      setResults(res);
      setLoading(false);
    }, 300);
  };

  const handleSelect = async (r) => {
    setResults([]);
    setQuery(r.title || '');

    if (r._full) {
      // Already has full data from LLM
      onSelect(r);
      return;
    }

    // Enrich via TMDB
    setEnrichingId(r.tmdb_id);
    const extra = await enrichFromTMDB(r.tmdb_id, r.media_type, tmdbKey);
    onSelect({ ...r, ...extra });
    setEnrichingId(null);
  };

  return (
    <div className="space-y-3 relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Escribe para buscar: ej. Interstellar, Breaking Bad..."
          value={query}
          onChange={handleInput}
          className="pl-9 pr-9"
        />
        {(loading || enrichingId) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {results.map((r, i) => (
            <button
              key={r.tmdb_id || i}
              onClick={() => handleSelect(r)}
              className="flex items-center gap-3 p-3 hover:bg-muted/60 transition-colors text-left w-full border-b border-border last:border-0"
            >
              {r.poster_url ? (
                <img src={r.poster_url} alt="" className="w-9 h-13 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-13 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Film className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {r.title}
                  {r.year ? <span className="font-normal text-muted-foreground ml-1">({r.year})</span> : ''}
                </p>
                {r.director && <p className="text-xs text-muted-foreground truncate">{r.director}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}