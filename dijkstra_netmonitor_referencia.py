"""NetMonitor - calculo de rota com Dijkstra (arquivo unico, sem dependencias).

Rodar:  python dijkstra_netmonitor.py
"""
import heapq

# ----------------------------------------------------------------------
# DADOS PRE-DEFINIDOS (topologia do guia): enlace -> (latencia ms, banda Gbps)
# ----------------------------------------------------------------------
ENLACES = {
    ("SP", "RJ"): (8, 10),
    ("RJ", "BSB"): (18, 5),
    ("SP", "BSB"): (32, 4),
}
ORIGEM = "SP"
DESTINO = "BSB"
ENLACE_QUE_CAI = ("RJ", "BSB")


def montar_grafo(enlaces, sem=None):
    """Grafo nao direcionado {vertice: {vizinho: latencia}}. Ignora o enlace 'sem'."""
    grafo = {}
    for (a, b), (lat, _) in enlaces.items():
        if sem and set((a, b)) == set(sem):
            continue
        grafo.setdefault(a, {})[b] = lat
        grafo.setdefault(b, {})[a] = lat
    return grafo


def dijkstra(grafo, origem):
    """Mostra cada passo no terminal e devolve (dist, pred)."""
    dist = {v: float("inf") for v in grafo}
    pred = {v: None for v in grafo}
    dist[origem] = 0
    fila = [(0, origem)]
    definitivos = set()

    print(f"  Início: dist = {fmt_dict(dist)}")
    n = 0
    while fila:
        d, u = heapq.heappop(fila)
        if u in definitivos:
            continue
        definitivos.add(u)
        n += 1
        print(f"\n  Passo {n}: escolhe {u} (dist = {d} ms) -> definitivo")
        for v, peso in grafo[u].items():
            if v in definitivos:
                continue
            nova = d + peso
            antiga = dist[v]
            antiga_txt = "∞" if antiga == float("inf") else f"{antiga} ms"
            if nova < antiga:
                print(f"     {u} -> {v}: {d} + {peso} = {nova} ms  < {antiga_txt}  => atualiza (pred[{v}] = {u})")
                dist[v], pred[v] = nova, u
                heapq.heappush(fila, (nova, v))
            else:
                print(f"     {u} -> {v}: {d} + {peso} = {nova} ms  >= {antiga_txt}  => mantém")
        print(f"     dist = {fmt_dict(dist)}")
    return dist, pred


def fmt_dict(dist):
    return "{" + ", ".join(f"{k}: {'∞' if v == float('inf') else v}" for k, v in dist.items()) + "}"


def caminho(pred, origem, destino):
    if destino != origem and pred[destino] is None:
        return []
    c = [destino]
    while c[-1] != origem:
        c.append(pred[c[-1]])
    return c[::-1]


def banda_gargalo(enlaces, rota):
    bandas = []
    for u, v in zip(rota, rota[1:]):
        bandas.append(enlaces.get((u, v), enlaces.get((v, u)))[1])
    return min(bandas) if bandas else None


def resumo(enlaces, dist, pred, origem, destino):
    rota = caminho(pred, origem, destino)
    if not rota:
        print("\n  Resultado: SEM ROTA")
        return None
    lat = dist[destino]
    print(f"\n  Resultado: {' -> '.join(rota)}")
    print(f"    Latência total : {lat} ms")
    print(f"    Saltos         : {len(rota) - 1}")
    print(f"    Banda (gargalo): {banda_gargalo(enlaces, rota)} Gbps")
    return lat


def severidade(antes, depois):
    if depois is None:
        return "Crítica"
    aumento = (depois - antes) / antes * 100
    if aumento < 20:
        return "Baixa"
    if aumento < 50:
        return "Moderada"
    return "Alta"


def titulo(t):
    print("\n" + "=" * 62 + f"\n {t}\n" + "=" * 62)


# ----------------------------------------------------------------------
titulo(f"1) ANÁLISE DE ROTAS: {ORIGEM} -> {DESTINO}")
print("  Enlaces (latência · banda):")
for (a, b), (lat, bw) in ENLACES.items():
    print(f"    {a} <-> {b}: {lat} ms · {bw} Gbps")
print()
dist, pred = dijkstra(montar_grafo(ENLACES), ORIGEM)
antes = resumo(ENLACES, dist, pred, ORIGEM, DESTINO)

titulo(f"2) SIMULAÇÃO DE FALHAS: cai o enlace {ENLACE_QUE_CAI[0]} <-> {ENLACE_QUE_CAI[1]}")
print("  O Dijkstra roda de novo, agora SEM esse enlace.\n")
dist2, pred2 = dijkstra(montar_grafo(ENLACES, sem=ENLACE_QUE_CAI), ORIGEM)
depois = resumo(ENLACES, dist2, pred2, ORIGEM, DESTINO)

titulo("3) IMPACTO")
if depois is None:
    print("  Sem rota alternativa. Severidade: Crítica")
else:
    delta = depois - antes
    pct = delta / antes * 100
    print(f"  Antes : {antes} ms")
    print(f"  Depois: {depois} ms")
    print(f"  Aumento: +{delta} ms (+{pct:.0f}%)  ->  Severidade: {severidade(antes, depois)}")
