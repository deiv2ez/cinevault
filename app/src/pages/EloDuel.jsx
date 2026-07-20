import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Swords, Trophy, RotateCcw, Star, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const K = 32;

function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function newElo(current, expected, score) {
  return Math.round(current + K * (score - expected));
}

export default function EloDuel() {
  const queryClient = useQueryClient();
  const [elos, setElos] = useState({});
  const [history, setHistory] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [showRanking, setShowRanking] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  // Only duel well-rated items
  const eligible = useMemo(() =>
    items.filter(i => i.rating != null && i.rating >= 7 &&
      (i.status === 'Visto' || i.status === 'Visto muchas veces' || i.status === 'Favorito'))
  , [items]);

  const getElo = (id) => elos[id] ?? 1500;

  const [pair, setPair] = useState(null);

  // Pick a pair of close-rated items (diff ≤ 0.5) to break ties
  function pickClosePair(pool) {
    if (pool.length < 2) return null;
    // Sort by rating and find adjacent items with close scores
    const sorted = [...pool].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    // Find all close pairs (rating diff ≤ 0.5)
    const close = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (Math.abs((sorted[i].rating || 0) - (sorted[i + 1].rating || 0)) <= 0.5) {
        close.push([sorted[i], sorted[i + 1]]);
      }
    }
    if (close.length > 0) {
      // Pick a random close pair
      return close[Math.floor(Math.random() * close.length)];
    }
    // Fallback: random pair
    const s = [...pool].sort(() => Math.random() - 0.5);
    return [s[0], s[1]];
  }

  const newPair = useMemo(() => {
    return pickClosePair(eligible);
  }, [eligible]);

  const currentPair = pair || newPair;

  const pickWinner = (winner, loser) => {
    setChosen(winner.id);
    setTimeout(() => {
      const wElo = getElo(winner.id);
      const lElo = getElo(loser.id);
      const exp = expectedScore(wElo, lElo);
      setElos(prev => ({
        ...prev,
        [winner.id]: newElo(wElo, exp, 1),
        [loser.id]: newElo(lElo, 1 - exp, 0),
      }));
      setHistory(h => [...h, { winner: winner.title, loser: loser.title }]);
      // Pick new close-rated pair
      setPair(pickClosePair(eligible));
      setChosen(null);
    }, 500);
  };

  const ranking = useMemo(() =>
    eligible
      .map(i => ({ ...i, elo: getElo(i.id) }))
      .sort((a, b) => b.elo - a.elo)
      .slice(0, 20)
  , [eligible, elos]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (eligible.length < 2) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground text-sm">Necesitas al menos 2 películas con nota ≥ 7 para el duelo.</p>
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[900px] mx-auto space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Swords className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">ELO Duels</h1>
          </div>
          <p className="text-sm text-muted-foreground">Duelos entre películas con nota similar para desempatar tu ranking definitivo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRanking(!showRanking)}>
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            {showRanking ? 'Duelos' : `Ranking (${history.length})`}
          </Button>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setElos({}); setHistory([]); setPair(null); }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showRanking ? (
          <motion.div key="duel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {currentPair && (
              <>
                <p className="text-center text-sm text-muted-foreground mb-6">
                  <span className="text-foreground font-semibold">Duelo #{history.length + 1}</span> · Elige la que más te impactó
                </p>
                <div className="grid grid-cols-2 gap-3 md:gap-6">
                  {currentPair.map((item, idx) => (
                    <motion.button
                      key={item.id}
                      onClick={() => pickWinner(item, currentPair[1 - idx])}
                      disabled={chosen !== null}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      animate={chosen === item.id ? { scale: 1.04, opacity: 1 } : chosen && chosen !== item.id ? { opacity: 0.4 } : { opacity: 1 }}
                      className="relative group rounded-2xl overflow-hidden border border-border bg-card text-left transition-all hover:border-primary/50 hover:shadow-lg"
                    >
                      {item.poster_url ? (
                        <div className="relative">
                          <img src={item.poster_url} alt={item.title} className="w-full aspect-[2/3] object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="font-bold text-white text-base leading-tight">{item.title}</p>
                            <p className="text-white/70 text-xs mt-1">{item.director} · {item.year}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span className="text-amber-400 font-bold text-sm">{item.rating?.toFixed(1)}</span>
                              <span className="text-white/50 text-xs ml-1">ELO: {getElo(item.id)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[2/3] flex flex-col items-center justify-center gap-3 bg-muted p-6">
                          <Film className="w-16 h-16 text-muted-foreground/20" />
                          <p className="font-bold text-foreground text-center text-base">{item.title}</p>
                          <p className="text-muted-foreground text-sm">{item.director} · {item.year}</p>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold">{item.rating?.toFixed(1)}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">ELO: {getElo(item.id)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 border-2 border-primary rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </motion.button>
                  ))}
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                  vs
                </p>
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">Top 20 según el algoritmo ELO tras {history.length} duelos</p>
            {ranking.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </span>
                {item.poster_url && <img src={item.poster_url} className="w-8 h-11 rounded object-cover flex-shrink-0" alt="" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.director} · {item.year}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-semibold">{item.rating?.toFixed(1)}</span>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    ELO {item.elo}
                  </Badge>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}