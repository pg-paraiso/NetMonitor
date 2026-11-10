/* NetMonitor - Topologia da Rede: mapa (grafo usado pelo Dijkstra), busca, filtro, zoom e painel do dispositivo. */
(function (NM) {
  let topo, D, selected = 'RJ', zoom = 1;
  const $ = (id) => document.getElementById(id);
  $('ico-s').innerHTML = NM.icon('search', 15);

  function dimSet() {
    const q = $('busca').value.trim().toLowerCase(), t = $('filtro').value;
    const dim = new Set();
    topo.dispositivos.forEach((d) => {
      const okQ = !q || d.nome.toLowerCase().includes(q) || d.papel.toLowerCase().includes(q) || d.ip.includes(q);
      if (!okQ || (t && d.tipo !== t)) dim.add(d.id);
    });
    return dim;
  }

  function drawMap() {
    NM.drawTopology($('svg'), topo, { selected, dim: dimSet(), onSelect: (id) => { selected = id; render(); } });
    $('svg').style.width = `${zoom * 100}%`;
    $('zv').textContent = `${Math.round(zoom * 100)}%`;
  }

  function drawList() {
    const dim = dimSet();
    $('vista-lista').innerHTML = `<table class="t"><thead><tr><th>Dispositivo</th><th>Tipo</th><th>Localização</th><th>IP</th><th>Estado</th></tr></thead><tbody>${
      topo.dispositivos.filter((d) => !dim.has(d.id)).map((d) => `<tr class="clk" data-id="${d.id}">
        <td><div class="dev"><div class="di">${NM.icon(d.tipo, 16)}</div><div><b>${NM.esc(d.nome)}</b><small>${NM.esc(d.papel)}</small></div></div></td>
        <td>${d.tipo}</td><td>${topo.localidades[d.localidade].nome}</td><td class="mono">${d.ip}</td>
        <td class="${NM.estadoClass[d.estado]}">${NM.estadoLabel[d.estado]}</td></tr>`).join('')}</tbody></table>`;
    $('vista-lista').querySelectorAll('tr.clk').forEach((tr) => tr.addEventListener('click', () => { selected = tr.dataset.id; render(); }));
  }

  function drawDetail() {
    const d = D[selected];
    const links = topo.enlaces.filter((e) => e.a === selected || e.b === selected);
    const meter = (t, v, txt) => `<div class="meter"><div class="t"><span>${t}</span><b>${txt}</b></div><div class="bar"><i style="width:${v}%"></i></div></div>`;
    const color = { operacional: 'var(--green)', alerta: 'var(--amber)', indisponivel: 'var(--red)' }[d.estado];
    $('detalhe').innerHTML = `
      <div class="panel-h"><span class="eyebrow">Detalhes do dispositivo</span></div>
      <div class="dh"><div class="big">${NM.icon(d.tipo, 24)}</div><div>
        <small class="st" style="color:${color}"><span class="dot" style="background:${color};box-shadow:0 0 8px ${color}"></span>${NM.estadoLabel[d.estado]}</small>
        <b>${NM.esc(d.nome)}</b><small class="dim">${NM.esc(d.papel)}</small></div></div>
      <div class="sec"><span class="eyebrow">Informações</span>
        <div class="kv"><span>${NM.icon('pin', 12)} Localização</span><b>${topo.localidades[d.localidade].nome}, ${topo.localidades[d.localidade].uf}</b></div>
        <div class="kv"><span>Endereço IP</span><b class="mono">${d.ip}</b></div>
        <div class="kv"><span>Modelo</span><b>${NM.esc(d.modelo)}</b></div>
        <div class="kv"><span>Tempo ativo</span><b>${d.uptime}</b></div></div>
      <div class="sec"><span class="eyebrow">Desempenho</span>
        ${meter('CPU', d.cpu, d.cpu + '%')}${meter('Memória', d.mem, d.mem + '%')}${meter('Tráfego', Math.min(d.trafego * 10, 100), `${String(d.trafego).replace('.', ',')} Gbps`)}</div>
      <div class="sec"><div style="display:flex"><span class="eyebrow">Conexões</span><span class="badge-n">${links.length}</span></div>
        ${links.map((e) => { const o = e.a === selected ? e.b : e.a;
          return `<div class="conn" data-id="${o}"><span class="dot" style="background:${e.estado === 'ativo' ? 'var(--green)' : 'var(--amber)'};box-shadow:none"></span>
            <div><b>${NM.esc(D[o].nome)}</b><small>${e.banda_gbps} Gbps · ${e.latencia_ms} ms</small></div><span class="ch">${NM.icon('chevron', 14)}</span></div>`; }).join('')}</div>
      <div class="sec" style="text-align:center"><a href="routes.html?origem=${selected}" style="font-size:12px">Analisar rotas a partir deste dispositivo →</a></div>`;
    $('detalhe').querySelectorAll('.conn').forEach((c) => c.addEventListener('click', () => { selected = c.dataset.id; render(); }));
  }

  function render() {
    drawMap(); drawList(); drawDetail();
    $('map-sub').textContent = `${topo.dispositivos.length} dispositivos visíveis · ${topo.enlaces.length} conexões`;
  }

  NM.topology().then((t) => {
    topo = t; D = NM.byId(t); render();
    $('busca').addEventListener('input', render);
    $('filtro').addEventListener('change', render);
    $('zoom').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      zoom = Math.min(1.8, Math.max(0.7, zoom + 0.15 * Number(b.dataset.z))); drawMap();
    }));
    const v = (g) => { $('vista-grafo').style.display = g ? '' : 'none'; $('vista-lista').style.display = g ? 'none' : '';
      $('v-grafo').classList.toggle('on', g); $('v-lista').classList.toggle('on', !g); $('zoom').style.visibility = g ? '' : 'hidden'; };
    $('v-grafo').addEventListener('click', () => v(true));
    $('v-lista').addEventListener('click', () => v(false));
  }).catch((e) => { $('err').textContent = e.message; $('err').classList.add('show'); });
})(window.NM);
