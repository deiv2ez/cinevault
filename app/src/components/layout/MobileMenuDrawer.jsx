import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Library, PlusCircle, Trophy, Settings,
  Sparkles, Radar, Shuffle, Clock, Layers, FlaskConical,
  PenLine, Flame, Dna, Users, Clapperboard, Compass, X, Sun, Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/ThemeContext';

const allNav = [
  { path: '/',            label: 'Dashboard',           icon: LayoutDashboard },
  { path: '/library',     label: 'Mi Biblioteca',       icon: Library },
  { path: '/add',         label: 'Añadir Nueva',        icon: PlusCircle },
  { path: '/rankings',    label: 'Rankings',            icon: Trophy },
  { divider: 'Descubrir' },
  { path: '/oracle',      label: 'El Oráculo IA',       icon: Sparkles },
  { path: '/radar',       label: 'Filmoradar',          icon: Radar },
  { path: '/picker',      label: '¿Qué veo hoy?',       icon: Shuffle },
  { divider: 'Apuntes' },
  { path: '/timeline',    label: 'Mi Timeline',         icon: Clock },
  { path: '/collections', label: 'Colecciones',         icon: Layers },
  { path: '/lab',         label: 'El Laboratorio',      icon: FlaskConical },
  { divider: 'Pro' },
  { path: '/critic',      label: 'Anton Ego',           icon: PenLine },
  { path: '/hot-takes',   label: 'Tus hot takes',       icon: Flame },
  { path: '/dna',         label: 'ADN Cinematográfico', icon: Dna },
  { path: '/social',      label: 'Connect',             icon: Users },
  { path: '/watchlist',   label: 'Pendientes',          icon: Clapperboard },
  { divider: '' },
  { path: '/settings',    label: 'Ajustes',             icon: Settings },
];

export default function MobileMenuDrawer({ open, onClose }) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-sm bg-background flex flex-col md:hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-xl font-bold text-foreground">Menú</span>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {allNav.map((item, idx) => {
            if ('divider' in item) {
              return item.divider
                ? <p key={idx} className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-5 pb-1">{item.divider}</p>
                : <div key={idx} className="my-2 mx-1 h-px bg-border" />;
            }
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-4 px-4 rounded-xl min-h-[52px] transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-foreground/75 hover:bg-muted'
                )}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-primary' : 'text-muted-foreground')} strokeWidth={active ? 2 : 1.5} />
                <span className="text-base">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-4 px-4 w-full min-h-[52px] rounded-xl text-foreground/75 hover:bg-muted transition-colors"
          >
            {theme === 'light'
              ? <Moon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              : <Sun className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />}
            <span className="text-base">{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>
          </button>
        </div>
      </div>
    </>
  );
}