/* Worker do site no modo Worker com assets estáticos (wrangler.jsonc).

   - /api/lista: POST vai para o coletor de functions/api/lista.js (a mesma fonte da Pages);
     qualquer outro método recebe 405 em JSON.
   - Todo o resto é página ou arquivo estático: env.ASSETS serve, e o que não existe cai na 404.html
     (not_found_handling "404-page"). */

import { onRequestPost, onRequest } from '../functions/api/lista.js';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/lista' || pathname === '/api/lista/') {
      return request.method === 'POST' ? onRequestPost({ request, env, ctx }) : onRequest();
    }
    return env.ASSETS.fetch(request);
  }
};
