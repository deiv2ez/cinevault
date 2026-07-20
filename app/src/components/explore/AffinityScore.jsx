import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function buildUserProfile(myItems) {
  const top15 = [...myItems]
    .filter(i => i.rating != null)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 15);

  const abandoned = myItems.filter(i => i.status === 'Abandono');

  const highlightCounts = {};
  myItems.forEach(i => {
    [i.highlight1, i.highlight2, i.highlight3].forEach(h => {
      if (h) highlightCounts[h] = (highlightCounts[h] || 0) + 1;
    });
  });
  const topHighlights = Object.entries(highlightCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  const genreCounts = {};
  myItems.forEach(i => {
    [i.genre1, i.genre2].forEach(g => {
      if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  return { top15, abandoned, topHighlights, topGenres };
}

export default function AffinityScore({ movie, myItems }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculate();
  }, []);

  const calculate = async () => {
    setLoading(true);
    setResult(null);
    const { top15, abandoned, topHighlights, topGenres } = buildUserProfile(myItems);

    const prompt = `Eres un experto en cinematografía con acceso al perfil cinéfilo de un usuario. Calcula un "Índice de Afinidad" (0-10) para la siguiente película/serie y el perfil del usuario.

PELÍCULA A EVALUAR:
- Título: ${movie.title}
- Director: ${movie.director || 'Desconocido'}
- Géneros: ${[movie.genre1, movie.genre2].filter(Boolean).join(', ')}
- Sinopsis: ${movie.synopsis?.substring(0, 300) || 'Sin sinopsis'}
- Reparto: ${movie.cast?.join(', ') || 'Sin datos'}

PERFIL CINÉFILO DEL USUARIO (sus 15 favoritas, nota 0-10):
${top15.map(i => `- "${i.title}" (${i.year || '?'}) dir. ${i.director || '?'} — ${i.rating}/10 — aspectos destacados: ${[i.highlight1, i.highlight2, i.highlight3].filter(Boolean).join(', ')}`).join('\n')}

PELÍCULAS ABANDONADAS (lo que odia):
${abandoned.map(i => `- "${i.title}"`).join('\n') || 'Ninguna'}

ASPECTOS QUE MÁS VALORA: ${topHighlights.join(', ')}
GÉNEROS FAVORITOS: ${topGenres.join(', ')}

INSTRUCCIONES:
1. Analiza el cruce entre la película y el perfil del usuario con detalle.
2. Asigna un score del 0 al 10 (con un decimal).
3. Escribe una razón breve (máx 2 frases) que mencione títulos específicos de su biblioteca y sus gustos concretos.
4. Sé preciso y personalizado, NO genérico.

Devuelve SOLO el JSON especificado.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['score', 'reason'],
      },
    });

    setResult(res);
    setLoading(false);
  };

  const getScoreConfig = (score) => {
    if (score >= 8) return {
      label: 'Altísima Afinidad',
      gradient: 'from-yellow-400 to-green-400',
      glow: 'shadow-green-400/40',
      text: 'text-green-500',
      ring: 'ring-green-400',
      bg: 'bg-green-500/10',
    };
    if (score >= 5) return {
      label: 'Afinidad Media',
      gradient: 'from-yellow-500 to-amber-400',
      glow: 'shadow-amber-400/40',
      text: 'text-amber-500',
      ring: 'ring-amber-400',
      bg: 'bg-amber-500/10',
    };
    return {
      label: 'Baja Afinidad',
      gradient: 'from-red-600 to-rose-400',
      glow: 'shadow-red-500/40',
      text: 'text-red-500',
      ring: 'ring-red-400',
      bg: 'bg-red-500/10',
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analizando tu perfil cinéfilo con IA...</p>
      </div>
    );
  }

  if (!result) return null;

  const config = getScoreConfig(result.score);
  const pct = Math.min(100, Math.max(0, (result.score / 10) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Índice de Afinidad</h3>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-6">
        {/* Circle */}
        <div className={cn(
          'relative w-24 h-24 rounded-full flex items-center justify-center ring-4 shadow-xl flex-shrink-0',
          config.ring, config.glow, config.bg
        )}>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className={cn('text-3xl font-black', config.text)}
          >
            {result.score.toFixed(1)}
          </motion.span>
          <span className={cn('absolute bottom-3 text-[10px] font-bold', config.text)}>/10</span>
        </div>

        {/* Bar + label */}
        <div className="flex-1 space-y-2">
          <p className={cn('text-sm font-bold', config.text)}>{config.label}</p>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className={cn('h-full rounded-full bg-gradient-to-r', config.gradient)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{pct.toFixed(0)}% compatibilidad con tu perfil</p>
        </div>
      </div>

      {/* Reason */}
      <div className={cn('rounded-xl p-4 border', config.bg, `border-current/20`)}>
        <p className="text-sm text-foreground/90 leading-relaxed italic">"{result.reason}"</p>
      </div>
    </motion.div>
  );
}