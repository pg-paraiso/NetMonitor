/* NetMonitor - Análise de Rotas.
   Envia origem/destino para POST /api/routes; o backend executa o Dijkstra e devolve tudo calculado. */
(function (NM) {
  const $ = (id) => document.getElementById(id);
  let topo, D;
  $('swap').innerHTML = NM.icon('refresh', 18);
  $('ico-go').innerHTML = NM.icon('arrow', 15);
  $('ch-o').innerHTML = $('ch-d').innerHTML = NM.icon('chevron', 14);
  $('tg').innerHTML = NM.icon('chevron', 16);

  function showErr(msg) { $('err').textContent = msg || ''; $('err').classList.toggle('show', !!msg); }

  function syncBoxes() {
    [['o', 'origem'], ['d', 'destino']].forEach(([k, id]) => {
      const d = D[$(id).value];
      $('sg-' + k).textContent = d.localidade;
      $('tx-' + k).textContent = NM.shortName(topo, d.id);
      $('sb-' + k).textContent = d.nome;
    });
  }

  function render(res) {
    const ok = res.existe;
    $('badge').innerHTML = ok ? `<span class="pill-tag tag-green">${NM.icon('check', 12)} Rota disponível</span>` : '<span class="pill-tag tag-red">Sem rota</span>';
    NM.drawPath($('diagrama'), res, topo);
    $('metricas').innerHTML = `
      <div><small>Latência total</small><b>${res.latencia_ms} <small>ms</small></b></div>
      <div><small>Número de saltos</small><b>${res.saltos}</b></div>
      <div><small>Largura mínima</small><b>${res.banda_gargalo_gbps} <small>Gbps</small></b></div>
      <div><small>Status</small><b style="font-size:13px" class="st-ok">${res.status}</b></div>`;

    $('tabela').innerHTML = `<table class="t"><thead><tr><th>Salto</th><th>Dispositivo</th><th>Localização</th><th>Latência</th><th>Status</th></tr></thead><tbody>${
      res.rota.map((id, i) => { const d = D[id], t = res.trechos[i - 1], loc = topo.localidades[d.localidade];
        return `<tr><td class="dim">${String(i + 1).padStart(2, '0')}</td>
          <td><div class="dev"><div class="di">${NM.icon(d.tipo, 15)}</div><div><b>${NM.esc(d.nome)}</b><small class="mono">${d.ip}</small></div></div></td>
          <td>${loc.nome}, ${loc.uf}</td><td>${t ? `<b>${t.latencia_ms} ms</b>` : '—'}</td>
          <td class="${NM.estadoClass[d.estado]}">${NM.estadoLabel[d.estado]}</td></tr>`; }).join('')}</tbody></table>`;

    // "Por que esta rota?": soma dos trechos x enlace direto
    const soma = res.trechos.map((t) => t.latencia_ms).join(' + ');
    const nomes = res.rota.map((id) => NM.esc(id)).join(' → ');
    const dir = res.enlace_direto;
    let html = `<div class="panel-h"><div><h2>Por que esta rota?</h2><p>O Dijkstra compara latências acumuladas, não a quantidade de saltos</p></div></div>`;
    if (dir && dir.latencia_ms > res.latencia_ms) {
      const max = dir.latencia_ms;
      html += `<div class="eq">
        <div class="opt win"><h3>Rota escolhida pelo Dijkstra · ${res.saltos} saltos</h3><div class="big">${soma} = ${res.latencia_ms} ms</div><p>${nomes}</p>
          <div class="bar"><i style="width:${res.latencia_ms / max * 100}%"></i></div></div>
        <div class="opt"><h3>Enlace direto · 1 salto</h3><div class="big">${dir.latencia_ms} ms</div><p>${NM.esc(res.origem)} → ${NM.esc(res.destino)}</p>
          <div class="bar"><i style="width:100%"></i></div></div></div>
        <div class="concl">${soma} = <b>${res.latencia_ms} ms</b> é melhor que <b>${dir.latencia_ms} ms</b>, mesmo com mais saltos (${res.saltos} contra 1).</div>`;
    } else if (dir) {
      html += `<div class="concl neutral" style="margin-top:0">O enlace direto (${dir.latencia_ms} ms) já é o caminho de menor latência.</div>`;
    } else {
      html += `<div class="concl neutral" style="margin-top:0">Não há enlace direto entre os dois pontos. Latência acumulada: ${soma} = <b>${res.latencia_ms} ms</b> (${nomes}).</div>`;
    }
    $('porque').innerHTML = html;
    NM.renderTrace($('trace'), res);
  }

  async function analisar() {
    showErr('');
    const origin = $('origem').value, destination = $('destino').value;
    if (origin === destination) return showErr('Escolha origem e destino diferentes.');
    try { render(await NM.api.post('/api/routes', { origin, destination })); }
    catch (e) { showErr(e.message); }
  }

  NM.topology().then((t) => {
    topo = t; D = NM.byId(t);
    const q = new URLSearchParams(location.search);
    NM.fillDeviceSelect($('origem'), t, D[q.get('origem')] ? q.get('origem') : 'SP');
    NM.fillDeviceSelect($('destino'), t, D[q.get('destino')] ? q.get('destino') : 'BSB');
    syncBoxes();
    ['origem', 'destino'].forEach((id) => $(id).addEventListener('change', syncBoxes));
    $('swap').addEventListener('click', () => { const o = $('origem').value; $('origem').value = $('destino').value; $('destino').value = o; syncBoxes(); });
    $('analisar').addEventListener('click', analisar);
    analisar();   // já abre com a análise padrão SP → BSB (executa o Dijkstra no backend)
  }).catch((e) => showErr(e.message));
})(window.NM);
