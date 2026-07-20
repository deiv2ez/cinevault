import { useState, useEffect } from 'react';

const PROVIDER_LOGOS = {
  8: { name: 'Netflix', color: 'bg-red-600' },
  119: { name: 'Prime', color: 'bg-cyan-500' },
  337: { name: 'Disney+', color: 'bg-blue-700' },
  384: { name: 'HBO', color: 'bg-purple-700' },
  149: { name: 'Filmin', color: 'bg-orange-500' },
  62: { name: 'Mubi', color: 'bg-gray-800' },
  2: { name: 'Apple TV', color: 'bg-gray-700' },
  350: { name: 'Apple TV+', color: 'bg-gray-700' },
  1773: { name: 'SkyShowtime', color: 'bg-blue-500' },
};

const cache = {};

export function useWatchProviders(tmdbId, tmdbKey) {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
    if (!tmdbId || !tmdbKey) return;
    const cacheKey = `${tmdbId}`;
    if (cache[cacheKey] !== undefined) {
      setProviders(cache[cacheKey]);
      return;
    }

    // Stagger requests to avoid rate limiting
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${tmdbKey}`
        );
        const data = await res.json();
        const es = data?.results?.ES;
        const flatrate = es?.flatrate || [];
        const found = flatrate
          .map(p => PROVIDER_LOGOS[p.provider_id])
          .filter(Boolean)
          .slice(0, 3);
        cache[cacheKey] = found.length > 0 ? found : [];
        setProviders(found.length > 0 ? found : []);
      } catch {
        cache[cacheKey] = [];
        setProviders([]);
      }
    }, Math.random() * 800);

    return () => clearTimeout(timer);
  }, [tmdbId, tmdbKey]);

  return providers;
}