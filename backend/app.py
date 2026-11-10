"""NetMonitor - API Flask + servidor das telas.

Arquitetura:  Frontend (HTML/JS)  ->  API (este arquivo)  ->  graph.py  ->  dijkstra.py

Rodar:  python backend/app.py      e abrir  http://127.0.0.1:5000
"""
import os

from flask import Flask, jsonify, request

import data
from graph import analisar_rota, simular_falha

FRONTEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
app = Flask(__name__, static_folder=FRONTEND, static_url_path="")

VERTICES = list(data.DISPOSITIVOS)


def _tipo_enlace(a, b):
    ta, tb = data.DISPOSITIVOS[a]["tipo"], data.DISPOSITIVOS[b]["tipo"]
    if ta == tb == "roteador":
        return "Enlace WAN"
    return "Uplink" if "servidor" not in (ta, tb) else "Acesso"


def _erro(msg, codigo=400):
    return jsonify({"erro": msg}), codigo


def _par_valido(corpo):
    """Valida origem/destino; devolve (origem, destino, erro)."""
    origem, destino = corpo.get("origin"), corpo.get("destination")
    for nome, v in (("origem", origem), ("destino", destino)):
        if v not in data.DISPOSITIVOS:
            return None, None, f"{nome} inválido: {v!r}"
    if origem == destino:
        return None, None, "origem e destino devem ser diferentes"
    return origem, destino, None


# ----------------------------------------------------------------------
@app.get("/")
def index():
    return app.send_static_file("dashboard.html")


@app.get("/api/dashboard")
def api_dashboard():
    return jsonify(data.DASHBOARD)


@app.get("/api/topology")
def api_topology():
    """Dispositivos (vértices) e enlaces (arestas) usados pelo Dijkstra."""
    dispositivos = [{"id": i, **d} for i, d in data.DISPOSITIVOS.items()]
    enlaces = [{
        "id": f"{a}|{b}", "a": a, "b": b, "latencia_ms": lat, "banda_gbps": bw,
        "tipo": _tipo_enlace(a, b),
        "estado": "alta_latencia" if (a, b) in data.ENLACES_ALTA_LATENCIA else "ativo",
    } for (a, b), (lat, bw) in data.ENLACES.items()]
    return jsonify({"localidades": data.LOCALIDADES, "dispositivos": dispositivos, "enlaces": enlaces})


@app.post("/api/routes")
def api_routes():
    """Análise de Rotas.  Corpo: {"origin": "SP", "destination": "BSB"}"""
    origem, destino, erro = _par_valido(request.get_json(silent=True) or {})
    if erro:
        return _erro(erro)
    return jsonify(analisar_rota(data.ENLACES, VERTICES, origem, destino))


@app.post("/api/failures")
def api_failures():
    """Simulação de Falhas.  Corpo: {"origin": "SP", "destination": "BSB", "failed_link": ["RJ", "BSB"]}"""
    corpo = request.get_json(silent=True) or {}
    origem, destino, erro = _par_valido(corpo)
    if erro:
        return _erro(erro)
    falho = corpo.get("failed_link")
    if (not isinstance(falho, list) or len(falho) != 2
            or not any({a, b} == set(falho) for (a, b) in data.ENLACES)):
        return _erro(f"enlace inexistente: {falho!r}")
    return jsonify(simular_falha(data.ENLACES, VERTICES, origem, destino, tuple(falho)))


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
