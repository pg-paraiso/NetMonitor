"""NetMonitor - Algoritmo de Dijkstra (camada isolada, só conhece grafos).

Adaptado de `dijkstra_netmonitor.py`: a lógica é a mesma (dist, pred, fila de
prioridade com heapq, conjunto de vértices definitivos e relaxamento das
arestas). A única diferença é que, em vez de imprimir cada passo no terminal,
os passos são GUARDADOS numa lista (`passos`) para que a interface web possa
exibir a "Execução do algoritmo".

Esta função não conhece telas, Flask, banco de dados ou estado dos dispositivos.
"""
import heapq

INF = float("inf")


def dijkstra(grafo, origem):
    """Menor latência de `origem` até todos os vértices.

    grafo  : {vertice: {vizinho: latencia}}   (pesos >= 0)
    origem : vértice de partida

    Devolve (dist, pred, passos):
      dist   -> {vertice: menor latência conhecida (inf se inalcançável)}
      pred   -> {vertice: vértice anterior no melhor caminho (None na origem)}
      passos -> registro de cada iteração, para demonstração visual.
    """
    dist = {v: INF for v in grafo}
    pred = {v: None for v in grafo}
    dist[origem] = 0
    fila = [(0, origem)]          # fila de prioridade (heap) de (dist, vértice)
    definitivos = set()           # vértices cuja menor distância já é final
    passos = []

    n = 0
    while fila:
        d, u = heapq.heappop(fila)        # vértice não definitivo mais próximo
        if u in definitivos:              # entrada antiga da fila: ignora
            continue
        definitivos.add(u)
        n += 1

        relaxamentos = []
        for v, peso in grafo[u].items():  # relaxa cada enlace que sai de u
            if v in definitivos:
                continue
            nova = d + peso
            antiga = dist[v]
            atualiza = nova < antiga
            if atualiza:                  # passar por u é mais barato
                dist[v], pred[v] = nova, u
                heapq.heappush(fila, (nova, v))
            relaxamentos.append({
                "de": u, "para": v, "peso": peso,
                "nova": nova, "antiga": antiga, "atualiza": atualiza,
            })

        passos.append({
            "passo": n,
            "escolhido": u,
            "dist_escolhido": d,
            "relaxamentos": relaxamentos,
            "dist": dict(dist),           # "foto" de dist ao fim do passo
        })
    return dist, pred, passos


def caminho(pred, origem, destino):
    """Reconstrói a rota origem -> destino a partir de `pred` ([] se não há rota)."""
    if destino != origem and pred[destino] is None:
        return []
    c = [destino]
    while c[-1] != origem:
        c.append(pred[c[-1]])
    return c[::-1]
