import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Library, PlusCircle, Trophy, Settings, 
  ChevronLeft, ChevronRight, Sun, Moon, Film,
  Sparkles, Radar, Shuffle, Clock, Layers, FlaskConical,
  PenLine, Flame, Dna, Users, Clapperboard, Compass
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/library', label: 'Mi Biblioteca', icon: Library },
  { path: '/add', label: 'Añadir Nueva', icon: PlusCircle },
  { path: '/rankings', label: 'Rankings', icon: Trophy },
  { divider: true, label: 'Descubrir' },
  { path: '/oracle', label: 'El Oráculo IA', icon: Sparkles },
  { path: '/radar', label: 'Filmoradar', icon: Radar },
  { path: '/picker', label: '¿Qué veo hoy?', icon: Shuffle },
  { path: '/explore', label: 'Explorar', icon: Compass },
  { divider: true, label: 'Explorar' },
  { path: '/timeline', label: 'Mi Timeline', icon: Clock },
  { path: '/collections', label: 'Colecciones', icon: Layers },
  { path: '/lab', label: 'El Laboratorio', icon: FlaskConical },
  { divider: true, label: 'Pro' },
  { path: '/critic', label: 'Anton Ego', icon: PenLine },
  { path: '/hot-takes', label: 'Tus hot takes', icon: Flame },
  { path: '/dna', label: 'ADN Cinematográfico', icon: Dna },
  { path: '/social', label: 'Connect', icon: Users },
  { path: '/watchlist', label: 'Por ver', icon: Clapperboard },
  { divider: true, label: '' },
  { path: '/settings', label: 'Ajustes', icon: Settings },
];

export default function Sidebar({ onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out z-40",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground text-[15px] tracking-tight whitespace-nowrap">
              CineVault
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-0.5">
          {navItems.map((item, idx) => {
            if (item.divider) {
              if (collapsed) return <div key={idx} className="my-2 mx-3 h-px bg-sidebar-border" />;
              return item.label
                ? <p key={idx} className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest px-3 pt-4 pb-1">{item.label}</p>
                : <div key={idx} className="my-2 mx-1 h-px bg-sidebar-border" />;
            }

            const isActive = location.pathname === item.path;
            const linkContent = (
              <Link
                to={item.path}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-[18px] h-[18px] flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"
                )} strokeWidth={isActive ? 2 : 1.5} />
                {!collapsed && (
                  <span className="text-sm whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return <React.Fragment key={item.path}>{linkContent}</React.Fragment>;
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 pb-4 space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all w-full"
              >
                {theme === 'light' 
                  ? <Moon className="w-[20px] h-[20px] flex-shrink-0" strokeWidth={1.5} />
                  : <Sun className="w-[20px] h-[20px] flex-shrink-0" strokeWidth={1.5} />
                }
                {!collapsed && <span className="text-sm">{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all w-full"
              >
                {collapsed 
                  ? <ChevronRight className="w-[20px] h-[20px] flex-shrink-0" strokeWidth={1.5} />
                  : <ChevronLeft className="w-[20px] h-[20px] flex-shrink-0" strokeWidth={1.5} />
                }
                {!collapsed && <span className="text-sm">Colapsar</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Expandir</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}