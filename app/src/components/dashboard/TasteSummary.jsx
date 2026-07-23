import React, { useMemo } from 'react';
import { Fingerprint, Star } from 'lucide-react';

// Resumen breve y terrenal del estilo de David: qué géneros/directores le van,
// cómo puntúa y qué revisita. Todo calculado de sus datos (sin IA, instantáneo).
export default function TasteSummary({ items }) {
  const d = useMemo(() => {
    const rated = items.filter(i => i.rating != null);
    const avg = rated.length ? rated.reduce((s, i) => s + Number(i.rating), 0) / rated.length : 0;

    const gCount = {};
    items.forEach(i => [i.genre1, i.genre2].forEach(g => { if (g) gCount[g] = (gCount[g] || 0) + 1; }));
    const topGenres = Object.entries(gCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);

    const dMap = {};
    rated.forEach(i => { if (i.director) (dMap[i.director] = dMap[i.director] || []).push(Number(i.rating)); });
    const topDirectors = Object.entries(dMap)
      .filter(([, r]) => r.length >= 2)
      .map(([name, r]) => ({ name, n: r.length }))
      .sort((a, b) => b.n - a.n).slice(0, 3);

    const rewatched = items.filter(i => i.status === 'Visto muchas veces');
    const rewatchTop = [...rewatched]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3).map(i => i.title);

    const decCount = {};
    items.forEach(i => { if (i.year) { const dec = Math.floor(i.year / 10) * 10; decCount[dec] = (decCount[dec] || 0) + 1; } });
    const topDecadeEntry = Object.entries(decCount).sort((a, b) => b[1] - a[1])[0];
    const topDecade = topDecadeEntry ? `${topDecadeEntry[0]}s` : null;

    return { avg, topGenres, topDirectors, rewatchCount: rewatched.length, rewatchTop, topDecade, ratedCount: rated.length };
  }, [items]);

  const ratingTone = d.avg >= 7.5
    ? 'te entregas a lo que te gana'
    : d.avg >= 6.5
      ? 'repartes con equilibrio'
      : 'eres de nota exigente';

  const genreText = d.topGenres.length
    ? (d.topGenres.length === 1
        ? d.topGenres[0]
        : `${d.topGenres.slice(0, -1).join(', ')} y ${d.topGenres[d.topGenres.length - 1]}`)
    : null;

  const directorText = d.topDirectors.length
    ? (d.topDirectors.length === 1
        ? d.topDirectors[0].name
        : `${d.topDirectors.slice(0, -1).map(x => x.name).join(', ')} y ${d.topDirectors[d.topDirectors.length - 1].name}`)
    : null;

  return (
    <div className="bg-gradient-to-br from-primary/5 via-card to-card border border-border rounded-xl p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Fingerprint className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tu estilo, de un vistazo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Lo que tus {items.length} obras dicen de ti</p>
        </div>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">
        {genreText
          ? <>Te mueves sobre todo en <span className="font-semibold text-foreground">{genreText}</span>.</>
          : <>Tu biblioteca aún está tomando forma.</>}
        {directorText && <> Vuelves una y otra vez a <span className="font-semibold text-foreground">{directorText}</span>.</>}
        {d.ratedCount > 0 && <> Puntúas con criterio —media <span className="font-semibold text-foreground">{d.avg.toFixed(1)}</span>—: {ratingTone}.</>}
        {d.topDecade && <> Tu época más presente es la de los <span className="font-semibold text-foreground">{d.topDecade}</span>.</>}
      </p>

      {/* Chips de géneros y directores */}
      {(d.topGenres.length > 0 || d.topDirectors.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {d.topGenres.map(g => (
            <span key={g} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{g}</span>
          ))}
          {d.topDirectors.map(dir => (
            <span key={dir.name} className="text-[11px] px-2.5 py-1 rounded-full bg-card text-muted-foreground border border-border">
              {dir.name} · {dir.n}
            </span>
          ))}
        </div>
      )}

      {/* Lo que revisitas */}
      {d.rewatchTop.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Las que vuelves a ver
          </p>
          <p className="text-sm text-foreground/80">{d.rewatchTop.join(' · ')}</p>
        </div>
      )}
    </div>
  );
}
