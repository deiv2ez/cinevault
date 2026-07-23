import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Plus, RefreshCw, Film, Star, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTmdbKey, searchBest, posterFrom } from '@/lib/tmdb';

function SuggestionCard({ suggestion, onAdd, adding }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 hover:border-primary/30">
      <div className="relative h-64 bg-muted overflow-hidden flex-shrink-0">
        {suggestion.poster_url ? (
          <img src={suggestion.poster_url} alt={suggestion.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-12 h-12 text-muted-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-lg leading-tight">{suggestion.title}</h3>
          <p className="text-white/70 text-sm">{suggestion.director} · {suggestion.year}</p>
        </div>
        {suggestion.tmdb_rating && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold text-white">{suggestion.tmdb_rating}</span>
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestion.genres?.map(g => (
            <Badge key={g} variant="secondary" className="text-[11px]">{g}</Badge>
          ))}
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex-1">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              "{suggestion.reason}"
            </p>
          </div>
        </div>
        <Button
          onClick={() => onAdd(suggestion)}
          disabled={adding}
          size="sm"
          className="w-full mt-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Añadir a Pendientes
        </Button>
      </div>
    </div>
  );
}

export default function Oracle() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['media-items-all'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const generateSuggestions = async () => {
    setLoading(true);
    setSuggestions([]);

    const favorites = [...items]
      .filter(i => i.rating != null)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 25)
      .map(i => ({
        title: i.title,
        director: i.director,
        year: i.year,
        rating: i.rating,
        genre1: i.genre1,
        genre2: i.genre2,
        status: i.status,
        highlights: [i.highlight1, i.highlight2, i.highlight3].filter(Boolean),
        category: i.category,
      }));

    const existingTitles = items.map(i => i.title.toLowerCase());

    const highlightCounts = {};
    items.forEach(item => {
      [item.highlight1, item.highlight2, item.highlight3].forEach(h => {
        if (h) highlightCounts[h] = (highlightCounts[h] || 0) + 1;
      });
    });
    const topHighlights = Object.entries(highlightCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([h]) => h);

    const genreCounts = {};
    items.forEach(i => {
      if (i.genre1) genreCounts[i.genre1] = (genreCounts[i.genre1] || 0) + 1;
      if (i.genre2) genreCounts[i.genre2] = (genreCounts[i.genre2] || 0) + 1;
    });
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);

    const prompt = `Eres un experto cinéfilo y recomendador de películas ultra-personalizado.

Aquí están las ${favorites.length} obras mejor valoradas de este usuario:
${JSON.stringify(favorites, null, 2)}

Sus aspectos favoritos más recurrentes: ${topHighlights.join(', ')}
Sus géneros más vistos: ${topGenres.join(', ')}
Títulos que ya tiene (NO sugerir ninguno): ${existingTitles.join(', ')}

Genera EXACTAMENTE 3 recomendaciones de películas o series que NO estén en la lista anterior. 
Para cada una, escribe una razón MUY PERSONALIZADA y específica mencionando los títulos concretos que ha visto, sus notas, y sus aspectos favoritos. La razón debe ser en español, en primera persona del espectador, emotiva y específica (mínimo 2 frases).

Responde SOLO con JSON válido, sin texto adicional.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                director: { type: 'string' },
                year: { type: 'number' },
                genres: { type: 'array', items: { type: 'string' } },
                tmdb_rating: { type: 'string' },
                poster_url: { type: 'string' },
                synopsis: { type: 'string' },
                reason: { type: 'string' },
              }
            }
          }
        }
      }
    });

    const suggestions = result.suggestions || [];
    // Enriquecer con pósters reales de TMDB (la IA suele no dar una URL válida)
    const key = getTmdbKey();
    if (key) {
      await Promise.all(suggestions.map(async (s) => {
        try {
          const hit = await searchBest(s.title, s.year, key);
          if (hit) {
            if (hit.poster_path) s.poster_url = posterFrom(hit.poster_path);
            if ((s.tmdb_rating == null || s.tmdb_rating === '') && typeof hit.vote_average === 'number') {
              s.tmdb_rating = (Math.round(hit.vote_average * 10) / 10).toString();
            }
          }
        } catch { /* noop */ }
      }));
    }
    setSuggestions(suggestions);
    setLoading(false);
  };

  const addToWatchlist = async (suggestion) => {
    setAddingId(suggestion.title);
    await base44.entities.MediaItem.create({
      title: suggestion.title,
      director: suggestion.director,
      year: suggestion.year,
      genre1: suggestion.genres?.[0] || '',
      genre2: suggestion.genres?.[1] || '',
      status: 'Pendiente',
      synopsis: suggestion.synopsis || '',
      poster_url: suggestion.poster_url || '',
    });
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey?.[0] === 'string' && q.queryKey[0].startsWith('media-items') });
    setAddingId(null);
    setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">El Oráculo</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg">
            La IA analiza tus {items.length} obras, tus gustos, tus aspectos favoritos y tu historial para sugerirte qué ver a continuación.
          </p>
        </div>
        <Button onClick={generateSuggestions} disabled={loading || items.length === 0} size="lg" className="gap-2">
          {loading ? (
            <><div className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> Consultando...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> {suggestions.length > 0 ? 'Regenerar' : 'Consultar al Oráculo'}</>
          )}
        </Button>
      </div>

      {/* Empty state */}
      {!loading && suggestions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">El Oráculo espera tu consulta</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Pulsa el botón para que la IA analice toda tu biblioteca y te recomiende 3 obras perfectas para ti.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="h-64 bg-muted" />
              <div className="p-5 space-y-3">
                <div className="flex gap-2"><div className="h-5 w-16 bg-muted rounded-full" /><div className="h-5 w-20 bg-muted rounded-full" /></div>
                <div className="h-24 bg-muted rounded-xl" />
                <div className="h-9 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {!loading && suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {suggestions.map((s, i) => (
            <SuggestionCard
              key={i}
              suggestion={s}
              onAdd={addToWatchlist}
              adding={addingId === s.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}