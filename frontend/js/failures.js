/* NetMonitor - Simulação de Falhas.
   POST /api/failures: o backend roda o Dijkstra na rede original, remove o enlace, roda de novo e compara. */
(function (NM) {
  const $ = (id) => document.getElementById(id);
  let topo, D, res = null, applied = false;
  document.querySelectorAll('.tg[data-i]').forEach((e) => (e.innerHTML = NM.icon(e.dataset.i, 16)));

  const showErr = (m) => { $('err').textContent = m || ''; $('err').classList.toggle('show', !!m); };
  const linkVal = () => $('enlace').value.split('|');
  const linkName = (a, b) => `${D[a].nome} ↔ ${D[b].nome}`;
  const short = (id) => NM.shortName(topo, id);
  const routeTxt = (r) => r.map((id) => short(id)).join(' → ');

  function drawMap() {
    const [a, b] = linkVal();
    NM.drawTopology($('svg'), topo, {
      origin: $('origem').value, destination: $('destino').value,
      failed: res ? [res.enlace_falho.a, res.enlace_falho.b] : null,
      selectedLink: res ? null : [a, b],
      alt: res && res.existe_alternativa ? res.depois.rota : null,
    });
  }

  function banner() {
    const el = $('banner');
    if (!res) {
      el.className = 'banner';
      el.innerHTML = `<div class="bi">${NM.icon('alert', 20)}</div><div><b>Nenhuma simulação ativa</b><small>Escolha origem, destino e a conexão que irá cair; depois clique em “Simular falha”.</small></div>`;
      return;
    }
    const nome = `${res.enlace_falho.a}-${res.enlace_falho.b}`;
    const sub = !res.existe_alternativa
      ? `Sem rota alternativa entre ${short(res.origem)} e ${short(res.destino)}.`
      : !res.rota_afetada ? 'O enlace não faz parte da rota original; nenhuma mudança de rota foi necessária.'
      : applied ? `Rota alternativa aplicada: ${routeTxt(res.depois.rota)}.`
      : `O tráfego seria redirecionado pela rota alternativa ${routeTxt(res.depois.rota)}.`;
    el.className = 'banner on';
    el.innerHTML = `<div class="bi">${NM.icon('alert', 20)}</div><div><b>Simulação ativa: falha no enlace ${NM.esc(nome)}</b><small>${NM.esc(sub)}</small></div>
      <div class="push"><span><span class="dot" style="background:var(--red);box-shadow:0 0 8px var(--red)"></span> SIMULAÇÃO</span><button class="btn danger" id="encerrar">Encerrar simulação</button></div>`;
    $('encerrar').addEventListener('click', () => { res = null; applied = false; render(); });
  }

  function side() {
    const ap = $('aplicar');
    if (!res) {
      $('resumo').innerHTML = `<div class="eyebrow">Resumo da falha</div><div class="impact imp-none"><span>Impacto estimado</span><b>—</b></div><p class="dim" style="font-size:11px;margin:0">Execute a simulação para ver o impacto calculado pelo Dijkstra.</p>`;
      $('altbox').innerHTML = '';
      ap.disabled = true; ap.textContent = 'Aplicar rota alternativa';
      return;
    }
    const a = res.antes, d = res.depois;
    const aum = res.existe_alternativa ? `+${res.aumento_ms} ms (+${res.aumento_pct}%)` : '—';
    const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
    $('resumo').innerHTML = `
      <div class="eyebrow" style="display:flex;gap:8px;align-items:center;color:#ff8a9b">${NM.icon('alert', 14)} <span style="font-size:13px;letter-spacing:0;text-transform:none;color:var(--text);font-weight:650">Resumo da falha</span></div>
      <div class="impact imp-${res.severidade}"><span>Impacto estimado</span><b>${res.severidade}</b></div>
      ${kv('Enlace derrubado', `${NM.esc(res.enlace_falho.a)} ↔ ${NM.esc(res.enlace_falho.b)}`)}
      ${kv('Rota original afetada', res.rota_afetada ? 'Sim' : 'Não')}
      ${kv('Dispositivos afetados', res.dispositivos_afetados.length)}
      ${kv('Aumento de latência', res.existe_alternativa ? `<span class="${res.aumento_ms > 0 ? 'up-bad' : ''}">${aum}</span>` : '—')}
      ${kv('Banda de gargalo', res.existe_alternativa ? `${a.banda_gargalo_gbps} → ${d.banda_gargalo_gbps} Gbps` : '—')}`;

    if (!res.existe_alternativa) {
      $('altbox').innerHTML = `<div class="alt-card none"><h4 style="color:#ff8a9b">${NM.icon('x', 15)} Sem rota alternativa</h4><small>${NM.esc(short(res.destino))} fica inalcançável a partir de ${NM.esc(short(res.origem))}.</small></div>`;
      ap.disabled = true; ap.textContent = 'Nenhuma rota para aplicar';
      return;
    }
    $('altbox').innerHTML = `<div class="alt-card"><h4 style="color:var(--green)">${NM.icon('check', 15)} ${res.rota_afetada ? 'Rota alternativa disponível' : 'Rota mantida'}</h4>
      <small>${res.rota_afetada ? 'Recalculada pelo Dijkstra sem o enlace' : 'O enlace derrubado não fazia parte da rota'}</small>
      <div id="altpath" style="margin-top:8px"></div>
      <div class="mm"><div><small>Latência</small><b>${d.latencia_ms} ms</b></div><div><small>Saltos</small><b>${d.saltos}</b></div><div><small>Capacidade</small><b>${d.banda_gargalo_gbps} Gbps</b></div></div></div>`;
    NM.drawPath($('altpath'), d, topo, { mini: true, color: 'green' });
    ap.disabled = applied || !res.rota_afetada;
    ap.innerHTML = applied ? `${NM.icon('check', 14)} Rota alternativa aplicada` : 'Aplicar rota alternativa';
  }

  function compare() {
    const box = $('comparacao');
    ['exec1', 'exec2'].forEach((i) => ($(i).style.display = res ? '' : 'none'));
    if (!res) { box.style.display = 'none'; return; }
    const a = res.antes, d = res.depois, ok = res.existe_alternativa;
    const route = (r) => (r.rota.length ? r.rota.map(NM.esc).join(' → ') : '—');
    box.style.display = '';
    box.innerHTML = `<div class="panel-h"><div><h2>Comparação antes × depois</h2><p>Resultado de dois Dijkstra: rede original e rede sem o enlace</p></div>
      <span class="push pill-tag tag-${{ Baixa: 'green', Moderada: 'amber', Alta: 'red', Crítica: 'red' }[res.severidade]}">Severidade: ${res.severidade}</span></div>
      <table class="t cmp"><thead><tr><th></th><th>Antes da falha</th><th>Depois da falha</th></tr></thead><tbody>
        <tr><td>Caminho</td><td><b>${route(a)}</b></td><td><b>${ok ? route(d) : 'Sem rota alternativa'}</b></td></tr>
        <tr><td>Latência total</td><td><b>${a.latencia_ms} ms</b></td><td><b>${ok ? d.latencia_ms + ' ms' : '—'}</b></td></tr>
        <tr><td>Saltos</td><td><b>${a.saltos}</b></td><td><b>${ok ? d.saltos : '—'}</b></td></tr>
        <tr><td>Banda do caminho (gargalo)</td><td><b>${a.banda_gargalo_gbps} Gbps</b></td><td><b>${ok ? d.banda_gargalo_gbps + ' Gbps' : '—'}</b></td></tr>
        <tr><td>Impacto</td><td>—</td><td><b>${ok ? `+${res.aumento_ms} ms (+${res.aumento_pct}%): severidade ${res.severidade}` : 'Sem rota alternativa: severidade Crítica'}</b></td></tr>
      </tbody></table>`;
    NM.renderTrace($('trace1'), a);
    NM.renderTrace($('trace2'), d);
    $('t2').textContent = `2ª execução do Dijkstra · sem o enlace ${res.enlace_falho.a} ↔ ${res.enlace_falho.b}`;
  }

  function render() { banner(); drawMap(); side(); compare(); }

  async function simular() {
    showErr('');
    const origin = $('origem').value, destination = $('destino').value;
    if (origin === destination) return showErr('Escolha origem e destino diferentes.');
    try {
      res = await NM.api.post('/api/failures', { origin, destination, failed_link: linkVal() });
      applied = false; render();
    } catch (e) { showErr(e.message); }
  }

  function preset(o, d, link) {
    $('origem').value = o; $('destino').value = d; $('enlace').value = link; res = null; simular();
  }

  NM.topology().then((t) => {
    topo = t; D = NM.byId(t);
    NM.fillDeviceSelect($('origem'), t, 'SP');
    NM.fillDeviceSelect($('destino'), t, 'BSB');
    $('enlace').innerHTML = t.enlaces.map((e) => `<option value="${e.id}">${NM.esc(linkName(e.a, e.b))} · ${e.latencia_ms} ms</option>`).join('');
    $('enlace').value = 'RJ|BSB';
    ['origem', 'destino', 'enlace'].forEach((id) => $(id).addEventListener('change', () => { res = null; applied = false; render(); }));
    $('simular').addEventListener('click', simular);
    $('aplicar').addEventListener('click', () => { applied = true; render(); });   // apenas registra a rota como ativa (sem Dijkstra)
    $('ex1').addEventListener('click', () => preset('SP', 'BSB', 'RJ|BSB'));
    $('ex2').addEventListener('click', () => preset('SP', 'SRV-SP-DB', 'SP|SW-SP'));
    render();
  }).catch((e) => showErr(e.message));
})(window.NM);
