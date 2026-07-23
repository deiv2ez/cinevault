import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Layers, Film, Star } from 'lucide-react';
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

const DOMESTIC = new Set(['españa', 'espana', 'es', 'estados unidos', 'eeuu', 'usa', 'us', 'united states', 'reino unido', 'uk']);
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

function Shelf({ collection, onSelect }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{collection.emoji}</span>
        <div>
          <h2 className="text-base md:text-lg font-bold text-foreground">{collection.label}</h2>
          <p className="text-xs text-muted-foreground">{collection.description} · {collection.items.length} obras</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:-mx-1 md:px-1 scrollbar-hide">
        {collection.items.map(item => (
          <button key={item.id} onClick={() => onSelect(item)} className="group flex-shrink-0 w-28 md:w-28 text-left">
            <div className="relative w-28 h-40 rounded-xl overflow-hidden bg-muted border border-border group-hover:border-primary/40 group-hover:shadow-md transition-all duration-300">
              {item.poster_url ? (
                <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Film className="w-8 h-8 text-muted-foreground/20" /></div>
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
  );
}

export default function SmartCollections() {
  const [selectedItem, setSelectedItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const EXCLUDED_TITLES = new Set(['la llegada']);
  const clean = useMemo(() => items.filter(i => !EXCLUDED_TITLES.has((i.title || '').toLowerCase().trim())), [items]);

  // Colecciones inteligentes (data-driven), mismo formato de estantería
  const smartCollections = useMemo(() => {
    const out = [];
    const rated = clean.filter(i => i.rating != null);

    // Tu Panteón: nota ≥ 9
    const pantheon = rated.filter(i => i.rating >= 9).sort((a, b) => b.rating - a.rating).slice(0, 24);
    if (pantheon.length >= 3) out.push({ key: 'pantheon', emoji: '🏛️', label: 'Tu Panteón', description: 'Tus obras de nota 9 o más', items: pantheon });

    // Cine del mundo: países no domésticos
    const world = rated.filter(i => i.country && !DOMESTIC.has(norm(i.country))).sort((a, b) => b.rating - a.rating).slice(0, 24);
    if (world.length >= 4) out.push({ key: 'world', emoji: '🌍', label: 'Cine del Mundo', description: 'Lo mejor fuera de EE.UU. y España', items: world });

    // Focos de director (top 3 por nº de obras, mín 3)
    const dMap = {};
    rated.forEach(i => { if (i.director) (dMap[i.director] = dMap[i.director] || []).push(i); });
    Object.entries(dMap)
      .filter(([, arr]) => arr.length >= 3)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3)
      .forEach(([name, arr]) => {
        out.push({ key: `dir-${name}`, emoji: '🎥', label: `Todo tu ${name}`, description: `Tu colección de ${name}`, items: arr.sort((a, b) => b.rating - a.rating) });
      });

    return out;
  }, [clean]);

  // Colecciones por aspecto destacado (las de siempre, que le gustan)
  const tagCollections = useMemo(() => {
    return COLLECTION_DEFS
      .map(def => ({
        ...def,
        items: clean
          .filter(i => i.highlight1 === def.tag || i.highlight2 === def.tag || i.highlight3 === def.tag)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0)),
      }))
      .filter(c => c.items.length > 0)
      .sort((a, b) => b.items.length - a.items.length);
  }, [clean]);

  const total = smartCollections.length + tagCollections.length;

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
          Estanterías generadas automáticamente desde tus datos y tus aspectos destacados · {total} colecciones
        </p>
      </div>

      {total === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Layers className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-sm">
            Añade "Aspectos a destacar" y notas a tus obras para que aparezcan colecciones aquí
          </p>
        </div>
      )}

      {smartCollections.map(c => <Shelf key={c.key} collection={c} onSelect={setSelectedItem} />)}

      {tagCollections.length > 0 && smartCollections.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por tus aspectos destacados</p>
        </div>
      )}

      {tagCollections.map(c => <Shelf key={c.tag} collection={c} onSelect={setSelectedItem} />)}

      <MediaDetailSheet item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
