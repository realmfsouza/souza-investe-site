/* Coletor da lista de e-mail: uma Pages Function da Cloudflare que grava o cadastro no D1.

   Rota: POST /api/lista, com o JSON que o formulário já manda:
         {"nome": "...", "email": "...", "origem": "/caminho/da/pagina/"}
   Banco: o D1 ligado ao projeto com o nome de variável DB (README, "Ligar a lista de e-mail").
   A tabela nasce sozinha na primeira chamada. E-mail repetido não duplica: a linha fica como estava.
   Não guarda IP nem nada além de nome, e-mail, página de origem e data. Quem lê a lista é o
   _sistema/lista.py do OS, pela API da Cloudflare, com um token que só o Matheus tem. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITE_CORPO = 2000;

const CRIAR = `CREATE TABLE IF NOT EXISTS inscritos (
  email TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  criado_em TEXT NOT NULL
)`;

let tabelaPronta = false;

function resposta(status, corpo) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function texto(valor, max) {
  return typeof valor === 'string' ? valor.trim().slice(0, max) : '';
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return resposta(503, { ok: false, erro: 'lista sem banco' });

  // Só aceita envio do próprio site: o navegador manda Origin num POST com JSON.
  const origem = request.headers.get('Origin');
  if (origem) {
    let mesmoSite = false;
    try {
      mesmoSite = new URL(origem).host === new URL(request.url).host;
    } catch (e) {
      mesmoSite = false;
    }
    if (!mesmoSite) return resposta(403, { ok: false, erro: 'origem' });
  }

  const bruto = await request.text();
  if (bruto.length > LIMITE_CORPO) return resposta(413, { ok: false, erro: 'grande demais' });

  let dados;
  try {
    dados = JSON.parse(bruto);
  } catch (e) {
    return resposta(400, { ok: false, erro: 'json' });
  }

  const email = texto(dados && dados.email, 160).toLowerCase();
  if (!EMAIL.test(email)) return resposta(400, { ok: false, erro: 'email' });
  const nome = texto(dados.nome, 80);
  const pagina = texto(dados.origem, 200);

  if (!tabelaPronta) {
    await env.DB.prepare(CRIAR).run();
    tabelaPronta = true;
  }
  await env.DB.prepare(
    'INSERT OR IGNORE INTO inscritos (email, nome, origem, criado_em) VALUES (?1, ?2, ?3, ?4)'
  ).bind(email, nome, pagina, new Date().toISOString()).run();

  return resposta(200, { ok: true });
}

export function onRequest() {
  return resposta(405, { ok: false, erro: 'use POST' });
}
