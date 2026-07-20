import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

// Contexto de autenticación con Supabase.
// Mantiene la MISMA interfaz que usaba la app con Base44 para no tocar App.jsx/ProtectedRoute.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState(null);

  const applySession = (session) => {
    if (session?.user) {
      const u = session.user;
      setUser({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
        ...u.user_metadata,
      });
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoadingAuth(false);
    setAuthChecked(true);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) applySession(data?.session);
    }).catch(() => {
      if (mounted) applySession(null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) applySession(session);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const checkUserAuth = async () => {
    const { data } = await supabase.auth.getSession();
    applySession(data?.session);
  };

  const checkAppState = checkUserAuth;

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/';
  };

  const navigateToLogin = () => {
    // No hay redirección externa: cuando no hay sesión, la app muestra la pantalla de Login.
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
