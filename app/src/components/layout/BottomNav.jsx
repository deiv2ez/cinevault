import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Library, PlusCircle, Compass, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/',        label: 'Inicio',     icon: LayoutDashboard },
  { path: '/library', label: 'Biblioteca', icon: Library },
  { path: '/add',     label: 'Añadir',     icon: PlusCircle },
  { path: '/explore', label: 'Explorar',   icon: Compass },
  { path: '/social',  label: 'Connect',    icon: Users },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden
                 bg-background/95 backdrop-blur-md border-t border-border
                 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex flex-col items-center justify-center flex-1 gap-1 min-h-[56px] py-2 transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon
              className={cn('w-[26px] h-[26px]', active && 'text-primary')}
              strokeWidth={active ? 2.2 : 1.6}
            />
            <span className={cn('text-[11px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}