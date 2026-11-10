/* NetMonitor - utilitários comuns: ícones, chamadas à API e estrutura da página (menu + cabeçalho).
   O frontend NÃO contém lógica do Dijkstra: apenas envia pedidos à API e desenha as respostas. */
window.NM = window.NM || {};
(function (NM) {
  const ICONS = {
    pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    network: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-2a2 2 0 0 1 2-2h14M19 16v-2"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    router: '<rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 17.5h.01M11 17.5h.01M6 14V9M18 14V9"/><path d="M9 7a4 4 0 0 1 6 0"/>',
    switch: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>',
    server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="14" y="14" width="0" height="0"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
  };
  ICONS.roteador = ICONS.router; ICONS.servidor = ICONS.server;   // tipos vindos da API (pt-BR)
  NM.ICONS = ICONS;
  NM.icon = (name, size = 18) =>
    `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

  // ---------- API ----------
  async function req(url, opts) {
    const r = await fetch(url, opts);
    let j = null;
    try { j = await r.json(); } catch (e) { /* resposta sem JSON */ }
    if (!r.ok) throw new Error((j && j.erro) || `Erro ${r.status} em ${url}`);
    return j;
  }
  NM.api = {
    get: (url) => req(url),
    post: (url, body) => req(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  };
  let topoPromise = null;
  NM.topology = () => (topoPromise = topoPromise || NM.api.get('/api/topology'));

  // ---------- helpers de texto ----------
  NM.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  NM.byId = (topo) => Object.fromEntries(topo.dispositivos.map((d) => [d.id, d]));
  /** Nome curto: roteador -> cidade ("São Paulo"); demais -> nome do equipamento. */
  NM.shortName = (topo, id) => {
    const d = NM.byId(topo)[id];
    return d.tipo === 'roteador' ? topo.localidades[d.localidade].nome : d.nome;
  };
  NM.estadoLabel = { operacional: 'Operacional', alerta: 'Alerta', indisponivel: 'Indisponível' };
  NM.estadoClass = { operacional: 'st-ok', alerta: 'st-alert', indisponivel: 'st-down' };
  NM.fmt = (n) => (n === null || n === undefined ? '∞' : n);

  // ---------- estrutura: menu lateral + cabeçalho ----------
  function buildShell() {
    const body = document.body;
    const page = body.dataset.page;
    const content = document.getElementById('content');
    const nav = [
      ['dashboard', 'dashboard.html', 'grid', 'Dashboard'],
      ['topology', 'topology.html', 'network', 'Topologia da Rede'],
      ['routes', 'routes.html', 'route', 'Análise de Rotas'],
      ['failures', 'failures.html', 'alert', 'Simulação de Falhas'],
    ];
    const shell = document.createElement('div');
    shell.innerHTML = `
      <aside class="sidebar">
        <div class="brand"><div class="logo">${NM.icon('pulse', 22)}</div><div><b>NetMonitor</b><small>NETWORK INTELLIGENCE</small></div></div>
        <div class="nav-title">MONITORAMENTO</div>
        <nav class="nav">${nav.map(([k, href, ic, t]) => `<a href="${href}" class="${k === page ? 'active' : ''}">${NM.icon(ic, 19)}${t}</a>`).join('')}</nav>
        <div class="spacer"></div>
        <div class="sys"><small>Status do sistema</small>
          <div class="row"><b>Operacional</b><span class="dot"></span></div>
          <div class="bar"><i style="width:100%"></i></div>
          <div class="foot"><span>Disponibilidade</span><b>99,98%</b></div></div>
        <div class="ver">${NM.icon('shield', 14)} NetMonitor v2.4.0</div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div><h1>${NM.esc(body.dataset.title)}</h1><p>${NM.esc(body.dataset.subtitle)}</p></div>
          <div class="right">
            <div class="status-ger"><span class="dot"></span><div><small>STATUS GERAL</small>Todos os sistemas operacionais</div></div>
            <button class="icon-btn" title="Buscar">${NM.icon('search', 17)}</button>
            <button class="icon-btn" title="Notificações">${NM.icon('bell', 17)}</button>
            <div class="user"><div class="av">MS</div><div><b>Mariana Silva</b><small>Administradora</small></div></div>
          </div>
        </header>
      </div>`;
    const main = shell.querySelector('.main');
    content.classList.add('content');
    main.appendChild(content);
    while (shell.firstChild) body.appendChild(shell.firstChild);
  }
  buildShell();
})(window.NM);
