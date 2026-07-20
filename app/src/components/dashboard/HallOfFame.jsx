import React from 'react';
import { Crown, Clapperboard, Palette, Heart } from 'lucide-react';

function FameCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-chart-3/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-chart-3" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value || '—'}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
    </div>
  );
}

export default function HallOfFame({ items }) {
  // Director más visto
  const directorCounts = {};
  const directorRatings = {};
  const genreCounts = {};
  const genreRatings = {};

  items.forEach(item => {
    if (item.director) {
      directorCounts[item.director] = (directorCounts[item.director] || 0) + 1;
      if (!directorRatings[item.director]) directorRatings[item.director] = [];
      if (item.rating != null) directorRatings[item.director].push(item.rating);
    }
    [item.genre1, item.genre2].forEach(g => {
      if (g) {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
        if (!genreRatings[g]) genreRatings[g] = [];
        if (item.rating != null) genreRatings[g].push(item.rating);
      }
    });
  });

  const topDirector = Object.entries(directorCounts).sort((a, b) => b[1] - a[1])[0];
  const favDirector = Object.entries(directorRatings)
    .filter(([_, ratings]) => ratings.length >= 2)
    .sort((a, b) => {
      const avgA = a[1].reduce((s, v) => s + v, 0) / a[1].length;
      const avgB = b[1].reduce((s, v) => s + v, 0) / b[1].length;
      return avgB - avgA;
    })[0];
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
  const favGenre = Object.entries(genreRatings)
    .filter(([_, ratings]) => ratings.length >= 3)
    .sort((a, b) => {
      const avgA = a[1].reduce((s, v) => s + v, 0) / a[1].length;
      const avgB = b[1].reduce((s, v) => s + v, 0) / b[1].length;
      return avgB - avgA;
    })[0];

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Salón de la Fama</h3>
      <div className="grid grid-cols-2 gap-3">
        <FameCard
          icon={Crown}
          label="Director más visto"
          value={topDirector?.[0]}
          sublabel={topDirector ? `${topDirector[1]} obras` : undefined}
        />
        <FameCard
          icon={Heart}
          label="Director favorito"
          value={favDirector?.[0]}
          sublabel={favDirector ? `Nota media: ${(favDirector[1].reduce((s,v) => s+v,0) / favDirector[1].length).toFixed(1)}` : undefined}
        />
        <FameCard
          icon={Palette}
          label="Género más visto"
          value={topGenre?.[0]}
          sublabel={topGenre ? `${topGenre[1]} obras` : undefined}
        />
        <FameCard
          icon={Clapperboard}
          label="Género favorito"
          value={favGenre?.[0]}
          sublabel={favGenre ? `Nota media: ${(favGenre[1].reduce((s,v) => s+v,0) / favGenre[1].length).toFixed(1)}` : undefined}
        />
      </div>
    </div>
  );
}