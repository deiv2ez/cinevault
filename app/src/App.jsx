import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Library from '@/pages/Library';
import AddNew from '@/pages/AddNew';
import Rankings from '@/pages/Rankings';
import Settings from '@/pages/Settings';
import Oracle from '@/pages/Oracle';
import Radar from '@/pages/Radar';
import WatchPicker from '@/pages/WatchPicker';
import Timeline from '@/pages/Timeline';
import SmartCollections from '@/pages/SmartCollections';
import DirectorLab from '@/pages/DirectorLab';
import AntonEgo from '@/pages/AntonEgo';
import HotTakes from '@/pages/HotTakes';

import WatchlistPurge from '@/pages/WatchlistPurge';
import Watchlist from '@/pages/Watchlist';
import CineDNA from '@/pages/CineDNA';
import Social from '@/pages/Social';
import Explore from '@/pages/Explore';
import Login from '@/pages/Login';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Si no hay sesión, mostrar la pantalla de acceso (Supabase).
  if (!isAuthenticated) {
    return <Login />;
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/library" element={<Library />} />
        <Route path="/add" element={<AddNew />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/oracle" element={<Oracle />} />
        <Route path="/radar" element={<Radar />} />
        <Route path="/picker" element={<WatchPicker />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/collections" element={<SmartCollections />} />
        <Route path="/lab" element={<DirectorLab />} />
        <Route path="/critic" element={<AntonEgo />} />
        <Route path="/hot-takes" element={<HotTakes />} />
        <Route path="/dna" element={<CineDNA />} />
        <Route path="/social" element={<Social />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/purge" element={<WatchlistPurge />} />
        <Route path="/watchlist" element={<Watchlist />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App