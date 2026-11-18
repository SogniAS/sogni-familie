// Cloudflare Pages: /api/recipe (selve koden ligger i server/recipe.mjs)
import handler from '../../server/recipe.mjs';
export const onRequestGet = ({ request }) => handler(request);
