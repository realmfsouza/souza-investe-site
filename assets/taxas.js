/* Taxa do dia nos simuladores.
   Lê dados/taxas.json (gerado pelo OS a partir do Banco Central e do Tesouro Nacional) sem travar
   a página: os simuladores já desenham com 10% e 4%, e este arquivo só troca os valores padrão
   quando o arquivo chega. Campo que a pessoa já mexeu não é sobrescrito.
   Com a chave "tesouro" no arquivo, cada simulador ganha o seletor "Taxa de referência": CDI do dia
   ou um título do Tesouro Direto, sempre com fonte e data. Sem a chave, o seletor fica escondido e
   tudo funciona como antes. Se o arquivo não carregar, nada muda e fica o texto "10% é só um exemplo". */
(function () {
  'use strict';
  if (!window.fetch) return;

  var CAMPOS_TAXA = ['a-taxa', 'p-taxa', 'r-taxa'];
  var CAMPOS_INFLACAO = ['a-infl', 'r-infl'];
  var mexeu = {};

  function $(id) { return document.getElementById(id); }

  CAMPOS_TAXA.concat(CAMPOS_INFLACAO).forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function (e) {
      if (!e.isTrusted) return;
      mexeu[id] = true;
      // Digitou a taxa à mão: o seletor deixa de apontar para uma referência.
      var sel = $(id + '-ref');
      if (sel) { sel.value = ''; mostrarDica(sel); }
    });
  });

  function br(n) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function dataBR(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }

  function arred(valor) { return Math.round(valor * 100) / 100; }

  function definir(id, valor) {
    var el = $(id);
    if (!el) return;
    el.value = String(arred(valor));
    // Os simuladores recalculam no evento input; disparo um para cada campo trocado.
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function preencher(ids, valor) {
    ids.forEach(function (id) { if (!mexeu[id]) definir(id, valor); });
  }

  function numero(obj) {
    var v = obj && obj.valor != null ? Number(obj.valor) : NaN;
    return isFinite(v) ? v : NaN;
  }

  /* Cada título do Tesouro vira uma opção com a taxa anual que entra no simulador.
     Prefixado: a própria taxa. Selic: Selic meta mais o acréscimo do título.
     IPCA+: taxa real composta com o IPCA dos últimos 12 meses, só como referência. */
  function opcoesTesouro(t, selic, ipca) {
    var tes = t && t.tesouro;
    if (!tes || !tes.titulos || !tes.titulos.length) return [];
    var quando = dataBR(tes.data_base);
    var fonte = 'Taxa de compra do Tesouro Direto em ' + quando + ', fonte Tesouro Nacional.';
    var temSelic = isFinite(selic) && selic > 0 && selic < 100;
    var temIpca = isFinite(ipca) && ipca >= 0 && ipca < 50;
    var opcoes = [];
    tes.titulos.forEach(function (tit) {
      var taxa = Number(tit.taxa), ano = String(tit.vencimento || '').slice(0, 4), nominal, rotulo, dica;
      if (!isFinite(taxa) || !ano) return;
      if (tit.indexador === 'prefixado') {
        nominal = taxa;
        rotulo = 'Tesouro Prefixado ' + ano + ': ' + br(taxa) + '% ao ano';
        dica = fonte;
      } else if (tit.indexador === 'selic') {
        if (!temSelic) return;
        nominal = selic + taxa;
        rotulo = 'Tesouro Selic ' + ano + ': Selic + ' + br(taxa) + '%, cerca de ' + br(nominal) + '%';
        dica = 'Selic meta de ' + br(selic) + '% (Banco Central) mais o acréscimo do título. ' + fonte;
      } else if (tit.indexador === 'ipca') {
        if (!temIpca) return;
        nominal = ((1 + taxa / 100) * (1 + ipca / 100) - 1) * 100;
        rotulo = 'Tesouro IPCA+ ' + ano + ': IPCA + ' + br(taxa) + '%, cerca de ' + br(nominal) + '%';
        dica = 'Taxa real do título mais o IPCA dos últimos 12 meses (' + br(ipca) + '%, Banco Central). ' +
          'A inflação à frente é outra: o número é referência, não previsão. ' + fonte;
      } else {
        return;
      }
      if (!isFinite(nominal) || nominal <= 0 || nominal > 100) return;
      opcoes.push({ tipo: tit.tipo, taxa: taxa, valor: arred(nominal), rotulo: rotulo, dica: dica, grupo: 'Tesouro Direto, ' + quando });
    });
    return opcoes;
  }

  function opcao(valor, texto, dica, dado) {
    var o = document.createElement('option');
    o.value = valor;
    o.textContent = texto;
    o.setAttribute('data-dica', dica);
    if (dado != null) o.setAttribute('data-valor', String(dado));
    return o;
  }

  function mostrarDica(sel) {
    var dica = $(sel.id + '-dica');
    if (!dica) return;
    var o = sel.options[sel.selectedIndex];
    dica.textContent = o ? o.getAttribute('data-dica') || '' : '';
  }

  function montarSeletor(campo, cdi, cdiData, opcoes) {
    var sel = $(campo + '-ref'), caixa = $(campo + '-ref-campo');
    if (!sel || !caixa) return;
    sel.innerHTML = '';
    sel.appendChild(opcao('', 'Digitada à mão', 'Você digitou a taxa. Escolha uma referência para voltar à taxa do dia.'));
    var gBC = document.createElement('optgroup');
    gBC.label = 'Banco Central, ' + cdiData;
    gBC.appendChild(opcao('cdi', 'CDI do dia: ' + br(cdi) + '% ao ano',
      'CDI de ' + br(cdi) + '% ao ano em ' + cdiData + ', fonte Banco Central.', cdi));
    sel.appendChild(gBC);
    var gTes = document.createElement('optgroup');
    gTes.label = opcoes[0].grupo;
    opcoes.forEach(function (op, i) { gTes.appendChild(opcao('tesouro-' + i, op.rotulo, op.dica, op.valor)); });
    sel.appendChild(gTes);
    sel.value = mexeu[campo] ? '' : 'cdi';
    mostrarDica(sel);
    sel.addEventListener('change', function () {
      var o = sel.options[sel.selectedIndex];
      var v = o ? Number(o.getAttribute('data-valor')) : NaN;
      if (isFinite(v)) definir(campo, v);
      mostrarDica(sel);
      // A dica do campo de taxa do primeiro simulador acompanha a referência escolhida.
      var dicaCampo = $(campo + '-dica');
      if (dicaCampo) {
        dicaCampo.textContent = sel.value === 'cdi' ? 'Preenchi com o CDI do dia. Use a Selic ou outra taxa, se quiser.'
          : sel.value ? 'Preenchi com a taxa do Tesouro Direto escolhida acima. Use outra, se quiser.'
          : 'Use a Selic ou o CDI do dia, ou a taxa de referência acima.';
      }
    });
    caixa.hidden = false;
  }

  /* Resumo de um tipo para a linha do topo: "Prefixado de 12,30% a 13,28%". */
  function faixa(opcoes, tipo) {
    var min = Infinity, max = -Infinity;
    opcoes.forEach(function (o) { if (o.tipo === tipo) { min = Math.min(min, o.taxa); max = Math.max(max, o.taxa); } });
    if (!isFinite(min)) return '';
    var prefixo = tipo === 'Tesouro Selic' ? 'Selic + ' : tipo === 'Tesouro IPCA+' ? 'IPCA + ' : '';
    var nome = tipo.replace('Tesouro ', '');
    if (min === max) return nome + ' a ' + prefixo + br(min) + '%';
    return nome + ' de ' + prefixo + br(min) + '% a ' + br(max) + '%';
  }

  fetch('../dados/taxas.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (t) {
      var cdi = numero(t && t.cdi_anual);
      var ipca = numero(t && t.ipca_12m);
      var selic = numero(t && t.selic_meta);
      if (!isFinite(cdi) || cdi <= 0 || cdi > 100) return;
      var temIpca = isFinite(ipca) && ipca >= 0 && ipca < 50;

      preencher(CAMPOS_TAXA, cdi);
      if (temIpca) preencher(CAMPOS_INFLACAO, ipca);

      var dica = $('a-taxa-dica');
      if (dica && !mexeu['a-taxa']) dica.textContent = 'Preenchi com o CDI do dia. Use a Selic ou outra taxa, se quiser.';

      var cdiData = dataBR(t.cdi_anual.data);
      var opcoes = opcoesTesouro(t, selic, ipca);
      if (opcoes.length) CAMPOS_TAXA.forEach(function (campo) { montarSeletor(campo, cdi, cdiData, opcoes); });

      var linha = $('taxa-linha');
      var texto = $('taxa-linha-texto');
      if (linha && texto) {
        var html = 'CDI de <span class="dinheiro">' + br(cdi) + '%</span> ao ano' + (cdiData ? ' em ' + cdiData : '') +
          (temIpca ? ' e IPCA de <span class="dinheiro">' + br(ipca) + '%</span> em 12 meses' : '') +
          ', fonte Banco Central.';
        if (opcoes.length) {
          var partes = ['Tesouro Prefixado', 'Tesouro IPCA+', 'Tesouro Selic'].map(function (tipo) { return faixa(opcoes, tipo); }).filter(Boolean);
          html += ' Tesouro Direto em ' + dataBR(t.tesouro.data_base) + ', fonte Tesouro Nacional: ' + partes.join('; ') +
            '. Escolha a taxa de referência em cada simulador, ou digite a sua.';
        } else {
          html += ' Ajuste se quiser.';
        }
        texto.innerHTML = html;
        linha.hidden = false;
      }
    })
    .catch(function () { /* mantém 10% e 4% */ });
})();
