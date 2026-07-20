import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function DeduplicateLibrary() {
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const findDuplicates = async () => {
    setLoading(true);
    const all = await base44.entities.MediaItem.list('-created_date', 5000);

    // Group by key: title (lowercase) + director + year
    const groups = {};
    all.forEach(item => {
      const key = [
        (item.title || '').toLowerCase().trim(),
        (item.director || '').toLowerCase().trim(),
        item.year || '',
      ].join('||');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    // Only keep groups with more than 1 item
    const dupes = Object.values(groups).filter(g => g.length > 1);
    setDuplicates(dupes);
    setLoading(false);

    if (dupes.length === 0) {
      toast.success('¡No se encontraron duplicados en tu biblioteca!');
    } else {
      toast.warning(`Encontrados ${dupes.length} grupos de duplicados (${dupes.reduce((s, g) => s + g.length - 1, 0)} registros sobrantes)`);
    }
  };

  const deleteDuplicates = async () => {
    if (!duplicates) return;
    setDeleting(true);

    // For each group, keep the one with the most data (most non-null fields), delete the rest
    let deletedCount = 0;
    for (const group of duplicates) {
      const scored = group.map(item => ({
        item,
        score: Object.values(item).filter(v => v != null && v !== '').length,
      }));
      scored.sort((a, b) => b.score - a.score);
      const toDelete = scored.slice(1).map(s => s.item);
      for (const item of toDelete) {
        await base44.entities.MediaItem.delete(item.id);
        deletedCount++;
      }
    }

    queryClient.invalidateQueries();
    setDuplicates(null);
    setDeleting(false);
    toast.success(`${deletedCount} duplicados eliminados. Se conservó el registro más completo de cada grupo.`);
  };

  const totalDupes = duplicates ? duplicates.reduce((s, g) => s + g.length - 1, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={findDuplicates} disabled={loading || deleting}>
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...</>
            : <><Copy className="w-4 h-4 mr-2" /> Buscar Duplicados</>}
        </Button>

        {duplicates && duplicates.length > 0 && (
          <Button variant="destructive" onClick={deleteDuplicates} disabled={deleting}>
            {deleting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</>
              : <><Trash2 className="w-4 h-4 mr-2" /> Eliminar {totalDupes} sobrantes</>}
          </Button>
        )}

        {duplicates && duplicates.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle2 className="w-4 h-4" />
            Sin duplicados
          </div>
        )}
      </div>

      {duplicates && duplicates.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-lg p-3 bg-muted/30">
          {duplicates.map((group, i) => (
            <div key={i} className="text-xs">
              <span className="font-semibold text-foreground">{group[0].title}</span>
              <span className="text-muted-foreground ml-1">
                ({group[0].director || 'sin director'}, {group[0].year || '—'}) · {group.length} copias
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}