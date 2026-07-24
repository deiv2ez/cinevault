// ============================================================
// Cliente "drop-in" que reemplaza al SDK de Base44 por Supabase.
// Mantiene EXACTAMENTE la misma forma de API que usaba la app
// (base44.entities.X, base44.auth.*, base44.integrations.Core.*)
// para que el resto del frontend no necesite cambios.
// ============================================================
import { supabase } from './supabaseClient';

// ---------- Utilidades ----------
// Convierte un "sort" estilo Base44 ('-created_date' / 'rating') en {column, ascending}
function parseSort(sort) {
  if (!sort || typeof sort !== 'string') return { column: 'created_date', ascending: false };
  if (sort.startsWith('-')) return { column: sort.slice(1), ascending: false };
  return { column: sort, ascending: true };
}

// Campos gestionados por la base de datos que el cliente no debe enviar al crear/actualizar.
const SYSTEM_FIELDS = ['id', 'user_id', 'created_by', 'created_date', 'updated_date', 'created_by_id', 'is_sample'];
function stripSystemFields(obj) {
  const clean = {};
  for (const k of Object.keys(obj || {})) {
    if (!SYSTEM_FIELDS.includes(k)) clean[k] = obj[k];
  }
  return clean;
}

// Fábrica de "entidad" con la misma API que Base44 (list/filter/create/bulkCreate/update/delete/get)
function makeEntity(table) {
  return {
    async list(sort = '-created_date', limit = 1000) {
      const { column, ascending } = parseSort(sort);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(column, { ascending })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },

    async filter(query = {}, sort = '-created_date', limit = 1000) {
      const { column, ascending } = parseSort(sort);
      let q = supabase.from(table).select('*');
      // Igualdades simples (ej: { status: 'Visto' })
      for (const [k, v] of Object.entries(query || {})) {
        q = q.eq(k, v);
      }
      const { data, error } = await q.order(column, { ascending }).limit(limit);
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(obj) {
      const { data, error } = await supabase
        .from(table)
        .insert(stripSystemFields(obj))
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async bulkCreate(arr) {
      const rows = (arr || []).map(stripSystemFields);
      const { data, error } = await supabase.from(table).insert(rows).select();
      if (error) throw error;
      return data || [];
    },

    async update(id, obj) {
      const { data, error } = await supabase
        .from(table)
        .update(stripSystemFields(obj))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  };
}

// ---------- Integraciones (IA y ficheros) ----------
// Mapa temporal para el flujo UploadFile -> ExtractDataFromUploadedFile (import XLSX local).
const _fileStore = new Map();

const Core = {
  // IA: llama a una función serverless (/api/invoke-llm) que usa el proveedor configurado.
  async InvokeLLM({ prompt, response_json_schema, add_context_from_internet, model } = {}) {
    const body = JSON.stringify({ prompt, response_json_schema, add_context_from_internet, model });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const maxAttempts = 4; // 1 intento + 3 reintentos ante el límite por minuto del free tier
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await fetch('/api/invoke-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) return res.json(); // objeto JSON con la forma de response_json_schema

      // Límite de cuota (429): reintentar esperando lo que indique el servidor.
      if (res.status === 429) {
        let serverMs = 0;
        try { const j = await res.clone().json(); if (j.retryAfterMs) serverMs = Number(j.retryAfterMs); } catch { /* noop */ }
        // Espera muy larga (cuota diaria): no tiene sentido reintentar.
        if (serverMs > 65000) throw new Error('Límite diario de la IA gratuita alcanzado. Reintenta más tarde (o mañana).');
        if (attempt < maxAttempts) {
          const waitMs = Math.min(Math.max(serverMs || 12000, 3000), 30000);
          await sleep(waitMs);
          continue;
        }
        throw new Error('La IA gratuita está saturada ahora mismo. Espera ~1 minuto y reintenta.');
      }

      const txt = await res.text().catch(() => '');
      throw new Error('IA no disponible (' + res.status + '). ' + txt.slice(0, 200));
    }
  },

  // Subida de fichero: guardamos el File en memoria y devolvemos una referencia local.
  async UploadFile({ file }) {
    const ref = 'local://' + Math.random().toString(36).slice(2) + '-' + (file?.name || 'file');
    _fileStore.set(ref, file);
    return { file_url: ref };
  },

  // Extracción de datos de XLSX/CSV en el propio navegador (SheetJS), sin servidor ni IA.
  async ExtractDataFromUploadedFile({ file_url }) {
    try {
      const file = _fileStore.get(file_url);
      if (!file) return { status: 'error', details: 'archivo no encontrado' };
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const items = rows.map(mapRowToItem).filter((i) => i.title);
      _fileStore.delete(file_url);
      return { status: 'success', output: { items } };
    } catch (e) {
      return { status: 'error', details: e?.message || 'error al leer el archivo' };
    }
  },
};

// Mapea una fila de hoja de cálculo (cabeceras en español o inglés) a un MediaItem.
function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && String(row[k]).trim() !== '') return String(row[k]).trim();
  }
  return undefined;
}
function mapRowToItem(row) {
  const num = (v) => (v === undefined || v === '' ? undefined : Number(String(v).replace(',', '.')));
  const bool = (v) => (v === undefined ? undefined : /^(1|true|s[ií]|yes|x)$/i.test(String(v).trim()));
  return {
    title: pick(row, ['Título', 'Titulo', 'title', 'Title']),
    title_alt: pick(row, ['Título alternativo', 'title_alt']),
    year: num(pick(row, ['Año', 'Ano', 'year', 'Year'])),
    rating: num(pick(row, ['Nota', 'rating', 'Rating', 'Puntuación', 'Puntuacion'])),
    category: pick(row, ['Categoría', 'Categoria', 'category', 'Tipo']),
    director: pick(row, ['Director', 'director']),
    genre1: pick(row, ['Género 1', 'Genero 1', 'genre1', 'Género', 'Genero']),
    genre2: pick(row, ['Género 2', 'Genero 2', 'genre2']),
    status: pick(row, ['Estado', 'status', 'Status']),
    comments: pick(row, ['Comentarios', 'comments', 'Reseña', 'Resena']),
    highlight1: pick(row, ['Aspecto a destacar 1', 'highlight1', 'Destacado 1']),
    highlight2: pick(row, ['Aspecto a destacar 2', 'highlight2', 'Destacado 2']),
    highlight3: pick(row, ['Aspecto a destacar 3', 'highlight3', 'Destacado 3']),
    favorite_quote: pick(row, ['Frase favorita', 'favorite_quote', 'Frase Favorita']),
    watched_at: pick(row, ['Vista en', 'watched_at', 'Visto en']),
    country: pick(row, ['País', 'Pais', 'country']),
    synopsis: pick(row, ['Sinopsis', 'synopsis']),
    poster_url: pick(row, ['poster_url', 'Poster', 'poster']),
    overrated: bool(pick(row, ['Sobrevalorada', 'overrated'])),
    underrated: bool(pick(row, ['Infravalorada', 'underrated'])),
  };
}

// ---------- Autenticación (misma API que base44.auth) ----------
const auth = {
  // Devuelve el usuario actual (con .email, .id). Lanza error tipo 401 si no hay sesión.
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const err = new Error('No autenticado');
      err.status = 401;
      throw err;
    }
    const u = data.user;
    return {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
      ...u.user_metadata,
    };
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = '/';
  },

  redirectToLogin() {
    // El login se muestra dentro de la app cuando no hay sesión (ver App.jsx / AuthContext).
    window.location.href = '/';
  },

  // Métodos extra usados por la nueva pantalla de login.
  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
};

// ---------- Objeto base44 (misma forma que el SDK original) ----------
export const base44 = {
  entities: {
    MediaItem: makeEntity('media_items'),
    FriendConnection: makeEntity('friend_connections'),
  },
  integrations: { Core },
  auth,
};

export default base44;
