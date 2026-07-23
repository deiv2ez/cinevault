import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { canonGenre } from '@/lib/genres';

const GENRE_COLORS = {
  'Drama': '#6B9E78',
  'Thriller': '#5B8DB8',
  'Comedia': '#E8A838',
  'Ciencia Ficción': '#8B7EC8',
  'Horror': '#C86B6B',
  'Acción': '#E87438',
  'Romance': '#D47BA8',
  'Animación': '#68B8A8',
  'Aventura': '#A8B868',
  'Crimen': '#888888',
  'Fantasía': '#B878C8',
  'Historia': '#C8A870',
  'Biografía': '#78A8C8',
  'Misterio': '#7878C8',
  'Musical': '#C8784E',
};

const STATUS_SIZE = {
  'Visto muchas veces': 200,
  'Favorito': 200,
  'Visto': 80,
  'En progreso': 80,
  'Abandono': 30,
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 shadow-lg max-w-[200px]">
      <p className="font-semibold text-sm text-foreground leading-tight">{d.title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{d.director} · {d.year}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-amber-500 font-bold text-sm">★ {d.rating?.toFixed(1)}</span>
        {d.genre1 && <span className="text-xs text-muted-foreground">{d.genre1}</span>}
      </div>
      {d.status && <span className="text-[10px] text-primary mt-0.5 block">{d.status}</span>}
    </div>
  );
};

export default function ScatterPlot({ items }) {
  const [hoveredGenre, setHoveredGenre] = useState(null);

  const data = items
    .filter(i => i.year && i.rating != null)
    .map(i => ({
      ...i,
      x: i.year,
      y: i.rating,
      z: STATUS_SIZE[i.status] || 60,
      _g: i.genre1 ? canonGenre(i.genre1) : null,
      color: GENRE_COLORS[i.genre1 ? canonGenre(i.genre1) : ''] || '#888',
    }));

  const topGenres = Object.entries(
    data.reduce((acc, d) => { if (d._g) acc[d._g] = (acc[d._g] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Universo Cinematográfico Personal</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Año vs. Nota — tamaño = veces visto, color = género</p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
            <XAxis
              type="number" dataKey="x" name="Año"
              domain={['auto', 'auto']}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              type="number" dataKey="y" name="Nota"
              domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <ZAxis type="number" dataKey="z" range={[30, 220]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '4 4', stroke: 'hsl(var(--border))' }} />
            <Scatter data={data} fillOpacity={0.75}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  opacity={hoveredGenre ? (entry._g === hoveredGenre ? 1 : 0.15) : 0.8}
                  stroke={hoveredGenre === entry._g ? entry.color : 'transparent'}
                  strokeWidth={1.5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Genre legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {topGenres.map(g => (
          <button
            key={g}
            onMouseEnter={() => setHoveredGenre(g)}
            onMouseLeave={() => setHoveredGenre(null)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: GENRE_COLORS[g] || '#888' }} />
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}