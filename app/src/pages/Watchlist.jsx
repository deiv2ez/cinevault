import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Clapperboard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import MediaCard from '@/components/library/MediaCard';
import MediaDetailSheet from '@/components/library/MediaDetailSheet';

// Página "Pendientes": todo lo que aún no has terminado (Pendiente / En progreso)
// más un acceso a las que dejaste a medias (Abandono), que si no quedarían inalcanzables.
const LOAD_STATUSES = ['Pendiente', 'En progreso', 'Abandono'];

const VIEWS = [
  { key: 'active', label: 'Por ver', statuses: ['Pendiente', 'En progreso'] },
  { key: 'abandoned', label: 'Abandonadas', statuses: ['Abandono'] },
];

export default function Watchlist() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_date');
  const [view, setView] = useState('active');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items-watchlist'],
    queryFn: async () => {
      const results = await Promise.all(
        LOAD_STATUSES.map(status =>
          base44.entities.MediaItem.filter({ status }, '-created_date', 5000)
        )
      );
      return results.flat();
    },
  });

  const counts = useMemo(() => ({
    active: items.filter(i => i.status === 'Pendiente' || i.status === 'En progreso').length,
    abandoned: items.filter(i => i.status === 'Abandono').length,
  }), [items]);

  const filtered = useMemo(() => {
    const allowed = VIEWS.find(v => v.key === view)?.statuses || [];
    let result = items.filter(item => {
      if (!allowed.includes(item.status)) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (item.title || '').toLowerCase().includes(s) ||
        (item.director || '').toLowerCase().includes(s) ||
        (item.title_alt || '').toLowerCase().includes(s) ||
        (item.genre1 || '').toLowerCase().includes(s) ||
        (item.genre2 || '').toLowerCase().includes(s) ||
        (item.synopsis || '').toLowerCase().includes(s);
    });

    result = [...result].sort((a, b) => {
      if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortKey === 'year') return (b.year || 0) - (a.year || 0);
      if (sortKey === 'rating') return (b.rating || 0) - (a.rating || 0);
      return String(b.created_date || '').localeCompare(String(a.created_date || ''));
    });

    return result;
  }, [items, search, sortKey, view]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clapperboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Pendientes</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'obra' : 'obras'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-9 w-52 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_date">Añadidas (recientes)</SelectItem>
              <SelectItem value="title">Título (A–Z)</SelectItem>
              <SelectItem value="year">Año de lanzamiento</SelectItem>
              <SelectItem value="rating">Nota</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segmented view */}
      <div className="flex gap-1.5 mb-6">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={cn(
              'text-sm px-3.5 py-1.5 rounded-lg border transition-all',
              view === v.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            )}
          >
            {v.label} <span className="opacity-70">· {counts[v.key]}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map(item => (
          <MediaCard key={item.id} item={item} onClick={setSelectedItem} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">
            {view === 'abandoned'
              ? (counts.abandoned === 0 ? 'No tienes obras abandonadas.' : 'No se encontraron abandonadas con esa búsqueda.')
              : (counts.active === 0 ? 'No tienes obras pendientes por ahora.' : 'No se encontraron pendientes con esa búsqueda.')}
          </p>
        </div>
      )}

      <MediaDetailSheet item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
