"""Testes obrigatórios do projeto (Testes 1, 2 e 3) + checagem da API.

Rodar:  python -m unittest discover -s tests -v
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import data                                   # noqa: E402
from app import app                           # noqa: E402
from graph import analisar_rota, severidade, simular_falha   # noqa: E402

V = list(data.DISPOSITIVOS)


class TestDijkstra(unittest.TestCase):
    def test1_rota_normal(self):
        r = analisar_rota(data.ENLACES, V, "SP", "BSB")
        self.assertEqual(r["rota"], ["SP", "RJ", "BSB"])
        self.assertEqual(r["latencia_ms"], 26)
        self.assertEqual(r["saltos"], 2)
        self.assertEqual(r["banda_gargalo_gbps"], 5)
        self.assertEqual(r["enlace_direto"]["latencia_ms"], 32)   # 8 + 18 = 26 < 32

    def test2_falha_rj_bsb(self):
        f = simular_falha(data.ENLACES, V, "SP", "BSB", ("RJ", "BSB"))
        self.assertEqual(f["antes"]["rota"], ["SP", "RJ", "BSB"])
        self.assertEqual(f["depois"]["rota"], ["SP", "BSB"])
        self.assertEqual(f["depois"]["latencia_ms"], 32)
        self.assertEqual(f["depois"]["saltos"], 1)
        self.assertEqual(f["depois"]["banda_gargalo_gbps"], 4)
        self.assertEqual(f["aumento_ms"], 6)
        self.assertEqual(f["aumento_pct"], 23)
        self.assertEqual(f["severidade"], "Moderada")

    def test3_falha_sem_rota(self):
        f = simular_falha(data.ENLACES, V, "SP", "SRV-SP-DB", ("SP", "SW-SP"))
        self.assertFalse(f["existe_alternativa"])
        self.assertEqual(f["depois"]["rota"], [])
        self.assertEqual(f["severidade"], "Crítica")

    def test_falha_em_servidor_isolado(self):
        # o destino perde TODOS os enlaces e ainda assim precisa existir como vértice
        f = simular_falha(data.ENLACES, V, "SP", "SRV-RJ-APP", ("SW-RJ", "SRV-RJ-APP"))
        self.assertEqual(f["severidade"], "Crítica")

    def test_falha_fora_da_rota(self):
        f = simular_falha(data.ENLACES, V, "SP", "RJ", ("SP", "BSB"))
        self.assertFalse(f["rota_afetada"])
        self.assertEqual(f["severidade"], "Baixa")

    def test_regra_de_severidade(self):
        self.assertEqual(severidade(100, 119), "Baixa")
        self.assertEqual(severidade(100, 120), "Moderada")
        self.assertEqual(severidade(100, 149), "Moderada")
        self.assertEqual(severidade(100, 150), "Alta")
        self.assertEqual(severidade(100, None), "Crítica")


class TestAPI(unittest.TestCase):
    def setUp(self):
        self.c = app.test_client()

    def test_topology(self):
        j = self.c.get("/api/topology").get_json()
        self.assertEqual(len(j["dispositivos"]), 12)
        self.assertEqual(len(j["enlaces"]), 12)

    def test_routes_json_valido(self):
        r = self.c.post("/api/routes", json={"origin": "SP", "destination": "BSB"})
        self.assertEqual(r.status_code, 200)
        self.assertNotIn(b"Infinity", r.data)        # ∞ vira null
        self.assertEqual(r.get_json()["latencia_ms"], 26)

    def test_failures(self):
        r = self.c.post("/api/failures", json={"origin": "SP", "destination": "BSB", "failed_link": ["RJ", "BSB"]})
        self.assertEqual(r.get_json()["severidade"], "Moderada")

    def test_entradas_invalidas(self):
        self.assertEqual(self.c.post("/api/routes", json={"origin": "X", "destination": "BSB"}).status_code, 400)
        self.assertEqual(self.c.post("/api/routes", json={"origin": "SP", "destination": "SP"}).status_code, 400)
        self.assertEqual(self.c.post("/api/failures", json={"origin": "SP", "destination": "BSB", "failed_link": ["SP", "SRV-SP-DB"]}).status_code, 400)


if __name__ == "__main__":
    unittest.main()
