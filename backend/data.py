"""NetMonitor - dados simulados da rede (sem banco de dados).

Cenário principal (documentos do projeto):
    SP  <-> RJ  : 8 ms  · 10 Gbps
    RJ  <-> BSB : 18 ms · 5 Gbps
    SP  <-> BSB : 32 ms · 4 Gbps

Os switches e servidores enriquecem a Topologia, mas ligam-se apenas ao seu
roteador local, então não alteram o resultado do exemplo principal.
"""

LOCALIDADES = {
    "SP":  {"nome": "São Paulo",      "uf": "SP", "x": 190},
    "RJ":  {"nome": "Rio de Janeiro", "uf": "RJ", "x": 500},
    "BSB": {"nome": "Brasília",       "uf": "DF", "x": 810},
}


def _disp(nome, tipo, papel, loc, ip, modelo, uptime, cpu, mem, trafego, x, y, estado="operacional"):
    return {"nome": nome, "tipo": tipo, "papel": papel, "localidade": loc, "ip": ip,
            "modelo": modelo, "uptime": uptime, "cpu": cpu, "mem": mem,
            "trafego": trafego, "x": x, "y": y, "estado": estado}


# id do vértice -> dados do dispositivo (x, y = posição no mapa da topologia)
DISPOSITIVOS = {
    # Roteadores: ids "SP", "RJ", "BSB" (os mesmos vértices de dijkstra_netmonitor.py)
    "SP":  _disp("RTR-SP-01",  "roteador", "Roteador principal", "SP",  "10.10.0.1", "Cisco ISR 4331", "36d 4h 12m", 28, 52, 3.1, 190, 175),
    "RJ":  _disp("RTR-RJ-01",  "roteador", "Roteador principal", "RJ",  "10.20.0.1", "Cisco ISR 4331", "42d 18h 32m", 34, 58, 4.2, 500, 175),
    "BSB": _disp("RTR-BSB-01", "roteador", "Roteador principal", "BSB", "10.30.0.1", "Cisco ISR 4331", "29d 7h 45m", 22, 47, 2.4, 810, 175),
    # Switches core
    "SW-SP":  _disp("SW-SP-CORE",  "switch", "Switch · 24 portas", "SP",  "10.10.0.2", "Cisco Catalyst 9300", "36d 4h 10m", 18, 41, 2.2, 190, 335),
    "SW-RJ":  _disp("SW-RJ-CORE",  "switch", "Switch · 24 portas", "RJ",  "10.20.0.2", "Cisco Catalyst 9300", "42d 18h 30m", 21, 44, 2.9, 500, 335),
    "SW-BSB": _disp("SW-BSB-CORE", "switch", "Switch · 16 portas", "BSB", "10.30.0.2", "Cisco Catalyst 9200", "29d 7h 43m", 15, 38, 1.6, 810, 335),
    # Servidores
    "SRV-SP-WEB":  _disp("SRV-SP-WEB",  "servidor", "Servidor Web",     "SP",  "10.10.1.10", "Dell PowerEdge R650", "21d 9h 5m",  41, 63, 0.9, 115, 500),
    "SRV-SP-DB":   _disp("SRV-SP-DB",   "servidor", "Banco de dados",   "SP",  "10.10.1.20", "Dell PowerEdge R750", "21d 9h 2m",  47, 71, 0.6, 265, 500),
    "SRV-RJ-APP":  _disp("SRV-RJ-APP",  "servidor", "Aplicação",        "RJ",  "10.20.1.10", "HPE ProLiant DL380",  "18d 2h 40m", 52, 66, 0.8, 425, 500),
    "SRV-RJ-BKP":  _disp("SRV-RJ-BKP",  "servidor", "Backup",           "RJ",  "10.20.1.30", "HPE ProLiant DL360",  "18d 2h 37m", 89, 82, 0.4, 575, 500, estado="alerta"),
    "SRV-BSB-DNS": _disp("SRV-BSB-DNS", "servidor", "DNS",              "BSB", "10.30.1.10", "Dell PowerEdge R450", "12d 16h 9m", 19, 35, 0.3, 735, 500),
    "SRV-BSB-APP": _disp("SRV-BSB-APP", "servidor", "Aplicação",        "BSB", "10.30.1.20", "Dell PowerEdge R650", "12d 16h 6m", 36, 54, 0.5, 885, 500),
}

# Enlaces: (a, b) -> (latência em ms, banda em Gbps)   [mesmo formato do código original]
ENLACES = {
    ("SP", "RJ"):  (8, 10),
    ("RJ", "BSB"): (18, 5),
    ("SP", "BSB"): (32, 4),
    # roteador <-> switch core
    ("SP", "SW-SP"):   (1, 10),
    ("RJ", "SW-RJ"):   (1, 10),
    ("BSB", "SW-BSB"): (1, 5),
    # switch <-> servidores
    ("SW-SP", "SRV-SP-WEB"):    (1, 1),
    ("SW-SP", "SRV-SP-DB"):     (1, 1),
    ("SW-RJ", "SRV-RJ-APP"):    (1, 1),
    ("SW-RJ", "SRV-RJ-BKP"):    (1, 1),
    ("SW-BSB", "SRV-BSB-DNS"):  (1, 1),
    ("SW-BSB", "SRV-BSB-APP"):  (1, 1),
}

# Enlaces com estado diferente de "ativo" (só informativo para o mapa).
# Atenção: um enlace indisponível NÃO entra no grafo (aresta ausente).
ENLACES_ALTA_LATENCIA = {("SP", "BSB")}

# Dashboard: dados estáticos/simulados, como no protótipo (38 dispositivos, 52 conexões).
DASHBOARD = {
    "cartoes": [
        {"id": "dispositivos", "valor": "38", "unidade": "", "rotulo": "Dispositivos monitorados",
         "detalhe": "+2 este mês", "selo": "estável", "tom": "blue",
         "serie": [10, 12, 11, 14, 13, 16, 15, 19, 17, 21]},
        {"id": "conexoes", "valor": "52", "unidade": "", "rotulo": "Conexões ativas",
         "detalhe": "96,3% do total", "selo": "estável", "tom": "green",
         "serie": [12, 14, 13, 15, 14, 17, 16, 15, 18, 17]},
        {"id": "indisponiveis", "valor": "2", "unidade": "", "rotulo": "Conexões indisponíveis",
         "detalhe": "Requer atenção", "selo": "2 falhas", "tom": "red",
         "serie": [8, 10, 7, 12, 9, 6, 10, 13, 9, 7]},
        {"id": "latencia", "valor": "14,8", "unidade": "ms", "rotulo": "Latência média",
         "detalhe": "-2,1 ms nas últimas 24h", "selo": "estável", "tom": "amber",
         "serie": [14, 15, 14, 16, 15, 15, 16, 14, 15, 15]},
    ],
    "resumo": {
        "total": 38,
        "estados": [{"rotulo": "Operacionais", "valor": 34, "tom": "green"},
                    {"rotulo": "Com alerta", "valor": 2, "tom": "amber"},
                    {"rotulo": "Indisponíveis", "valor": 2, "tom": "red"}],
        "localidades": [{"sigla": "SP", "nome": "São Paulo", "dispositivos": 18, "latencia_ms": 8, "tom": "blue"},
                        {"sigla": "RJ", "nome": "Rio de Janeiro", "dispositivos": 12, "latencia_ms": 12, "tom": "green"},
                        {"sigla": "BSB", "nome": "Brasília", "dispositivos": 8, "latencia_ms": 24, "tom": "violet"}],
        "tipos": [{"rotulo": "Roteadores", "valor": 6}, {"rotulo": "Switches", "valor": 14},
                  {"rotulo": "Servidores", "valor": 12}, {"rotulo": "Outros", "valor": 6}],
    },
    "alertas": [
        {"tipo": "erro", "titulo": "Enlace SW-SP-ACC-07 ↔ SRV-SP-14 indisponível", "detalhe": "Falha detectada na conexão de acesso", "quando": "há 8 min"},
        {"tipo": "aviso", "titulo": "Alta latência no enlace SP–BSB", "detalhe": "Latência de 32 ms, a maior entre os enlaces WAN", "quando": "há 24 min"},
        {"tipo": "aviso", "titulo": "Uso elevado de CPU", "detalhe": "SRV-RJ-BKP atingiu 89% de utilização", "quando": "há 1 h"},
        {"tipo": "info", "titulo": "Novo dispositivo detectado", "detalhe": "SRV-SP-WEB-02 adicionado à topologia", "quando": "há 3 h"},
    ],
    "atividade": {"trafego_gbps": "4,28",
                  "barras": [18, 22, 20, 26, 24, 30, 34, 31, 38, 36, 42, 40, 46, 44, 50, 47, 53, 49, 55, 52,
                             58, 54, 60, 57, 63, 59, 56, 61, 58, 64, 60, 57, 62, 66, 61, 58, 63, 60, 65, 62]},
}
