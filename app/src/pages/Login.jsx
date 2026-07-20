import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

// Pantalla de acceso (reemplaza el login alojado de Base44).
// Con la misma cuenta puedes entrar en el PC y en el móvil: tus datos se sincronizan.
export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const data = await base44.auth.signUp(email.trim(), password);
        if (data?.session) {
          window.location.href = '/';
        } else {
          setInfo('Cuenta creada. Revisa tu email para confirmar el acceso y luego inicia sesión.');
          setMode('signin');
        }
      } else {
        await base44.auth.signInWithPassword(email.trim(), password);
        window.location.href = '/';
      }
    } catch (err) {
      setError(traducirError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
            C
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">CineVault</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tu biblioteca personal de cine</p>
        </div>

        <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-600 dark:text-emerald-400">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-60"
          >
            {loading ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
          </button>

          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            {mode === 'signup' ? '¿Ya tienes cuenta?' : '¿Primera vez?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); setInfo(null); }}
              className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              {mode === 'signup' ? 'Inicia sesión' : 'Crear una cuenta'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

function traducirError(msg) {
  if (!msg) return 'Ha ocurrido un error. Inténtalo de nuevo.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese email ya tiene cuenta. Inicia sesión.';
  if (m.includes('email not confirmed')) return 'Confirma tu email antes de entrar (revisa tu bandeja).';
  if (m.includes('password')) return 'La contraseña debe tener al menos 6 caracteres.';
  return msg;
}
