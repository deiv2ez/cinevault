import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { PenLine, Loader2, Star, Film, Search, Sparkles, Users, RefreshCw, FlaskConical, TrendingDown, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getTmdbKey, searchBest, fetchDetails, posterFrom } from '@/lib/tmdb';

// Voz del alter-ego crítico. Sobria, exigente, profunda pero no excesiva.
const CRITIC_VOICE = `Anton Ego es el alter-ego crítico del espectador: un cinéfilo pragmático, exigente pero nunca cínico, de voz sobria, terrenal y directa. Escribe en primera persona ("Yo..."), con criterio y sin palabrería. Le importa el cine como oficio: valora la buena ejecución técnica (guion, dirección, interpretación, montaje, atmósfera), el ritmo bien medido y los desarrollos a fuego lento por encima del espectáculo vacío. Da mucho peso a la LÓGICA y la COHERENCIA: premia que los personajes tomen decisiones con sentido y evolucionen de forma creíble, y castiga las conveniencias de guion, los agujeros y las decisiones ilógicas. Aprecia la profundidad, pero NO todas sus críticas giran sobre la moral o el sentido de la vida: equilibra el fondo con lo tangible. NO usa ningún nombre propio.`;

// Directrices de valoración aprendidas del backtesting.
const WEIGHT_RULES = `Ajuste de pesos (aprendido de errores pasados): NO te dejes llevar por el prestigio del director, el espectáculo visual ni la intensidad emocional. Esos elementos, por sí solos, NO suben la nota. Antes de valorar alto, comprueba: ¿el ritmo se sostiene o hay relleno?, ¿las decisiones de los personajes tienen lógica o son conveniencias de guion?, ¿la ambición se traduce en una película coherente o en un ejercicio de estilo hueco? Si detectas ritmo irregular, incoherencias o vacío bajo la superficie, BAJA la nota aunque la obra sea prestigiosa o espectacular. Sé analíticamente preciso, no complaciente.`;

const PRESTIGE = ['nolan', 'tarantino', 'fincher', 'villeneuve', 'spielberg', 'scorsese', 'kubrick', 'aronofsky', 'coen', 'inarritu', 'del toro', 'bong', 'ridley scott', 'cameron', 'coppola', 'chazelle', 'gerwig', 'park chan', 'malick', 'aster', 'eggers', 'refn', 'mendes', 'jackson', 'iñarritu'];

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const isPrestige = (dir) => { const d = norm(dir); return d && PRESTIGE.some(p => d.includes(p)); };

// Ejemplos que David pidió incluir en el backtesting (se buscan en su biblioteca).
const BACKTEST_SEEDS = [
  { key: 'oppenheimer', match: (t) => t === 'oppenheimer' },
  { key: 'odiosos', match: (t) => t.includes('odiosos ocho') || t.includes('hateful') },
  { key: 'seven', match: (t) => t === 'seven' || t === 'se7en' || t.includes('se7en') },
];

export default function AntonEgo() {
  const [mode, setMode] = useState('predict');

  // Predict
  const [title, setTitle] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [film, setFilm] = useState(null);
  const [result, setResult] = useState(null);
  const [libMatch, setLibMatch] = useState(null);

  // Backtest
  const [btRunning, setBtRunning] = useState(false);
  const [btProgress, setBtProgress] = useState(null);
  const [btResults, setBtResults] = useState([]);

  const { data: items = [] } = useQuery({
    queryKey: ['media-items-all'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const seen = useMemo(() => items.filter(i => i.rating != null && i.status !== 'Pendiente'), [items]);

  // Perfil de gusto compacto (no envía las +700 obras).
  const profile = useMemo(() => {
    const rated = items.filter(i => i.rating != null);
    const avg = rated.length ? (rated.reduce((s, i) => s + Number(i.rating), 0) / rated.length) : 0;
    const dirMap = {};
    rated.forEach(i => { if (i.director) (dirMap[i.director] = dirMap[i.director] || []).push(Number(i.rating)); });
    const topDirectors = Object.entries(dirMap).filter(([, r]) => r.length >= 2)
      .map(([d, r]) => ({ d, n: r.length, avg: r.reduce((a, b) => a + b, 0) / r.length }))
      .sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 12);
    const genreMap = {};
    items.forEach(i => [i.genre1, i.genre2].forEach(g => { if (g) genreMap[g] = (genreMap[g] || 0) + 1; }));
    const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);
    const withComments = rated.filter(i => (i.comments || '').trim().length > 30)
      .sort((a, b) => Math.abs(Number(b.rating) - avg) - Math.abs(Number(a.rating) - avg))
      .slice(0, 14).map(i => `"${i.title}" (${Number(i.rating).toFixed(1)}/10): ${(i.comments || '').trim().slice(0, 300)}`);
    return { count: items.length, avg, topDirectors, topGenres, withComments };
  }, [items]);

  // Casos de calibración: falsos positivos reales (prestigio/espectáculo alto pero él la puntuó bajo).
  const misses = useMemo(() => {
    return seen.map(i => {
      const tm = (i.tmdb_rating != null && Number(i.tmdb_rating) > 0) ? Number(i.tmdb_rating) : null;
      const prestige = isPrestige(i.director);
      const expected = tm != null ? tm : (prestige ? 7.8 : null);
      if (expected == null) return null;
      const gap = expected - Number(i.rating);
      return { title: i.title, year: i.year, rating: Number(i.rating), expected, gap, comments: (i.comments || '').trim(), norm: norm(i.title) };
    }).filter(Boolean)
      .filter(m => m.gap >= 1.2 && m.rating <= 7 && m.comments)
      .sort((a, b) => b.gap - a.gap);
  }, [seen]);

  const buildCalibration = (excludeNorm) => {
    const top = misses.filter(m => m.norm !== excludeNorm).slice(0, 8);
    if (!top.length) return '';
    return `${WEIGHT_RULES}

CASOS DE CALIBRACIÓN (tus falsos positivos reales — un crítico ingenuo habría puntuado alto por prestigio/espectáculo, pero tu nota real fue baja). Aprende de ellos y aplica el mismo criterio:
${top.map(m => `- "${m.title}"${m.year ? ` (${m.year})` : ''}: expectativa del público/prestigio ~${m.expected.toFixed(1)}, tu nota real ${m.rating.toFixed(1)}. Tu razón: "${m.comments.slice(0, 200)}"`).join('\n')}`;
  };

  const buildProfileText = () => {
    const dirs = profile.topDirectors.map(d => `${d.d} (${d.n} obras, media ${d.avg.toFixed(1)})`).join('; ');
    return `${CRITIC_VOICE}

Contexto del gusto real del espectador (${profile.count} obras, nota media ${profile.avg.toFixed(1)}):
Directores recurrentes: ${dirs || 'n/d'}
Géneros más presentes: ${profile.topGenres.join(', ') || 'n/d'}

Muestras de sus reseñas reales (imita este tono, vocabulario y exigencia):
${profile.withComments.join('\n') || 'n/d'}`;
  };

  const STYLE_RULES = `Directrices de estilo (mantenlas SIEMPRE):
- Equilibrio: mezcla el análisis del mensaje/tema con lo tangible y técnico (guion, dirección, interpretaciones, ritmo, montaje, atmósfera).
- Lógica y coherencia: da mucho peso a si los personajes deciden con sentido y progresan de forma creíble; castiga conveniencias de guion, agujeros y decisiones ilógicas.
- Ritmo y ejecución: premia la buena ejecución y el slow-burn frente al espectáculo vacío.
- Tono: pragmático, exigente y sobrio, pero terrenal y directo. Profundo pero NO excesivo; nada de moralismo ni exceso filosófico.`;

  // Motor: predice nota (+ crítica o motivo) de una película con la voz calibrada.
  const antonPredict = async (meta, { quick }) => {
    const cal = buildCalibration(norm(meta.title));
    const base = `${buildProfileText()}

${cal || WEIGHT_RULES}

${STYLE_RULES}

Película: "${meta.title}"${meta.year ? ` (${meta.year})` : ''}${meta.director ? `, dirigida por ${meta.director}` : ''}.
${meta.genres?.length ? `Géneros: ${meta.genres.join(', ')}.` : ''}
${meta.synopsis ? `Sinopsis: ${meta.synopsis}` : ''}`;

    if (quick) {
      const prompt = `${base}

Como Anton Ego (criterio ya calibrado a los gustos reales del espectador), estima la NOTA (0-10, un decimal) que él le pondría y explica en UNA sola frase el motivo clave. Responde SOLO JSON: { "nota": number, "motivo": string }`;
      return base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: { type: 'object', properties: { nota: { type: 'number' }, motivo: { type: 'string' } } },
      });
    }
    const prompt = `${base}

Escribe, como Anton Ego (NO empieces con "Como Anton Ego"; escribe directamente como si fueras él):
1. "critica": 2 o 3 párrafos en primera persona.
2. "nota": número del 0 al 10 (un decimal), coherente con la crítica y con el criterio calibrado.
Responde SOLO JSON válido.`;
    return base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: { type: 'object', properties: { nota: { type: 'number' }, critica: { type: 'string' } } },
    });
  };

  const generate = async () => {
    if (!title.trim()) { toast.error('Escribe el título de una película.'); return; }
    setLoading(true); setResult(null); setFilm(null); setLibMatch(null);

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
          if (det) { meta.director = det.director || ''; meta.genres = det.genres || []; if (!meta.synopsis) meta.synopsis = det.synopsis || ''; }
        }
      } catch { /* sin TMDB */ }
    }
    setFilm(meta);
    const match = items.find(i => norm(i.title) === norm(meta.title) && i.rating != null);
    setLibMatch(match || null);

    try {
      const data = await antonPredict(meta, { quick: false });
      if (data && (data.critica || data.nota != null)) setResult({ nota: data.nota, critica: data.critica || '' });
      else toast.error('La IA no devolvió una crítica. Inténtalo de nuevo.');
    } catch { toast.error('No se pudo generar la crítica. Revisa la configuración de IA.'); }
    setLoading(false);
  };

  // Selecciona el set de backtesting: los ejemplos pedidos + falsos positivos detectados.
  const buildBacktestSet = () => {
    const chosen = [];
    const usedIds = new Set();
    // Semillas pedidas por David
    BACKTEST_SEEDS.forEach(seed => {
      const found = seen.find(i => seed.match(norm(i.title)));
      if (found && !usedIds.has(found.id)) { chosen.push(found); usedIds.add(found.id); }
    });
    // Falsos positivos automáticos (prestigio/público alto, nota real baja)
    const autos = misses
      .map(m => seen.find(i => i.id && norm(i.title) === m.norm))
      .filter(Boolean)
      .filter(i => !usedIds.has(i.id));
    for (const it of autos) {
      if (chosen.length >= 8) break;
      chosen.push(it); usedIds.add(it.id);
    }
    return chosen.slice(0, 8);
  };

  const runBacktest = async () => {
    const set = buildBacktestSet();
    if (!set.length) { toast.error('No encuentro obras con alto Delta en tu biblioteca todavía.'); return; }
    setBtRunning(true); setBtResults([]); setBtProgress({ done: 0, total: set.length });
    const out = [];
    for (let idx = 0; idx < set.length; idx++) {
      const it = set[idx];
      const meta = { title: it.title, year: it.year, director: it.director, genres: [it.genre1, it.genre2].filter(Boolean), synopsis: it.synopsis, poster_url: it.poster_url };
      let predicted = null, motivo = '';
      try {
        const data = await antonPredict(meta, { quick: true });
        if (data) { predicted = typeof data.nota === 'number' ? data.nota : parseFloat(data.nota); motivo = data.motivo || ''; }
      } catch { /* deja null */ }
      out.push({ item: it, predicted, real: Number(it.rating), delta: predicted != null ? predicted - Number(it.rating) : null, motivo });
      setBtProgress({ done: idx + 1, total: set.length });
      setBtResults([...out]);
    }
    setBtRunning(false);
  };

  const mae = useMemo(() => {
    const valid = btResults.filter(r => r.delta != null);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + Math.abs(r.delta), 0) / valid.length;
  }, [btResults]);

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

      {/* Modo */}
      <div className="flex gap-1.5">
        {[{ k: 'predict', l: 'Predecir', icon: PenLine }, { k: 'backtest', l: 'Backtesting', icon: FlaskConical }].map(t => (
          <button key={t.k} onClick={() => setMode(t.k)}
            className={cn('flex items-center gap-1.5 text-sm px-3.5 py-1.5 rounded-lg border transition-all',
              mode === t.k ? 'bg-violet-500 text-white border-violet-500' : 'bg-card text-muted-foreground border-border hover:border-violet-500/40')}>
            <t.icon className="w-3.5 h-3.5" /> {t.l}
          </button>
        ))}
      </div>

      {mode === 'predict' && (
        <>
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Título de la película..." value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && generate()} className="pl-9" />
              </div>
              <Input placeholder="Año (opcional)" value={year}
                onChange={e => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} className="w-full sm:w-36" />
              <Button onClick={generate} disabled={loading} className="gap-2 bg-violet-500 hover:bg-violet-600 text-white">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Escribiendo...</> : <><PenLine className="w-4 h-4" /> Generar Mi Crítica</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Predice tu nota y crítica antes de verla. Criterio calibrado con {misses.length} casos de tus valoraciones reales.
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

              <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
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
                Escribe cualquier película y Anton Ego predecirá tu nota y crítica. Ideal para decidir si verla antes de ir al cine.
              </p>
            </div>
          )}
        </>
      )}

      {mode === 'backtest' && (
        <>
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-[18px] h-[18px] text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Backtesting del modelo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Anton predice tu nota en obras que YA has visto y donde el modelo ingenuo (prestigio, espectáculo, intensidad) tiende a fallar. Cruza su predicción con tu nota real para medir el desvío (Delta) y afinar el criterio.
                </p>
              </div>
            </div>
            <Button onClick={runBacktest} disabled={btRunning} className="gap-2 bg-violet-500 hover:bg-violet-600 text-white">
              {btRunning
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulando… {btProgress ? `${btProgress.done}/${btProgress.total}` : ''}</>
                : <><FlaskConical className="w-4 h-4" /> Ejecutar backtesting</>}
            </Button>
          </div>

          {mae != null && !btRunning && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-2xl font-bold text-foreground">{mae.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">desvío medio (pts)</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-2xl font-bold text-foreground">{btResults.filter(r => r.delta != null && Math.abs(r.delta) <= 1).length}/{btResults.filter(r => r.delta != null).length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">aciertos (±1 pt)</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-2xl font-bold text-foreground">{btResults.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">obras simuladas</p>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {btResults.map((r, i) => {
              const over = r.delta != null && r.delta > 0; // Anton predijo por encima de tu nota real
              return (
                <div key={r.item.id || i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <div className="w-10 h-[60px] rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {r.item.poster_url ? <img src={r.item.poster_url} alt={r.item.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-muted-foreground/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{[r.item.director, r.item.year].filter(Boolean).join(' · ')}</p>
                    {r.motivo && <p className="text-[11px] text-muted-foreground/90 mt-1 line-clamp-2 italic">{r.motivo}</p>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-center">
                    <div>
                      <p className="text-sm font-bold text-violet-500 leading-none">{r.predicted != null ? Number(r.predicted).toFixed(1) : '—'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Anton</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground leading-none">{r.real.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">real</p>
                    </div>
                    {r.delta != null && (
                      <Badge className={cn('flex items-center gap-0.5 border-0 text-xs font-bold',
                        Math.abs(r.delta) <= 1 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600')}>
                        {over && <TrendingDown className="w-3 h-3" />}
                        Δ {r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {!btRunning && btResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-violet-500/5 border border-violet-500/20 flex items-center justify-center mb-6">
                <FlaskConical className="w-10 h-10 text-violet-500/40" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Afina el criterio de Anton</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ejecuta el backtesting para ver dónde el modelo ingenuo sobrevaloraría (prestigio, espectáculo) frente a tu nota real, y cómo el criterio calibrado se acerca a ti.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
