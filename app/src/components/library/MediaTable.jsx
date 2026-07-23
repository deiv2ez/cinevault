import React from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusColors = {
  'Visto': 'bg-chart-2/15 text-chart-2',
  'Visto muchas veces': 'bg-chart-1/15 text-chart-1',
  'Pendiente': 'bg-chart-3/15 text-chart-3',
  'Abandono': 'bg-destructive/15 text-destructive',
  'Favorito': 'bg-amber-500/15 text-amber-600',
  'En progreso': 'bg-chart-4/15 text-chart-4',
};

export default function MediaTable({ items, onItemClick, sortField, sortDir, onSort }) {
  const SortHeader = ({ field, children }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors text-xs"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </TableHead>
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-x-auto">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 text-xs"></TableHead>
            <SortHeader field="title">Título</SortHeader>
            <SortHeader field="year">Año</SortHeader>
            <SortHeader field="rating">Nota</SortHeader>
            <SortHeader field="director">Director</SortHeader>
            <TableHead className="text-xs">Género</TableHead>
            <SortHeader field="status">Estado</SortHeader>
            <SortHeader field="category">Categoría</SortHeader>
            <TableHead className="text-xs">País</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => onItemClick?.(item)}
            >
              <TableCell className="py-2">
                {item.poster_url ? (
                  <img src={item.poster_url} className="w-8 h-11 rounded object-cover" alt="" />
                ) : (
                  <div className="w-8 h-11 rounded bg-muted" />
                )}
              </TableCell>
              <TableCell className="font-medium text-sm max-w-[200px] truncate">{item.title}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{item.year || '—'}</TableCell>
              <TableCell>
                {item.rating != null ? (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                  </div>
                ) : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{item.director || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{[item.genre1, item.genre2].filter(Boolean).join(', ') || '—'}</TableCell>
              <TableCell>
                {item.status && (
                  <Badge variant="secondary" className={`text-[10px] ${statusColors[item.status] || ''}`}>
                    {item.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{item.category || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{item.country || '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}