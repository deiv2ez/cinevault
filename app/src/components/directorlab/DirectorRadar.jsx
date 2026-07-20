import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

// Map highlights to 5 cinematic axes
const AXIS_MAP = {
  'Complejidad': ['Guión', 'Desarrollo de personajes', 'Mensaje'],
  'Ritmo': ['Montaje', 'Ritmo'],
  'Tensión': ['Thriller', 'Atmósfera', 'Girito final'],
  'Estética': ['Fotografía', 'Escenografía', 'Efectos especiales'],
  'Emoción': ['Actuaciones', 'Banda sonora', 'Emocional', 'Diálogos'],
};

export default function DirectorRadar({ items }) {
  const highlights = items.flatMap(i =>
    [i.highlight1, i.highlight2, i.highlight3].filter(Boolean)
  );

  const total = Math.max(1, highlights.length);

  const data = Object.entries(AXIS_MAP).map(([axis, tags]) => {
    const count = highlights.filter(h => tags.some(t => h.toLowerCase().includes(t.toLowerCase()))).length;
    return { axis, value: Math.round((count / total) * 100) };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">ADN Cinematográfico</h3>
      <p className="text-xs text-muted-foreground mb-4">Basado en tus aspectos destacados</p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(v) => [`${v}%`]}
            />
            <Radar
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}