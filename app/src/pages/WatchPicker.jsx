import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shuffle, Film, Star, Clock, RefreshCw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const MOODS = [
  { id: 'think', label: 'Cine para pensar', icon: '🧠', genres: ['Drama', 'Ciencia Ficción', 'Thriller', 'Misterio'], keywords: ['Guión', 'Mensaje', 'Girito final'] },
  { id: 'fun', label: 'Quiero reírme', icon: '😂', genres: ['Comedia', 'Animación', 'Aventura'], keywords: ['Humor', 'Ritmo'] },
  { id: 'epic', label: 'Epicidad total', icon: '⚡', genres: ['Acción', 'Aventura', 'Fantasía', 'Bélico'], keywords: ['Efectos especiales', 'Banda sonora', 'Escenografía'] },
  { id: 'classic', label: 'Un clásico', icon: '🎞️', maxYear: 1990, keywords: ['Diálogos', 'Actuaciones', 'Dirección'] },
  { id: 'short', label: 'Algo corto', icon: '⏱️', categories: ['Cortometraje', 'Documental'], keywords: [] },
  { id: 'emotional', label: 'Para llorar', icon: '🥹', keywords: ['Emocional', 'Actuaciones'], genres: ['Drama', 'Romance'] },
  { id: 'terror', label: 'Pasar miedo', icon: '👻', genres: ['Horror', 'Thriller', 'Suspense'], keywords: ['Atmósfera', 'Villano'] },
  { id: 'art', label: 'Cine de autor', icon: '🎨', keywords: ['Fotografía', 'Dirección', 'Atmósfera', 'Montaje'] },
];

function pickWeighted(items) {
  if (items.length === 0) return null;
  const weighted = items.flatMap(item => {
    const w = item.rating ? Math.max(1, Math.round(item.rating)) : 1;
    return Array(w).fill(item);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export default function WatchPicker() {
  const [selectedMood, setSelectedMood] = useState(null);
  const [picked, setPicked] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const navigate = useNavigate();

  const { data: items = [] } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const pending = items.filter(i => i.status === 'Pendiente');

  const spin = () => {
    if (!selectedMood) return;
    setSpinning(true);
    setPicked(null);

    let pool = [...pending];
    const mood = MOODS.find(m => m.id === selectedMood);

    if (mood.genres?.length) {
      const byGenre = pool.filter(i => mood.genres.some(g => i.genre1 === g || i.genre2 === g));
      if (byGenre.length > 0) pool = byGenre;
    }
    if (mood.categories?.length) {
      const byCat = pool.filter(i => mood.categories.includes(i.category));
      if (byCat.length > 0) pool = byCat;
    }
    if (mood.maxYear) {
      const byYear = pool.filter(i => i.year && i.year <= mood.maxYear);
      if (byYear.length > 0) pool = byYear;
    }
    if (mood.keywords?.length) {
      const byKeyword = pool.filter(i =>
        mood.keywords.some(k => i.highlight1 === k || i.highlight2 === k || i.highlight3 === k)
      );
      if (byKeyword.length > 0) pool = byKeyword;
    }

    setTimeout(() => {
      const result = pickWeighted(pool);
      setPicked(result);
      setSpinning(false);
    }, 1200);
  };

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
            <Shuffle className="w-5 h-5 text-chart-3" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">¿Qué veo hoy?</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {pending.length} películas en tu watchlist. Elige tu mood y la ruleta decide.
        </p>
      </div>

      {/* Mood selector */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">¿Cuál es tu mood hoy?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MOODS.map(mood => (
            <button
              key={mood.id}
              onClick={() => { setSelectedMood(mood.id); setPicked(null); }}
              className={cn(
                "p-4 rounded-xl border text-left transition-all duration-200",
                selectedMood === mood.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border hover:border-primary/40 text-foreground"
              )}
            >
              <div className="text-2xl mb-2">{mood.icon}</div>
              <div className="text-sm font-medium leading-tight">{mood.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Spin button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={spin}
          disabled={!selectedMood || spinning || pending.length === 0}
          className="gap-3 px-10 py-6 text-base"
        >
          {spinning ? (
            <><div className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> Girando la ruleta...</>
          ) : (
            <><Shuffle className="w-5 h-5" /> {picked ? 'Volver a girar' : 'Girar la ruleta'}</>
          )}
        </Button>
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {picked && !spinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-xl"
          >
            {picked.poster_url && (
              <div className="absolute inset-0">
                <img src={picked.poster_url} alt="" className="w-full h-full object-cover opacity-10 scale-110 blur-sm" />
              </div>
            )}
            <div className="relative flex flex-col md:flex-row gap-6 p-6">
              {picked.poster_url ? (
                <img src={picked.poster_url} alt={picked.title} className="w-32 h-48 object-cover rounded-xl flex-shrink-0 shadow-lg" />
              ) : (
                <div className="w-32 h-48 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                  <Film className="w-10 h-10 text-muted-foreground/30" />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">Esta noche ves</p>
                  <h2 className="text-3xl font-bold text-foreground leading-tight">{picked.title}</h2>
                  {picked.title_alt && <p className="text-muted-foreground">{picked.title_alt}</p>}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {picked.director && <span className="text-sm text-muted-foreground">{picked.director}</span>}
                  {picked.year && <Badge variant="outline">{picked.year}</Badge>}
                  {picked.category && <Badge variant="secondary">{picked.category}</Badge>}
                  {picked.genre1 && <Badge variant="outline">{picked.genre1}</Badge>}
                </div>
                {picked.synopsis && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{picked.synopsis}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <Button onClick={spin} variant="outline" size="sm">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Otra
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/add?edit=${picked.id}`)}>
                    <Play className="w-3.5 h-3.5 mr-1.5" /> Marcar como vista
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pending.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">No tienes obras en tu watchlist. ¡Añade algunas marcadas como "Pendiente"!</p>
        </div>
      )}
    </div>
  );
}