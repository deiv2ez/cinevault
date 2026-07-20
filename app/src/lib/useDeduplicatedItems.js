import { useMemo } from 'react';

const ARRIVAL_TITLES = new Set(['arrival', 'la llegada']);

/**
 * Deduplicates a MediaItem array:
 * - Merges "Arrival" / "La llegada" → keeps the one titled "Arrival"
 * - For other duplicates with the same tmdb_id, keeps the richest record
 */
export function useDeduplicatedItems(items = []) {
  return useMemo(() => {
    const seen = new Map();
    let arrivalCanonical = null;

    for (const item of items) {
      const normalTitle = (item.title || '').toLowerCase().trim();

      if (ARRIVAL_TITLES.has(normalTitle)) {
        // Prefer the English title, or the one with more data
        if (!arrivalCanonical) {
          arrivalCanonical = item;
        } else {
          const preferEnglish = item.title === 'Arrival';
          const richer = Object.values(item).filter(Boolean).length > Object.values(arrivalCanonical).filter(Boolean).length;
          if (preferEnglish || (!arrivalCanonical.title.toLowerCase().includes('arrival') && richer)) {
            arrivalCanonical = item;
          }
        }
        continue;
      }

      const key = item.tmdb_id ? `tmdb_${item.tmdb_id}` : `title_${normalTitle}_${item.year}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const prev = seen.get(key);
        const prevScore = Object.values(prev).filter(v => v != null && v !== '').length;
        const curScore = Object.values(item).filter(v => v != null && v !== '').length;
        if (curScore > prevScore) seen.set(key, item);
      }
    }

    const result = [...seen.values()];
    if (arrivalCanonical) result.push(arrivalCanonical);
    return result;
  }, [items]);
}