import { createClient } from '@supabase/supabase-js';

// Configuración vía variables de entorno (Vite las inyecta en el build).
// - VITE_SUPABASE_URL: URL del proyecto (ej: https://xxxx.supabase.co)
// - VITE_SUPABASE_ANON_KEY: clave "publishable"/anon (segura en el navegador con RLS activado)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Aviso claro en consola si falta la configuración.
  console.error(
    '[CineVault] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Configúralas en las variables de entorno (Vercel) o en un archivo .env local.'
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
