// Utilidades compartidas para hablar con la API de TMDB.
// La clave se guarda en localStorage ('tmdb_api_key') desde Ajustes.

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

export function getTmdbKey() {
  try { return localStorage.getItem('tmdb_api_key') || ''; } catch { return ''; }
}

export function posterFrom(path, size = 'w500') {
  return path ? `${IMG}/${size}${path}` : '';
}

// Busca la mejor coincidencia para un título (y año opcional). Devuelve el resultado crudo de TMDB o null.
export async function searchBest(title, year, key = getTmdbKey()) {
  if (!key || !title) return null;
  try {
    const q = encodeURIComponent(title);
    const yr = year ? `&year=${year}` : '';
    const res = await fetch(`${BASE}/search/movie?api_key=${key}&query=${q}${yr}&language=es-ES&include_adult=false`);
    const data = await res.json();
    let results = data.results || [];
    // Si se pidió año, prioriza coincidencia exacta de año
    if (year && results.length) {
      const exact = results.filter(r => (r.release_date || '').startsWith(String(year)));
      if (exact.length) results = exact;
    }
    return results[0] || null;
  } catch { return null; }
}

// Devuelve solo la URL del póster real para un título.
export async function fetchPoster(title, year, key = getTmdbKey()) {
  const hit = await searchBest(title, year, key);
  return hit ? posterFrom(hit.poster_path) : '';
}

// Detalles ampliados (director, país, géneros, nota pública) de un id de TMDB.
export async function fetchDetails(id, key = getTmdbKey()) {
  if (!key || !id) return null;
  try {
    const [detail, credits] = await Promise.all([
      fetch(`${BASE}/movie/${id}?api_key=${key}&language=es-ES`).then(r => r.json()),
      fetch(`${BASE}/movie/${id}/credits?api_key=${key}&language=es-ES`).then(r => r.json()),
    ]);
    const director = (credits.crew || []).find(c => c.job === 'Director')?.name || '';
    const country = detail.production_countries?.[0]?.iso_3166_1 || detail.origin_country?.[0] || '';
    const genres = (detail.genres || []).map(g => g.name);
    return {
      director,
      country,
      genres,
      year: detail.release_date ? parseInt(detail.release_date.slice(0, 4)) : null,
      synopsis: detail.overview || '',
      poster_url: posterFrom(detail.poster_path),
      tmdb_rating: typeof detail.vote_average === 'number' ? Math.round(detail.vote_average * 10) / 10 : null,
      tmdb_id: String(detail.id),
    };
  } catch { return null; }
}

// Mapa géneros id -> nombre (cacheado en memoria).
let _genreMap = null;
export async function genreMap(key = getTmdbKey()) {
  if (_genreMap) return _genreMap;
  if (!key) return {};
  try {
    const res = await fetch(`${BASE}/genre/movie/list?api_key=${key}&language=es-ES`);
    const data = await res.json();
    _genreMap = Object.fromEntries((data.genres || []).map(g => [g.id, g.name]));
    return _genreMap;
  } catch { return {}; }
}

// Estrenos reales para Filmoradar: próximos + populares del año actual y siguiente.
export async function fetchRadarReleases(key = getTmdbKey(), year = new Date().getFullYear()) {
  if (!key) return [];
  const gmap = await genreMap(key);
  const urls = [
    `${BASE}/movie/upcoming?api_key=${key}&language=es-ES&region=ES&page=1`,
    `${BASE}/discover/movie?api_key=${key}&language=es-ES&sort_by=popularity.desc&primary_release_year=${year}&vote_count.gte=20&page=1`,
    `${BASE}/discover/movie?api_key=${key}&language=es-ES&sort_by=popularity.desc&primary_release_year=${year + 1}&page=1`,
  ];
  let all = [];
  try {
    const responses = await Promise.all(urls.map(u => fetch(u).then(r => r.json()).catch(() => ({}))));
    for (const r of responses) all = all.concat(r.results || []);
  } catch { /* noop */ }
  // dedupe por id
  const seen = new Set();
  const dedup = [];
  for (const m of all) {
    if (!m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    dedup.push(m);
  }
  // ordena por popularidad y limita
  dedup.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  const top = dedup.slice(0, 18);
  // enriquece con director (una llamada de credits por película)
  const enriched = await Promise.all(top.map(async (m) => {
    let director = '';
    try {
      const credits = await fetch(`${BASE}/movie/${m.id}/credits?api_key=${key}&language=es-ES`).then(r => r.json());
      director = (credits.crew || []).find(c => c.job === 'Director')?.name || '';
    } catch { /* noop */ }
    return {
      title: m.title || m.original_title,
      director,
      year: m.release_date ? parseInt(m.release_date.slice(0, 4)) : null,
      release_date: m.release_date || '',
      genres: (m.genre_ids || []).map(id => gmap[id]).filter(Boolean),
      poster_url: posterFrom(m.poster_path),
      synopsis: m.overview || '',
      category: 'Película',
      tmdb_rating: typeof m.vote_average === 'number' ? Math.round(m.vote_average * 10) / 10 : null,
    };
  }));
  return enriched;
}
