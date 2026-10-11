/* Comportamento comum a todas as páginas: tema, redes do rodapé, lista de e-mail e a lista
   de vídeos. Sem dependências. Cada parte só roda se o elemento dela existir na página. */
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
    var endpoint = urlSegura(cfg.listEndpoint) ? cfg.listEndpoint.trim() : '';

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
            '<p class="etiqueta">Prova Real' + (v.numero ? ' · ' + esc(v.numero) : '') + (v.publicado_em ? ' · ' + esc(dataBR(v.publicado_em)) : '') + '</p>' +
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

  function dataBR(iso) {
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso);
  }
})();
