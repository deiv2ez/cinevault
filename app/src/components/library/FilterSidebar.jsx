import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Search } from 'lucide-react';

const CATEGORIES = ['Película', 'Serie', 'Documental', 'Libro', 'Cortometraje', 'Anime', 'Otro'];
const STATUSES = ['Visto', 'Visto muchas veces', 'Pendiente', 'Abandono', 'Favorito', 'En progreso'];

export default function FilterSidebar({ filters, setFilters, genres, directors }) {
  const update = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const clear = () => setFilters({
    search: '', category: '', status: '', genres: [], director: '',
    minRating: 0, maxRating: 10, minYear: 1900, maxYear: 2026
  });

  const toggleGenre = (genre) => {
    const current = filters.genres || [];
    const next = current.includes(genre) ? current.filter(g => g !== genre) : [...current, genre];
    update('genres', next);
  };

  const hasFilters = filters.search || filters.category || filters.status ||
    (filters.genres || []).length > 0 || filters.director ||
    filters.minRating > 0 || filters.maxRating < 10 ||
    filters.minYear > 1900 || filters.maxYear < 2026;

  const currentYear = 2026;

  return (
    <div className="space-y-5">
      {/* Search full-text */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Título, director, comentarios..."
          value={filters.search}
          onChange={e => update('search', e.target.value)}
          className="pl-9 bg-card text-sm"
        />
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Categoría</label>
        <Select value={filters.category || 'all'} onValueChange={v => update('category', v === 'all' ? '' : v)}>
          <SelectTrigger className="bg-card text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Status</label>
        <Select value={filters.status || 'all'} onValueChange={v => update('status', v === 'all' ? '' : v)}>
          <SelectTrigger className="bg-card text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Genres multi-select chips */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Géneros</label>
        <div className="flex flex-wrap gap-1.5">
          {genres.map(g => {
            const active = (filters.genres || []).includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Director */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Director</label>
        <Select value={filters.director || 'all'} onValueChange={v => update('director', v === 'all' ? '' : v)}>
          <SelectTrigger className="bg-card text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {directors.slice(0, 80).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Rating range */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Nota: {(filters.minRating ?? 0).toFixed(1)} – {(filters.maxRating ?? 10).toFixed(1)}
        </label>
        <Slider
          value={[filters.minRating ?? 0, filters.maxRating ?? 10]}
          onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minRating: min, maxRating: max }))}
          min={0} max={10} step={0.5}
        />
      </div>

      {/* Year range */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Año: {filters.minYear ?? 1900} – {filters.maxYear ?? currentYear}
        </label>
        <Slider
          value={[filters.minYear ?? 1900, filters.maxYear ?? currentYear]}
          onValueChange={([min, max]) => setFilters(prev => ({ ...prev, minYear: min, maxYear: max }))}
          min={1900} max={currentYear} step={1}
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="w-full text-muted-foreground">
          <X className="w-3.5 h-3.5 mr-1.5" /> Limpiar filtros
        </Button>
      )}
    </div>
  );
}