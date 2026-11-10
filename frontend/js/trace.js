/* NetMonitor - "Execução do algoritmo": mostra passo a passo o que o Dijkstra (backend) fez.
   Os passos vêm prontos da API (campo `passos`); aqui só são formatados. */
(function (NM) {
  const f = (x) => (x === null || x === undefined ? '∞' : x);
  const ms = (x) => (x === null || x === undefined ? '∞' : `${x} ms`);

  function chips(dist, antes) {
    return '<div class="chips">' + Object.entries(dist).map(([k, v]) => {
      const chg = antes && antes[k] !== v;
      return `<span class="chip ${chg ? 'chg' : ''}">${NM.esc(k)} = <b>${f(v)}</b></span>`;
    }).join('') + '</div>';
  }

  /** res: resultado do backend (inicio, passos, rota, latencia_ms). */
  NM.renderTrace = function (el, res) {
    const uid = 'tr' + Math.random().toString(36).slice(2, 8);
    const noRota = new Set(res.rota);
    const hasRoute = res.rota.length > 0;

    function paint(onlyRoute) {
      let prev = res.inicio, hidden = 0, html = '';
      html += `<div class="step"><h4>Início</h4><div class="muted" style="font-size:12px">dist[origem] = 0; todos os outros = ∞; pred = nenhum; fila = [(0, ${NM.esc(res.origem)})]</div>${chips(res.inicio)}</div>`;
      res.passos.forEach((p) => {
        const on = noRota.has(p.escolhido);
        if (onlyRoute && hasRoute && !on) { hidden++; prev = p.dist; return; }
        html += `<div class="step ${on ? 'onroute' : ''}"><h4>Passo ${p.passo} · escolhe <span>${NM.esc(p.escolhido)}</span> (dist = ${ms(p.dist_escolhido)}) → definitivo</h4>`;
        if (!p.relaxamentos.length) html += '<div class="relax keep">nenhum vizinho a relaxar (todos já definitivos)</div>';
        p.relaxamentos.forEach((r) => {
          html += r.atualiza
            ? `<div class="relax up">${NM.esc(r.de)} → ${NM.esc(r.para)}: ${p.dist_escolhido} + ${r.peso} = <b>${r.nova} ms</b> &lt; ${ms(r.antiga)} ⇒ <b>atualiza</b> (pred[${NM.esc(r.para)}] = ${NM.esc(r.de)})</div>`
            : `<div class="relax keep">${NM.esc(r.de)} → ${NM.esc(r.para)}: ${p.dist_escolhido} + ${r.peso} = ${r.nova} ms ≥ ${ms(r.antiga)} ⇒ mantém</div>`;
        });
        html += chips(p.dist, prev) + '</div>';
        prev = p.dist;
      });
      html += res.existe
        ? `<div class="res-line">Resultado: ${res.rota.map(NM.esc).join(' → ')} · ${res.latencia_ms} ms</div>`
        : `<div class="res-line bad">Resultado: SEM ROTA — ${NM.esc(res.destino)} permanece com dist = ∞</div>`;
      const note = hidden ? `<p class="hidden-note">${hidden} passo(s) de vértices fora da rota ocultados.</p>` : '';
      el.querySelector('.tbody').innerHTML = note + html;
    }

    el.innerHTML = `<div class="trace">
      ${hasRoute ? `<label class="opts"><input type="checkbox" id="${uid}" checked> Mostrar só os passos dos dispositivos que compõem a rota</label>` : ''}
      <div class="tbody"></div></div>`;
    const cb = el.querySelector('#' + uid);
    if (cb) cb.addEventListener('change', () => paint(cb.checked));
    paint(!!cb);
  };
})(window.NM);
