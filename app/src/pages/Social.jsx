import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Link2, Copy, CheckCircle2, Loader2, Zap, Star, Film, Sparkles, UserCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

function generateCode(name) {
  const clean = (name || 'USER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `CINEVAULT-${clean}-${rand}`;
}

function OracleCard({ film }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      <div className="flex gap-3 p-4">
        {film.poster_url ? (
          <img src={film.poster_url} className="w-14 h-20 rounded-lg object-cover flex-shrink-0" alt="" />
        ) : (
          <div className="w-14 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5 text-muted-foreground/30" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground">{film.title}</p>
          <p className="text-xs text-muted-foreground mb-1">{film.director} · {film.year}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {film.genre && <Badge variant="outline" className="text-[10px]">{film.genre}</Badge>}
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{film.reason}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Social() {
  const [user, setUser] = useState(null);
  const [myCode, setMyCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [oracleResult, setOracleResult] = useState(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ['media-items'],
    queryFn: () => base44.entities.MediaItem.list('-created_date', 500),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['friend-connections'],
    queryFn: () => base44.entities.FriendConnection.list('-created_date', 50),
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Find my connection: either I'm the owner or the friend
  const myConnection = connections.find(c =>
    (c.owner_email === user?.email || c.friend_email === user?.email) && c.status === 'connected'
  );

  const myPendingCode = connections.find(c => c.owner_email === user?.email && c.status === 'pending');

  const generateInvite = async () => {
    if (!user) return;
    const name = user.full_name?.split(' ')[0] || 'USER';
    const code = generateCode(name);
    const conn = await base44.entities.FriendConnection.create({
      owner_email: user.email,
      owner_name: user.full_name || name,
      invite_code: code,
      status: 'pending',
    });
    queryClient.invalidateQueries({ queryKey: ['friend-connections'] });
    setMyCode(code);
    toast.success('Código generado. ¡Compártelo con tu amigo!');
  };

  const joinWithCode = async () => {
    if (!joinCode.trim() || !user) return;
    setConnecting(true);
    const all = await base44.entities.FriendConnection.list('-created_date', 100);
    const target = all.find(c => c.invite_code === joinCode.trim().toUpperCase() && c.status === 'pending');
    if (!target) {
      toast.error('Código no encontrado o ya usado');
      setConnecting(false);
      return;
    }
    if (target.owner_email === user.email) {
      toast.error('No puedes conectarte contigo mismo');
      setConnecting(false);
      return;
    }
    await base44.entities.FriendConnection.update(target.id, {
      friend_email: user.email,
      friend_name: user.full_name || 'Amigo',
      status: 'connected',
    });
    queryClient.invalidateQueries({ queryKey: ['friend-connections'] });
    toast.success('¡Conectados! Ya podéis usar el Doble Oráculo.');
    setJoinCode('');
    setConnecting(false);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runDoubleOracle = async () => {
    if (!myConnection) return;
    setOracleLoading(true);
    setOracleResult(null);

    // My watched titles
    const myWatched = items
      .filter(i => i.status && i.status !== 'Pendiente')
      .map(i => i.title.toLowerCase());

    // Friend's items — fetch all and filter by their email
    const allItems = await base44.entities.MediaItem.list('-created_date', 1000);
    const friendEmail = myConnection.owner_email === user?.email
      ? myConnection.friend_email
      : myConnection.owner_email;
    const friendItems = allItems.filter(i => i.created_by === friendEmail);
    const friendWatched = friendItems
      .filter(i => i.status && i.status !== 'Pendiente')
      .map(i => i.title.toLowerCase());

    // Preferences
    const myTop = items.filter(i => i.rating >= 7).slice(0, 20);
    const friendTop = friendItems.filter(i => i.rating >= 7).slice(0, 20);

    const myPrefs = myTop.map(i => `${i.title} (★${i.rating}, ${i.genre1 || ''}, Dir: ${i.director || ''})`).join('; ');
    const friendPrefs = friendTop.map(i => `${i.title} (★${i.rating}, ${i.genre1 || ''}, Dir: ${i.director || ''})`).join('; ');

    const seen = [...new Set([...myWatched, ...friendWatched])];

    const data = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres un experto en recomendaciones cinematográficas. Dos amigos quieren ver una película juntos esta noche.

Películas ya vistas por cualquiera de los dos (DESCARTAR TODAS): ${seen.join(', ')}

Preferencias del Usuario 1 (películas con nota ≥ 7): ${myPrefs || 'No hay datos suficientes'}

Preferencias del Usuario 2 (películas con nota ≥ 7): ${friendPrefs || 'No hay datos suficientes'}

Propón exactamente 4 películas candidatas perfectas para ver juntos esta noche. Deben ser películas que NINGUNO de los dos haya visto, que crucen los gustos de ambos, y que sean una experiencia compartida memorable. Para cada candidata, explica por qué es perfecta para AMBOS, referenciando específicamente sus gustos.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          films: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                year: { type: 'number' },
                director: { type: 'string' },
                genre: { type: 'string' },
                poster_url: { type: 'string' },
                reason: { type: 'string', description: 'Por qué es perfecta para ambos (2-3 frases)' },
              }
            }
          }
        }
      }
    });

    setOracleResult(data?.films || []);
    setOracleLoading(false);
  };

  // Friend name display
  const friendName = myConnection
    ? (myConnection.owner_email === user?.email ? myConnection.friend_name : myConnection.owner_name)
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Amigos & Doble Oráculo</h1>
            <p className="text-sm text-muted-foreground">Conecta con un amigo y descubrid qué ver juntos</p>
          </div>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border">
        <Lock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Control de privacidad:</span> Con amigos enlazados solo se comparten Rankings, Películas Vistas y Notas numéricas.
          Los campos <span className="font-medium">Comentarios, Frase Favorita y "Vista en"</span> son siempre privados y nunca se comparten.
        </p>
      </div>

      {!myConnection ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Generate invite */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">Generar código de invitación</h3>
            </div>
            <p className="text-sm text-muted-foreground">Crea un código único y compártelo con tu amigo para que se una.</p>

            {myPendingCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <code className="flex-1 text-sm font-mono font-bold text-primary">{myPendingCode.invite_code}</code>
                  <button onClick={() => copyCode(myPendingCode.invite_code)} className="text-muted-foreground hover:text-foreground">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-amber-600">⏳ Esperando que tu amigo introduzca el código...</p>
              </div>
            ) : (
              <Button onClick={generateInvite} disabled={!user} className="w-full">
                <Link2 className="w-4 h-4 mr-2" /> Generar mi código
              </Button>
            )}
          </div>

          {/* Join with code */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-chart-2" />
              <h3 className="font-semibold text-foreground">Unirse con código</h3>
            </div>
            <p className="text-sm text-muted-foreground">Introduce el código que te ha dado tu amigo para conectaros.</p>
            <div className="space-y-2">
              <Input
                placeholder="CINEVAULT-XXXXX-XXXX"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button onClick={joinWithCode} disabled={!joinCode.trim() || connecting || !user} className="w-full" variant="outline">
                {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                {connecting ? 'Conectando...' : 'Unirme'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Connected status */}
          <div className="flex items-center gap-4 p-5 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Conectado con {friendName}</p>
              <p className="text-sm text-muted-foreground">Podéis usar el Doble Oráculo para encontrar vuestra película de esta noche.</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">Activo</Badge>
          </div>

          {/* Double Oracle */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-chart-3" />
                <h2 className="text-xl font-bold text-foreground">Doble Oráculo</h2>
                <Sparkles className="w-5 h-5 text-chart-3" />
              </div>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Cruza vuestras bases de datos, descarta todo lo que ya habéis visto y obtén las 4 películas perfectas para ver juntos esta noche.
              </p>
              <Button
                onClick={runDoubleOracle}
                disabled={oracleLoading}
                size="lg"
                className="min-w-[280px] bg-gradient-to-r from-chart-3/80 to-chart-4/80 hover:from-chart-3 hover:to-chart-4 text-white border-0"
              >
                {oracleLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Consultando el Oráculo...</>
                  : <><Zap className="w-4 h-4 mr-2" /> ¡Doble Oráculo!</>}
              </Button>
            </div>

            <AnimatePresence>
              {oracleResult && oracleResult.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-4 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    4 candidatas perfectas para vosotros
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {oracleResult.map((film, i) => (
                      <OracleCard key={i} film={film} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}