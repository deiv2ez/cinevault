// ============================================================
// "Cerebro" compartido de Anton Ego: voz, reglas de calibración y construcción
// del prompt de predicción. Lo usan tanto la página Anton Ego como el ADN
// (para backtestear las películas recomendadas con la misma vara de medir).
// ============================================================
import { base44 } from '@/api/base44Client';
import { canonGenre } from '@/lib/genres';

// Voz del alter-ego crítico. Sobria, exigente, profunda pero no excesiva.
export const CRITIC_VOICE = `Anton Ego es el alter-ego crítico del espectador: un cinéfilo pragmático, exigente pero nunca cínico, de voz sobria, terrenal y directa. Escribe en primera persona ("Yo..."), con criterio y sin palabrería. Le importa el cine como oficio: valora la buena ejecución técnica (guion, dirección, interpretación, montaje, atmósfera), el ritmo bien medido y los desarrollos a fuego lento por encima del espectáculo vacío. Da mucho peso a la LÓGICA y la COHERENCIA: premia que los personajes tomen decisiones con sentido y evolucionen de forma creíble, y castiga las conveniencias de guion, los agujeros y las decisiones ilógicas. Aprecia la profundidad, pero NO todas sus críticas giran sobre la moral o el sentido de la vida: equilibra el fondo con lo tangible. NO usa ningún nombre propio.`;

// Ajuste de pesos aprendido internamente (backtesting silencioso de sus falsos positivos).
export const WEIGHT_RULES = `Ajuste de pesos (aprendido de sus errores y de su gusto real):
- NO subas la nota por el mero prestigio del director ni por la intensidad emocional.
- MATIZ IMPORTANTE sobre el espectáculo: el espectáculo y la acción BIEN EJECUTADOS (con oficio, tensión real, acción práctica y coherencia) SÍ le encantan y suben la nota (ejemplo: le fascina "Top Gun: Maverick"). Lo que penaliza es el espectáculo VACÍO, sin oficio ni coherencia.
- Penaliza con dureza la PRETENCIOSIDAD estética sin sustancia y el metraje inflado: la belleza visual o la "trascendencia" NO rescatan una película si el ritmo es imposible y hay relleno (ejemplo: "El árbol de la vida" le parece preciosa pero pesadísima e inflada).
- Antes de valorar alto comprueba: ¿el ritmo se sostiene o hay relleno?, ¿las decisiones de los personajes tienen lógica o son conveniencias de guion?, ¿pasan cosas o "pasa poco"?, ¿la ambición cuaja en una película coherente o es un ejercicio de estilo hueco? Si falla algo de esto, BAJA la nota aunque la obra sea prestigiosa, espectacular o "profunda". Sé analíticamente preciso, no complaciente.`;

// Señales de gusto declaradas por el espectador (mini-test). Se amplía de cuando en cuando.
export const TASTE_SIGNALS = `Señales de gusto declaradas por el espectador (úsalas para afinar la predicción):
- "El árbol de la vida" (Malick): admira su estética y sus planos, pero la considera pretenciosa, inflada e "imposible de ver sin saltártela"; le sirve de "detector de soplapollas cinéfilos". → castiga la pretenciosidad vacía y el ritmo imposible aunque haya belleza.
- "Top Gun: Maverick": le encanta ("así es como se rueda una película de acción"). → premia el espectáculo y la acción BIEN EJECUTADOS.
- "Hereditary": no le gustó; en general el terror no es lo suyo salvo excepciones. Le molesta el guion mediocre, que "pase poco" y los sustos sin sentido; en cambio valora la estética y los finales potentes (le gustó la estética y el final de "Midsommar"). → con el terror, exige guion sólido, ritmo y estética; penaliza el susto gratuito.`;

export const STYLE_RULES = `Directrices de estilo (mantenlas SIEMPRE):
- Equilibrio: mezcla el análisis del mensaje/tema con lo tangible y técnico (guion, dirección, interpretaciones, ritmo, montaje, atmósfera).
- Lógica y coherencia: da mucho peso a si los personajes deciden con sentido y progresan de forma creíble; castiga conveniencias de guion, agujeros y decisiones ilógicas.
- Ritmo y ejecución: premia la buena ejecución y el slow-burn frente al espectáculo vacío.
- Tono: pragmático, exigente y sobrio, pero terrenal y directo. Profundo pero NO excesivo; nada de moralismo ni exceso filosófico.`;

const PRESTIGE = ['nolan', 'tarantino', 'fincher', 'villeneuve', 'spielberg', 'scorsese', 'kubrick', 'aronofsky', 'coen', 'inarritu', 'del toro', 'bong', 'ridley scott', 'cameron', 'coppola', 'chazelle', 'gerwig', 'park chan', 'malick', 'aster', 'eggers', 'refn', 'mendes', 'jackson'];
export const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
export const isPrestige = (dir) => { const d = norm(dir); return d && PRESTIGE.some(p => d.includes(p)); };

// Construye el perfil de gusto a partir de la biblioteca del usuario.
export function buildProfile(items) {
  const rated = items.filter(i => i.rating != null);
  const avg = rated.length ? (rated.reduce((s, i) => s + Number(i.rating), 0) / rated.length) : 0;
  const dirMap = {};
  rated.forEach(i => { if (i.director) (dirMap[i.director] = dirMap[i.director] || []).push(Number(i.rating)); });
  const topDirectors = Object.entries(dirMap).filter(([, r]) => r.length >= 2)
    .map(([d, r]) => ({ d, n: r.length, avg: r.reduce((a, b) => a + b, 0) / r.length }))
    .sort((a, b) => b.n - a.n || b.avg - a.avg).slice(0, 12);
  const genreMap = {};
  items.forEach(i => [i.genre1, i.genre2].forEach(g => { if (g) { const cg = canonGenre(g); genreMap[cg] = (genreMap[cg] || 0) + 1; } }));
  const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);
  const withCommentsRaw = rated.filter(i => (i.comments || '').trim().length > 30)
    .sort((a, b) => Math.abs(Number(b.rating) - avg) - Math.abs(Number(a.rating) - avg))
    .slice(0, 24)
    .map(i => ({ norm: norm(i.title), text: `"${i.title}" (${Number(i.rating).toFixed(1)}/10): ${(i.comments || '').trim().slice(0, 300)}` }));

  const sorted = [...rated].sort((a, b) => b.rating - a.rating);
  const loves = sorted.slice(0, 10).map(i => `${i.title} (${Number(i.rating).toFixed(1)})`);
  const hates = sorted.filter(i => i.rating <= 4).slice(-10).map(i => `${i.title} (${Number(i.rating).toFixed(1)})`);

  const gAvg = {};
  rated.forEach(i => [i.genre1, i.genre2].forEach(g => { if (g) { const cg = canonGenre(g); (gAvg[cg] = gAvg[cg] || []).push(Number(i.rating)); } }));
  const genreAvg = Object.entries(gAvg).filter(([, a]) => a.length >= 3)
    .map(([g, a]) => ({ g, avg: a.reduce((x, y) => x + y, 0) / a.length })).sort((a, b) => b.avg - a.avg);
  const generous = genreAvg.slice(0, 4).map(x => `${x.g} (${x.avg.toFixed(1)})`);
  const exigent = genreAvg.slice(-4).reverse().map(x => `${x.g} (${x.avg.toFixed(1)})`);

  const quotes = items.filter(i => (i.favorite_quote || '').trim()).slice(0, 5).map(i => `«${i.favorite_quote.trim().slice(0, 120)}»`);

  return { count: items.length, avg, topDirectors, topGenres, withCommentsRaw, loves, hates, generous, exigent, quotes };
}

// Falsos positivos reales (calibración): aclamadas/prestigio que él puntuó bajo.
export function buildMisses(items) {
  const seen = items.filter(i => i.rating != null && i.status !== 'Pendiente');
  return seen.map(i => {
    const tm = (i.tmdb_rating != null && Number(i.tmdb_rating) > 0) ? Number(i.tmdb_rating) : null;
    const expected = tm != null ? tm : (isPrestige(i.director) ? 7.8 : null);
    if (expected == null) return null;
    return { rating: Number(i.rating), expected, gap: expected - Number(i.rating), comments: (i.comments || '').trim(), norm: norm(i.title), title: i.title, year: i.year };
  }).filter(Boolean).filter(m => m.gap >= 1.2 && m.rating <= 7 && m.comments).sort((a, b) => b.gap - a.gap);
}

export function buildCalibration(misses, excludeNorm) {
  const top = (misses || []).filter(m => m.norm !== excludeNorm).slice(0, 8);
  if (!top.length) return WEIGHT_RULES;
  return `${WEIGHT_RULES}

CASOS DE CALIBRACIÓN (tus falsos positivos reales — un crítico ingenuo habría puntuado alto por prestigio/espectáculo, pero tu nota real fue baja). Aprende de ellos y aplica el mismo criterio:
${top.map(m => `- "${m.title}"${m.year ? ` (${m.year})` : ''}: expectativa del público/prestigio ~${m.expected.toFixed(1)}, tu nota real ${m.rating.toFixed(1)}. Tu razón: "${m.comments.slice(0, 200)}"`).join('\n')}`;
}

export function buildProfileText(profile, excludeNorm) {
  const dirs = profile.topDirectors.map(d => `${d.d} (${d.n} obras, media ${d.avg.toFixed(1)})`).join('; ');
  const samples = profile.withCommentsRaw.filter(w => w.norm !== excludeNorm).slice(0, 16).map(w => w.text);
  return `${CRITIC_VOICE}

Contexto del gusto real del espectador (${profile.count} obras, nota media ${profile.avg.toFixed(1)}):
Directores recurrentes: ${dirs || 'n/d'}
Géneros más presentes: ${profile.topGenres.join(', ') || 'n/d'}
Géneros donde es GENEROSO (nota media alta): ${profile.generous.join(', ') || 'n/d'}
Géneros donde es EXIGENTE (nota media baja): ${profile.exigent.join(', ') || 'n/d'}
Obras que le ENCANTAN (nota alta): ${profile.loves.join(', ') || 'n/d'}
Obras que DETESTA (nota baja): ${profile.hates.join(', ') || 'n/d'}
Frases que ha guardado como favoritas: ${profile.quotes.join(' / ') || 'n/d'}

${TASTE_SIGNALS}

Muestras de sus reseñas reales (imita este tono, vocabulario y nivel de exigencia):
${samples.join('\n') || 'n/d'}`;
}

// Prompt completo de predicción de Anton Ego para una película "meta".
export function antonPrompt(profile, misses, meta) {
  const ex = norm(meta.title);
  return `${buildProfileText(profile, ex)}

${buildCalibration(misses, ex)}

${STYLE_RULES}

Película: "${meta.title}"${meta.year ? ` (${meta.year})` : ''}${meta.director ? `, dirigida por ${meta.director}` : ''}.
${meta.genres?.length ? `Géneros: ${meta.genres.join(', ')}.` : ''}
${meta.synopsis ? `Sinopsis: ${meta.synopsis}` : ''}

Escribe, como Anton Ego (NO empieces con "Como Anton Ego"; escribe directamente como si fueras él):
1. "critica": TRES párrafos completos, densos y bien desarrollados en primera persona (extensión generosa, no te quedes corto; entra en detalle sobre guion, dirección, personajes, ritmo y ejecución).
2. "nota": número del 0 al 10 (un decimal), coherente con la crítica y con el criterio calibrado.
Responde SOLO JSON válido.`;
}

// Llama a la IA con el prompt de Anton Ego y devuelve {nota, critica} o null.
export async function predictNota(profile, misses, meta) {
  const data = await base44.integrations.Core.InvokeLLM({
    prompt: antonPrompt(profile, misses, meta),
    response_json_schema: { type: 'object', properties: { nota: { type: 'number' }, critica: { type: 'string' } } },
  });
  if (data && (data.critica || data.nota != null)) return { nota: data.nota, critica: data.critica || '' };
  return null;
}
