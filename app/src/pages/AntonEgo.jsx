import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { PenLine, Loader2, Star, Film, Search, Sparkles, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { getTmdbKey, fetchDetails, posterFrom } from '@/lib/tmdb';
import { canonGenre } from '@/lib/genres';

// Voz del alter-ego crítico. Sobria, exigente, profunda pero no excesiva.
const CRITIC_VOICE = `Anton Ego es el alter-ego crítico del espectador: un cinéfilo pragmático, exigente pero nunca cínico, de voz sobria, terrenal y directa. Escribe en primera persona ("Yo..."), con criterio y sin palabrería. Le importa el cine como oficio: valora la buena ejecución técnica (guion, dirección, interpretación, montaje, atmósfera), el ritmo bien medido y los desarrollos a fuego lento por encima del espectáculo vacío. Da mucho peso a la LÓGICA y la COHERENCIA: premia que los personajes tomen decisiones con sentido y evolucionen de forma creíble, y castiga las conveniencias de guion, los agujeros y las decisiones ilógicas. Aprecia la profundidad, pero NO todas sus críticas giran sobre la moral o el sentido de la vida: equilibra el fondo con lo tangible. NO usa ningún nombre propio.`;

// Ajuste de pesos aprendido internamente (backtesting silencioso de sus falsos positivos).
const WEIGHT_RULES = `Ajuste de pesos (aprendido de sus errores y de su gusto real):
- NO subas la nota por el mero prestigio del director ni por la intensidad emocional.
- MATIZ IMPORTANTE sobre el espectáculo: el espectáculo y la acción BIEN EJECUTADOS (con oficio, tensión real, acción práctica y coherencia) SÍ le encantan y suben la nota (ejemplo: le fascina "Top Gun: Maverick"). Lo que penaliza es el espectáculo VACÍO, sin oficio ni coherencia.
- Penaliza con dureza la PRETENCIOSIDAD estética sin sustancia y el metraje inflado: la belleza visual o la "trascendencia" NO rescatan una película si el ritmo es imposible y hay relleno (ejemplo: "El árbol de la vida" le parece preciosa pero pesadísima e inflada).
- Antes de valorar alto comprueba: ¿el ritmo se sostiene o hay relleno?, ¿las decisiones de los personajes tienen lógica o son conveniencias de guion?, ¿pasan cosas o "pasa poco"?, ¿la ambición cuaja en una película coherente o es un ejercicio de estilo hueco? Si falla algo de esto, BAJA la nota aunque la obra sea prestigiosa, espectacular o "profunda". Sé analíticamente preciso, no complaciente.`;

// Señales de gusto declaradas por el espectador (mini-test). Se amplía de cuando en cuando.
const TASTE_SIGNALS = `Señales de gusto declaradas por el espectador (úsalas para afinar la predicción):
- "El árbol de la vida" (Malick): admira su estética y sus planos, pero la considera pretenciosa, inflada e "imposible de ver sin saltártela"; le sirve de "detector de soplapollas cinéfilos". → castiga la pretenciosidad vacía y el ritmo imposible aunque haya belleza.
- "Top Gun: Maverick": le encanta ("así es como se rueda una película de acción"). → premia el espectáculo y la acción BIEN EJECUTADOS.
- "Hereditary": no le gustó; en general el terror no es lo suyo salvo excepciones. Le molesta el guion mediocre, que "pase poco" y los sustos sin sentido; en cambio valora la estética y los finales potentes (le gustó la estética y el final de "Midsommar"). → con el terror, exige guion sólido, ritmo y estética; penaliza el susto gratuito.`;

const STYLE_RULES = `Directrices de estilo (mantenlas SIEMPRE):
- Equilibrio: mezcla el análisis del mensaje/tema con lo tangible y técnico (guion, dirección, interpretaciones, ritmo, montaje, atmósfera).
- Lógica y coherencia: da mucho peso a si los personajes deciden con sentido y progresan de forma creíble; castiga conveniencias de guion, agujeros y decisiones ilógicas.
- Ritmo y ejecución: premia la buena ejecución y el slow-burn frente al espectáculo vacío.
- Tono: pragmático, exigente y sobrio, pero terrenal y directo. Profundo pero NO excesivo; nada de moralismo ni exceso filosófico.`;

const PRESTIGE = ['nolan', 'tarantino', 'fincher', 'villeneuve', 'spielberg', 'scorsese', 'kubrick', 'aronofsky', 'coen', 'inarritu', 'del toro', 'bong', 'ridley scott', 'cameron', 'coppola', 'chazelle', 'gerwig', 'park chan', 'malick', 'aster', 'eggers', 'refn', 'mendes', 'jackson'];
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const isPrestige = (dir) => { const d = norm(dir); return d && PRESTIGE.some(p => d.includes(p)); };

async function tmdbSearchList(query, key) {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=es-ES&include_adult=false`);
    const data = await res.json();
    return (data.results || []).slice(0, 6).map(r => ({
      tmdb_id: String(r.id),
      title: r.title || r.original_title || '',
      year: r.release_date ? parseInt(r.release_date.slice(0, 4)) : null,
      poster_url: r.poster_path ? posterFrom(r.poster_path, 'w92') : '',
    }));
  } catch { return []; }
}

export default function AntonEgo() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [film, setFilm] = useState(null);
  const [result, setResult] = useState(null);
  const [libMatch, setLibMatch] = useState(null);
  const debounceRef = useRef(null);

  const { data: items = [] } = useQuery({
    queryKey: ['media-items-all'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const seen = useMemo(() => items.filter(i => i.rating != null && i.status !== 'Pendiente'), [items]);

  const profile = useMemo(() => {
    const rated = items.filter(i => i.rating != null);
    const avg = rated.length ? (rated.reduce((s, i) => s + Number(i.rating), 0) / rated.length) : 0;
    const dirMap = {};
    rated.forEach(i => { if (i.director) (dirMap[i.director] = dirMap[i.director] || []).push(Number(i.rating)); });
    const topDirectors = Object.entries(dirMap).filter(([, r]) => r.length >= 2)
      .map(([d, r]) => ({ d, n: r.length, avg: r.reduce((a, b) => a + b, 0) / r.length }))
      .sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 12);
    const genreMap = {};
    items.forEach(i => [i.genre1, i.genre2].forEach(g => { if (g) { const cg = canonGenre(g); genreMap[cg] = (genreMap[cg] || 0) + 1; } }));
    const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);
    const withCommentsRaw = rated.filter(i => (i.comments || '').trim().length > 30)
      .sort((a, b) => Math.abs(Number(b.rating) - avg) - Math.abs(Number(a.rating) - avg))
      .slice(0, 24)
      .map(i => ({ norm: norm(i.title), text: `"${i.title}" (${Number(i.rating).toFixed(1)}/10): ${(i.comments || '').trim().slice(0, 300)}` }));

    // Exemplares extremos: lo que le encanta y lo que detesta
    const sorted = [...rated].sort((a, b) => b.rating - a.rating);
    const loves = sorted.slice(0, 10).map(i => `${i.title} (${Number(i.rating).toFixed(1)})`);
    const hates = sorted.filter(i => i.rating <= 4).slice(-10).map(i => `${i.title} (${Number(i.rating).toFixed(1)})`);

    // Termómetro de géneros (dónde es generoso / exigente)
    const gAvg = {};
    rated.forEach(i => [i.genre1, i.genre2].forEach(g => { if (g) { const cg = canonGenre(g); (gAvg[cg] = gAvg[cg] || []).push(Number(i.rating)); } }));
    const genreAvg = Object.entries(gAvg).filter(([, a]) => a.length >= 3)
      .map(([g, a]) => ({ g, avg: a.reduce((x, y) => x + y, 0) / a.length })).sort((a, b) => b.avg - a.avg);
    const generous = genreAvg.slice(0, 4).map(x => `${x.g} (${x.avg.toFixed(1)})`);
    const exigent = genreAvg.slice(-4).reverse().map(x => `${x.g} (${x.avg.toFixed(1)})`);

    const quotes = items.filter(i => (i.favorite_quote || '').trim()).slice(0, 5).map(i => `«${i.favorite_quote.trim().slice(0, 120)}»`);

    return { count: items.length, avg, topDirectors, topGenres, withCommentsRaw, loves, hates, generous, exigent, quotes };
  }, [items]);

  // Falsos positivos reales (calibración interna): aclamadas/prestigio que él puntuó bajo.
  const misses = useMemo(() => {
    return seen.map(i => {
      const tm = (i.tmdb_rating != null && Number(i.tmdb_rating) > 0) ? Number(i.tmdb_rating) : null;
      const expected = tm != null ? tm : (isPrestige(i.director) ? 7.8 : null);
      if (expected == null) return null;
      return { rating: Number(i.rating), expected, gap: expected - Number(i.rating), comments: (i.comments || '').trim(), norm: norm(i.title), title: i.title, year: i.year };
    }).filter(Boolean).filter(m => m.gap >= 1.2 && m.rating <= 7 && m.comments).sort((a, b) => b.gap - a.gap);
  }, [seen]);

  const buildCalibration = (excludeNorm) => {
    const top = misses.filter(m => m.norm !== excludeNorm).slice(0, 8);
    if (!top.length) return WEIGHT_RULES;
    return `${WEIGHT_RULES}

CASOS DE CALIBRACIÓN (tus falsos positivos reales — un crítico ingenuo habría puntuado alto por prestigio/espectáculo, pero tu nota real fue baja). Aprende de ellos y aplica el mismo criterio:
${top.map(m => `- "${m.title}"${m.year ? ` (${m.year})` : ''}: expectativa del público/prestigio ~${m.expected.toFixed(1)}, tu nota real ${m.rating.toFixed(1)}. Tu razón: "${m.comments.slice(0, 200)}"`).join('\n')}`;
  };

  const buildProfileText = (excludeNorm) => {
    const dirs = profile.topDirectors.map(d => `${d.d} (${d.n} obras, media ${d.avg.toFixed(1)})`).join('; ');
    const samples = profile.withCommentsRaw.filter(w => w.norm !== excludeNorm).slice(0, 16).map(w => w.text);
    return `${CRITIC_VOICE}

Contexto del gusto real del espectador (${profile.count} obras, nota media ${profile.avg.toFixed(1)}):
Directores recurrentes: ${dirs || 'n/d'}
Géneros más presentes: ${profile.topGenres.join(', ') || 'n/d'}
Géneros donde es GENEROSO (nota media alta): ${profile.generous.join(', ') || 'n/d'}
Géneros donde es EXIGENTE (nota media baja): ${profile.exigent.join(', ') || 'n/d'}
Obras que le ENCANTAN (nota alta): ${profile.loves.join(', ') || 'n/d'}
Obras que DETESTA (nota baja): ${profile.hates.join(', ') || 'n/d'}
Frases que ha guardado como favoritas: ${profile.quotes.join(' / ') || 'n/d'}

${TASTE_SIGNALS}

Muestras de sus reseñas reales (imita este tono, vocabulario y nivel de exigencia):
${samples.join('\n') || 'n/d'}`;
  };

  const runCritique = async (meta) => {
    setLoading(true); setResult(null); setFilm(meta);
    const match = items.find(i => norm(i.title) === norm(meta.title) && i.rating != null);
    setLibMatch(match || null);

    const ex = norm(meta.title);
    const prompt = `${buildProfileText(ex)}

${buildCalibration(ex)}

${STYLE_RULES}

Película: "${meta.title}"${meta.year ? ` (${meta.year})` : ''}${meta.director ? `, dirigida por ${meta.director}` : ''}.
${meta.genres?.length ? `Géneros: ${meta.genres.join(', ')}.` : ''}
${meta.synopsis ? `Sinopsis: ${meta.synopsis}` : ''}

Escribe, como Anton Ego (NO empieces con "Como Anton Ego"; escribe directamente como si fueras él):
1. "critica": 2 o 3 párrafos en primera persona.
2. "nota": número del 0 al 10 (un decimal), coherente con la crítica y con el criterio calibrado.
Responde SOLO JSON válido.`;

    try {
      const data = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: { type: 'object', properties: { nota: { type: 'number' }, critica: { type: 'string' } } },
      });
      if (data && (data.critica || data.nota != null)) setResult({ nota: data.nota, critica: data.critica || '' });
      else toast.error('La IA no devolvió una crítica. Inténtalo de nuevo.');
    } catch { toast.error('No se pudo generar la crítica (puede ser límite diario de la IA). Inténtalo más tarde.'); }
    setLoading(false);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim() || val.length < 2) { setResults([]); return; }
    const key = getTmdbKey();
    if (!key) return; // sin clave TMDB: se usa Enter para generar por título
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setResults(await tmdbSearchList(val, key));
      setSearching(false);
    }, 300);
  };

  const handleSelect = async (r) => {
    setResults([]);
    setQuery(r.title);
    const key = getTmdbKey();
    let meta = { title: r.title, year: r.year, director: '', genres: [], synopsis: '', poster_url: r.poster_url ? r.poster_url.replace('/w92', '/w500') : '' };
    setLoading(true); setFilm(meta); setResult(null);
    try {
      const det = await fetchDetails(r.tmdb_id, key);
      if (det) { meta = { ...meta, director: det.director || '', genres: det.genres || [], synopsis: det.synopsis || meta.synopsis, poster_url: det.poster_url || meta.poster_url }; }
    } catch { /* sigue con lo básico */ }
    await runCritique(meta);
  };

  const handleEnter = () => {
    if (!query.trim() || loading) return;
    setResults([]);
    runCritique({ title: query.trim(), year: null, director: '', genres: [], synopsis: '', poster_url: '' });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[900px] mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <PenLine className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Anton Ego</h1>
            <p className="text-sm text-muted-foreground">Tu alter-ego crítico, calibrado con tus gustos reales</p>
          </div>
        </div>
      </div>

      {/* Buscador TMDB con desplegable */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            placeholder="Busca una película... ej. Interstellar, Dune"
            value={query}
            onChange={handleInput}
            onKeyDown={e => e.key === 'Enter' && handleEnter()}
            className="pl-9 pr-9 h-11"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}

          {results.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {results.map((r, i) => (
                <button key={r.tmdb_id || i} onClick={() => handleSelect(r)}
                  className="flex items-center gap-3 p-2.5 hover:bg-muted/60 transition-colors text-left w-full border-b border-border last:border-0">
                  {r.poster_url ? <img src={r.poster_url} alt="" className="w-8 h-12 rounded object-cover flex-shrink-0" />
                    : <div className="w-8 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0"><Film className="w-4 h-4 text-muted-foreground/40" /></div>}
                  <p className="text-sm font-semibold truncate">
                    {r.title}{r.year ? <span className="font-normal text-muted-foreground ml-1">({r.year})</span> : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Elige la película del desplegable y Anton Ego predice tu nota y crítica. Criterio calibrado internamente con {misses.length} casos de tus valoraciones reales.
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
          <div className="flex gap-4 md:gap-5 bg-card border border-border rounded-2xl p-4 md:p-5">
            <div className="w-20 h-[120px] md:w-24 md:h-36 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {film.poster_url ? <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-muted-foreground/30" /></div>}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight">{film.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{[film.director, film.year].filter(Boolean).join(' · ') || '—'}</p>
              {film.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {film.genres.slice(0, 4).map(g => <Badge key={g} variant="secondary" className="text-[11px]">{g}</Badge>)}
                </div>
              )}
              <div className="mt-auto pt-3 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-violet-500 leading-none">{result.nota != null ? Number(result.nota).toFixed(1) : '—'}</span>
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

          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5" /> Mi Crítica
            </p>
            <div className="text-[15px] text-foreground/90 leading-relaxed space-y-3 whitespace-pre-wrap">{result.critica}</div>
          </div>

          <Button variant="outline" size="sm" onClick={() => runCritique(film)} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Regenerar
          </Button>
        </motion.div>
      )}

      {!loading && !result && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-violet-500/5 border border-violet-500/20 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-violet-500/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Consulta a tu alter-ego</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Busca cualquier película y Anton Ego predecirá tu nota y crítica. Ideal para decidir si verla antes de ir al cine.
          </p>
        </div>
      )}
    </div>
  );
}
