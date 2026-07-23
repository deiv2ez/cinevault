import React, { useMemo, useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Fingerprint, RefreshCw, Loader2 } from 'lucide-react';
import { canonGenre } from '@/lib/genres';

// Resumen del estilo del espectador: unos datos (géneros, directores, nota, década)
// + un retrato BREVE generado por IA (cacheado en localStorage, no en cada carga).
const CACHE_KEY = 'taste_summary_blurb';

export default function TasteSummary({ items }) {
  const [blurb, setBlurb] = useState(() => {
    try { const s = localStorage.getItem(CACHE_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [loadingBlurb, setLoadingBlurb] = useState(false);
  const triedRef = useRef(false);

  const d = useMemo(() => {
    const rated = items.filter(i => i.rating != null);
    const avg = rated.length ? rated.reduce((s, i) => s + Number(i.rating), 0) / rated.length : 0;

    const gCount = {};
    items.forEach(i => [i.genre1, i.genre2].forEach(g => { if (g) { const cg = canonGenre(g); gCount[cg] = (gCount[cg] || 0) + 1; } }));
    const topGenres = Object.entries(gCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g);

    const dMap = {};
    rated.forEach(i => { if (i.director) (dMap[i.director] = dMap[i.director] || []).push(Number(i.rating)); });
    const topDirectors = Object.entries(dMap)
      .filter(([, r]) => r.length >= 2)
      .map(([name, r]) => ({ name, n: r.length, avg: r.reduce((a, b) => a + b, 0) / r.length }))
      .sort((a, b) => b.n - a.n).slice(0, 4);

    const decCount = {};
    items.forEach(i => { if (i.year) { const dec = Math.floor(i.year / 10) * 10; decCount[dec] = (decCount[dec] || 0) + 1; } });
    const topDecadeEntry = Object.entries(decCount).sort((a, b) => b[1] - a[1])[0];
    const topDecade = topDecadeEntry ? `${topDecadeEntry[0]}s` : null;

    // Muestras de reseñas reales para dar color al retrato IA
    const samples = rated
      .filter(i => (i.comments || '').trim().length > 30)
      .sort((a, b) => Math.abs(Number(b.rating) - avg) - Math.abs(Number(a.rating) - avg))
      .slice(0, 8)
      .map(i => `"${i.title}" (${Number(i.rating).toFixed(1)}): ${(i.comments || '').trim().slice(0, 160)}`);

    return { avg, topGenres, topDirectors, topDecade, ratedCount: rated.length, samples, count: items.length };
  }, [items]);

  const generateBlurb = async () => {
    if (loadingBlurb || d.count === 0) return;
    setLoadingBlurb(true);
    const prompt = `Eres un analista de cine. A partir de estos datos de la biblioteca de un espectador, escribe un RETRATO de su gusto cinematográfico: qué tipo de cine le atrae, qué estilo, qué directores, qué parece valorar en una película, sus tendencias como espectador y qué dice todo eso de él. Extensión: entre 180 y 250 palabras, en 2-3 párrafos. Puede tener algo de profundidad y carácter, pero SIN la densidad filosófica ni la solemnidad de un manifiesto existencial: cercano, con criterio, concreto y apoyado en sus datos. Escribe en segunda persona ("Te atrae...", "Buscas...", "Valoras...") y NO uses ningún nombre propio.

Datos:
- Géneros más presentes: ${d.topGenres.join(', ') || 'n/d'}
- Directores recurrentes: ${d.topDirectors.map(x => `${x.name} (${x.n} obras, media ${x.avg.toFixed(1)})`).join(', ') || 'n/d'}
- Nota media: ${d.avg.toFixed(1)} sobre 10
- Década dominante: ${d.topDecade || 'n/d'}
- Muestras de sus reseñas reales: ${d.samples.join(' | ') || 'n/d'}

Responde SOLO con JSON válido: { "retrato": "..." }`;
    try {
      const data = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: { type: 'object', properties: { retrato: { type: 'string' } } },
      });
      if (data?.retrato) {
        const payload = { text: data.retrato, count: d.count };
        setBlurb(payload);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch { /* noop */ }
      }
    } catch { /* deja el fallback data-driven */ }
    setLoadingBlurb(false);
  };

  // Autogenera una vez cuando hay datos y no hay caché (o la biblioteca cambió mucho).
  useEffect(() => {
    if (triedRef.current) return;
    if (d.count === 0) return;
    const stale = !blurb || Math.abs((blurb.count || 0) - d.count) > 25;
    if (stale) { triedRef.current = true; generateBlurb(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.count]);

  const genreText = d.topGenres.length
    ? (d.topGenres.length === 1
        ? d.topGenres[0]
        : `${d.topGenres.slice(0, -1).join(', ')} y ${d.topGenres[d.topGenres.length - 1]}`)
    : null;

  const ratingTone = d.avg >= 7.5 ? 'te entregas a lo que te gana' : d.avg >= 6.5 ? 'repartes con equilibrio' : 'eres de nota exigente';

  const directorText = d.topDirectors.length
    ? (d.topDirectors.length === 1
        ? d.topDirectors[0].name
        : `${d.topDirectors.slice(0, 2).map(x => x.name).join(', ')}${d.topDirectors.length > 2 ? ' y ' + d.topDirectors[2].name : ''}`)
    : null;

  return (
    <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Fingerprint className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Tu estilo, de un vistazo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Lo que tus {d.count} obras dicen de ti</p>
        </div>
        <button
          onClick={() => { triedRef.current = true; generateBlurb(); }}
          disabled={loadingBlurb}
          title="Regenerar retrato"
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          {loadingBlurb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Retrato IA (o fallback data-driven completo mientras carga / si falla) */}
      {blurb?.text ? (
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line space-y-2">{blurb.text}</div>
      ) : loadingBlurb ? (
        <p className="text-sm text-muted-foreground leading-relaxed italic">Analizando tu gusto…</p>
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed">
          {genreText
            ? <>Te mueves sobre todo en <span className="font-semibold text-foreground">{genreText}</span>.</>
            : <>Tu biblioteca aún está tomando forma.</>}
          {directorText && <> Vuelves una y otra vez a <span className="font-semibold text-foreground">{directorText}</span>.</>}
          {d.ratedCount > 0 && <> Puntúas con criterio —media <span className="font-semibold text-foreground">{d.avg.toFixed(1)}</span>—: {ratingTone}.</>}
          {d.topDecade && <> Tu época más presente es la de los <span className="font-semibold text-foreground">{d.topDecade}</span>.</>}
        </p>
      )}

      {/* Chips de géneros y directores */}
      {(d.topGenres.length > 0 || d.topDirectors.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {d.topGenres.map(g => (
            <span key={g} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{g}</span>
          ))}
          {d.topDirectors.slice(0, 3).map(dir => (
            <span key={dir.name} className="text-[11px] px-2.5 py-1 rounded-full bg-card text-muted-foreground border border-border">
              {dir.name} · {dir.n}
            </span>
          ))}
          {d.topDecade && (
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-card text-muted-foreground border border-border">{d.topDecade}</span>
          )}
        </div>
      )}
    </div>
  );
}
