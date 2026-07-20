import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Clock, Flame, Eye, Check, X, AlertTriangle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const URGENCY_WEIGHTS = {
  age: 0.5,    // how old it is in the pending list
  rating: 0.3, // base rating relevance
  trending: 0.2,
};

function getUrgencyScore(item, now) {
  // Estimate age from created_date
  const created = new Date(item.created_date || now);
  const ageYears = (now - created) / (1000 * 60 * 60 * 24 * 365);
  const ageScore = Math.min(100, ageYears * 25); // 4+ years = 100

  // No personal rating for pending = neutral 50
  const ratingScore = 50;

  return Math.round(ageScore * URGENCY_WEIGHTS.age + ratingScore * URGENCY_WEIGHTS.rating + 50 * URGENCY_WEIGHTS.trending);
}

export default function WatchlistPurge() {
  const queryClient = useQueryClient();
  const [purged, setPurged] = useState(new Set());
  const [kept, setKept] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [trendingTitles, setTrendingTitles] = useState([]);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const pending = useMemo(() =>
    items
      .filter(i => i.status === 'Pendiente' && !purged.has(i.id) && !kept.has(i.id))
      .sort((a, b) => getUrgencyScore(b, Date.now()) - getUrgencyScore(a, Date.now()))
  , [items, purged, kept]);

  const processedItems = useMemo(() =>
    items.filter(i => i.status === 'Pendiente' && (purged.has(i.id) || kept.has(i.id)))
  , [items, purged, kept]);

  const loadTrending = async () => {
    setLoading(true);
    const pendingTitles = items.filter(i => i.status === 'Pendiente').map(i => i.title).slice(0, 30);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `From this list of movies/series, tell me which ones are currently trending, critically acclaimed, or culturally relevant in 2025-2026: ${pendingTitles.join(', ')}. Return only titles from the provided list.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          trending: { type: 'array', items: { type: 'string' } }
        }
      }
    });
    setTrendingTitles(result.trending || []);
    setTrendingLoaded(true);
    setLoading(false);
  };

  const confirmPurge = async () => {
    setLoading(true);
    for (const id of purged) {
      await base44.entities.MediaItem.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    setPurged(new Set());
    setLoading(false);
  };

  const markKept = (id) => {
    setKept(prev => new Set([...prev, id]));
  };
  const markPurged = (id) => {
    setPurged(prev => new Set([...prev, id]));
  };

  const isTrending = (title) => trendingTitles.some(t => t.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(t.toLowerCase()));

  const getUrgencyLabel = (item) => {
    const score = getUrgencyScore(item, Date.now());
    if (score >= 60) return { label: 'Urgente', color: 'text-destructive bg-destructive/10' };
    if (score >= 35) return { label: 'Moderada', color: 'text-amber-500 bg-amber-500/10' };
    return { label: 'Reciente', color: 'text-primary bg-primary/10' };
  };

  const getAgeLabel = (item) => {
    const created = new Date(item.created_date || Date.now());
    const ageMonths = Math.round((Date.now() - created) / (1000 * 60 * 60 * 24 * 30));
    if (ageMonths >= 24) return `${Math.floor(ageMonths / 12)} años en lista`;
    if (ageMonths >= 1) return `${ageMonths} meses en lista`;
    return 'Añadida recientemente';
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
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Purga de Pendientes</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {pending.length} obras pendientes · Decide cuáles conservar y cuáles eliminar definitivamente
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {!trendingLoaded ? (
          <Button onClick={loadTrending} disabled={loading} size="sm">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {loading ? 'Analizando tendencias...' : 'Analizar tendencias 2026'}
          </Button>
        ) : (
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            <Zap className="w-3 h-3 mr-1" /> {trendingTitles.length} títulos en tendencia identificados
          </Badge>
        )}
        {purged.size > 0 && (
          <Button variant="destructive" size="sm" onClick={confirmPurge} disabled={loading}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Purgar {purged.size} obras definitivamente
          </Button>
        )}
        {(purged.size > 0 || kept.size > 0) && (
          <span className="text-xs text-muted-foreground">
            {kept.size} conservadas · {purged.size} marcadas para purgar
          </span>
        )}
      </div>

      {/* Pending list */}
      <div className="space-y-2">
        <AnimatePresence>
          {pending.map((item) => {
            const urgency = getUrgencyLabel(item);
            const trending = isTrending(item.title);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-border/80"
              >
                {item.poster_url ? (
                  <img src={item.poster_url} className="w-9 h-12 rounded object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-9 h-12 rounded bg-muted flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    {trending && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0">
                        <Flame className="w-2.5 h-2.5 mr-0.5" /> Trending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">{item.director} · {item.year || '—'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${urgency.color}`}>
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      {getAgeLabel(item)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    size="sm" variant="outline"
                    className="h-8 w-8 p-0 border-primary/30 hover:bg-primary/10 hover:border-primary text-primary"
                    onClick={() => markKept(item.id)}
                    title="Conservar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="h-8 w-8 p-0 border-destructive/30 hover:bg-destructive/10 hover:border-destructive text-destructive"
                    onClick={() => markPurged(item.id)}
                    title="Purgar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {pending.length === 0 && kept.size + purged.size > 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Triage completado</p>
            <p className="text-xs text-muted-foreground mt-1">{kept.size} conservadas · {purged.size} marcadas para purgar</p>
            {purged.size > 0 && (
              <Button variant="destructive" size="sm" className="mt-4" onClick={confirmPurge}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Confirmar purga de {purged.size} obras
              </Button>
            )}
          </div>
        )}

        {pending.length === 0 && kept.size + purged.size === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No tienes obras pendientes.</p>
          </div>
        )}
      </div>
    </div>
  );
}