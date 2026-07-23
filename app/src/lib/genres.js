// Canonicaliza nombres de género para fusionar duplicados (mayús/minús, acentos, sinónimos).
// TMDB (es-ES) devuelve p. ej. "Bélica", "Suspense", "Ciencia ficción"; los unificamos.
const strip = (s) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const MAP = {
  'belico': 'Bélico',
  'belica': 'Bélico',
  'ciencia ficcion': 'Ciencia Ficción',
  'sci-fi': 'Ciencia Ficción',
  'science fiction': 'Ciencia Ficción',
  'suspense': 'Thriller',
  'thriller': 'Thriller',
};

export function canonGenre(g) {
  if (!g) return g;
  const k = strip(g);
  return MAP[k] || g;
}

// Aplica canonGenre a una lista, elimina vacíos y duplica-fusiona.
export function canonGenres(list) {
  const out = [];
  const seen = new Set();
  for (const g of (list || [])) {
    const c = canonGenre(g);
    if (c && !seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}
