import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FlaskConical, Star, Film, TrendingUp, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import DirectorRadar from '@/components/directorlab/DirectorRadar';

export default function DirectorLab() {
  const [selectedDirector, setSelectedDirector] = useState(null);
  const [search, setSearch] = useState('');
  const [filmography, setFilmography] = useState([]);
  const [loadingFilmo, setLoadingFilmo] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const directors = useMemo(() => {
    const map = {};
    items.forEach(i => {
      if (!i.director) return;
      if (!map[i.director]) map[i.director] = { name: i.director, items: [] };
      map[i.director].items.push(i);
    });
    return Object.values(map)
      .sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  const filteredDirectors = directors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const myFilms = useMemo(() => {
    if (!selectedDirector) return [];
    return selectedDirector.items
      .filter(i => i.year && i.rating != null)
      .sort((a, b) => a.year - b.year);
  }, [selectedDirector]);

  const avgRating = useMemo(() => {
    if (!myFilms.length) return null;
    return (myFilms.reduce((s, i) => s + i.rating, 0) / myFilms.length).toFixed(2);
  }, [myFilms]);

  const fetchFilmography = async (director) => {
    setLoadingFilmo(true);
    setFilmography([]);
    const prompt = `List all known filmography (movies and series directed) by "${director.name}". Include title, year, and approximate IMDb/TMDB rating. Only include works where they are the main director.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          works: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                year: { type: 'number' },
                category: { type: 'string' },
              }
            }
          }
        }
      }
    });

    setFilmography(result.works || []);
    setLoadingFilmo(false);
  };

  const selectDirector = (director) => {
    setSelectedDirector(director);
    fetchFilmography(director);
  };

  const myTitlesLower = items.map(i => i.title.toLowerCase());
  const seenCount = filmography.filter(f => myTitlesLower.includes(f.title.toLowerCase())).length;
  const completionPct = filmography.length > 0 ? Math.round((seenCount / filmography.length) * 100) : 0;

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-chart-2" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">El Laboratorio</h1>
        </div>
        <p className="text-sm text-muted-foreground">Deep dive de tus directores favoritos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Director list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar director..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredDirectors.map(d => (
              <button
                key={d.name}
                onClick={() => selectDirector(d)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all",
                  selectedDirector?.name === d.name
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-card border-border hover:border-primary/30 text-foreground"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{d.items.length} obra{d.items.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold">
                    {(d.items.filter(i => i.rating != null).reduce((s, i) => s + i.rating, 0) /
                      (d.items.filter(i => i.rating != null).length || 1)).toFixed(1)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Director detail */}
        <div className="lg:col-span-2">
          {!selectedDirector ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FlaskConical className="w-12 h-12 text-muted-foreground/20 mb-3" />
              <p className="text-muted-foreground text-sm">Selecciona un director para ver su perfil completo</p>
            </div>
          ) : (
            <motion.div
              key={selectedDirector.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-primary">
                  {selectedDirector.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground">{selectedDirector.name}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-semibold">{avgRating} media</span>
                    </div>
                    <Badge variant="outline">{selectedDirector.items.length} vistas</Badge>
                    {filmography.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {completionPct}% filmografía vista
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {filmography.length > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Filmografía completada</span>
                    <span>{seenCount} / {filmography.length}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              )}

              {loadingFilmo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                  Cargando filmografía completa...
                </div>
              )}

              {/* ADN Radar */}
              {selectedDirector.items.length >= 2 && (
                <DirectorRadar items={selectedDirector.items} />
              )}

              {/* Rating evolution chart */}
              {myFilms.length >= 2 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Evolución de mis notas</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={myFilms}>
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value, name, props) => [value.toFixed(1), props.payload.title]}
                          labelFormatter={() => ''}
                        />
                        <ReferenceLine y={parseFloat(avgRating)} stroke="hsl(var(--primary))" strokeDasharray="4 4" opacity={0.5} />
                        <Line
                          type="monotone"
                          dataKey="rating"
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* My films */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Mis obras de {selectedDirector.name}
                </h3>
                <div className="space-y-2">
                  {selectedDirector.items.sort((a, b) => (b.rating || 0) - (a.rating || 0)).map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                      {item.poster_url ? (
                        <img src={item.poster_url} className="w-8 h-11 rounded object-cover flex-shrink-0" alt="" />
                      ) : (
                        <div className="w-8 h-11 rounded bg-muted flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground">{item.year || '—'} · {item.genre1 || '—'}</p>
                      </div>
                      {item.rating != null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-bold">{item.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Unseen from filmography */}
              {filmography.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Sin ver de su filmografía
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {filmography
                      .filter(f => !myTitlesLower.includes(f.title.toLowerCase()))
                      .map(f => (
                        <Badge key={f.title} variant="outline" className="text-xs">
                          {f.title} {f.year ? `(${f.year})` : ''}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}