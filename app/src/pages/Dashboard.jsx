import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useDeduplicatedItems } from '@/lib/useDeduplicatedItems';
import { Eye, Users, Layers, RefreshCw, ThumbsDown, Star, Sparkles, Radar, Shuffle, Clock, FlaskConical, PenLine, Flame, Dna, Clapperboard, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '@/components/dashboard/StatCard';
import ScatterPlot from '@/components/dashboard/ScatterPlot';
import TasteSummary from '@/components/dashboard/TasteSummary';
import HighlightHeatmap from '@/components/dashboard/HighlightHeatmap';
import TopRanking from '@/components/dashboard/TopRanking';
import HallOfFame from '@/components/dashboard/HallOfFame';
import HighlightsCloud from '@/components/dashboard/HighlightsCloud';

const QUICK_TOOLS = [
  { path: '/oracle', label: 'El Oráculo', desc: 'Sugerencias IA personalizadas', icon: Sparkles, color: 'text-primary bg-primary/10' },
  { path: '/radar', label: 'Filmoradar', desc: 'Estrenos del año', icon: Radar, color: 'text-amber-500 bg-amber-500/10' },
  { path: '/picker', label: '¿Qué veo hoy?', desc: 'Ruleta del watchlist', icon: Shuffle, color: 'text-chart-3 bg-chart-3/10' },
  { path: '/critic', label: 'Anton Ego', desc: 'Mi crítica y mi nota', icon: PenLine, color: 'text-chart-4 bg-chart-4/10' },
  { path: '/hot-takes', label: 'Tus hot takes', desc: 'Tu nota vs el público', icon: Flame, color: 'text-rose-500 bg-rose-500/10' },
  { path: '/dna', label: 'ADN Ciné', desc: 'Tu filosofía vital', icon: Dna, color: 'text-chart-5 bg-chart-5/10' },
  { path: '/watchlist', label: 'Pendientes', desc: 'Todo lo que tienes por ver', icon: Clapperboard, color: 'text-chart-3 bg-chart-3/10' },
  { path: '/timeline', label: 'Timeline', desc: 'Historia de visionado', icon: Clock, color: 'text-muted-foreground bg-muted' },
  { path: '/collections', label: 'Colecciones', desc: 'Grupos inteligentes', icon: Layers, color: 'text-chart-2 bg-chart-2/10' },
  { path: '/lab', label: 'El Laboratorio', desc: 'Deep dive directores', icon: FlaskConical, color: 'text-chart-2 bg-chart-2/10' },
  { path: '/social', label: 'Connect', desc: 'Doble Oráculo', icon: Users, color: 'text-chart-2 bg-chart-2/10' },
  { path: '/explore', label: 'Explorar', desc: 'Descubre por afinidad', icon: Compass, color: 'text-primary bg-primary/10' },
];

export default function Dashboard() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-items-all'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 5000),
  });

  const deduped = useDeduplicatedItems(items);
  // "Vistas" = terminadas de verdad (igual que en Mi Biblioteca). Excluye Pendiente, En progreso y Abandono.
  const WATCHED = ['Visto', 'Visto muchas veces', 'Favorito'];
  const watched = deduped.filter(i => WATCHED.includes(i.status));
  const uniqueDirectors = new Set(deduped.filter(i => i.director).map(i => i.director)).size;
  const genres = new Set(deduped.flatMap(i => [i.genre1, i.genre2]).filter(Boolean)).size;
  const rewatched = deduped.filter(i => i.status === 'Visto muchas veces').length;
  const pending = deduped.filter(i => i.status === 'Pendiente').length;
  const abandoned = deduped.filter(i => i.status === 'Abandono').length;
  const abandonRate = (watched.length + abandoned) > 0 ? ((abandoned / (watched.length + abandoned)) * 100).toFixed(1) : '0';
  const rated = deduped.filter(i => i.rating != null);
  const avgRating = rated.length > 0 ? (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(2) : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tu biblioteca en una mirada · {deduped.length} obras registradas
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total vistas" value={watched.length} icon={Eye} />
        <StatCard title="Directores" value={uniqueDirectors} icon={Users} />
        <StatCard title="Géneros" value={genres} icon={Layers} />
        <StatCard title="Revisionadas" value={rewatched} subtitle={`${pending} pendientes`} icon={RefreshCw} />
        <StatCard title="Tasa abandono" value={`${abandonRate}%`} icon={ThumbsDown} />
        <StatCard title="Nota media" value={avgRating} icon={Star} />
      </div>

      {/* Scatter Plot */}
      <ScatterPlot items={deduped} />

      {/* ADN Cinéfilo */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">ADN</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TasteSummary items={deduped} />
          <HighlightHeatmap items={deduped} />
        </div>
      </div>

      {/* Quick Tools */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Herramientas</h2>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_TOOLS.map(tool => (
            <Link
              key={tool.path}
              to={tool.path}
              className="bg-card border border-border rounded-xl p-3 md:p-4 hover:shadow-sm hover:border-primary/20 transition-all group min-h-[80px] md:min-h-[auto] flex flex-col"
            >
              <div className={`w-9 h-9 rounded-lg ${tool.color} flex items-center justify-center mb-2 md:mb-3`}>
                <tool.icon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <p className="text-xs md:text-sm font-semibold text-foreground leading-tight">{tool.label}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 leading-tight hidden sm:block">{tool.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Rankings and fame */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopRanking items={deduped} />
        <div className="space-y-6">
          <HallOfFame items={deduped} />
          <HighlightsCloud items={deduped} />
        </div>
      </div>
    </div>
  );
}