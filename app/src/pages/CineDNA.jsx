import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dna, Zap, Loader2, BookOpen, Star, Brain, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const DAVID_PROFILE = `Perfil existencial de David: pragmático de la existencia que ha entendido que la verdadera libertad no consiste en no tener ataduras, sino en elegir por qué principios atarse y asumir íntegramente los resultados. Filtra su entorno sin condescendencia pero con exigencia, protegiendo su frontera interior de la pereza existencial y el victimismo, mientras mantiene profunda empatía y visión crítica hacia las injusticias sistémicas. Ha automatizado su brújula moral y no necesita actuar ni demostrar su identidad ante nadie; simplemente la habita con naturalidad. Encuentra la eudaimonía tanto en la defensa inquebrantable de sus ideales como en la llana sencillez de una tarde de ciclismo en el sofá.`;

export default function CineDNA() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const run = async () => {
    setLoading(true);
    setResult(null);

    const topItems = items
      .filter(i => i.rating != null && i.rating >= 8 && i.status !== 'Pendiente')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 40);

    const highlights = [...new Set(
      topItems.flatMap(i => [i.highlight1, i.highlight2, i.highlight3].filter(Boolean))
    )].slice(0, 20);

    const summary = topItems.map(i =>
      `${i.title} (${i.year || '?'}) - ★${i.rating} - ${i.genre1 || ''} ${i.genre2 || ''} - Dir: ${i.director || '?'}`
    ).join('\n');

    const data = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres un filósofo y crítico de cine. Tu misión es hacer un análisis profundo del ADN cinematográfico de un cinéfilo llamado David basándote en sus películas con nota ≥ 8 y sus aspectos destacados favoritos.

${DAVID_PROFILE}

Sus películas top:
${summary}

Sus aspectos destacados más frecuentes: ${highlights.join(', ')}

Genera:
1. Un "manifiesto" o reflexión filosófica (150-200 palabras) sobre su momento vital y sus inquietudes existenciales según lo que está consumiendo. Debe ser literario, profundo, personalizado para David, con referencias a algunas de sus películas. Escrito en segunda persona ("Tú, David...") con un tono de espejo existencial, no de psicólogo.
2. Un "arquetipo cinematográfico" de David: un título corto y evocador (ej: "El Peregrino Racionalista", "El Arquitecto del Caos Ordenado").
3. Tres recomendaciones de libros que conecten profundamente con las temáticas de sus películas top, especialmente si hay patrones de ciencia ficción existencial, dilemas morales, determinismo, libre albedrío. Para cada libro: título, autor, y una explicación de por qué conecta específicamente con el ADN cinematográfico de David (citar alguna de sus películas top como puente).`,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          archetype: { type: 'string', description: 'Título evocador del arquetipo cinematográfico' },
          manifesto: { type: 'string', description: 'Reflexión filosófica literaria en segunda persona' },
          books: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                author: { type: 'string' },
                why: { type: 'string', description: 'Por qué conecta con el ADN de David' },
                bridge_film: { type: 'string', description: 'Película de su lista que sirve de puente' },
              }
            }
          },
          dominant_themes: { type: 'array', items: { type: 'string' }, description: '5-7 temas filosóficos dominantes' },
        }
      }
    });

    setResult(data);
    setLoading(false);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
            <Dna className="w-5 h-5 text-chart-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">ADN Cinematográfico</h1>
            <p className="text-sm text-muted-foreground">Tu filosofía vital a través del cine</p>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="flex flex-col items-center py-16 gap-5">
          <div className="w-24 h-24 rounded-3xl bg-chart-4/10 flex items-center justify-center">
            <Dna className="w-12 h-12 text-chart-4/40" />
          </div>
          <div className="text-center max-w-sm space-y-2">
            <p className="text-foreground font-semibold">Descubre quién eres a través de lo que ves</p>
            <p className="text-sm text-muted-foreground">
              La IA analizará tus {items.filter(i => i.rating != null && i.rating >= 8).length} obras con nota ≥ 8 y generará
              un manifiesto filosófico personal, tu arquetipo cinematográfico y recomendaciones literarias cruzadas.
            </p>
            <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-1.5">
              Análisis profundo con IA (Gemini) · ~30 segundos
            </p>
          </div>
          <Button onClick={run} disabled={loading} size="lg" className="min-w-[260px]">
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Construyendo tu ADN...</>
              : <><Dna className="w-4 h-4 mr-2" /> Generar mi ADN Cinematográfico</>}
          </Button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Archetype */}
          <div className="bg-gradient-to-br from-chart-4/10 via-card to-card border border-chart-4/20 rounded-2xl p-6 text-center">
            <p className="text-xs font-semibold text-chart-4 uppercase tracking-widest mb-2">Tu Arquetipo Cinematográfico</p>
            <h2 className="text-3xl font-bold text-foreground">{result.archetype}</h2>
          </div>

          {/* Dominant themes */}
          {result.dominant_themes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Temas dominantes en tu cosmos
              </p>
              <div className="flex flex-wrap gap-2">
                {result.dominant_themes.map(t => (
                  <Badge key={t} className="bg-chart-4/10 text-chart-4 border-chart-4/20">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Manifesto */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Dna className="w-3.5 h-3.5" /> Manifiesto existencial
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap italic">
              "{result.manifesto}"
            </p>
          </div>

          {/* Book recommendations */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Recomendaciones literarias cross-media
            </p>
            <div className="space-y-3">
              {(result.books || []).map((book, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-5 flex gap-4"
                >
                  <div className="w-10 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-lg font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">{book.title}</p>
                    <p className="text-sm text-muted-foreground mb-2">{book.author}</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{book.why}</p>
                    {book.bridge_film && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs text-muted-foreground">Conecta con: <span className="text-foreground font-medium">{book.bridge_film}</span></span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={run} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Regenerar análisis
          </Button>
        </motion.div>
      )}
    </div>
  );
}