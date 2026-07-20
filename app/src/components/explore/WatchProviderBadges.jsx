import React from 'react';

const PROVIDER_MAP = {
  8: { name: 'Netflix', bg: 'bg-red-600' },
  119: { name: 'Prime', bg: 'bg-cyan-600' },
  337: { name: 'Disney+', bg: 'bg-blue-700' },
  384: { name: 'HBO Max', bg: 'bg-purple-700' },
  1899: { name: 'Max', bg: 'bg-purple-700' },
  149: { name: 'Filmin', bg: 'bg-orange-500' },
  62: { name: 'Mubi', bg: 'bg-neutral-800' },
  2: { name: 'Apple TV', bg: 'bg-gray-700' },
  350: { name: 'Apple TV+', bg: 'bg-gray-700' },
  1773: { name: 'SkyShowtime', bg: 'bg-blue-500' },
  567: { name: 'Filmin', bg: 'bg-orange-500' },
};

export default function WatchProviderBadges({ providers = [] }) {
  const known = providers
    .map(p => PROVIDER_MAP[p.provider_id])
    .filter(Boolean);

  if (known.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No disponible en streaming en España</p>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Ver en España:</span>
      {known.map(p => (
        <span
          key={p.name}
          className={`text-xs font-semibold text-white px-2.5 py-1 rounded-md ${p.bg}`}
        >
          {p.name}
        </span>
      ))}
    </div>
  );
}