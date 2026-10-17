/* Comportamento comum a todas as páginas: tema, redes do rodapé, lista de e-mail, a lista
   de vídeos e, no blog, compartilhar, player, filtro por conta e botão do canal. Sem dependências. Cada parte só roda se o elemento dela existir na página. */
(function () {
  'use strict';

  var cfg = window.CONFIG || {};
  var raiz = document.documentElement;

  var ICONES = {
    ok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/></svg>',
    erro: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.5h.01"/></svg>'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function urlSegura(u) {
    return typeof u === 'string' && /^https:\/\//i.test(u.trim());
  }

  // O endereço da lista pode ser externo (https://) ou a rota do próprio site (/api/lista).
  function enderecoLista(u) {
    if (typeof u !== 'string') return '';
    u = u.trim();
    return urlSegura(u) || /^\/[A-Za-z0-9/_-]+$/.test(u) ? u : '';
  }

  /* ---------- Tema claro e escuro ---------- */
  var botaoTema = document.querySelector('[data-tema]');
  var prefereEscuro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function temaAtual() {
    var t = raiz.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return prefereEscuro && prefereEscuro.matches ? 'dark' : 'light';
  }

  function pintarBotao() {
    if (!botaoTema) return;
    var alvo = temaAtual() === 'dark' ? 'light' : 'dark';
    botaoTema.setAttribute('data-alvo', alvo);
    botaoTema.setAttribute('aria-label', alvo === 'dark' ? 'Usar o tema escuro' : 'Usar o tema claro');
    var texto = botaoTema.querySelector('.tema-texto');
    if (texto) texto.textContent = alvo === 'dark' ? 'Escuro' : 'Claro';
  }

  if (botaoTema) {
    botaoTema.hidden = false;
    pintarBotao();
    botaoTema.addEventListener('click', function () {
      var alvo = botaoTema.getAttribute('data-alvo') === 'light' ? 'light' : 'dark';
      raiz.setAttribute('data-theme', alvo);
      try { localStorage.setItem('si-tema', alvo); } catch (e) {}
      pintarBotao();
    });
    if (prefereEscuro) {
      var aoMudar = function () { pintarBotao(); };
      if (prefereEscuro.addEventListener) prefereEscuro.addEventListener('change', aoMudar);
      else if (prefereEscuro.addListener) prefereEscuro.addListener(aoMudar);
    }
  }

  /* ---------- Redes no rodapé: só aparecem se a URL estiver em config.js ---------- */
  var social = document.querySelector('[data-social]');
  if (social) {
    var redes = [['YouTube', cfg.youtubeUrl], ['Instagram', cfg.instagramUrl]];
    var htmlRedes = '';
    redes.forEach(function (r) {
      if (urlSegura(r[1])) htmlRedes += '<li><a href="' + esc(r[1].trim()) + '" rel="noopener">' + esc(r[0]) + '</a></li>';
    });
    if (htmlRedes) { social.innerHTML = htmlRedes; social.hidden = false; }
  }

  /* ---------- Lista de e-mail ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function mensagem(el, tipo, texto) {
    el.setAttribute('data-tipo', tipo);
    el.innerHTML = ICONES[tipo === 'ok' ? 'ok' : tipo === 'erro' ? 'erro' : 'info'] + '<span>' + esc(texto) + '</span>';
    el.hidden = false;
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[data-lista]'), function (form) {
    var fieldset = form.querySelector('fieldset');
    var status = form.querySelector('[data-lista-status]');
    var nomeEl = form.querySelector('input[name="nome"]');
    var emailEl = form.querySelector('input[name="email"]');
    var erroEmail = form.querySelector('[data-erro-email]');
    var botao = form.querySelector('button[type="submit"]');
    var endpoint = enderecoLista(cfg.listEndpoint);

    if (!endpoint) {
      // Desligada: o HTML já vem com o fieldset desabilitado e o aviso visível.
      fieldset.disabled = true;
      return;
    }

    fieldset.disabled = false;
    status.hidden = true;

    function limparErro() {
      emailEl.removeAttribute('aria-invalid');
      erroEmail.hidden = true;
      erroEmail.innerHTML = '';
    }

    emailEl.addEventListener('input', function () {
      if (emailEl.getAttribute('aria-invalid') === 'true' && EMAIL.test(emailEl.value.trim())) limparErro();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailEl.value.trim();
      var nome = nomeEl ? nomeEl.value.trim() : '';
      if (!EMAIL.test(email)) {
        emailEl.setAttribute('aria-invalid', 'true');
        erroEmail.innerHTML = ICONES.erro + '<span>' + (email ? 'Confere o e-mail: faltou alguma coisa nele.' : 'Escreve o seu e-mail para receber a planilha.') + '</span>';
        erroEmail.hidden = false;
        emailEl.focus();
        return;
      }
      limparErro();
      botao.disabled = true;
      var textoBotao = botao.textContent;
      botao.textContent = 'Enviando…';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome, email: email, origem: location.pathname })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        botao.textContent = 'Cadastrado';
        mensagem(status, 'ok', 'Anotado' + (nome ? ', ' + nome : '') + '. Quando sair conta nova, você recebe primeiro.');
        form.reset();
      }).catch(function () {
        botao.disabled = false;
        botao.textContent = textoBotao;
        mensagem(status, 'erro', 'Não consegui enviar agora. Tenta de novo em um minuto.');
      });
    });
  });

  /* ---------- Lista de vídeos (página /videos/) ---------- */
  var videosHost = document.querySelector('[data-videos]');
  if (videosHost && window.fetch) {
    var base = videosHost.getAttribute('data-raiz') || '../';
    var SIMS = {
      aporte: 'R$ 50 por mês',
      parcelar: 'Parcelar ou à vista',
      fgc: 'Se o banco quebrar',
      renda: 'Renda de R$ 1.000'
    };
    fetch(base + 'dados/videos.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (lista) {
        if (!Array.isArray(lista)) return;
        var validos = lista.filter(function (v) { return v && /^[A-Za-z0-9_-]{11}$/.test(v.video_id || '') && v.titulo; });
        if (!validos.length) return; // fica o estado vazio que já está no HTML
        var h = '';
        validos.forEach(function (v) {
          var yt = 'https://www.youtube.com/watch?v=' + v.video_id;
          var capa = 'https://i.ytimg.com/vi/' + v.video_id + '/hqdefault.jpg';
          var linhas = Array.isArray(v.resumo_conta) ? v.resumo_conta.slice(0, 3) : [];
          var sim = SIMS[v.simulador] ? v.simulador : '';
          var slug = /^[a-z0-9-]+$/.test(v.slug || '') ? v.slug : '';
          h += '<article class="cartao video-cartao">' +
            '<a href="' + yt + '" rel="noopener"><img class="video-capa" src="' + capa + '" alt="Capa do vídeo: ' + esc(v.titulo) + '" width="480" height="360" loading="lazy"></a>' +
            '<div class="video-corpo">' +
            '<p class="meta">Prova Real' + (v.numero ? ' · ' + esc(v.numero) : '') + (v.publicado_em ? ' · ' + esc(dataBR(v.publicado_em)) : '') + '</p>' +
            '<h2>' + esc(v.titulo) + '</h2>' +
            (linhas.length ? '<div><p class="legenda">Como fiz a conta</p><ul class="video-conta">' + linhas.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' : '') +
            '<p class="video-links">' +
            '<a class="link-forte" href="' + yt + '" rel="noopener">Assistir no YouTube</a>' +
            (sim ? '<a class="link-forte" href="' + base + 'simuladores/#' + sim + '">Simulador: ' + esc(SIMS[sim]) + '</a>' : '') +
            (slug ? '<a class="link-forte" href="' + base + 'blog/' + slug + '/">A conta completa</a>' : '') +
            '</p></div></article>';
        });
        videosHost.innerHTML = '<div class="videos-lista">' + h + '</div>';
      })
      .catch(function () { /* sem o arquivo, fica o estado vazio do HTML */ });
  }

  /* ---------- Blog: compartilhar ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-compartilhar]'), function (bloco) {
    var url = location.href.split('#')[0];
    var titulo = bloco.getAttribute('data-titulo') || document.title;
    var links = {
      whatsapp: 'https://wa.me/?text=' + encodeURIComponent(titulo + ' ' + url),
      x: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(titulo) + '&url=' + encodeURIComponent(url),
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url)
    };
    Array.prototype.forEach.call(bloco.querySelectorAll('a[data-rede]'), function (a) {
      var rede = a.getAttribute('data-rede');
      if (links[rede]) a.href = links[rede];
    });
    var copiar = bloco.querySelector('[data-copiar]');
    if (!copiar) return;
    if (!navigator.clipboard || !window.isSecureContext) { copiar.hidden = true; return; }
    copiar.hidden = false;
    copiar.addEventListener('click', function () {
      var texto = copiar.textContent;
      navigator.clipboard.writeText(url).then(function () {
        copiar.textContent = 'Link copiado';
        setTimeout(function () { copiar.textContent = texto; }, 2000);
      }).catch(function () {
        copiar.textContent = 'Não deu; copie da barra';
        setTimeout(function () { copiar.textContent = texto; }, 2500);
      });
    });
  });

  /* ---------- Blog: player que só carrega o YouTube no clique ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-player]'), function (player) {
    var id = player.getAttribute('data-player') || '';
    var botao = player.querySelector('[data-player-botao]');
    if (!botao || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    botao.hidden = false;
    botao.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.title = 'Vídeo no YouTube';
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      player.innerHTML = '';
      player.appendChild(iframe);
      player.classList.add('player-ativo');
    });
  });

  /* ---------- Blog: filtro por conta ---------- */
  var filtros = document.querySelector('[data-filtros]');
  if (filtros) {
    var botoes = filtros.querySelectorAll('button[data-serie]');
    var itens = document.querySelectorAll('article[data-serie]');
    var semResultado = document.querySelector('[data-sem-resultado]');
    Array.prototype.forEach.call(botoes, function (b) {
      b.addEventListener('click', function () {
        var alvo = b.getAttribute('data-serie') || '';
        var visiveis = 0;
        Array.prototype.forEach.call(botoes, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        Array.prototype.forEach.call(itens, function (it) {
          var mostra = !alvo || it.getAttribute('data-serie') === alvo;
          it.hidden = !mostra;
          if (mostra) visiveis++;
        });
        if (semResultado) semResultado.hidden = visiveis > 0;
      });
    });
  }

  /* ---------- Blog: botão do canal, só com youtubeUrl em config.js ---------- */
  var canal = document.querySelector('[data-youtube-canal]');
  if (canal && urlSegura(cfg.youtubeUrl)) {
    canal.href = cfg.youtubeUrl.trim();
    canal.hidden = false;
  }

  /* ---------- Abertura: a conta roda uma vez ao carregar ---------- */
  var conta = document.querySelector('[data-conta]');
  var semMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (conta && !semMovimento && window.requestAnimationFrame) {
    var valores = Array.prototype.slice.call(conta.querySelectorAll('[data-conta-valor]'));
    var pergunta = conta.querySelector('[data-conta-pergunta]');
    var duracao = 1100;
    var inicio = null;
    valores.forEach(function (el) { el.textContent = (el.getAttribute('data-conta-prefixo') || '') + '0'; });
    if (pergunta) pergunta.style.opacity = '0';
    function quadro(agora) {
      if (inicio === null) inicio = agora;
      var t = Math.min(1, (agora - inicio) / duracao);
      var e = 1 - Math.pow(2, -10 * t);
      valores.forEach(function (el) {
        var alvo = Number(el.getAttribute('data-conta-valor')) || 0;
        var v = Math.round(alvo * e);
        el.textContent = (el.getAttribute('data-conta-prefixo') || '') + v.toLocaleString('pt-BR');
      });
      if (t < 1) {
        requestAnimationFrame(quadro);
      } else if (pergunta) {
        pergunta.style.transition = 'opacity 420ms cubic-bezier(0.23, 1, 0.32, 1)';
        pergunta.style.opacity = '1';
      }
    }
    requestAnimationFrame(quadro);
  }

  /* ---------- Rosto do Matheus: só com fotoHero em config.js ---------- */
  var rostos = document.querySelectorAll('[data-rosto]');
  if (rostos.length && typeof cfg.fotoHero === 'string' && /^[\w./-]+\.(png|webp)$/i.test(cfg.fotoHero.trim())) {
    Array.prototype.forEach.call(rostos, function (img) {
      var raiz = img.getAttribute('data-raiz') || '';
      img.src = raiz + cfg.fotoHero.trim();
      img.alt = 'Matheus Souza';
      img.hidden = false;
      var lugar = img.closest('[data-foto-lugar]');
      if (lugar) lugar.classList.add('tem-foto');
      var abertura = img.closest('[data-abertura]');
      if (abertura) abertura.classList.add('tem-rosto');
    });
  }

  function dataBR(iso) {
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
  }
})();
