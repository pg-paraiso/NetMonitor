# NetMonitor · Dijkstra aplicado ao monitoramento de rede

Projeto Final de Estrutura de Dados (Fatec São Caetano do Sul, ADS), Entrega 4: implementação, em Python, de um algoritmo de grafos integrado à solução de software.

## 1. O que é o NetMonitor

Protótipo de uma plataforma web de monitoramento de infraestrutura de rede. O cenário tem três localidades (São Paulo, Rio de Janeiro e Brasília), cada uma com um roteador, um switch core e servidores. Há quatro telas, reproduzidas do protótipo (`prototipacao.pdf`): **Dashboard**, **Topologia da Rede**, **Análise de Rotas** e **Simulação de Falhas**.

Os dados são simulados (não há monitoramento real, banco de dados ou autenticação). O que funciona de verdade é o **Dijkstra**, que responde às duas telas centrais do projeto.

## 2. Qual problema o sistema resolve

> Qual é o melhor caminho entre dois pontos da rede e qual o impacto quando um enlace cai?

* **Análise de Rotas:** encontra a rota de menor latência entre dois dispositivos.
* **Simulação de Falhas:** derruba um enlace, recalcula a rota, compara antes/depois e classifica a severidade.

## 3. Como o grafo representa a rede

| Na rede | No grafo | Uso |
|---|---|---|
| Roteador, switch, servidor | Vértice | Origem, destino ou passagem |
| Enlace entre dois dispositivos | Aresta não direcionada | Funciona nos dois sentidos |
| Latência (ms) | Peso da aresta | É o que o Dijkstra minimiza |
| Largura de banda (Gbps) | Atributo da aresta | Não entra no cálculo; usada depois para achar o gargalo |
| Enlace indisponível | Aresta ausente | Fica fora do grafo (não vira "peso alto") |
| Melhor rota | Caminho de menor custo | Custo = latência acumulada |

Dados do cenário principal (`backend/data.py`):

```text
SP  <-> RJ   8 ms   10 Gbps
RJ  <-> BSB  18 ms  5 Gbps
SP  <-> BSB  32 ms  4 Gbps
```

Cada localidade ainda tem um switch core e servidores ligados ao seu roteador (1 ms por enlace). Eles enriquecem a topologia e permitem testar falhas sem rota alternativa, mas não alteram o resultado do exemplo principal.

## 4. Por que o Dijkstra

* A latência é sempre **não negativa**, que é a condição de correção do Dijkstra.
* A pergunta é de **uma origem para um destino** com custo acumulado.
* Uma busca em largura (BFS) escolheria o enlace direto SP→BSB (1 salto, 32 ms) e erraria: passar pelo Rio tem mais saltos, mas só 26 ms.
* É a mesma ideia usada pelo protocolo OSPF em roteadores reais.
* Complexidade com heap: `O((V + E) log V)`.

## 5. Como o algoritmo funciona

O Dijkstra mantém três estruturas:

* `dist`: menor latência conhecida até cada dispositivo (começa em ∞, exceto a origem, que é 0);
* `pred`: de qual dispositivo se chega a ele no melhor caminho (permite reconstruir a rota);
* fila de prioridade (`heapq`): entrega sempre o dispositivo ainda não definitivo com menor `dist`.

A cada passo ele escolhe o dispositivo mais próximo ainda não definitivo e **relaxa** seus enlaces: se passar por ele é mais barato para chegar a um vizinho, atualiza `dist` e `pred` do vizinho.

```text
Passo 1  SP = 0        SP → RJ: 0 + 8 = 8        SP → BSB: 0 + 32 = 32
Passo 2  RJ = 8        RJ → BSB: 8 + 18 = 26     26 < 32  → atualiza BSB
Resultado: SP → RJ → BSB, 26 ms
```

A lógica vem de `dijkstra_netmonitor.py` (mantido como `dijkstra_netmonitor_referencia.py`). A diferença é que, em vez de `print`, os passos são guardados e enviados à tela, que os mostra na seção "Execução do algoritmo".

**Arquitetura:** `Frontend (HTML/CSS/JS) → API Flask → serviço de grafos → Dijkstra`. O frontend só desenha as respostas e não contém lógica de rota.

## 6. Como executar

Requisitos: Python 3.9 ou superior.

```bash
cd NetMonitor
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python backend/app.py
```

Abra **http://127.0.0.1:5000** no navegador.

Demonstração só no terminal (mesmo código do sistema):

```bash
python backend/demo_terminal.py
```

Testes automáticos (rota normal, falha RJ-BSB, falha sem rota e API):

```bash
python -m unittest discover -s tests -v
```

## 7. Como executar a Análise de Rotas

1. No menu, abra **Análise de Rotas**.
2. Escolha **Origem** e **Destino** (por exemplo São Paulo → Brasília) e clique em **Analisar rota**. A tela já abre com essa análise padrão.
3. O navegador envia `POST /api/routes`, o backend executa o Dijkstra e a tela mostra o caminho, a latência por trecho, a latência total, os saltos, a banda de gargalo, os dispositivos intermediários e o quadro **Por que esta rota?** (8 + 18 = 26 ms contra 32 ms do enlace direto).
4. A seção **Execução do algoritmo** mostra cada passo (`dist`, relaxamentos e atualizações de `pred`).

O critério "Maior largura de banda" aparece desabilitado no protótipo: este projeto minimiza latência com o Dijkstra.

## 8. Como executar a Simulação de Falhas

1. Abra **Simulação de Falhas**.
2. Escolha origem, destino e a **conexão selecionada** (padrão: RJ ↔ BSB) e clique em **Simular falha**. Os botões em "Cenários de teste" preenchem e executam dois casos prontos.
3. O backend (`POST /api/failures`) executa: Dijkstra na rede original → remove o enlace → reconstrói o grafo → Dijkstra de novo → compara.
4. A tela mostra o enlace afetado (vermelho), a rota alternativa (verde tracejado), a comparação antes × depois, o impacto, a severidade e as duas execuções do algoritmo.
5. **Aplicar rota alternativa** apenas registra visualmente a rota como ativa; o Dijkstra não participa dessa etapa, como nos documentos do projeto.

Regra de severidade: aumento de latência `< 20%` Baixa · `20% a 50%` Moderada · `>= 50%` Alta · sem rota alternativa: Crítica.

## 9. Exemplo esperado

| | Antes (rede original) | Depois (sem RJ ↔ BSB) |
|---|---|---|
| Rota | SP → RJ → BSB | SP → BSB |
| Latência | 26 ms | 32 ms |
| Saltos | 2 | 1 |
| Banda de gargalo | 5 Gbps | 4 Gbps |
| Impacto | | +6 ms (+23%) · **Moderada** |

Falha sem rota alternativa: derrubar **SP ↔ SW-SP** com destino **SRV-SP-DB** isola o switch e os servidores de São Paulo, e o resultado é *Sem rota alternativa · Crítica*.

Exemplo de chamada à API:

```bash
curl -X POST localhost:5000/api/failures -H "Content-Type: application/json" \
     -d '{"origin":"SP","destination":"BSB","failed_link":["RJ","BSB"]}'
```

## 10. Estrutura do projeto

```text
NetMonitor/
├── backend/
│   ├── app.py            API Flask (GET /api/topology, /api/dashboard · POST /api/routes, /api/failures) e servidor das telas
│   ├── dijkstra.py       Dijkstra puro: dist, pred, heapq, relaxamento, caminho()
│   ├── graph.py          Serviço de grafos: montar_grafo, banda_gargalo, severidade, analisar_rota, simular_falha
│   ├── data.py           Dados simulados: dispositivos, enlaces (latência/banda) e dashboard
│   └── demo_terminal.py  Demonstração do algoritmo no terminal
├── frontend/
│   ├── index.html · dashboard.html · topology.html · routes.html · failures.html
│   ├── css/style.css     Tema escuro
│   └── js/               common, topology-view, trace, dashboard, topology, routes, failures
├── tests/test_netmonitor.py
├── dijkstra_netmonitor_referencia.py   Código original de referência
├── requirements.txt
└── README.md
```

### Observação sobre a lista de algoritmos elegíveis

O enunciado geral (`Projeto_Final_Implementação_de_Algoritmos.pdf`) lista BFS, DFS, Kahn, Bellman-Ford, Floyd-Warshall, Prim, Kruskal e Union-Find, e **não inclui o Dijkstra**. Os documentos específicos do NetMonitor (`Dijkstra_no_NetMonitor.pdf`, `Dijkstra_a_partir_do_codigo.pdf`, `dijkstra_netmonitor.py` e a Matriz de Aplicabilidade da Entrega 3) apresentam o Dijkstra como o algoritmo escolhido e implementado. Este projeto segue esses documentos e **não substitui** o Dijkstra por outro algoritmo. Vale confirmar com o professor Veríssimo se o Dijkstra será aceito.

### Escopo

Dashboard e dispositivos são dados simulados. Não há monitoramento em tempo real, SNMP, banco de dados, autenticação ou alertas reais. Os números do Dashboard (38 dispositivos, 52 conexões, 14,8 ms, 4,28 Gbps) são os do protótipo. A Topologia mostra os 12 dispositivos modelados no grafo.
