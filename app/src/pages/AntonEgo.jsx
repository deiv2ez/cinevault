import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { PenLine, Loader2, Star, Film, Search, Sparkles, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getTmdbKey, searchBest, fetchDetails, posterFrom } from '@/lib/tmdb';

// Perfil de voz de David — su alter-ego crítico "Anton Ego" escribe imitando esta sensibilidad.
const DAVID_VOICE = `Anton Ego es el alter-ego crítico de David: un cinéfilo pragmático, exigente pero nunca cínico, de voz sobria, terrenal y directa. Escribe en primera persona ("Yo..."), con criterio y sin palabrería. Le importa el cine como oficio: valora la buena ejecución técnica (guion, dirección, interpretación, montaje, atmósfera), el ritmo bien medido y los desarrollos a fuego lento por encima del espectáculo vacío. Da mucho peso a la LÓGICA y la COHERENCIA: premia que los personajes tomen decisiones con sentido y evolucionen de forma creíble, y castiga las conveniencias de guion, los agujeros y las decisiones ilógicas. Aprecia la profundidad y el trasfondo, pero NO todas sus críticas giran sobre la moral o el sentido de la vida: equilibra el fondo con lo tangible. Su nota (0-10) es coherente con su carácter: generoso con lo honesto y bien hecho, severo con lo perezoso o tramposo.`;

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export default function AntonEgo() {
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [film, setFilm] = useState(null);   // metadatos TMDB / entrada
  const [result, setResult] = useState(null); // { nota, critica }
  const [libMatch, setLibMatch] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ['media-items-all'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  // Perfil de gusto compacto que se recalcula con tu biblioteca (no envía las +700 obras).
  const profile = useMemo(() => {
    const rated = items.filter(i => i.rating != null);
    const avg = rated.length ? (rated.reduce((s, i) => s + Number(i.rating), 0) / rated.length) : 0;

    // Directores por frecuencia + nota media
    const dirMap = {};
    rated.forEach(i => {
      if (!i.director) return;
      (dirMap[i.director] = dirMap[i.director] || []).push(Number(i.rating));
    });
    const topDirectors = Object.entries(dirMap)
      .filter(([, r]) => r.length >= 2)
      .map(([d, r]) => ({ d, n: r.length, avg: r.reduce((a, b) => a + b, 0) / r.length }))
      .sort((a, b) => b.n - a.n || b.avg - a.avg)
      .slice(0, 12);

    // Géneros
    const genreMap = {};
    items.forEach(i => {
      [i.genre1, i.genre2].forEach(g => { if (g) genreMap[g] = (genreMap[g] || 0) + 1; });
    });
    const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);

    // Muestras de voz: sus reseñas reales (prioriza notas extremas y comentarios con sustancia)
    const withComments = rated
      .filter(i => (i.comments || '').trim().length > 30)
      .sort((a, b) => Math.abs(Number(b.rating) - avg) - Math.abs(Number(a.rating) - avg))
      .slice(0, 16)
      .map(i => `"${i.title}" (${Number(i.rating).toFixed(1)}/10): ${(i.comments || '').trim().slice(0, 320)}`);

    const quotes = items
      .filter(i => (i.favorite_quote || '').trim())
      .slice(0, 8)
      .map(i => `— «${i.favorite_quote.trim()}» (de ${i.title})`);

    return { count: items.length, avg, topDirectors, topGenres, withComments, quotes };
  }, [items]);

  const buildProfileText = () => {
    const dirs = profile.topDirectors.map(d => `${d.d} (${d.n} obras, media ${d.avg.toFixed(1)})`).join('; ');
    return `${DAVID_VOICE}

Contexto del gusto real de David (${profile.count} obras, nota media ${profile.avg.toFixed(1)}):
Directores recurrentes: ${dirs || 'n/d'}
Géneros más presentes: ${profile.topGenres.join(', ') || 'n/d'}

Muestras de sus reseñas reales (imita este tono, vocabulario y nivel de exigencia):
${profile.withComments.join('\n') || 'n/d'}

Frases que ha marcado como favoritas:
${profile.quotes.join('\n') || 'n/d'}`;
  };

  const generate = async () => {
    if (!title.trim()) { toast.error('Escribe el título de una película.'); return; }
    setLoading(true);
    setResult(null);
    setFilm(null);
    setLibMatch(null);

    // 1) Metadatos reales de TMDB (si hay clave)
    const key = getTmdbKey();
    let meta = { title: title.trim(), year: year ? parseInt(year) : null, director: '', poster_url: '', synopsis: '', genres: [] };
    if (key) {
      try {
        const hit = await searchBest(title.trim(), year ? parseInt(year) : undefined, key);
        if (hit) {
          meta.title = hit.title || meta.title;
          meta.year = hit.release_date ? parseInt(hit.release_date.slice(0, 4)) : meta.year;
          meta.poster_url = posterFrom(hit.poster_path);
          meta.synopsis = hit.overview || '';
          const det = await fetchDetails(hit.id, key);
          if (det) {
            meta.director = det.director || '';
            meta.genres = det.genres || [];
            if (!meta.synopsis) meta.synopsis = det.synopsis || '';
          }
        }
      } catch { /* seguimos sin TMDB */ }
    }
    setFilm(meta);

    // ¿La tengo ya vista/valorada?
    const match = items.find(i => norm(i.title) === norm(meta.title) && i.rating != null);
    setLibMatch(match || null);

    // 2) Anton Ego escribe la crítica
    const prompt = `${buildProfileText()}

Ahora, como Anton Ego (alter-ego de David), escribe una crítica ANTICIPADA de esta película, tanto si David la ha visto como si no. El objetivo es que sea una primera aproximación fiel a lo que él sentiría.

Película: "${meta.title}"${meta.year ? ` (${meta.year})` : ''}${meta.director ? `, dirigida por ${meta.director}` : ''}.
${meta.genres.length ? `Géneros: ${meta.genres.join(', ')}.` : ''}
${meta.synopsis ? `Sinopsis: ${meta.synopsis}` : ''}

Directrices de estilo (síguelas al escribir la crítica):
- Equilibrio: mezcla el análisis del mensaje/tema con aspectos tangibles y técnicos (guion, dirección, interpretaciones, ritmo, montaje, atmósfera). No te quedes solo en lo temático.
- Lógica y coherencia: da mucho peso a si los personajes toman decisiones con sentido y tienen una progresión creíble. Señala y castiga las conveniencias de guion, los agujeros y las decisiones ilógicas.
- Ritmo y ejecución: valora positivamente la buena ejecución técnica y los desarrollos a fuego lento (slow-burn) frente al espectáculo vacío.
- Tono: pragmático, exigente y sobrio, pero terrenal y directo. Puede haber profundidad, pero NO toda la crítica debe girar sobre la moral o el sentido de la vida; evita el exceso filosófico y el moralismo.

Escribe:
1. "critica": 2 o 3 párrafos en primera persona, con la voz de David/Anton Ego. NO empieces con "Como Anton Ego"; escribe directamente como si fuera él.
2. "nota": un número del 0 al 10 (permite un decimal) coherente con esa crítica y con su carácter.

Responde SOLO con JSON válido.`;

    try {
      const data = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            nota: { type: 'number' },
            critica: { type: 'string' },
          },
        },
      });
      if (data && (data.critica || data.nota != null)) {
        setResult({ nota: data.nota, critica: data.critica || '' });
      } else {
        toast.error('La IA no devolvió una crítica. Inténtalo de nuevo.');
      }
    } catch {
      toast.error('No se pudo generar la crítica. Revisa la configuración de IA.');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <PenLine className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Anton Ego</h1>
            <p className="text-sm text-muted-foreground">Tu alter-ego crítico escribe por ti — la hayas visto o no</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Título de la película..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && generate()}
              className="pl-9"
            />
          </div>
          <Input
            placeholder="Año (opcional)"
            value={year}
            onChange={e => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
            className="w-full sm:w-36"
          />
          <Button onClick={generate} disabled={loading} className="gap-2 bg-violet-500 hover:bg-violet-600 text-white">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Escribiendo...</>
              : <><PenLine className="w-4 h-4" /> Generar Mi Crítica</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Anton Ego aprende de tus {profile.count} obras y de tus reseñas reales para darte Mi Nota y Mi Crítica como primera aproximación antes de verla.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-violet-500/50 animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Anton Ego está afilando la pluma...</p>
        </div>
      )}

      {!loading && result && film && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Ficha */}
          <div className="flex gap-5 bg-card border border-border rounded-2xl p-5">
            <div className="w-24 h-36 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {film.poster_url ? (
                <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h2 className="text-xl font-bold text-foreground leading-tight">{film.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {[film.director, film.year].filter(Boolean).join(' · ') || '—'}
              </p>
              {film.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {film.genres.slice(0, 4).map(g => <Badge key={g} variant="secondary" className="text-[11px]">{g}</Badge>)}
                </div>
              )}
              <div className="mt-auto pt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-violet-500 leading-none">
                      {result.nota != null ? Number(result.nota).toFixed(1) : '—'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide">Mi Nota</p>
                    <p className="text-[11px] text-muted-foreground">por Anton Ego</p>
                  </div>
                </div>
                {libMatch && (
                  <div className="flex items-center gap-1.5 text-sm border-l border-border pl-4">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="font-bold text-foreground">{Number(libMatch.rating).toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">tu nota real</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Crítica */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5" /> Mi Crítica
            </p>
            <div className="text-[15px] text-foreground/90 leading-relaxed space-y-3 whitespace-pre-wrap">
              {result.critica}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerar
          </Button>
        </motion.div>
      )}

      {!loading && !result && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/5 border border-violet-500/20 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-violet-500/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Consulta a tu alter-ego</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Escribe cualquier película y Anton Ego escribirá la crítica que tú escribirías, con tu nota estimada. Ideal antes de decidir si verla.
          </p>
        </div>
      )}
    </div>
  );
}
