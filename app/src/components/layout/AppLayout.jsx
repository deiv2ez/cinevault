import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileMenuDrawer from './MobileMenuDrawer';
import { Menu, Film } from 'lucide-react';

export default function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile full-screen drawer */}
      <MobileMenuDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Mobile sticky top bar */}
        <div className="sticky top-0 z-40 md:hidden flex items-center justify-between px-4 h-14
                        bg-background/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Film className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-[17px] tracking-tight">CineVault</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-muted text-muted-foreground"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Page content — extra bottom padding for BottomNav on mobile */}
        <div className="pb-[env(safe-area-inset-bottom)] md:pb-0">
          <div className="pb-20 md:pb-0">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Bottom Nav — mobile only */}
      <BottomNav />
    </div>
  );
}