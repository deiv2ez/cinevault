import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Layers, Film, Star, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import MediaDetailSheet from '@/components/library/MediaDetailSheet';

const COLLECTION_DEFS = [
  { tag: 'Girito final', label: 'El Mejor Giro Final', emoji: '🌀', description: 'Obras que te dejaron con la boca abierta' },
  { tag: 'Fotografía', label: 'Fotografía Sublime', emoji: '📸', description: 'Las más bellas visualmente' },
  { tag: 'Banda sonora', label: 'Bandas Sonoras Inolvidables', emoji: '🎵', description: 'Música que se te queda grabada' },
  { tag: 'Actuaciones', label: 'Actuaciones Magistrales', emoji: '🎭', description: 'Los mejores trabajos actorales' },
  { tag: 'Guión', label: 'Guiones de Oro', emoji: '✍️', description: 'Las historias mejor escritas' },
  { tag: 'Atmósfera', label: 'Atmósfera Única', emoji: '🌫️', description: 'Que te transportan a otro mundo' },
  { tag: 'Emocional', label: 'Para Llorar', emoji: '🥹', description: 'Las que más te han impactado emocionalmente' },
  { tag: 'Dirección', label: 'Dirección Magistral', emoji: '🎬', description: 'Obra de directores en estado de gracia' },
  { tag: 'Diálogos', label: 'Los Mejores Diálogos', emoji: '💬', description: 'Frases que se quedan contigo para siempre' },
  { tag: 'Mensaje', label: 'Cine con Mensaje', emoji: '💡', description: 'Las que te hacen pensar y reflexionar' },
  { tag: 'Montaje', label: 'Montaje Espectacular', emoji: '✂️', description: 'Editadas con una maestría técnica excepcional' },
  { tag: 'Villano', label: 'Los Mejores Villanos', emoji: '😈', description: 'Los antagonistas más memorables' },
];

export default function SmartCollections() {
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  // Exclude "La llegada" (duplicate of Arrival not in real library)
  const EXCLUDED_TITLES = new Set(['la llegada']);

  const collections = useMemo(() => {
    return COLLECTION_DEFS
      .map(def => ({
        ...def,
        items: items
          .filter(i =>
            !EXCLUDED_TITLES.has((i.title || '').toLowerCase().trim()) &&
            (i.highlight1 === def.tag || i.highlight2 === def.tag || i.highlight3 === def.tag)
          )
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      }))
      .filter(c => c.items.length > 0)
      .sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 md:space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-chart-5" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Colecciones</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Estanterías generadas automáticamente desde tus aspectos destacados · {collections.length} colecciones activas
        </p>
      </div>

      {collections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Layers className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">
            Añade "Aspectos a destacar" en tus obras para que aparezcan colecciones aquí
          </p>
        </div>
      )}

      {collections.map(collection => (
        <section key={collection.tag}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{collection.emoji}</span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{collection.label}</h2>
              <p className="text-xs text-muted-foreground">{collection.description} · {collection.items.length} obras</p>
            </div>
          </div>
          {/* Horizontal scroll shelf */}
          <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:-mx-1 md:px-1 scrollbar-hide">
            {collection.items.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group flex-shrink-0 w-32 md:w-28 text-left"
              >
                <div className="relative w-32 h-48 md:w-28 md:h-40 rounded-xl overflow-hidden bg-muted border border-border group-hover:border-primary/40 group-hover:shadow-md transition-all duration-300">
                  {item.poster_url ? (
                    <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                  )}
                  {item.rating != null && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-bold text-white">{item.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-foreground mt-1.5 truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.year || '—'}</p>
              </button>
            ))}
          </div>
        </section>
      ))}

      <MediaDetailSheet item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}