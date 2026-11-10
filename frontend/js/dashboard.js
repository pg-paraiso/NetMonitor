/* NetMonitor - Dashboard (dados estáticos/simulados vindos de /api/dashboard). */
(function (NM) {
  const COL = { blue: '#4d8dff', green: '#20c997', red: '#ef4a63', amber: '#f2b33d', violet: '#8b7cf6' };
  const ICON = { dispositivos: 'server', conexoes: 'wifi', indisponiveis: 'alert', latencia: 'clock' };

  function spark(serie, color) {
    const w = 96, h = 30, max = Math.max(...serie), min = Math.min(...serie);
    const pts = serie.map((v, i) => `${(i / (serie.length - 1)) * w},${h - 3 - ((v - min) / (max - min || 1)) * (h - 8)}`);
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polygon points="0,${h} ${pts.join(' ')} ${w},${h}" fill="${color}" opacity=".12"/>
      <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }

  function donut(estados, total) {
    const R = 46, C = 2 * Math.PI * R, gap = 3;
    let off = 0, s = `<svg width="112" height="112" viewBox="0 0 112 112"><g transform="rotate(-90 56 56)">`;
    estados.forEach((e) => {
      const len = (e.valor / total) * C;
      s += `<circle cx="56" cy="56" r="${R}" fill="none" stroke="${COL[e.tom]}" stroke-width="9" stroke-dasharray="${Math.max(len - gap, 1)} ${C}" stroke-dashoffset="${-off}"/>`;
      off += len;
    });
    return s + '</g></svg>';
  }

  NM.api.get('/api/dashboard').then((d) => {
    document.getElementById('cards').innerHTML = d.cartoes.map((c) => `
      <div class="panel card tone-${c.tom}">
        <div class="top"><div class="ib">${NM.icon(ICON[c.id], 18)}</div><span class="pill-tag tag-${c.tom === 'blue' ? 'green' : c.tom}">${c.tom === 'red' ? '! ' : '↗ '}${NM.esc(c.selo)}</span></div>
        <div class="val">${c.valor} <small>${c.unidade}</small></div>
        <div class="lab">${NM.esc(c.rotulo)}</div><div class="det">${NM.esc(c.detalhe)}</div>
        ${spark(c.serie, COL[c.tom])}
      </div>`).join('');

    const r = d.resumo;
    document.getElementById('resumo').innerHTML = `
      <div class="panel-h"><div><h2>Resumo da infraestrutura</h2><p>Distribuição e desempenho por localidade</p></div><a class="push" href="topology.html" style="font-size:11px">Ver topologia →</a></div>
      <div class="resumo">
        <div class="donut-wrap">${donut(r.estados, r.total)}<div class="c"><b>${r.total}</b><small>dispositivos</small></div></div>
        <div class="legend">${r.estados.map((e) => `<div><i style="background:${COL[e.tom]}"></i>${e.rotulo}<b>${e.valor}</b></div>`).join('')}</div>
        <div class="locs">${r.localidades.map((l) => `
          <div class="loc"><div class="sg" style="background:${COL[l.tom]}22;color:${COL[l.tom]}">${l.sigla}</div>
            <div class="bd"><div class="nm">${l.nome}<span>${l.dispositivos} dispositivos</span></div>
              <div class="bar"><i style="width:${(l.dispositivos / 20) * 100}%;background:${COL[l.tom]}"></i></div></div>
            <div class="lat"><small>LATÊNCIA</small>${l.latencia_ms} ms</div></div>`).join('')}</div>
      </div>
      <div class="tipos">${r.tipos.map((t) => `<div><small>${t.rotulo}</small><b>${t.valor}</b></div>`).join('')}</div>`;

    const ic = { erro: 'alert', aviso: 'alert', info: 'server' };
    document.getElementById('alertas').innerHTML = `
      <div class="panel-h"><div><h2>Alertas recentes</h2><p>Últimas 24 horas</p></div></div>
      ${d.alertas.map((a) => `<div class="alert ${a.tipo}"><div class="ai">${NM.icon(ic[a.tipo], 16)}</div><div><b>${NM.esc(a.titulo)}</b><small>${NM.esc(a.detalhe)}</small></div><time>${a.quando}</time></div>`).join('')}
      <div class="alerts-foot"><a href="#">Visualizar todos os alertas →</a></div>`;

    document.getElementById('atividade').innerHTML = `
      <span class="eyebrow"><span class="dot" style="margin-right:8px"></span>Atividade da rede</span>
      <div class="bars">${d.atividade.barras.map((b) => `<i style="height:${b * 0.65}px"></i>`).join('')}</div>
      <div class="tr"><div class="eyebrow">Tráfego atual</div><b>${d.atividade.trafego_gbps}</b> <small>Gbps</small></div>`;
  }).catch((e) => { document.getElementById('content').innerHTML = `<div class="err show">${NM.esc(e.message)}</div>`; });
})(window.NM);
