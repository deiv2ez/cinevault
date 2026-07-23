import React from 'react';
import { canonGenre } from '@/lib/genres';

const TOP_HIGHLIGHTS = ['Fotografía', 'Guión', 'Actuaciones', 'Dirección', 'Banda sonora', 'Montaje', 'Atmósfera', 'Diálogos'];
const TOP_GENRES = ['Drama', 'Thriller', 'Ciencia Ficción', 'Comedia', 'Acción', 'Horror', 'Fantasía', 'Crimen'];

export default function HighlightHeatmap({ items }) {
  // Only consider items with rating >= 8
  const highRated = items.filter(i => i.rating >= 8 && i.genre1);

  // Build co-occurrence matrix
  const matrix = {};
  TOP_HIGHLIGHTS.forEach(h => {
    matrix[h] = {};
    TOP_GENRES.forEach(g => { matrix[h][g] = 0; });
  });

  highRated.forEach(item => {
    const g = canonGenre(item.genre1);
    [item.highlight1, item.highlight2, item.highlight3].filter(Boolean).forEach(h => {
      if (matrix[h] && g && matrix[h][g] !== undefined) {
        matrix[h][g]++;
      }
    });
  });

  const maxVal = Math.max(1, ...TOP_HIGHLIGHTS.flatMap(h => TOP_GENRES.map(g => matrix[h][g])));

  const getColor = (val) => {
    const intensity = val / maxVal;
    if (intensity === 0) return 'hsl(var(--muted))';
    const alpha = 0.15 + intensity * 0.85;
    return `hsl(145 22% 55% / ${alpha})`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Mapa de Correlación</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Aspectos destacados vs. Género en obras con nota ≥ 8</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="w-28 pb-2" />
              {TOP_GENRES.map(g => (
                <th key={g} className="pb-2 px-1">
                  <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide writing-mode-vertical block text-center leading-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '60px', paddingTop: '4px' }}>
                    {g}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOP_HIGHLIGHTS.map(h => (
              <tr key={h}>
                <td className="pr-2 py-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{h}</span>
                </td>
                {TOP_GENRES.map(g => {
                  const val = matrix[h][g];
                  return (
                    <td key={g} className="px-1 py-0.5">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center transition-all hover:scale-110 cursor-default"
                        style={{ background: getColor(val) }}
                        title={`${h} + ${g}: ${val} obras`}
                      >
                        {val > 0 && (
                          <span className="text-[9px] font-bold text-foreground/70">{val}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <span className="text-[10px] text-muted-foreground">Menos</span>
        <div className="flex gap-0.5">
          {[0.05, 0.25, 0.5, 0.75, 1].map(v => (
            <div key={v} className="w-5 h-3 rounded-sm" style={{ background: `hsl(145 22% 55% / ${v})` }} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">Más</span>
      </div>
    </div>
  );
}