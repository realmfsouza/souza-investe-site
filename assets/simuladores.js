/* Simuladores da série Prova Real.
   A lógica de cálculo veio sem mudança de _sistema/site-fontes/simuladores.html do OS.
   Fora do cálculo, só ajustes de integração ao site: a lista de e-mail saiu daqui
   (agora em assets/site.js, com o endpoint em assets/config.js); o clique na aba rola até
   a barra de abas em vez do topo da página, respeitando prefers-reduced-motion; e o
   hashchange só troca de aba quando o hash é de um simulador (#lista não mexe nas abas). */
(function () {
  'use strict';

  // ---------- Helpers ----------
  var fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  var fmtBRL2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmtPct = function (v, d) { return v.toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + '%'; };
  function brl(v) { return fmtBRL.format(Math.round(v)); }
  function brl2(v) { return fmtBRL2.format(v); }
  function short(v) {
    var a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
    if (a >= 1e3) return s + 'R$ ' + (a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
    return s + 'R$ ' + a.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }
  function num(id, def) { var el = document.getElementById(id); var v = parseFloat(String(el.value).replace(',', '.')); if (!isFinite(v)) v = def || 0; var mn = parseFloat(el.min), mx = parseFloat(el.max); if (isFinite(mn) && v < mn) v = mn; if (isFinite(mx) && v > mx) v = mx; return v; }
  function $(id) { return document.getElementById(id); }
  function mrate(annualPct) { return Math.pow(1 + annualPct / 100, 1 / 12) - 1; }
  function irRate(months) { var dias = months * 365 / 12; if (dias <= 180) return 0.225; if (dias <= 360) return 0.20; if (dias <= 720) return 0.175; return 0.15; } // prazo em dias de calendário (mês = 365/12), Lei 11.033/2004
  function anosMeses(m) { var a = Math.floor(m / 12), r = m % 12; if (a === 0) return r + (r === 1 ? ' mês' : ' meses'); if (r === 0) return a + (a === 1 ? ' ano' : ' anos'); return a + (a === 1 ? ' ano e ' : ' anos e ') + r + (r === 1 ? ' mês' : ' meses'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Line chart (SVG, two series, crosshair tooltip) ----------
  function lineChart(host, opt) {
    var W = 640, H = 300, P = { l: 76, r: 104, t: 18, b: 34 };
    var series = opt.series, n = 0, i, j;
    for (i = 0; i < series.length; i++) n = Math.max(n, series[i].data.length);
    if (n < 2) { host.innerHTML = ''; return; }
    var ymax = -Infinity, ymin = Infinity;
    for (i = 0; i < series.length; i++) for (j = 0; j < series[i].data.length; j++) { var v = series[i].data[j]; if (v > ymax) ymax = v; if (v < ymin) ymin = v; }
    if (ymin > 0) ymin = 0; if (ymax < 0) ymax = 0;
    if (ymax === ymin) ymax = ymin + 1;
    // nice ticks
    var span = ymax - ymin, raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), nrm = raw / mag, step = (nrm <= 1 ? 1 : nrm <= 2 ? 2 : nrm <= 2.5 ? 2.5 : nrm <= 5 ? 5 : 10) * mag;
    var y0 = Math.floor(ymin / step) * step, y1 = Math.ceil(ymax / step) * step;
    var pw = W - P.l - P.r, ph = H - P.t - P.b;
    var sx = function (k) { return P.l + (k / (n - 1)) * pw; };
    var sy = function (v) { return P.t + (1 - (v - y0) / (y1 - y0)) * ph; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opt.aria || 'Gráfico') + '">';
    s += '<g class="grid">';
    for (var t = y0; t <= y1 + step / 2; t += step) { var yy = sy(t); s += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>'; s += '<text x="' + (P.l - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + esc(short(t)) + '</text>'; }
    s += '</g>';
    if (y0 < 0) s += '<line class="zero" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + sy(0).toFixed(1) + '" y2="' + sy(0).toFixed(1) + '"/>';
    // x labels
    var xs = opt.xStep || 12, labels = Math.floor((n - 1) / xs); while (labels > 8) { xs *= 2; labels = Math.floor((n - 1) / xs); }
    for (var k = 0; k < n; k += xs) { s += '<text x="' + sx(k).toFixed(1) + '" y="' + (H - 12) + '" text-anchor="middle">' + esc(opt.xLabel(k)) + '</text>'; }
    // series
    var ends = [];
    for (i = 0; i < series.length; i++) {
      var d = series[i].data, path = '';
      for (j = 0; j < d.length; j++) path += (j ? 'L' : 'M') + sx(j).toFixed(1) + ' ' + sy(d[j]).toFixed(1);
      if (i === 0 && opt.area !== false) s += '<path d="' + path + 'L' + sx(d.length - 1).toFixed(1) + ' ' + sy(Math.max(0, y0)).toFixed(1) + 'L' + sx(0).toFixed(1) + ' ' + sy(Math.max(0, y0)).toFixed(1) + 'Z" fill="' + series[i].color + '" opacity="0.10"/>';
      s += '<path d="' + path + '" fill="none" stroke="' + series[i].color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      var ex = sx(d.length - 1), ey = sy(d[d.length - 1]);
      s += '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="4" fill="' + series[i].color + '" stroke="var(--surface)" stroke-width="2"/>';
      ends.push({ x: ex, y: ey, name: series[i].name, color: series[i].color });
    }
    // direct end labels, nudged apart
    if (ends.length === 2 && Math.abs(ends[0].y - ends[1].y) < 14) { var mid = (ends[0].y + ends[1].y) / 2; if (ends[0].y <= ends[1].y) { ends[0].y = mid - 8; ends[1].y = mid + 8; } else { ends[0].y = mid + 8; ends[1].y = mid - 8; } }
    for (i = 0; i < ends.length; i++) { var ty = Math.min(H - P.b - 4, Math.max(P.t + 8, ends[i].y)); s += '<text class="end" x="' + (ends[i].x + 9).toFixed(1) + '" y="' + (ty + 4).toFixed(1) + '" text-anchor="start" style="fill:' + ends[i].color + '">' + esc(ends[i].name) + '</text>'; }
    s += '<line class="cross" id="cross" x1="0" x2="0" y1="' + P.t + '" y2="' + (H - P.b) + '" visibility="hidden"/>';
    s += '</svg><div class="tip" hidden></div>';
    host.innerHTML = s;
    var svg = host.querySelector('svg'), tip = host.querySelector('.tip'), cross = host.querySelector('#cross');
    function show(e) {
      var r = svg.getBoundingClientRect(); var px = (e.clientX - r.left) / r.width * W;
      var k = Math.round((px - P.l) / pw * (n - 1)); if (k < 0) k = 0; if (k > n - 1) k = n - 1;
      cross.setAttribute('x1', sx(k)); cross.setAttribute('x2', sx(k)); cross.setAttribute('visibility', 'visible');
      var html = '<div><b>' + esc(opt.xTip(k)) + '</b></div>';
      for (var q = 0; q < series.length; q++) if (k < series[q].data.length) html += '<div class="row"><span>' + esc(series[q].name) + '</span><b>' + esc(brl(series[q].data[k])) + '</b></div>';
      tip.innerHTML = html; tip.hidden = false;
      var left = sx(k) / W * r.width, top = (P.t / H) * r.height;
      var tw = tip.offsetWidth; if (left - tw / 2 < 0) left = tw / 2; if (left + tw / 2 > r.width) left = r.width - tw / 2;
      tip.style.left = left + 'px'; tip.style.top = (top - 6) + 'px';
    }
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', function () { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
  }
  function yearTable(host, cols, rows) {
    var h = '<table class="tbl"><thead><tr>'; cols.forEach(function (c) { h += '<th>' + esc(c) + '</th>'; }); h += '</tr></thead><tbody>';
    rows.forEach(function (r) { h += '<tr>'; r.forEach(function (c, i) { h += '<td>' + esc(i ? brl(c) : c) + '</td>'; }); h += '</tr>'; });
    host.innerHTML = h + '</tbody></table>';
  }

  // ---------- 01 Aporte mensal ----------
  function calcAporte() {
    var monthly = num('a-mensal'), initial = num('a-inicial'), annual = num('a-taxa'), years = Math.round(num('a-anos', 10)), infl = num('a-infl'), taxed = $('a-ir-sim').checked;
    var N = years * 12, i = mrate(annual), s = initial, ap = initial, saldo = [initial], aportado = [initial], hit10 = null, m, k;
    for (m = 1; m <= N; m++) { s = (s + monthly) * (1 + i); ap += monthly; saldo.push(s); aportado.push(ap); if (hit10 === null && s >= 10000) hit10 = m; }
    var tax = 0;
    if (taxed) {
      var g0 = initial * Math.pow(1 + i, N) - initial; tax += g0 * irRate(N);
      for (k = 1; k <= N; k++) { var hold = N - k + 1; var val = monthly * Math.pow(1 + i, hold); tax += (val - monthly) * irRate(hold); }
    }
    var net = s - tax, juros = s - ap, real = net / Math.pow(1 + infl / 100, years);
    $('a-hero').textContent = brl(net);
    $('a-aportado').textContent = brl(ap); $('a-juros').textContent = brl(juros); $('a-ir').textContent = taxed ? brl(tax) : 'isento'; $('a-real').textContent = brl(real);
    var v = 'Em ' + years + (years === 1 ? ' ano' : ' anos') + ', ' + brl(ap) + ' do seu bolso viram ' + brl(net) + ' líquidos. Os juros fizeram ' + (ap > 0 ? Math.round(juros / ap * 100) : 0) + '% do trabalho.';
    if (hit10 !== null) v += ' Os primeiros R$ 10 mil chegam em ' + anosMeses(hit10) + '.'; else if (monthly > 0) v += ' Nesse ritmo, os R$ 10 mil não chegam no prazo.';
    $('a-verdict').textContent = v;
    lineChart($('a-chart'), { series: [{ name: 'Saldo bruto', color: 'var(--s1)', data: saldo }, { name: 'Você colocou', color: 'var(--s2)', data: aportado }], xStep: 12, xLabel: function (k) { return k === 0 ? 'início' : (k / 12) + ' a'; }, xTip: function (k) { return k === 0 ? 'Início' : 'Mês ' + k + ' (' + anosMeses(k) + ')'; }, aria: 'Saldo bruto e valor aportado, mês a mês' });
    var rows = []; for (m = 12; m <= N; m += 12) rows.push(['Ano ' + (m / 12), aportado[m], saldo[m] - aportado[m], saldo[m]]);
    yearTable($('a-table'), ['Ano', 'Você colocou', 'Juros', 'Saldo bruto'], rows);
  }

  // ---------- 02 Parcelar ou à vista ----------
  function calcParcelar() {
    var preco = num('p-preco', 1), desc = num('p-desc'), n = Math.round(num('p-n', 12)), jm = num('p-j') / 100, annual = num('p-taxa');
    var cash = preco * (1 - desc / 100);
    var parcela = jm > 0 ? preco * jm / (1 - Math.pow(1 + jm, -n)) : preco / n;
    var iNet = mrate(annual) * 0.80;
    var pot = cash, series = [cash], paid = [0], runsOut = null, m;
    for (m = 1; m <= n; m++) { pot = pot * (1 + iNet) - parcela; series.push(pot); paid.push(parcela * m); if (pot < 0 && runsOut === null) runsOut = m; }
    // implicit monthly rate: cash = sum parcela/(1+r)^m
    var rStar = 0;
    if (parcela * n > cash) { var lo = 0, hi = 2, mid, q; for (q = 0; q < 80; q++) { mid = (lo + hi) / 2; var pv = 0; for (m = 1; m <= n; m++) pv += parcela / Math.pow(1 + mid, m); if (pv > cash) lo = mid; else hi = mid; } rStar = (lo + hi) / 2; }
    var parcelarWins = pot >= 0;
    $('p-label').textContent = parcelarWins ? 'Vence: parcelar e deixar o dinheiro rendendo' : 'Vence: pagar à vista';
    $('p-hero').textContent = (parcelarWins ? 'sobram ' : 'faltam ') + brl2(Math.abs(pot));
    var v;
    if (parcelarWins) v = 'Você paga as ' + n + ' parcelas com o dinheiro que deixaria na loja e ainda termina com ' + brl2(pot) + '. O desconto de ' + fmtPct(desc, 1) + ' não cobre o que o seu dinheiro rende em ' + n + ' meses.';
    else v = 'O dinheiro guardado acaba na parcela ' + runsOut + '. O desconto de ' + fmtPct(desc, 1) + ' equivale a um juro de ' + fmtPct(rStar * 100, 2) + ' ao mês, mais do que o seu dinheiro rende. Pagar à vista sai ' + brl2(-pot) + ' mais barato.';
    if (desc === 0 && jm === 0) v = 'Sem desconto e sem juros, parcelar é dinheiro grátis: o valor fica rendendo e sobram ' + brl2(pot) + '. Só vale se o dinheiro à vista existe.';
    $('p-verdict').textContent = v;
    $('p-cash').textContent = brl2(cash); $('p-parc').textContent = n + 'x ' + brl2(parcela); $('p-rstar').textContent = fmtPct(rStar * 100, 2) + ' a.m.'; $('p-inet').textContent = fmtPct(iNet * 100, 2) + ' a.m.';
    lineChart($('p-chart'), { series: [{ name: 'Dinheiro investido', color: 'var(--s1)', data: series }, { name: 'Parcelas já pagas', color: 'var(--s2)', data: paid }], xStep: n <= 12 ? 1 : n <= 24 ? 2 : 6, xLabel: function (k) { return k === 0 ? 'hoje' : k + 'ª'; }, xTip: function (k) { return k === 0 ? 'Hoje' : 'Depois da ' + k + 'ª parcela'; }, aria: 'Dinheiro investido pagando as parcelas, mês a mês' });
    var rows = []; for (m = 0; m <= n; m++) rows.push([m === 0 ? 'Hoje' : 'Parcela ' + m, paid[m], series[m]]);
    yearTable($('p-table'), ['Momento', 'Parcelas pagas', 'Dinheiro investido'], rows);
  }

  // ---------- 03 FGC ----------
  var FGC_LIM = 250000, FGC_GLOBAL = 1000000;
  var fgcRows = [
    { name: 'Banco digital (CDB)', valor: 8000, tipo: 'fgc' },
    { name: 'Banco do CDB de 120% do CDI', valor: 2500, tipo: 'fgc' },
    { name: 'Tesouro Direto', valor: 1500, tipo: 'tesouro' }
  ];
  function renderFgcInputs() {
    var host = $('fgc-list'), h = '';
    fgcRows.forEach(function (r, idx) {
      h += '<div class="fgc-in" data-idx="' + idx + '">' +
        '<div class="field full"><label for="f-name-' + idx + '">Instituição</label><div class="in"><input id="f-name-' + idx + '" type="text" data-k="name" value="' + esc(r.name) + '" style="font-family:var(--font-body)"></div></div>' +
        '<div class="field"><label for="f-val-' + idx + '">Valor aplicado</label><div class="in"><span class="unit pre">R$</span><input id="f-val-' + idx + '" type="number" inputmode="decimal" min="0" step="500" data-k="valor" value="' + r.valor + '"></div></div>' +
        '<div class="field"><label for="f-tipo-' + idx + '">Tipo</label><div class="in"><select id="f-tipo-' + idx + '" data-k="tipo">' +
        '<option value="fgc"' + (r.tipo === 'fgc' ? ' selected' : '') + '>CDB, LCI, LCA, poupança</option>' +
        '<option value="tesouro"' + (r.tipo === 'tesouro' ? ' selected' : '') + '>Tesouro Direto</option>' +
        '<option value="bolsa"' + (r.tipo === 'bolsa' ? ' selected' : '') + '>Ações, FIIs, ETFs, fundos</option>' +
        '<option value="cripto"' + (r.tipo === 'cripto' ? ' selected' : '') + '>Cripto em exchange</option>' +
        '</select></div></div>' +
        (fgcRows.length > 1 ? '<div class="field full" style="align-items:flex-end"><button type="button" class="rm" data-rm="' + idx + '">Remover</button></div>' : '') +
        '</div>';
    });
    host.innerHTML = h;
  }
  function calcFgc() {
    var cov = 0, unc = 0, out = 0, bars = '', maxV = 0;
    fgcRows.forEach(function (r) { if (r.valor > maxV) maxV = r.valor; });
    fgcRows.forEach(function (r) {
      var v = r.valor;
      if (r.tipo === 'fgc') {
        var c = Math.min(v, FGC_LIM), u = v - c; cov += c; unc += u;
        bars += '<div class="fgc-row"><div class="fgc-head"><span class="name">' + esc(r.name || 'Sem nome') + '</span>' + (u > 0 ? '<span class="chip serious">! ' + brl(u) + ' acima do limite</span>' : '<span class="chip good">✓ coberto</span>') + '</div>' +
          '<div class="bar" title="' + esc(r.name) + ': coberto ' + brl(c) + ', descoberto ' + brl(u) + '"><span class="cov" style="width:' + (maxV ? c / maxV * 100 : 0) + '%"></span>' + (u > 0 ? '<span class="unc" style="width:' + (u / maxV * 100) + '%"></span>' : '') + '</div>' +
          '<div class="fgc-vals">Coberto ' + brl(c) + (u > 0 ? ' · Descoberto ' + brl(u) : '') + '</div></div>';
      } else {
        out += v;
        var txt = r.tipo === 'tesouro' ? 'Garantia do Tesouro Nacional, fora do FGC' : r.tipo === 'bolsa' ? 'Sem FGC; fica no seu CPF na B3' : 'Sem garantia nenhuma';
        bars += '<div class="fgc-row"><div class="fgc-head"><span class="name">' + esc(r.name || 'Sem nome') + '</span><span class="chip">' + esc(txt) + '</span></div><div class="fgc-vals">' + brl(v) + ' · outra regra, não entra na conta do FGC</div></div>';
      }
    });
    var over = Math.max(0, cov - FGC_GLOBAL); cov = Math.min(cov, FGC_GLOBAL);
    $('f-hero').textContent = brl(cov);
    $('f-cov').textContent = brl(cov); $('f-unc').textContent = brl(unc + over); $('f-out').textContent = brl(out);
    var v;
    if (unc + over === 0) v = 'Se qualquer uma dessas instituições quebrar, o FGC devolve tudo o que está em CDB, LCI, LCA e poupança, até R$ 250 mil por instituição. O que fica de fora é o tempo: o dinheiro para de render até o pagamento.';
    else v = 'Há ' + brl(unc + over) + ' que o FGC não devolve se o banco quebrar' + (over > 0 ? ', incluindo ' + brl(over) + ' acima do teto de R$ 1 milhão' : '') + '. A saída é espalhar: até R$ 250 mil por CPF em cada instituição.';
    $('f-verdict').textContent = v;
    $('f-bars').innerHTML = bars || '<p class="note">Adicione uma instituição.</p>';
  }
  $('fgc-list').addEventListener('input', function (e) {
    var row = e.target.closest('.fgc-in'); if (!row) return; var idx = +row.getAttribute('data-idx'), k = e.target.getAttribute('data-k');
    if (k === 'valor') { var v = parseFloat(e.target.value); fgcRows[idx].valor = isFinite(v) && v >= 0 ? v : 0; } else if (k === 'name') fgcRows[idx].name = e.target.value; else if (k === 'tipo') fgcRows[idx].tipo = e.target.value;
    mudou('fgc')();
  });
  $('fgc-list').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; fgcRows.splice(+b.getAttribute('data-rm'), 1); renderFgcInputs(); mudou('fgc')(); });
  $('fgc-add').addEventListener('click', function () { if (fgcRows.length >= 8) return; fgcRows.push({ name: 'Instituição ' + (fgcRows.length + 1), valor: 0, tipo: 'fgc' }); renderFgcInputs(); mudou('fgc')(); var last = $('fgc-list').querySelector('.fgc-in:last-child input'); if (last) last.focus(); });

  // ---------- 04 Renda passiva ----------
  function simRenda(meta, monthly, initial, annual, infl, maxMonths) {
    var i = mrate(annual), pi = mrate(infl), s = initial, saldo = [initial], need = [meta * 12 / (annual / 100)], hit = null, ap = initial, m;
    for (m = 1; m <= maxMonths; m++) { s = (s + monthly) * (1 + i); ap += monthly; var nd = meta * Math.pow(1 + pi, m) * 12 / (annual / 100); saldo.push(s); need.push(nd); if (hit === null && s >= nd) { hit = m; } if (hit !== null && m >= hit + 12) break; }
    return { saldo: saldo, need: need, hit: hit, aportado: hit === null ? ap : initial + monthly * hit };
  }
  function calcRenda() {
    var meta = num('r-meta', 1000), monthly = num('r-mensal'), initial = num('r-inicial'), annual = num('r-taxa', 10), infl = num('r-infl');
    var MAX = 60 * 12, r = simRenda(meta, monthly, initial, annual, infl, MAX);
    if (annual <= 0) { $('r-hero').textContent = '—'; $('r-verdict').textContent = 'Com rendimento zero, nenhum patrimônio gera renda. Coloque uma taxa.'; return; }
    if (r.hit === null) {
      $('r-hero').textContent = 'mais de 60 anos';
      $('r-verdict').textContent = 'Com ' + brl(monthly) + ' por mês a ' + fmtPct(annual, 1) + ' ao ano, a meta de ' + brl(meta) + ' por mês não chega em 60 anos, porque a inflação a empurra para longe mais rápido do que você se aproxima. Suba o aporte ou a taxa.';
      $('r-need').textContent = '—'; $('r-need-hoje').textContent = brl(meta * 12 / (annual / 100)); $('r-aportado').textContent = '—'; $('r-juros').textContent = '—';
    } else {
      var needAt = r.need[r.hit], hoje = meta * 12 / (annual / 100), juros = r.saldo[r.hit] - r.aportado;
      $('r-hero').textContent = anosMeses(r.hit);
      $('r-verdict').textContent = 'Com ' + brl(monthly) + ' por mês a ' + fmtPct(annual, 1) + ' ao ano, você chega a ' + brl(needAt) + ' em ' + anosMeses(r.hit) + '. Esse valor rende ' + brl(meta * Math.pow(1 + mrate(infl), r.hit)) + ' por mês, o que naquele ano compra o que ' + brl(meta) + ' compram hoje. Você terá colocado ' + brl(r.aportado) + '; os juros fizeram o resto.';
      $('r-need').textContent = brl(needAt); $('r-need-hoje').textContent = brl(hoje); $('r-aportado').textContent = brl(r.aportado); $('r-juros').textContent = brl(juros);
    }
    var n = r.saldo.length;
    lineChart($('r-chart'), { series: [{ name: 'Seu saldo', color: 'var(--s1)', data: r.saldo }, { name: 'Necessário', color: 'var(--s2)', data: r.need }], xStep: 12, xLabel: function (k) { return k === 0 ? 'início' : (k / 12) + ' a'; }, xTip: function (k) { return k === 0 ? 'Início' : 'Mês ' + k + ' (' + anosMeses(k) + ')'; }, aria: 'Saldo acumulado contra o patrimônio necessário, mês a mês' });
    var rows = [], m; for (m = 12; m < n; m += 12) rows.push(['Ano ' + (m / 12), r.saldo[m], r.need[m]]); if ((n - 1) % 12 !== 0) rows.push(['Mês ' + (n - 1), r.saldo[n - 1], r.need[n - 1]]);
    yearTable($('r-table'), ['Ano', 'Seu saldo', 'Necessário'], rows);
    var sens = '', opts = [monthly / 2, monthly, monthly * 2, monthly * 4];
    opts.forEach(function (a) { if (a <= 0) return; var q = simRenda(meta, a, initial, annual, infl, MAX); sens += '<div><div class="k">' + brl(a) + ' por mês</div><div class="v">' + (q.hit === null ? '> 60 anos' : anosMeses(q.hit)) + '</div></div>'; });
    $('r-sens').innerHTML = sens || '<div><div class="k">Coloque um aporte</div></div>';
  }

  // ---------- Wiring ----------
  function bind(ids, fn) { ids.forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', fn); }); }
  // A ordem da conta (o Matheus, 2026-10-19: "revela resultado durante o cálculo e divide espaço com os
  // campos de inserção"): primeiro os campos, depois o botão, e só então o resultado, embaixo. Mudar um
  // número depois não troca o resultado na hora: ele fica apagado até "Refazer a conta".
  var calcs = { aporte: calcAporte, parcelar: calcParcelar, fgc: calcFgc, renda: calcRenda };
  var revelado = {};
  function preparar(p) {
    var sec = $(p), res = sec && sec.querySelector('.results'), card = sec && sec.querySelector('.grid > .card');
    if (!res || !card) return;
    res.hidden = true;
    var barra = document.createElement('div');
    barra.className = 'conta-acoes';
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'botao botao-tinta conta-botao';
    b.textContent = 'Fazer a conta';
    var aviso = document.createElement('p');
    aviso.className = 'conta-aviso';
    aviso.hidden = true;
    aviso.setAttribute('role', 'status');
    aviso.textContent = 'Você mudou os números. Refaça a conta para ver o resultado novo.';
    barra.appendChild(b);
    barra.appendChild(aviso);
    card.appendChild(barra);
    b.addEventListener('click', function () { fazer(p, true); });
    sec.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') { e.preventDefault(); fazer(p, true); }
    });
  }
  function fazer(p, rolar) {
    var sec = $(p), res = sec.querySelector('.results'), b = sec.querySelector('.conta-botao'), aviso = sec.querySelector('.conta-aviso');
    res.hidden = false;
    res.classList.remove('desatualizado');
    calcs[p]();
    revelado[p] = true;
    if (b) b.textContent = 'Refazer a conta';
    if (aviso) aviso.hidden = true;
    if (rolar) {
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var y = res.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function mudou(p) {
    return function () {
      if (!revelado[p]) return;
      var sec = $(p);
      sec.querySelector('.results').classList.add('desatualizado');
      var a = sec.querySelector('.conta-aviso');
      if (a) a.hidden = false;
    };
  }
  bind(['a-mensal', 'a-inicial', 'a-taxa', 'a-anos', 'a-infl'], mudou('aporte'));
  $('a-ir-sim').addEventListener('change', mudou('aporte')); $('a-ir-nao').addEventListener('change', mudou('aporte'));
  bind(['p-preco', 'p-desc', 'p-n', 'p-j', 'p-taxa'], mudou('parcelar'));
  bind(['r-meta', 'r-mensal', 'r-inicial', 'r-taxa', 'r-infl'], mudou('renda'));

  // Tabs
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab')), panels = ['aporte', 'parcelar', 'fgc', 'renda'];
  function showTab(id, push) {
    if (panels.indexOf(id) < 0) id = 'aporte';
    tabs.forEach(function (t) { t.setAttribute('aria-selected', t.getAttribute('data-tab') === id ? 'true' : 'false'); });
    panels.forEach(function (p) { $(p).hidden = p !== id; });
    if (push) { try { history.replaceState(null, '', '#' + id); } catch (e) {} }
    try { localStorage.setItem('si-tab', id); } catch (e) {}
    // charts measure nothing on hidden panels, so draw after showing
    if (revelado[id]) calcs[id]();
  }
  // Integração ao site: depois de trocar de aba, a barra de abas volta ao topo da tela
  // (não o topo da página, onde estão o menu e a introdução). Sem animação se o sistema pedir.
  function scrollToTabs() {
    var mark = $('sim-topo'); if (!mark) return;
    var y = mark.getBoundingClientRect().top + window.pageYOffset;
    if (window.pageYOffset <= y) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { showTab(t.getAttribute('data-tab'), true); scrollToTabs(); }); });
  // Só troca de aba quando o hash é de um simulador; #lista e outros âncoras do site não mexem nas abas.
  window.addEventListener('hashchange', function () { var h = location.hash.replace('#', ''); if (panels.indexOf(h) >= 0) showTab(h, false); });

  // Boot
  renderFgcInputs();
  var start = location.hash.replace('#', ''); if (panels.indexOf(start) < 0) { try { start = localStorage.getItem('si-tab') || 'aporte'; } catch (e) { start = 'aporte'; } }
  panels.forEach(preparar);
  showTab(start, false);
})();
