// ============================================================
// Función serverless (Vercel) que reemplaza base44.integrations.Core.InvokeLLM
// Usa Google Gemini (tiene un plan gratuito). Devuelve directamente el
// objeto JSON con la forma pedida en response_json_schema.
//
// Variables de entorno necesarias en Vercel:
//   - GEMINI_API_KEY : clave de API de Google AI Studio (https://aistudio.google.com/apikey)
//   - GEMINI_MODEL   : (opcional) modelo a usar. Por defecto "gemini-2.0-flash".
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Falta GEMINI_API_KEY en el servidor' });
    return;
  }

  try {
    // Body puede venir como objeto (Vercel lo parsea) o como string.
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { prompt, response_json_schema, add_context_from_internet } = body;
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errTxt = await r.text().catch(() => '');
      res.status(502).json({ error: 'Error del proveedor de IA', detail: errTxt.slice(0, 500) });
      return;
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    const json = extractJson(text);

    if (json === null) {
      // Si no se pudo parsear, devolvemos el texto crudo para no romper.
      res.status(200).json({ _raw: text });
      return;
    }
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: e?.message || 'error interno' });
  }
}
