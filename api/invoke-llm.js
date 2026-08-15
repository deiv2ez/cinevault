// ============================================================
// Función serverless (Vercel) que reemplaza base44.integrations.Core.InvokeLLM
// Usa Google Gemini (tiene un plan gratuito). Devuelve directamente el
// objeto JSON con la forma pedida en response_json_schema.
//
// Variables de entorno necesarias en Vercel:
//   - GEMINI_API_KEY : clave de API de Google AI Studio (https://aistudio.google.com/apikey)
//   - GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4 : (opcional) claves
//                      adicionales GRATUITAS de OTROS proyectos de Google. Cada
//                      proyecto tiene su propia cuota diaria, así que rotar entre
//                      varias claves multiplica la cuota gratuita total.
//   - GEMINI_MODEL   : (opcional) modelo(s) preferido(s). Puede ser uno solo
//                      ("gemini-2.5-flash-lite") o una lista separada por comas.
//                      Se prueban en orden y, si se agota la cuota gratuita de uno
//                      (429), se pasa automáticamente al siguiente. Aunque no se
//                      configure, hay una cadena de "lite" por defecto (más cuota
//                      diaria gratuita).
//
// Estrategia ante 429 (cuota agotada): para cada modelo se prueban TODAS las
// claves; si todas fallan por cuota, se baja al siguiente modelo. Así se agota
// primero la capacidad del mejor modelo (mejor calidad) antes de degradar.
// ============================================================

// Vercel: amplía el límite de tiempo de la función (por defecto 10s en Hobby).
// Sin esto, las críticas largas de Anton Ego se cortaban por timeout y solo
// respondían las películas cuya generación era muy rápida.
export const config = { maxDuration: 60 };

function extractJson(text) {
  if (!text) return null;
  // Quita vallas de código ```json ... ```
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch (_) {
    // Intenta recortar entre la primera { y la última }
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      try { return JSON.parse(t.slice(first, last + 1)); } catch (_) { /* noop */ }
    }
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Recoge todas las claves disponibles (la principal + las adicionales opcionales).
  const rawKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
  ].map((k) => (k || '').trim()).filter(Boolean);
  const keys = [...new Set(rawKeys)];
  if (keys.length === 0) {
    res.status(500).json({ error: 'Falta GEMINI_API_KEY en el servidor' });
    return;
  }
  // Rotación: empezamos por una clave distinta en cada invocación para repartir
  // la carga (y no golpear siempre la misma con el límite por minuto).
  const startIdx = keys.length > 1 ? (Math.floor(Date.now() / 1000) % keys.length) : 0;
  const rotatedKeys = keys.map((_, i) => keys[(startIdx + i) % keys.length]);

  try {
    // Body puede venir como objeto (Vercel lo parsea) o como string.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt, response_json_schema, add_context_from_internet } = body;

    // ---- Cadena de modelos con "fallback" ----
    // La cuota gratuita de Gemini es POR MODELO: cada modelo tiene su propio
    // límite de peticiones/día. Si uno se agota (429), probamos el siguiente,
    // multiplicando de facto la capacidad gratuita disponible.
    // GEMINI_MODEL puede ser un único modelo o una lista separada por comas.
    const envModels = (process.env.GEMINI_MODEL || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    // Fallbacks fijos: variantes "lite" (mayor cuota diaria gratuita) primero.
    const FALLBACK_MODELS = [
      'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-flash-latest',
    ];
    // Modelos a probar en orden, sin duplicados. Los del env van primero.
    const models = [...new Set([...envModels, ...FALLBACK_MODELS])];

    const schemaHint = response_json_schema
      ? `\n\nResponde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown) que cumpla exactamente este esquema:\n${JSON.stringify(response_json_schema)}`
      : '\n\nResponde únicamente con JSON válido, sin texto adicional.';

    const payload = {
      contents: [{ role: 'user', parts: [{ text: (prompt || '') + schemaHint }] }],
      generationConfig: { temperature: 0.7 },
    };
    // Nota: el "grounding" con búsqueda de Google (google_search) requiere facturación
    // y no está en el plan gratuito, así que no se usa. El modelo responde con su
    // propio conocimiento (suficiente para recomendaciones/análisis de cine).
    void add_context_from_internet;

    // Extrae el retraso sugerido (ms) de un cuerpo de error 429 de Gemini.
    const parseRetryMs = (errTxt) => {
      let ms = 15000;
      try {
        const j = JSON.parse(errTxt);
        const det = (j.error?.details || []).find((d) => (d['@type'] || '').includes('RetryInfo'));
        if (det?.retryDelay) { const s = parseFloat(det.retryDelay); if (!isNaN(s)) ms = Math.round(s * 1000) + 500; }
      } catch { /* fallback al match de texto */ }
      const m = errTxt.match(/retry in ([\d.]+)s/i);
      if (m) ms = Math.round(parseFloat(m[1]) * 1000) + 500;
      return ms;
    };

    let minRetryMs = Infinity;   // menor espera sugerida entre los intentos con 429
    let lastErrTxt = '';         // último error (para diagnóstico)
    let lastStatus = 0;

    // Para cada modelo probamos todas las claves antes de degradar de modelo.
    for (const model of models) {
      for (const key of rotatedKeys) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        let r;
        try {
          r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } catch (netErr) {
          lastErrTxt = netErr?.message || 'error de red'; lastStatus = 0;
          continue; // probamos la siguiente clave / modelo
        }

        if (r.ok) {
          const data = await r.json();
          const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
          const json = extractJson(text);
          if (json === null) {
            // Si no se pudo parsear, devolvemos el texto crudo para no romper.
            res.status(200).json({ _raw: text });
            return;
          }
          res.status(200).json(json);
          return;
        }

        const errTxt = await r.text().catch(() => '');
        lastErrTxt = errTxt; lastStatus = r.status;
        if (r.status === 429) {
          // Cuota agotada con ESTA clave en ESTE modelo: probamos la siguiente clave.
          minRetryMs = Math.min(minRetryMs, parseRetryMs(errTxt));
          continue;
        }
        // Errores del modelo (404 inexistente, 400, etc.): no dependen de la clave,
        // así que saltamos directamente al siguiente MODELO.
        break;
      }
    }

    // Ningún modelo/clave respondió correctamente.
    if (minRetryMs !== Infinity) {
      // Todos (o los que fallaron) fue por cuota: devolvemos 429 + espera mínima.
      res.status(429).json({ error: 'rate_limited', retryAfterMs: minRetryMs, detail: String(lastErrTxt).slice(0, 300) });
      return;
    }
    res.status(502).json({ error: 'Error del proveedor de IA', status: lastStatus, detail: String(lastErrTxt).slice(0, 500) });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'error interno' });
  }
}
