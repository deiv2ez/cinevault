# CineVault — Guía de despliegue (independiente de Base44)

Tu app ahora usa **Supabase** (base de datos + login) y **Vercel** (hosting), con una función
de IA opcional que usa **Google Gemini**. El frontend es idéntico al original.

## Qué ya está hecho
- Código migrado: el SDK de Base44 se ha sustituido por un cliente propio hacia Supabase.
- Base de datos Supabase creada con tus tablas (`media_items`, `friend_connections`), índices,
  disparadores y seguridad por usuario (RLS).
- Proyecto Supabase: `rzjhmnituyusxmetfrdf` (organización "deiv2ez's", región eu-west-1).

## Variables de entorno (se configuran en Vercel)
| Variable | Para qué | Dónde se obtiene |
|---|---|---|
| `VITE_SUPABASE_URL` | Conexión a tu base de datos | `https://rzjhmnituyusxmetfrdf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (segura con RLS) | Supabase → Settings → API Keys → **Publishable key** |
| `GEMINI_API_KEY` | IA (Oráculo, recomendaciones…) — opcional | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Modelo de IA (opcional) | por defecto `gemini-2.0-flash` |

## Pasos para desplegar
1. **Subir el código a GitHub** (repositorio nuevo, ej: `cinevault`).
2. **Vercel** → *Add New Project* → *Import* el repositorio de GitHub.
3. En la configuración del proyecto, framework: **Vite** (se detecta solo).
4. Añadir las variables de entorno de la tabla de arriba.
5. **Deploy**. Vercel instala dependencias, compila y publica. Te da una URL.
6. Abrir la URL en el PC y en el móvil, **crear tu cuenta** (email + contraseña) e iniciar sesión
   con la misma cuenta en ambos → tus datos se sincronizan.
7. **Importar tu biblioteca**: cargar tus 683 obras (ver paso de importación).

## Desarrollo local (opcional)
```bash
npm install
cp .env.example .env   # y rellena los valores
npm run dev
```

## Notas
- La IA es opcional: sin `GEMINI_API_KEY` el núcleo (biblioteca, notas, estadísticas, gráficas)
  funciona igual; solo las funciones de IA mostrarían un aviso.
- El nombre del modelo de Gemini puede cambiar con el tiempo; si la IA falla, ajusta `GEMINI_MODEL`.
- Los datos son 100% tuyos y exportables desde Supabase o desde la propia app (Ajustes → Exportar).
