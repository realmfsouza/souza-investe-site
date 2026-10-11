# Souza Investe: site

Site do canal Souza Investe, apresentado por Matheus Souza. Hospeda os simuladores da série Prova Real, captura e-mail em troca da planilha de cada vídeo e é a casa da marca.

Souza investe, mas antes faz a conta.

É um site estático em HTML, CSS e JavaScript puros: sem framework, sem dependência e sem etapa de build. Conteúdo educacional; nada aqui indica ativo, banco ou produto.

## Rodar no computador

```bash
python -m http.server 8765
```

Abra http://localhost:8765/. Use um servidor local, não o arquivo direto: os simuladores leem `dados/taxas.json` com `fetch`, que o navegador bloqueia em `file://`.

## Publicar na Cloudflare Pages

O código fica em um repositório privado no GitHub (`realmfsouza/souza-investe-site`). Quem serve o site é a Cloudflare Pages, que publica de repositório privado sem custo, com HTTPS e domínio próprio.

1. Envie este conteúdo para a branch `main` do repositório (`git push`).
2. Em https://dash.cloudflare.com, "Workers & Pages", "Create", aba "Pages", "Connect to Git". Autorize o app da Cloudflare no GitHub só para este repositório.
3. Configuração do projeto: framework "None", comando de build vazio, diretório de saída `/` (a raiz). Salvar e implantar.
4. O site sobe em `https://<projeto>.pages.dev`. Cada `git push` na `main` publica de novo em menos de um minuto.
5. Domínio próprio: "Custom domains", "Set up a custom domain", digite o domínio e siga as instruções de DNS (um CNAME apontando para o endereço `.pages.dev`). O certificado HTTPS é automático.

Todos os links são relativos, então o site funciona na raiz de um domínio ou numa subpasta sem mudar nada. O arquivo `.nojekyll` fica por compatibilidade, caso um dia o site volte para o GitHub Pages.

## Como o OS atualiza o site

O site não é editado à mão para receber taxa ou vídeo novo. No OS (repositório privado):

```bash
python _sistema/publicar_site.py            # busca as taxas no Banco Central e gera tudo
python _sistema/publicar_site.py --sem-rede # sem internet: mantém as taxas anteriores
```

Depois, neste repositório: `git add -A`, commit e push.

O script descobre esta pasta pela chave `SITE_DIR` em `_sistema/.env` (sem ela, usa a pasta irmã `../souza-investe-site`). Ele escreve só isto:

| Arquivo | O que é |
|---|---|
| `dados/taxas.json` | Selic meta (SGS 432), CDI anualizado (SGS 4389) e IPCA 12 meses (SGS 13522), com data e fonte |
| `dados/videos.json` | Um item por vídeo publicado: número, título, `video_id`, data, simulador e três linhas da conta |
| `blog/<slug>/index.html` | Um post por vídeo, a partir de `modelos/post.html` |
| `blog/index.html` | A lista do blog, a partir de `modelos/blog.html` |
| `sitemap.xml`, `robots.txt` | Só com `SITE_URL` definido no `.env`; o script também troca o `og:image` relativo pelo absoluto |

Do OS só saem os campos do frontmatter do roteiro, a seção "Descrição do vídeo" e o `conta.md`. Roteiro completo, radar, ideias e decisões ficam no OS. O vídeo liga ao simulador pelo campo opcional `simulador:` no frontmatter do roteiro (`aporte`, `parcelar`, `fgc` ou `renda`).

A página `/simuladores/` lê `dados/taxas.json` sem travar a tela: os simuladores desenham com 10% e 4% e trocam para o CDI e o IPCA do arquivo quando ele chega. Se o arquivo faltar, ficam os valores de exemplo e o texto "10% é só um exemplo".

## Ligar a lista de e-mail

Abra `assets/config.js` e preencha `listEndpoint` com a URL `https://` do provedor de e-mail que vai receber o cadastro. O formulário envia um `POST` com JSON:

```json
{ "nome": "Ana", "email": "ana@exemplo.com", "origem": "/simuladores/" }
```

O provedor precisa aceitar esse formato e responder com status 2xx (e permitir CORS vindo do domínio do site). Enquanto `listEndpoint` estiver vazio, o formulário aparece desabilitado com o aviso "A lista ainda não está ligada. A planilha de cada vídeo fica no link da descrição." Com o provedor escolhido, revise o texto de `/privacidade/`.

No mesmo arquivo, `youtubeUrl` e `instagramUrl` ligam os links do rodapé. Vazios, os links não aparecem.

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
- Provedor de e-mail: ainda não escolhido; a lista fica desligada até `listEndpoint` ser preenchido.
- Lighthouse: não rodei auditoria formal de desempenho. A verificação desta versão foi manual, em navegador, a 360, 400, 768 e 1200px, nos dois temas.
- `sitemap.xml` e `robots.txt`: só saem quando `SITE_URL` existir.
