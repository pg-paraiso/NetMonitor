"""NetMonitor - Serviço de grafos (camada entre a API e o Dijkstra).

Responsabilidades (conforme o guia do projeto):
  * montar o grafo a partir dos enlaces (enlace indisponível = aresta ausente);
  * chamar o Dijkstra;
  * traduzir o resultado nos campos que as telas mostram: latência total,
    saltos, banda de gargalo, rota alternativa e severidade.

Nenhuma regra de rota fica no frontend.
"""
from dijkstra import INF, dijkstra, caminho


# ----------------------------------------------------------------------
# Construção do grafo
# ----------------------------------------------------------------------
def montar_grafo(enlaces, vertices=(), sem=None):
    """Grafo não direcionado {vertice: {vizinho: latencia}}.

    - `sem`: enlace (a, b) a ignorar (simulação de falha). A aresta simplesmente
      não existe no grafo; não vira "peso alto".
    - `vertices`: garante que todo dispositivo seja um vértice, mesmo que fique
      sem nenhum enlace depois da falha (senão o destino sumiria do grafo).
    """
    grafo = {v: {} for v in vertices}
    for (a, b), (lat, _) in enlaces.items():
        if sem and {a, b} == set(sem):
            continue
        grafo.setdefault(a, {})[b] = lat
        grafo.setdefault(b, {})[a] = lat
    return grafo


def _enlace(enlaces, u, v):
    return enlaces.get((u, v)) or enlaces.get((v, u))


def banda_gargalo(enlaces, rota):
    """Menor banda entre os enlaces da rota (a banda não entra no cálculo do Dijkstra)."""
    bandas = [_enlace(enlaces, u, v)[1] for u, v in zip(rota, rota[1:])]
    return min(bandas) if bandas else None


def severidade(antes, depois):
    """< 20% Baixa · 20% a 50% Moderada · >= 50% Alta · sem rota: Crítica."""
    if depois is None:
        return "Crítica"
    aumento = 0 if antes == 0 else (depois - antes) / antes * 100
    if aumento < 20:
        return "Baixa"
    if aumento < 50:
        return "Moderada"
    return "Alta"


# ----------------------------------------------------------------------
# Execução de uma consulta (um Dijkstra) e tradução para o formato das telas
# ----------------------------------------------------------------------
def _json_safe(x):
    """JSON não aceita Infinity: o infinito do Dijkstra vira None (a tela mostra ∞)."""
    if isinstance(x, float) and x == INF:
        return None
    if isinstance(x, dict):
        return {k: _json_safe(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_json_safe(v) for v in x]
    return x


def executar(enlaces, vertices, origem, destino, sem=None):
    """Monta o grafo, roda o Dijkstra e devolve rota, latência, saltos, banda e passos."""
    grafo = montar_grafo(enlaces, vertices, sem)
    dist, pred, passos = dijkstra(grafo, origem)
    rota = caminho(pred, origem, destino)

    inicio = {v: (0 if v == origem else INF) for v in grafo}
    res = {
        "existe": bool(rota),
        "origem": origem,
        "destino": destino,
        "rota": rota,
        "inicio": _json_safe(inicio),
        "passos": _json_safe(passos),
        "_dist": dist,                       # uso interno (comparação antes/depois)
    }
    if not rota:
        res.update(status="Sem rota", latencia_ms=None, saltos=None,
                   banda_gargalo_gbps=None, trechos=[])
        return res

    res.update(
        status="Conectado",
        latencia_ms=dist[destino],
        saltos=len(rota) - 1,
        banda_gargalo_gbps=banda_gargalo(enlaces, rota),
        trechos=[{"de": u, "para": v,
                  "latencia_ms": _enlace(enlaces, u, v)[0],
                  "banda_gbps": _enlace(enlaces, u, v)[1]} for u, v in zip(rota, rota[1:])],
    )
    return res


def _publico(res):
    """Remove campos internos antes de enviar ao frontend."""
    return {k: v for k, v in res.items() if not k.startswith("_")}


# ----------------------------------------------------------------------
# Funcionalidade 1: Análise de Rotas
# ----------------------------------------------------------------------
def analisar_rota(enlaces, vertices, origem, destino):
    """Um Dijkstra com a rede inteira."""
    res = executar(enlaces, vertices, origem, destino)
    direto = _enlace(enlaces, origem, destino)
    res["enlace_direto"] = ({"latencia_ms": direto[0], "banda_gbps": direto[1]} if direto else None)
    return _publico(res)


# ----------------------------------------------------------------------
# Funcionalidade 2: Simulação de Falhas
# ----------------------------------------------------------------------
def simular_falha(enlaces, vertices, origem, destino, enlace_falho):
    """Dijkstra na rede original -> remove o enlace -> Dijkstra de novo -> compara."""
    antes = executar(enlaces, vertices, origem, destino)                        # 1º Dijkstra
    depois = executar(enlaces, vertices, origem, destino, sem=enlace_falho)     # 2º Dijkstra (sem o enlace)

    a, b = enlace_falho
    lat, bw = _enlace(enlaces, a, b)
    existe_alt = depois["existe"]
    lat_antes = antes["latencia_ms"]
    lat_depois = depois["latencia_ms"] if existe_alt else None

    aumento_ms = aumento_pct = None
    if existe_alt:
        aumento_ms = lat_depois - lat_antes
        aumento_pct = round(aumento_ms / lat_antes * 100) if lat_antes else 0

    # Dispositivos "afetados": a menor latência a partir da origem piorou ou ficou inalcançável.
    afetados = [v for v in vertices
                if v != origem and depois["_dist"][v] > antes["_dist"][v]]

    par_falho = {a, b}
    rota_afetada = any({u, v} == par_falho for u, v in zip(antes["rota"], antes["rota"][1:]))

    return {
        "origem": origem,
        "destino": destino,
        "enlace_falho": {"a": a, "b": b, "latencia_ms": lat, "banda_gbps": bw},
        "antes": _publico(antes),
        "depois": _publico(depois),
        "rota_afetada": rota_afetada,
        "existe_alternativa": existe_alt,
        "aumento_ms": aumento_ms,
        "aumento_pct": aumento_pct,
        "severidade": severidade(lat_antes, lat_depois),
        "dispositivos_afetados": afetados,
    }
