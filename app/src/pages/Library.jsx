import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import MediaCard from '@/components/library/MediaCard';
import MediaTable from '@/components/library/MediaTable';
import FilterSidebar from '@/components/library/FilterSidebar';
import MediaDetailSheet from '@/components/library/MediaDetailSheet';

const CURRENT_YEAR = new Date().getFullYear();

export default function Library() {
  const [view, setView] = useState('gallery');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'rating', direction: 'desc' });
  const [filters, setFilters] = useState({
    search: '', category: '', status: '', genres: [], director: '',
    minRating: 0, maxRating: 10, minYear: 1900, maxYear: CURRENT_YEAR,
    watchedAt: '', overrated: false, underrated: false, hasQuote: false, hasHighlights: false
  });

  const WATCHED_STATUSES = ['Visto', 'Visto muchas veces', 'Favorito'];

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items-library'],
    queryFn: async () => {
      const results = await Promise.all(
        WATCHED_STATUSES.map(status =>
          base44.entities.MediaItem.filter({ status }, '-rating', 5000)
        )
      );
      return results.flat();
    },
  });

  const genres = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.genre1) set.add(i.genre1); if (i.genre2) set.add(i.genre2); });
    return [...set].sort();
  }, [items]);

  const directors = useMemo(() => {
    const set = new Set();
    items.forEach(i => { if (i.director) set.add(i.director); });
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = items.filter(item => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const match = (item.title || '').toLowerCase().includes(s) ||
          (item.director || '').toLowerCase().includes(s) ||
          (item.title_alt || '').toLowerCase().includes(s) ||
          (item.comments || '').toLowerCase().includes(s) ||
          (item.favorite_quote || '').toLowerCase().includes(s) ||
          (item.synopsis || '').toLowerCase().includes(s) ||
          (item.watched_at || '').toLowerCase().includes(s);
        if (!match) return false;
      }
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status && item.status !== filters.status) return false;
      if ((filters.genres || []).length > 0) {
        const hasGenre = filters.genres.some(g => item.genre1 === g || item.genre2 === g);
        if (!hasGenre) return false;
      }
      if (filters.director && item.director !== filters.director) return false;
      const minR = filters.minRating ?? 0;
      const maxR = filters.maxRating ?? 10;
      if (minR > 0 || maxR < 10) {
        if (item.rating == null || item.rating < minR || item.rating > maxR) return false;
      }
      if (item.year != null && (item.year < (filters.minYear ?? 1900) || item.year > (filters.maxYear ?? CURRENT_YEAR))) return false;
      // Filtros por tus anotaciones
      if (filters.overrated && !item.overrated) return false;
      if (filters.underrated && !item.underrated) return false;
      if (filters.hasQuote && !(item.favorite_quote || '').trim()) return false;
      if (filters.hasHighlights && !((item.highlight1 || '').trim() || (item.highlight2 || '').trim() || (item.highlight3 || '').trim())) return false;
      if (filters.watchedAt) {
        const w = (item.watched_at || '').toLowerCase();
        if (!w.includes(filters.watchedAt.toLowerCase())) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const key = sortConfig.key;
      let aVal = key === 'watched_year' ? (a.watched_at ? parseInt(String(a.watched_at).match(/\b(19|20)\d{2}\b/)?.[0]) || 0 : 0) : a[key];
      let bVal = key === 'watched_year' ? (b.watched_at ? parseInt(String(b.watched_at).match(/\b(19|20)\d{2}\b/)?.[0]) || 0 : 0) : b[key];
      if (aVal == null || aVal === 0) return 1;
      if (bVal == null || bVal === 0) return -1;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      return sortConfig.direction === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return result;
  }, [items, filters, sortConfig]);

  const toggleDirection = () => setSortConfig(prev => ({
    ...prev,
    direction: prev.direction === 'asc' ? 'desc' : 'asc',
  }));

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
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Mi Biblioteca</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} obras encontradas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort selector */}
          <Select
            value={sortConfig.key}
            onValueChange={key => setSortConfig({ key, direction: 'desc' })}
          >
            <SelectTrigger className="h-9 w-44 text-sm">
              <SelectValue placeholder="Ordenar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Nota</SelectItem>
              <SelectItem value="year">Año de lanzamiento</SelectItem>
              <SelectItem value="watched_year">Año de visionado</SelectItem>
              <SelectItem value="title">Título (A–Z)</SelectItem>
              <SelectItem value="genre1">Género principal</SelectItem>
            </SelectContent>
          </Select>

          {/* Direction toggle */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={toggleDirection}
            title={sortConfig.direction === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}
          >
            {sortConfig.direction === 'desc'
              ? <ArrowDown className="w-4 h-4" />
              : <ArrowUp className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-muted")}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-md", view === 'gallery' && "bg-card shadow-sm")}
              onClick={() => setView('gallery')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-md", view === 'table' && "bg-card shadow-sm")}
              onClick={() => setView('table')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {showFilters && (
          <aside className="w-full md:w-[240px] flex-shrink-0 md:sticky md:top-4 md:self-start">
            <FilterSidebar filters={filters} setFilters={setFilters} genres={genres} directors={directors} />
          </aside>
        )}
        <div className="flex-1 min-w-0">
          {view === 'gallery' ? (
            <div className={cn(
              "grid gap-3 md:gap-4",
              showFilters
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            )}>
              {filtered.map(item => (
                <MediaCard key={item.id} item={item} onClick={setSelectedItem} />
              ))}
            </div>
          ) : (
            <MediaTable
              items={filtered}
              onItemClick={setSelectedItem}
              sortField={sortConfig.key}
              sortDir={sortConfig.direction}
              onSort={key => setSortConfig(prev => ({ key, direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'desc' }))}
            />
          )}
          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No se encontraron obras con estos filtros</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <MediaDetailSheet item={selectedItem} open={!!selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}