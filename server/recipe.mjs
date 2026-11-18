// Henter en oppskrift fra en matside via sidens innebygde oppskriftsdata (schema.org Recipe).
// GET /api/recipe?url=https://...  ->  { n, t, i: [...], s: [...] }
import { safeUrl, fetchText } from './fetch-guard.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' }
});

function minutes(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const t = (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0);
  return t || null;
}
const clean = s => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();

function findRecipe(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const x of node) { const r = findRecipe(x); if (r) return r; } return null; }
  const type = node['@type'];
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return node;
  for (const k of ['@graph', 'mainEntity', 'itemListElement']) { const r = findRecipe(node[k]); if (r) return r; }
  return null;
}
function steps(ins) {
  if (!ins) return [];
  if (typeof ins === 'string') return ins.split(/\n+|(?<=\.)\s+(?=[A-ZÆØÅ])/).map(clean).filter(Boolean);
  if (Array.isArray(ins)) return ins.flatMap(x => typeof x === 'string' ? [clean(x)]
    : x['@type'] === 'HowToSection' ? steps(x.itemListElement) : [clean(x.text || x.name)]).filter(Boolean);
  return [];
}

export default async (req) => {
  const target = new URL(req.url).searchParams.get('url') || '';
  const u = safeUrl(target);
  if (!u) return json(400, { error: 'bad_url' });
  let html;
  try { html = await fetchText(u, 'text/html'); } catch { return json(502, { error: 'fetch_failed' }); }

  let recipe = null;
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { recipe = findRecipe(JSON.parse(m[1].trim())); } catch { /* skip broken blocks */ }
    if (recipe) break;
  }
  if (!recipe) return json(404, { error: 'no_recipe' });
  const ing = (recipe.recipeIngredient || recipe.ingredients || []).map(clean).filter(Boolean).slice(0, 60);
  return json(200, {
    n: clean(recipe.name).slice(0, 80),
    t: minutes(recipe.totalTime) || minutes(recipe.cookTime) || null,
    i: ing,
    s: steps(recipe.recipeInstructions).slice(0, 40)
  });
};

