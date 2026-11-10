"""NetMonitor - demonstração do Dijkstra no terminal (usa o MESMO código da aplicação web).

Rodar:  python backend/demo_terminal.py
"""
import data
from graph import analisar_rota, simular_falha

VERTICES = list(data.DISPOSITIVOS)


def v(x):
    return "∞" if x is None else x


def mostra_execucao(res):
    print("  Início: dist = {" + ", ".join(f"{k}: {v(x)}" for k, x in res["inicio"].items()) + "}")
    for p in res["passos"]:
        print(f"\n  Passo {p['passo']}: escolhe {p['escolhido']} (dist = {p['dist_escolhido']} ms) -> definitivo")
        for r in p["relaxamentos"]:
            antiga = "∞" if r["antiga"] is None else f"{r['antiga']} ms"
            if r["atualiza"]:
                print(f"     {r['de']} -> {r['para']}: {p['dist_escolhido']} + {r['peso']} = {r['nova']} ms  < {antiga}  => atualiza (pred[{r['para']}] = {r['de']})")
            else:
                print(f"     {r['de']} -> {r['para']}: {p['dist_escolhido']} + {r['peso']} = {r['nova']} ms  >= {antiga}  => mantém")


def resumo(res):
    if not res["existe"]:
        print("\n  Resultado: SEM ROTA")
        return
    print(f"\n  Resultado: {' -> '.join(res['rota'])}")
    print(f"    Latência total : {res['latencia_ms']} ms")
    print(f"    Saltos         : {res['saltos']}")
    print(f"    Banda (gargalo): {res['banda_gargalo_gbps']} Gbps")


def titulo(t):
    print("\n" + "=" * 62 + f"\n {t}\n" + "=" * 62)


if __name__ == "__main__":
    titulo("1) ANÁLISE DE ROTAS: SP -> BSB")
    r = analisar_rota(data.ENLACES, VERTICES, "SP", "BSB")
    mostra_execucao(r)
    resumo(r)

    titulo("2) SIMULAÇÃO DE FALHAS: cai o enlace RJ <-> BSB")
    f = simular_falha(data.ENLACES, VERTICES, "SP", "BSB", ("RJ", "BSB"))
    print("  O Dijkstra roda de novo, agora SEM esse enlace.")
    mostra_execucao(f["depois"])
    resumo(f["depois"])

    titulo("3) IMPACTO")
    print(f"  Antes : {f['antes']['latencia_ms']} ms")
    print(f"  Depois: {f['depois']['latencia_ms']} ms")
    print(f"  Aumento: +{f['aumento_ms']} ms (+{f['aumento_pct']}%)  ->  Severidade: {f['severidade']}")

    titulo("4) FALHA SEM ROTA ALTERNATIVA: cai SP <-> SW-SP (destino SRV-SP-DB)")
    f = simular_falha(data.ENLACES, VERTICES, "SP", "SRV-SP-DB", ("SP", "SW-SP"))
    resumo(f["depois"])
    print(f"  Sem rota alternativa. Severidade: {f['severidade']}")
