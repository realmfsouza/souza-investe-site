/* Taxa do dia nos simuladores.
   Lê dados/taxas.json (gerado pelo OS a partir do Banco Central) sem travar a página:
   os simuladores já desenham com 10% e 4%, e este arquivo só troca os valores padrão
   quando o arquivo chega. Campo que a pessoa já mexeu não é sobrescrito.
   Se o arquivo não carregar, nada muda e fica o texto original "10% é só um exemplo". */
(function () {
  'use strict';
  if (!window.fetch) return;

  var CAMPOS_TAXA = ['a-taxa', 'p-taxa', 'r-taxa'];
  var CAMPOS_INFLACAO = ['a-infl', 'r-infl'];
  var mexeu = {};

  CAMPOS_TAXA.concat(CAMPOS_INFLACAO).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', function (e) { if (e.isTrusted) mexeu[id] = true; });
  });

  function br(n) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function dataBR(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  function preencher(ids, valor) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || mexeu[id]) return;
      el.value = String(Math.round(valor * 100) / 100);
      // Os simuladores recalculam no evento input; disparo um para cada campo trocado.
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  fetch('../dados/taxas.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (t) {
      var cdi = t && t.cdi_anual ? Number(t.cdi_anual.valor) : NaN;
      var ipca = t && t.ipca_12m ? Number(t.ipca_12m.valor) : NaN;
      if (!isFinite(cdi) || cdi <= 0 || cdi > 100) return;
      var temIpca = isFinite(ipca) && ipca >= 0 && ipca < 50;

      preencher(CAMPOS_TAXA, cdi);
      if (temIpca) preencher(CAMPOS_INFLACAO, ipca);

      var dica = document.getElementById('a-taxa-dica');
      if (dica && !mexeu['a-taxa']) dica.textContent = 'Preenchi com o CDI do dia. Use a Selic ou outra taxa, se quiser.';

      var linha = document.getElementById('taxa-linha');
      var texto = document.getElementById('taxa-linha-texto');
      if (linha && texto) {
        var quando = dataBR(t.cdi_anual.data);
        texto.innerHTML = 'CDI de <span class="dinheiro">' + br(cdi) + '%</span> ao ano' + (quando ? ' em ' + quando : '') +
          (temIpca ? ' e IPCA de <span class="dinheiro">' + br(ipca) + '%</span> em 12 meses' : '') +
          ', fonte Banco Central. Ajuste se quiser.';
        linha.hidden = false;
      }
    })
    .catch(function () { /* mantém 10% e 4% */ });
})();
