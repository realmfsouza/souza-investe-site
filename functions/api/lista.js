/* Coletor da lista de e-mail da Cloudflare: grava o cadastro no D1.

   Uma fonte só para os dois modos de hospedagem:
   - Worker com assets estáticos (wrangler.jsonc): o worker/index.js importa onRequestPost e onRequest daqui.
   - Pages Functions: a Cloudflare Pages chama este arquivo direto, pela pasta functions/.

   Rota: POST /api/lista, com o JSON que o formulário manda:
         {"nome": "...", "email": "...", "origem": "/caminho/?utm_source=...", "site": ""}
   Banco: o D1 ligado com o nome de variável DB (README, "Ligar a lista de e-mail").
   A tabela nasce sozinha na primeira chamada. E-mail repetido não duplica: a linha fica como estava.
   Não guarda IP nem nada além de nome, e-mail, página de origem (com as UTMs) e data. Quem lê a lista é
   o _sistema/lista.py do OS, pela API da Cloudflare, com um token que só o Matheus tem.

   Defesas, todas sem IP:
   - Origin obrigatório e do mesmo host da requisição (403): o navegador sempre manda Origin num POST.
   - Corpo acima de LIMITE_CORPO (413) e JSON inválido (400).
   - Isca: o campo "site" fica escondido no formulário; gente não vê, robô preenche. Preenchido, a
     resposta é 200 e nada é gravado, para o robô não aprender a desviar.
   - E-mail pela regra EMAIL (400).
   - Limite global: LIMITE_POR_MINUTO cadastros no último minuto, contados na própria tabela, e o
     próximo recebe 429. */

const EMAIL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
const LIMITE_CORPO = 2000;
const LIMITE_POR_MINUTO = 20;
const MAX_ORIGEM = 300;

const CRIAR = [
  `CREATE TABLE IF NOT EXISTS inscritos (
  email TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL
)`,
  'CREATE INDEX IF NOT EXISTS inscritos_criado_em ON inscritos (criado_em)'
];

let tabelaPronta = false;

function resposta(status, corpo, extras) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  return new Response(JSON.stringify(corpo), { status, headers: Object.assign(headers, extras || {}) });
}

function texto(valor, max) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

function emailValido(email) {
  if (!email || email.length > 160 || !EMAIL.test(email)) return false;
  const partes = email.split('@');
  return partes[0].length <= 64 && partes[1].length <= 253;
}

// A página de origem: só o caminho e os parâmetros utm_*, nada mais da URL.
function origemLimpa(valor, base) {
  if (typeof valor !== 'string' || !valor.trim().startsWith('/') || valor.trim().startsWith('//')) return '';
  let url;
  try {
    url = new URL(valor.trim(), base);
  } catch (e) {
    return '';
  }
  const utm = new URLSearchParams();
  url.searchParams.forEach(function (v, k) {
    if (/^utm_[a-z]+$/i.test(k)) utm.append(k.toLowerCase(), v.slice(0, 100));
  });
  const busca = utm.toString();
  return (url.pathname + (busca ? '?' + busca : '')).slice(0, MAX_ORIGEM);
}

async function prepararTabela(db) {
  if (tabelaPronta) return;
  await db.batch(CRIAR.map(function (sql) { return db.prepare(sql); }));
  tabelaPronta = true;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return resposta(503, { ok: false, erro: 'lista sem banco' });

  // Só aceita envio do próprio site, e o navegador sempre manda Origin num POST.
  const origemCabecalho = request.headers.get('Origin');
  let mesmoSite = false;
  if (origemCabecalho) {
    try {
      mesmoSite = new URL(origemCabecalho).host === new URL(request.url).host;
    } catch (e) {
      mesmoSite = false;
    }
  }
  if (!mesmoSite) return resposta(403, { ok: false, erro: 'origem' });

  const bruto = await request.text();
  if (bruto.length > LIMITE_CORPO) return resposta(413, { ok: false, erro: 'grande demais' });

  let dados;
  try {
    dados = JSON.parse(bruto);
  } catch (e) {
    return resposta(400, { ok: false, erro: 'json' });
  }
  if (!dados || typeof dados !== 'object') return resposta(400, { ok: false, erro: 'json' });

  // Isca preenchida: robô. Responde como se tivesse dado certo e não grava nada.
  if (texto(dados.site, 200)) return resposta(200, { ok: true });

  const email = texto(dados.email, 200).toLowerCase();
  if (!emailValido(email)) return resposta(400, { ok: false, erro: 'email' });
  const nome = texto(dados.nome, 80);
  const pagina = origemLimpa(dados.origem, request.url);

  await prepararTabela(env.DB);

  const umMinutoAtras = new Date(Date.now() - 60 * 1000).toISOString();
  const recentes = await env.DB.prepare('SELECT COUNT(*) AS n FROM inscritos WHERE criado_em > ?1')
    .bind(umMinutoAtras).first('n');
  if (Number(recentes) >= LIMITE_POR_MINUTO) {
    return resposta(429, { ok: false, erro: 'muitos cadastros agora' }, { 'Retry-After': '60' });
  }

  await env.DB.prepare(
    'INSERT OR IGNORE INTO inscritos (email, nome, origem, criado_em) VALUES (?1, ?2, ?3, ?4)'
  ).bind(email, nome, pagina, new Date().toISOString()).run();

  return resposta(200, { ok: true });
}

export function onRequest() {
  return resposta(405, { ok: false, erro: 'use POST' }, { Allow: 'POST' });
}
