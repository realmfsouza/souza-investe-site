# Souza Investe: site

Site do canal Souza Investe, apresentado por Matheus Souza. Hospeda os simuladores da série Prova Real, captura e-mail para o aviso de conta nova e é a casa da marca.

Souza investe, mas antes faz a conta.

É um site estático em HTML, CSS e JavaScript puros: sem framework, sem dependência e sem etapa de build. Conteúdo educacional; nada aqui indica ativo, banco ou produto.

## Rodar no computador

Só o site estático, sem a lista:

```bash
python -m http.server 8765
```

Abra http://localhost:8765/. Use um servidor local, não o arquivo direto: os simuladores leem `dados/taxas.json` com `fetch`, que o navegador bloqueia em `file://`.

O site inteiro, com o coletor da lista e um D1 local de teste (precisa do Node; nada toca a conta da Cloudflare):

```bash
npx --yes wrangler@4 dev --local --port 8787
```

Abra http://localhost:8787/. O banco de teste fica em `.wrangler/state/`, fora do git. Para ver o que entrou: `npx --yes wrangler@4 d1 execute souza-investe-lista --local --command "SELECT * FROM inscritos"`. E-mail de teste, só `@example.com`.

## Publicar

O site no ar responde em `https://souza-investe-site.realmfsouza.workers.dev`, endereço de Worker. Por isso este repositório traz a configuração do **modo Worker com assets estáticos**, e o modo Pages continua funcionando com o mesmo código. Qual dos dois é o projeto de verdade se confirma no painel da Cloudflare, em "Workers & Pages" (o ícone e a aba "Deployments" dizem se é Worker ou Pages).

### Modo Worker (o endereço `*.workers.dev`)

- `wrangler.jsonc`: o nome do Worker (`souza-investe-site`), o `worker/index.js`, a pasta de assets (a raiz, `.`), a página `404.html` para o que não existe e o banco D1 com o nome de variável `DB`.
- `worker/index.js`: só atende `/api/lista` (POST vai para o coletor de `functions/api/lista.js`; outro método recebe 405). Todo o resto é arquivo estático.
- `.assetsignore`: o que não vai para o ar, como `README.md`, `wrangler.jsonc`, `worker/`, `functions/`, `modelos/` e `docs/`. Sobem só as páginas, `assets/`, `dados/`, `blog/`, `s/` e a `404.html`.
- Deploy: `npx wrangler deploy`, nesta pasta, logado na conta da Cloudflare (`npx wrangler login`, uma vez). Antes, `npx wrangler deploy --dry-run --outdir <pasta temporária>` confere a configuração sem subir nada. Se o projeto estiver ligado ao GitHub (Workers Builds), o envio para a `main` faz o deploy sozinho; o comando de deploy configurado aparece em "Settings", "Build".
- Enquanto o `database_id` do `wrangler.jsonc` for o marcador `TROCAR_PELO_ID_DO_D1`, o deploy falha de propósito: o banco ainda não existe.

### Modo Pages (o endereço `*.pages.dev`)

1. Envie este conteúdo para a branch `main` do repositório.
2. Em https://dash.cloudflare.com, "Workers & Pages", "Create", aba "Pages", "Connect to Git". Autorize o app da Cloudflare no GitHub só para este repositório.
3. Configuração do projeto: framework "None", comando de build vazio, diretório de saída `/` (a raiz). Salvar e implantar.
4. O site sobe em `https://<projeto>.pages.dev`. Cada envio para a `main` publica de novo em menos de um minuto.
5. Domínio próprio: "Custom domains", "Set up a custom domain", digite o domínio e siga as instruções de DNS (um CNAME apontando para o endereço `.pages.dev`). O certificado HTTPS é automático.

A Pages ignora o `wrangler.jsonc` (ele não tem `pages_build_output_dir`) e roda o coletor direto da pasta `functions/`. Nesse modo, a `404.html` da raiz também vira a página de erro.

Os links das páginas são relativos, então o site funciona na raiz de um domínio ou numa subpasta sem mudar nada. A exceção é a `404.html`, que abre em qualquer profundidade de URL e por isso usa caminhos a partir da raiz (`/assets/`, `/blog/`). O arquivo `.nojekyll` fica por compatibilidade, caso um dia o site volte para o GitHub Pages.

## Como o OS atualiza o site

O site não é editado à mão para receber taxa ou vídeo novo. No OS (repositório privado):

```bash
python _sistema/publicar_site.py            # busca as taxas no Banco Central e no Tesouro Nacional e gera tudo
python _sistema/publicar_site.py --sem-rede # sem internet: mantém as taxas anteriores
python _sistema/publicar_site.py --exemplo --site /caminho/de/uma/copia --sem-rede
                                            # três posts inventados numa CÓPIA do site, para ver o modelo
```

Depois, neste repositório: `git add -A`, commit e push.

O script descobre esta pasta pela chave `SITE_DIR` em `_sistema/.env` (sem ela, usa a pasta irmã `../souza-investe-site`). Ele escreve só isto:

| Arquivo | O que é |
|---|---|
| `dados/taxas.json` | Selic meta (SGS 432), CDI anualizado (SGS 4389) e IPCA 12 meses (SGS 13522) do Banco Central, com data e fonte; e, na chave `tesouro`, as taxas de compra do dia do Tesouro Direto (Tesouro Selic, Prefixado e IPCA+, sem cupom, um item por vencimento) lidas do CSV público do Tesouro Transparente, com `data_base`, `fonte` e `url`. A taxa vem como o Tesouro publica: Prefixado é a taxa anual, IPCA+ é a taxa real acima do IPCA e Selic é o acréscimo sobre a Selic |
| `dados/videos.json` | Um item por vídeo publicado: número, título, `video_id`, data, simulador e três linhas da conta |
| `blog/<slug>/index.html` | Um post por vídeo, a partir de `modelos/post.html`: trilha, série, tempo de leitura, linha-fina, compartilhar, player que só carrega o YouTube no clique, sumário, a conta com a caixa de taxas, "Resumindo", relacionados e o `og:image` com a capa do vídeo |
| `blog/index.html` | A lista do blog, a partir de `modelos/blog.html`: destaque do último post, filtro por conta (só com duas contas ou mais), grade de cards, as quatro contas, os últimos vídeos e o autor. Com nenhum vídeo, o estado "Primeiro texto em breve" |
| `sitemap.xml`, `robots.txt` | Só com `SITE_URL` definido no `.env`; o script também troca o `og:image` relativo pelo absoluto |

Do OS só saem os campos do frontmatter do roteiro, o `tema` da ideia ligada a ele, a seção "Descrição do vídeo" e o `conta.md`. Roteiro completo, radar, ideias e decisões ficam no OS. O vídeo liga ao simulador pelo campo opcional `simulador:` no frontmatter do roteiro (`aporte`, `parcelar`, `fgc` ou `renda`).

A página `/simuladores/` lê `dados/taxas.json` sem travar a tela: os simuladores desenham com 10% e 4% e trocam para o CDI e o IPCA do arquivo quando ele chega. Com a chave `tesouro`, cada simulador mostra o seletor "Taxa de referência": CDI do dia ou um título do Tesouro Direto, com fonte e data na dica (para o Tesouro Selic o site soma a Selic meta ao acréscimo do título; para o IPCA+ compõe a taxa real com o IPCA dos últimos 12 meses e avisa que é referência, não previsão). Sem a chave, o seletor fica escondido e tudo funciona como antes. Se o arquivo faltar, ficam os valores de exemplo e o texto "10% é só um exemplo". Nenhum nome de banco ou corretora: Tesouro é título público e conceito.

## Ligar a lista de e-mail

O coletor é do próprio site, sem provedor pago: `functions/api/lista.js` recebe o formulário em `POST /api/lista` e grava num banco D1 da sua conta Cloudflare. No modo Worker quem chama o coletor é o `worker/index.js`; no modo Pages, a própria Pages, pela pasta `functions/`. Sem custo no plano gratuito, mesma origem do site (sem CORS) e só você acessa. A tabela `inscritos` (e-mail, nome, página de origem com as UTMs e data; nenhum IP) nasce sozinha no primeiro cadastro, e e-mail repetido não duplica. Quem lê a lista é o `python _sistema/lista.py` do OS.

O formulário envia um `POST` com JSON:

```json
{ "nome": "Ana", "email": "ana@example.com", "origem": "/simuladores/?utm_source=youtube&utm_campaign=video-012", "site": "" }
```

O que o coletor faz com cada envio, sem guardar IP:

| Caso | Resposta |
|---|---|
| Sem cabeçalho `Origin`, ou de outro site | 403 |
| Corpo acima de 2.000 caracteres | 413 |
| JSON inválido ou e-mail fora da regra | 400 |
| Campo-isca `site` preenchido (robô) | 200, e nada é gravado |
| 20 cadastros no último minuto, no site inteiro | o próximo recebe 429 |
| Banco não ligado | 503 |
| Cadastro certo, ou e-mail que já estava na lista | 200 |
| `GET` ou outro método em `/api/lista` | 405 |

A `origem` guarda só o caminho da página e os parâmetros `utm_*`, até 300 caracteres: é o que diz de qual vídeo a pessoa veio. O formulário mostra uma frase para cada resposta, e a de sucesso não promete envio, porque o serviço de envio ainda não existe.

Para ligar, uma vez (só o Matheus, na conta dele):

1. Em https://dash.cloudflare.com, "Storage & Databases", "D1 SQL Database", "Create". Nome: `souza-investe-lista`. Copie o "Database ID" da página do banco (é identificador, não segredo).
2. Modo Worker: troque o marcador `TROCAR_PELO_ID_DO_D1` do `wrangler.jsonc` por esse id e publique (`npx wrangler deploy`, ou o envio para a `main`, se o deploy for pelo GitHub). Modo Pages: "Workers & Pages", o projeto do site, "Settings", "Bindings", "Add", "D1 database". Nome da variável: `DB`. Banco: `souza-investe-lista`. Salve.
3. `assets/config.js` já traz `listEndpoint: '/api/lista'`.
4. Teste: `GET /api/lista` no ar tem de dar 405 (404 quer dizer que o coletor não subiu). Depois cadastre o seu e-mail na página `/lista/` e confira no OS com `python _sistema/lista.py`.

Com `listEndpoint` vazio, o formulário fica desabilitado com o aviso "A lista ainda não está ligada. Enquanto isso, a conta completa de cada vídeo fica no blog." Se o banco faltar, o coletor responde 503 e o formulário mostra "A lista está fora do ar agora."

O coletor só guarda. Mandar e-mail para a lista é outro passo: quando chegar a hora, o `lista.py --exportar` gera o CSV para importar no serviço de envio escolhido, e o texto de `/privacidade/` ganha o nome desse serviço. Se a isca e o limite por minuto não bastarem contra robô, o próximo passo é o Turnstile da Cloudflare no formulário.

No mesmo arquivo, `youtubeUrl` e `instagramUrl` ligam os links do rodapé e o botão "Ver o canal" do blog. Vazios, os links não aparecem.

`fotoHero` liga a foto do Matheus na abertura da home e na página Sobre: coloque o arquivo em `assets/` (PNG ou WebP com fundo transparente, de frente, cara de quem acabou de conferir uma conta, como na miniatura) e escreva o caminho, por exemplo `fotoHero: 'assets/matheus.png'`. Vazio, a abertura fica só com a conta.

## Links curtos `/s/`

`/s/aporte/`, `/s/parcelar/`, `/s/fgc/` e `/s/renda/` são os links para a descrição dos vídeos. O GitHub Pages não faz redirecionamento 301 no servidor, então cada um é um `index.html` mínimo que redireciona no navegador: um JavaScript leva para `../../simuladores/#<aba>` preservando a query string (as UTMs chegam inteiras) e um `<meta http-equiv="refresh">` cobre quem está sem JavaScript, nesse caso sem a query string. Para o Google, isso conta como redirecionamento no cliente, e as páginas levam `noindex`.

## Mapa

| Caminho | O que é |
|---|---|
| `index.html` | Home: frase da marca, os quatro simuladores, a série Prova Real |
| `simuladores/` | Os quatro simuladores em abas (`#aporte`, `#parcelar`, `#fgc`, `#renda`) |
| `s/<aba>/` | Links curtos, redirecionamento no cliente |
| `videos/` | Lista de vídeos, desenhada a partir de `dados/videos.json` |
| `blog/` | Um texto por vídeo publicado, gerado pelo OS |
| `sobre/`, `lista/`, `privacidade/` | Quem fala, cadastro de e-mail, LGPD e aviso legal |
| `empresa/` | Reservada para BI e consultoria, fora do menu, com `noindex` |
| `modelos/` | Modelos do blog usados pelo `publicar_site.py` |
| `assets/tokens.css` | Os tokens do design system; o único arquivo com cor escrita à mão |
| `assets/site.css`, `assets/site.js` | Layout, tema claro e escuro, lista de e-mail, vídeos |
| `assets/simuladores.css`, `assets/simuladores.js` | Os simuladores; o cálculo é o mesmo do arquivo original do OS |
| `assets/taxas.js` | Preenche as taxas do dia nos simuladores |
| `assets/config.js` | Endpoint da lista e redes |
| `functions/api/lista.js` | O coletor da lista: grava o cadastro no D1 (o mesmo código no modo Worker e no modo Pages) |
| `worker/index.js`, `wrangler.jsonc`, `.assetsignore` | O modo Worker: o roteador do `/api/lista`, a configuração e o que não sobe |
| `404.html` | A página de erro, com caminhos a partir da raiz |
| `assets/og.png`, `assets/og.svg` | Imagem do Open Graph, 1200x630 |

Cabeçalho, menu, rodapé e o bloco da lista se repetem em cada página, porque não há build. Mudou o menu? Troque em todos os `index.html` e em `modelos/`.

## Decisões desta versão

- Sem analytics e sem cookie. O navegador guarda só a escolha de tema (`si-tema`) e a última aba de simulador (`si-tab`) no `localStorage`.
- O `og.png` foi gerado com o Chrome em modo headless a partir do mesmo desenho do `og.svg` (o Pillow não estava instalado). Para refazer, abra um HTML 1200x630 com o desenho e rode `chrome --headless --window-size=1200,630 --screenshot=og.png`.
- O ícone da aba ficou vazio de propósito: a marca não tem logotipo.
- As capturas de verificação ficam em `docs/capturas/`, fora do git (`.gitignore`), para não pesar o repositório nem ser publicadas.

## Fora do MVP

- Domínio próprio: decidido (um `.com.br` pelo registro.br, cerca de R$ 40 por ano), ainda não registrado. Até lá o site roda no endereço `.pages.dev`. Com o domínio no ar, preencha `SITE_URL` no `.env` do OS e configure o domínio na Cloudflare Pages.
- Redirecionamentos `/s/` no servidor: a Cloudflare Pages aceita um arquivo `_redirects` com 301 de verdade. Fica para depois de o site estar no ar, com teste de que a query string (UTM) sobrevive; até lá os redirecionamentos no cliente continuam valendo.
- Analytics: nenhum, por decisão do MVP.
- Envio de e-mail para a lista: o coletor (D1) guarda os cadastros; o serviço de envio ainda não foi escolhido.
- Lighthouse: não rodei auditoria formal de desempenho. A verificação desta versão foi manual, em navegador, a 360, 400, 768 e 1200px, nos dois temas.
- `sitemap.xml` e `robots.txt`: só saem quando `SITE_URL` existir.
