/* NetMonitor - desenho SVG da topologia e do caminho encontrado.
   Só desenha o que a API devolveu (grafo e rotas já calculados pelo backend). */
(function (NM) {
  const key = (a, b) => [a, b].sort().join('|');
  const iconFor = (tipo) => NM.ICONS[tipo] || NM.ICONS.server;

  function pill(x, y, text, cls = '') {
    const w = text.length * 6.1 + 18;
    return `<g class="pillx ${cls}"><rect x="${x - w / 2}" y="${y - 9.5}" width="${w}" height="19" rx="9.5"/><text x="${x}" y="${y + 3.8}" text-anchor="middle">${NM.esc(text)}</text></g>`;
  }

  /** Rótulo para listas: roteador -> "São Paulo (RTR-SP-01)"; demais -> "SW-SP-CORE · São Paulo". */
  NM.optLabel = (topo, d) => {
    const loc = topo.localidades[d.localidade].nome;
    return d.tipo === 'roteador' ? `${loc} (${d.nome})` : `${d.nome} · ${loc}`;
  };
  /** Preenche um <select> com os dispositivos, agrupados por localidade. */
  NM.fillDeviceSelect = (sel, topo, value) => {
    sel.innerHTML = Object.entries(topo.localidades).map(([k, l]) =>
      `<optgroup label="${NM.esc(l.nome)}">${topo.dispositivos.filter((d) => d.localidade === k)
        .map((d) => `<option value="${d.id}">${NM.esc(NM.optLabel(topo, d))}</option>`).join('')}</optgroup>`).join('');
    if (value) sel.value = value;
  };

  /** Mapa da topologia.
   * o: { selected, failed:[a,b], selectedLink:[a,b], alt:[ids da rota], route:[ids da rota],
   *      origin, destination, dim:Set(ids), onSelect(id) } */
  NM.drawTopology = function (svg, topo, o = {}) {
    const D = NM.byId(topo);
    const failed = o.failed ? key(...o.failed) : null;
    const selLink = o.selectedLink ? key(...o.selectedLink) : null;
    const pathKeys = (p) => new Set((p || []).slice(1).map((v, i) => key(p[i], v)));
    const alt = pathKeys(o.alt), route = pathKeys(o.route);
    const dim = o.dim || new Set();

    const geom = (e) => {
      const A = D[e.a], B = D[e.b];
      if (A.tipo === 'roteador' && B.tipo === 'roteador' && Math.abs(A.x - B.x) > 400) {   // enlace SP–BSB passa por cima do RJ
        const cy = Math.min(A.y, B.y) - 150;
        return { d: `M${A.x} ${A.y} Q${(A.x + B.x) / 2} ${cy} ${B.x} ${B.y}`, mx: (A.x + B.x) / 2, my: 0.25 * A.y + 0.5 * cy + 0.25 * B.y };
      }
      return { d: `M${A.x} ${A.y} L${B.x} ${B.y}`, mx: (A.x + B.x) / 2, my: (A.y + B.y) / 2 };
    };

    let edges = '', pills = '';
    topo.enlaces.forEach((e) => {
      const k = key(e.a, e.b), g = geom(e);
      let cls = e.estado === 'alta_latencia' ? 'lat' : '', pcls = '';
      if (route.has(k)) { cls = 'route'; pcls = 'route'; }
      if (alt.has(k)) { cls = 'alt'; pcls = 'alt'; }
      if (k === selLink) cls = 'sel';
      if (k === failed) { cls = 'failed'; pcls = 'failed'; }
      if (o.selected && !(e.a === o.selected || e.b === o.selected) && !o.alt && !o.route) cls += ' dim';
      edges += `<path class="edge ${cls}" d="${g.d}"><title>${NM.esc(D[e.a].nome)} ↔ ${NM.esc(D[e.b].nome)} · ${e.latencia_ms} ms · ${e.banda_gbps} Gbps</title></path>`;
      const wan = e.tipo === 'Enlace WAN', up = e.tipo === 'Uplink';
      if (wan) pills += pill(g.mx, g.my, `${e.banda_gbps} Gbps · ${e.latencia_ms} ms`, pcls);
      else if (up) pills += pill(g.mx, g.my, `${e.banda_gbps} Gbps`, pcls);
      else if (pcls) pills += pill(g.mx, g.my, `${e.latencia_ms} ms`, pcls);
    });

    let nodes = '';
    topo.dispositivos.forEach((d) => {
      const c = ['node', d.estado];
      if (o.selected === d.id) c.push('sel');
      if (o.origin === d.id) c.push('origin');
      if (o.destination === d.id) c.push('dest');
      if (dim.has(d.id)) c.push('dim');
      nodes += `<g class="${c.join(' ')}" data-id="${d.id}" transform="translate(${d.x},${d.y})">
        <circle class="halo" r="35"/><circle class="body" r="25"/>
        <g class="ic" transform="translate(-10.5,-10.5) scale(.875)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconFor(d.tipo)}</g>
        <text class="name" y="48">${NM.esc(d.nome)}</text><text class="role" y="62">${NM.esc(d.papel)}</text>
        <title>${NM.esc(d.nome)} · ${NM.estadoLabel[d.estado]}</title></g>`;
    });

    const heads = Object.values(topo.localidades).map((l) => `<text class="colhead" x="${l.x}" y="46">${NM.esc(l.nome.toUpperCase())}</text>`).join('');
    svg.setAttribute('viewBox', '0 0 1000 585');
    svg.innerHTML = heads + edges + nodes + pills;
    if (o.onSelect) svg.querySelectorAll('.node').forEach((n) => n.addEventListener('click', () => o.onSelect(n.dataset.id)));
  };

  /** Caminho em linha (rota encontrada). res = resultado do backend (rota, trechos).
   * opt: { mini:true, color:'green' } */
  NM.drawPath = function (el, res, topo, opt = {}) {
    const D = NM.byId(topo), mini = !!opt.mini, n = res.rota.length;
    const W = mini ? 300 : 780, H = mini ? 80 : 210, pad = mini ? 34 : 70, y = mini ? 32 : 96, r = mini ? 14 : 25;
    const step = n > 1 ? (W - 2 * pad) / (n - 1) : 0, px = (i) => (n > 1 ? pad + i * step : W / 2);
    const col = opt.color === 'green' ? 'var(--green)' : 'var(--blue2)';
    let s = `<svg class="route-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Caminho encontrado">`;
    res.trechos.forEach((t, i) => {
      const x1 = px(i), x2 = px(i + 1), mx = (x1 + x2) / 2;
      s += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${col}" stroke-width="${mini ? 2.2 : 2.6}" ${opt.color === 'green' ? 'stroke-dasharray="7 5"' : ''}/>`;
      const lt = `${t.latencia_ms} ms`, w = lt.length * 6.4 + 18;
      s += `<g class="pillx ${opt.color === 'green' ? 'alt' : ''}"><rect x="${mx - w / 2}" y="${y - (mini ? 26 : 38)}" width="${w}" height="${mini ? 17 : 20}" rx="10"/><text x="${mx}" y="${y - (mini ? 14 : 24)}" text-anchor="middle">${lt}</text></g>`;
      if (!mini) s += `<text x="${mx}" y="${y + 18}" text-anchor="middle" fill="#52647f" font-size="10">${t.banda_gbps} Gbps</text>`;
    });
    res.rota.forEach((id, i) => {
      const d = D[id], x = px(i);
      s += `<g transform="translate(${x},${y})"><circle r="${r + (mini ? 6 : 10)}" fill="#2f6df6" opacity=".16"/><circle r="${r}" fill="#0c1c3a" stroke="${col}" stroke-width="2"/>
        <g transform="translate(${-r * .42},${-r * .42}) scale(${r / 29})" fill="none" stroke="#9cc4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconFor(d.tipo)}</g></g>`;
      if (mini) s += `<text x="${x}" y="${y + r + 15}" text-anchor="middle" fill="#cfe0ff" font-size="11" font-weight="700">${NM.esc(id)}</text>`;
      else {
        const first = d.tipo === 'roteador' ? id : d.nome;
        s += `<text x="${x}" y="${y + r + 22}" text-anchor="middle" fill="#e8eef9" font-size="13" font-weight="700">${NM.esc(first)}</text>
              <text x="${x}" y="${y + r + 37}" text-anchor="middle" fill="#7d90b0" font-size="10">${NM.esc(topo.localidades[d.localidade].nome)}</text>
              <text x="${x}" y="${y + r + 50}" text-anchor="middle" fill="#52647f" font-size="9">${NM.esc(d.nome)}</text>`;
      }
    });
    el.innerHTML = s + '</svg>';
  };
})(window.NM);
