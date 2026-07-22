import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, Clapperboard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MediaCard from '@/components/library/MediaCard';
import MediaDetailSheet from '@/components/library/MediaDetailSheet';

// Página "Por ver": lista todas las obras con estado "Pendiente" (y "En progreso")
// juntas, para poder repasarlas de un vistazo. Sustituye a "Purgar Pendientes".
const WATCHLIST_STATUSES = ['Pendiente', 'En progreso'];

export default function Watchlist() {
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_date');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items-watchlist'],
    queryFn: async () => {
      const results = await Promise.all(
        WATCHLIST_STATUSES.map(status =>
          base44.entities.MediaItem.filter({ status }, '-created_date', 5000)
        )
      );
      return results.flat();
    },
  });

  const filtered = useMemo(() => {
    let result = items.filter(item => {
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
      // created_date (más recientes primero)
      return String(b.created_date || '').localeCompare(String(a.created_date || ''));
    });

    return result;
  }, [items, search, sortKey]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clapperboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Por ver</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} {filtered.length === 1 ? 'obra pendiente' : 'obras pendientes'}
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

      {/* Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filtered.map(item => (
          <MediaCard key={item.id} item={item} onClick={setSelectedItem} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">
            {items.length === 0
              ? 'No tienes obras pendientes por ahora.'
              : 'No se encontraron pendientes con esa búsqueda.'}
          </p>
        </div>
      )}

      <MediaDetailSheet item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
