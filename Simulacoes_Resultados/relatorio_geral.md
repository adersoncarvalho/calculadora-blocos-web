# Relatório Técnico de Simulações de Diagramas de Blocos

Este relatório consolida a resolução analítica, diagramas gráficos vetoriais e capturas de tela (prints) de **20 simulações inéditas** com funções de transferência contendo valores numéricos e dinâmicas polinomiais reais. As simulações estão divididas equitativamente entre as quatro topologias fundamentais da Engenharia de Controle (5 simulações por topologia).

---

## Estrutura dos Arquivos Gerados

- **Painel Interativo Geral**: [index.html](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/index.html)
- **Pasta de Capturas (Prints PNG)**: [prints/](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/)
- **Pasta de Relatórios HTML**: [relatorios_html/](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/)
- **Pasta de Diagramas SVG**: [diagramas_svg/](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/)
- **Base de Dados Estruturada**: [simulations.json](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/simulations.json)

---

## 1. Topologia 1 — Associação em Cascata / Série

Na ligação em cascata, o sinal de saída de um bloco é a entrada do bloco subsequente. A função de transferência equivalente corresponde ao produto direto das funções de transferência individuais:

$$G_{\text{eq}}(s) = \prod_{i=1}^n G_i(s)$$

### Simulação 01: Dois Polos Reais em Cascata
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_01.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_01.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_01.svg)
- **Descrição**: Associação de dois blocos dinâmicos de primeira ordem com polos reais distintos: $G_1(s) = \frac{4}{s+1}$ e $G_2(s) = \frac{5}{s+2}$.
- **Passo a Passo**: Pela regra de blocos em série, multiplica-se diretamente o numerador pelo numerador e o denominador pelo denominador:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= G_1(s) \cdot G_2(s) \\ &= \left(\frac{4}{s + 1}\right) \cdot \left(\frac{5}{s + 2}\right) \\ &= \frac{4 \cdot 5}{(s + 1)(s + 2)} = \frac{20}{s^2 + 3s + 2} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{20}{s^2 + 3s + 2}}$
- **Ordem**: 2ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = -1$, $s_2 = -2$ (Sistema Estável, polos reais no semiplano esquerdo)
- **Ganho DC**: $T(0) = \frac{20}{2} = 10$

---

### Simulação 02: Cascata de Três Blocos (Ganho + Integrador + Polo)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_02.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_02.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_02.svg)
- **Descrição**: Linha direta contendo ganho estático $K=10$, integrador puro $G_2(s)=\frac{1}{s}$ e polo de primeira ordem $G_3(s)=\frac{2}{s+5}$.
- **Passo a Passo**: Calcula-se o produto contínuo dos 3 estágios em cascata: $G_1(s) \cdot G_2(s) \cdot G_3(s)$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= 10 \cdot \left(\frac{1}{s}\right) \cdot \left(\frac{2}{s + 5}\right) \\ &= \frac{10 \cdot 1 \cdot 2}{s(s + 5)} = \frac{20}{s^2 + 5s} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{20}{s^2 + 5s}}$
- **Ordem**: 2ª Ordem (Tipo 1) | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = 0$, $s_2 = -5$ (Marginalmente Estável, polo na origem)
- **Ganho DC**: $T(0) \to \infty$ (Ação integradora presente)

---

### Simulação 03: Compensador Lead em Cascata com Planta de 1ª Ordem
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_03.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_03.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_03.svg)
- **Descrição**: Associação de um compensador por avanço de fase $G_1(s) = \frac{s+3}{s+1}$ em série com a planta $G_2(s) = \frac{2}{s+4}$.
- **Passo a Passo**: Multiplica-se o numerador (distributiva $2(s+3) = 2s+6$) e os denominadores $(s+1)(s+4) = s^2 + 5s + 4$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= \left(\frac{s + 3}{s + 1}\right) \cdot \left(\frac{2}{s + 4}\right) \\ &= \frac{2(s + 3)}{(s + 1)(s + 4)} = \frac{2s + 6}{s^2 + 5s + 4} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{2s + 6}{s^2 + 5s + 4}}$
- **Ordem**: 2ª Ordem (1 Zero real, 2 Polos reais) | **Zeros**: $z_1 = -3$
- **Polos**: $s_1 = -1$, $s_2 = -4$ (Sistema Estável, polos no semiplano esquerdo)
- **Ganho DC**: $T(0) = \frac{6}{4} = 1.5$

---

### Simulação 04: Controlador PI em Série com Dois Estágios de 1ª Ordem
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_04.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_04.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_04.svg)
- **Descrição**: Cascata com controlador Proporcional-Integral $G_1(s)=\frac{2s+1}{s}$ e dois filtros de 1ª ordem $G_2(s)=\frac{3}{s+2}$ e $G_3(s)=\frac{1}{s+6}$.
- **Passo a Passo**: Numerador: $(2s+1) \cdot 3 \cdot 1 = 6s + 3$. Denominador: $s(s+2)(s+6) = s^3 + 8s^2 + 12s$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= \left(\frac{2s + 1}{s}\right) \cdot \left(\frac{3}{s + 2}\right) \cdot \left(\frac{1}{s + 6}\right) \\ &= \frac{3(2s + 1)}{s(s + 2)(s + 6)} = \frac{6s + 3}{s^3 + 8s^2 + 12s} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{6s + 3}{s^3 + 8s^2 + 12s}}$
- **Ordem**: 3ª Ordem | **Zeros**: $z_1 = -0.5$
- **Polos**: $s_1 = 0$, $s_2 = -2$, $s_3 = -6$ (Marginalmente Estável, Tipo 1)
- **Ganho DC**: $T(0) \to \infty$

---

### Simulação 05: Ganho Proporcional em Série com Sistema de 2ª Ordem
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_05.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_05.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_05.svg)
- **Descrição**: Ganho proporcional $K=2.5$ excitando diretamente uma planta de segunda ordem subamortecida $G_2(s) = \frac{4}{s^2 + 2s + 5}$.
- **Passo a Passo**: O ganho $2.5$ multiplica o numerador $4$ da função de transferência de 2ª ordem: $2.5 \cdot 4 = 10$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= 2.5 \cdot \left(\frac{4}{s^2 + 2s + 5}\right) \\ &= \frac{2.5 \cdot 4}{s^2 + 2s + 5} = \frac{10}{s^2 + 2s + 5} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{10}{s^2 + 2s + 5}}$
- **Ordem**: 2ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_{1,2} = -1 \pm j2$ (Estável Subamortecido, $\zeta = 0.447$, $\omega_n = 2.236$ rad/s)
- **Ganho DC**: $T(0) = \frac{10}{5} = 2$

---

## 2. Topologia 2 — Associação em Paralelo / Soma

Na topologia paralela, o mesmo sinal de entrada excita múltiplos subsistemas simultaneamente e suas saídas convergem para um ponto somador/subtrator:

$$G_{\text{eq}}(s) = \sum_{i=1}^n \pm G_i(s)$$

### Simulação 06: Dois Ramos em Paralelo Aditivo (+ e +)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_06.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_06.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_06.svg)
- **Descrição**: Bifurcação de sinal com dois blocos de primeira ordem somados em paralelo: $G_1(s) = \frac{6}{s+2}$ e $G_2(s) = \frac{3}{s+4}$.
- **Passo a Passo**: Calcula-se o MMC entre $(s+2)$ e $(s+4) = s^2 + 6s + 8$, multiplicando cruzado os numeradores:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= G_1(s) + G_2(s) = \frac{6}{s + 2} + \frac{3}{s + 4} \\ &= \frac{6(s + 4) + 3(s + 2)}{(s + 2)(s + 4)} \\ &= \frac{(6s + 24) + (3s + 6)}{s^2 + 6s + 8} = \frac{9s + 30}{s^2 + 6s + 8} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{9s + 30}{s^2 + 6s + 8}}$
- **Ordem**: 2ª Ordem (1 Zero real, 2 Polos reais) | **Zeros**: $z_1 = -3.333$
- **Polos**: $s_1 = -2$, $s_2 = -4$ (Sistema Estável, semiplano esquerdo)
- **Ganho DC**: $T(0) = \frac{30}{8} = 3.75$

---

### Simulação 07: Controlador PI na Forma Paralela (P + I)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_07.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_07.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_07.svg)
- **Descrição**: Arquitetura paralela canônica do controlador PI: ramo proporcional puro $K_p=5$ somado ao ramo integrador $\frac{K_i}{s} = \frac{2}{s}$.
- **Passo a Passo**: Soma-se $5 + \frac{2}{s}$ colocando sobre o mesmo denominador comum $s$: $\frac{5s + 2}{s}$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= K_p + \frac{K_i}{s} = 5 + \frac{2}{s} \\ &= \frac{5 \cdot s + 2}{s} = \frac{5s + 2}{s} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{U(s)}{R(s)} = \mathbf{\frac{5s + 2}{s}}$
- **Ordem**: 1ª Ordem (Tipo 1) | **Zeros**: $z_1 = -0.4$
- **Polos**: $s_1 = 0$ (Marginalmente Estável em malha aberta)
- **Ganho DC**: $T(0) \to \infty$

---

### Simulação 08: Paralelo Subtrativo (+ e - / Feedforward Diferencial)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_08.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_08.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_08.svg)
- **Descrição**: Subtração de canais: ramo direto principal $G_1(s) = \frac{8}{s+1}$ subtraído do canal de perturbação $G_2(s) = \frac{2}{s+3}$.
- **Passo a Passo**: MMC $(s+1)(s+3) = s^2 + 4s + 3$. Numerador: $8(s+3) - 2(s+1) = (8s+24) - (2s+2) = 6s + 22$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= G_1(s) - G_2(s) = \frac{8}{s + 1} - \frac{2}{s + 3} \\ &= \frac{8(s + 3) - 2(s + 1)}{(s + 1)(s + 3)} \\ &= \frac{(8s + 24) - (2s + 2)}{s^2 + 4s + 3} = \frac{6s + 22}{s^2 + 4s + 3} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{6s + 22}{s^2 + 4s + 3}}$
- **Ordem**: 2ª Ordem | **Zeros**: $z_1 = -3.667$
- **Polos**: $s_1 = -1$, $s_2 = -3$ (Sistema Estável)
- **Ganho DC**: $T(0) = \frac{22}{3} \approx 7.333$

---

### Simulação 09: Três Ramos em Paralelo (PID Completo com Filtro)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_09.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_09.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_09.svg)
- **Descrição**: Estrutura PID paralela com derivada filtrada: $K_p=3$, $\frac{K_i}{s}=\frac{4}{s}$, $\frac{K_d s}{s+N} = \frac{2s}{s+10}$.
- **Passo a Passo**: MMC dos três denominadores é $s(s+10) = s^2 + 10s$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= 3 + \frac{4}{s} + \frac{2s}{s + 10} \\ &= \frac{3s(s + 10) + 4(s + 10) + 2s(s)}{s(s + 10)} \\ &= \frac{(3s^2 + 30s) + (4s + 40) + 2s^2}{s^2 + 10s} = \frac{5s^2 + 34s + 40}{s^2 + 10s} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{U(s)}{R(s)} = \mathbf{\frac{5s^2 + 34s + 40}{s^2 + 10s}}$
- **Ordem**: 2ª Ordem | **Zeros**: $z_1 = -1.6$, $z_2 = -5.2$
- **Polos**: $s_1 = 0$, $s_2 = -10$ (Marginalmente Estável em malha aberta)
- **Ganho DC**: $T(0) \to \infty$

---

### Simulação 10: Compensador Duplo Lead-Lag em Paralelo
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_10.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_10.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_10.svg)
- **Descrição**: Dois ramos dinâmicos em paralelo: $G_1(s) = \frac{2(s+1)}{s+5}$ e $G_2(s) = \frac{s+4}{s+2}$.
- **Passo a Passo**: Multiplica-se cruzado: $2(s+1)(s+2) + (s+4)(s+5) = (2s^2 + 6s + 4) + (s^2 + 9s + 20) = 3s^2 + 15s + 24$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{eq}}(s) &= \frac{2(s + 1)}{s + 5} + \frac{s + 4}{s + 2} \\ &= \frac{2(s + 1)(s + 2) + (s + 4)(s + 5)}{(s + 5)(s + 2)} \\ &= \frac{(2s^2 + 6s + 4) + (s^2 + 9s + 20)}{s^2 + 7s + 10} = \frac{3s^2 + 15s + 24}{s^2 + 7s + 10} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{3s^2 + 15s + 24}{s^2 + 7s + 10}}$
- **Ordem**: 2ª Ordem | **Zeros**: $z_{1,2} = -2.5 \pm j1.323$
- **Polos**: $s_1 = -2$, $s_2 = -5$ (Sistema Estável)
- **Ganho DC**: $T(0) = \frac{24}{10} = 2.4$

---

## 3. Topologia 3 — Realimentação / Malha Fechada

A equação fundamental de fechamento de malha para realimentação negativa $(-)$ e positiva $(+)$ é:

$$T(s) = \frac{C(s)}{R(s)} = \frac{G(s)}{1 \pm G(s)H(s)}$$

### Simulação 11: Malha Fechada com Realimentação Negativa Unitária
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_11.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_11.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_11.svg)
- **Descrição**: Planta de 1ª ordem $G(s) = \frac{10}{s+2}$ em malha fechada unitária $H(s)=1$ com realimentação negativa clássica.
- **Passo a Passo**: Como a realimentação é negativa, o denominador recebe sinal positivo $(+)$: $1 + G(s)H(s) = \frac{(s+2)+10}{s+2} = \frac{s+12}{s+2}$:
- **Memorial em LaTeX**:
$$\begin{aligned} T(s) &= \frac{G(s)}{1 + G(s)H(s)} = \frac{\frac{10}{s + 2}}{1 + \left(\frac{10}{s + 2}\right) \cdot 1} \\ &= \frac{\frac{10}{s + 2}}{\frac{(s + 2) + 10}{s + 2}} = \frac{10}{s + 12} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{10}{s + 12}}$
- **Ordem**: 1ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = -12$ (Estável; polo deslocado de $-2$ para $-12$, acelerando o sistema em 6 vezes)
- **Ganho DC**: $T(0) = \frac{10}{12} \approx 0.833$

---

### Simulação 12: Sistema Tipo 1 com Sensor de Ganho Estático (H = 2)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_12.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_12.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_12.svg)
- **Descrição**: Planta servomecânica de tipo 1 $G(s) = \frac{5}{s^2 + s}$ realimentada através de um transdutor/sensor com ganho $H=2$.
- **Passo a Passo**: O produto de laço é $G(s)H(s) = \frac{10}{s^2+s}$. Somando ao 1: $\frac{s^2 + s + 10}{s^2 + s}$:
- **Memorial em LaTeX**:
$$\begin{aligned} T(s) &= \frac{\frac{5}{s^2 + s}}{1 + \left(\frac{5}{s^2 + s}\right) \cdot 2} = \frac{\frac{5}{s^2 + s}}{1 + \frac{10}{s^2 + s}} \\ &= \frac{\frac{5}{s^2 + s}}{\frac{(s^2 + s) + 10}{s^2 + s}} = \frac{5}{s^2 + s + 10} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{5}{s^2 + s + 10}}$
- **Ordem**: 2ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_{1,2} = -0.5 \pm j3.122$ (Estável Subamortecido, $\omega_n = 3.162$ rad/s, $\zeta = 0.158$)
- **Ganho DC**: $T(0) = \frac{5}{10} = 0.5$

---

### Simulação 13: Realimentação com Dinâmica no Sensor H(s) = 2/(s+1)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_13.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_13.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_13.svg)
- **Descrição**: Planta $G(s)=\frac{8}{s+3}$ realimentada negativamente através de um sensor que possui dinâmica de atraso de 1ª ordem $H(s)=\frac{2}{s+1}$.
- **Passo a Passo**: O produto de laço é $\frac{16}{(s+3)(s+1)}$. Ao tirar o MMC no denominador, cancela-se $(s+3)$ e sobra $(s+1)$ no numerador:
- **Memorial em LaTeX**:
$$\begin{aligned} T(s) &= \frac{\frac{8}{s + 3}}{1 + \left(\frac{8}{s + 3}\right) \cdot \left(\frac{2}{s + 1}\right)} = \frac{\frac{8}{s + 3}}{1 + \frac{16}{(s + 3)(s + 1)}} \\ &= \frac{\frac{8}{s + 3}}{\frac{(s + 3)(s + 1) + 16}{(s + 3)(s + 1)}} = \frac{8(s + 1)}{(s^2 + 4s + 3) + 16} = \frac{8s + 8}{s^2 + 4s + 19} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{8s + 8}{s^2 + 4s + 19}}$
- **Ordem**: 2ª Ordem | **Zeros**: $z_1 = -1$ (Zero introduzido pelo sensor)
- **Polos**: $s_{1,2} = -2 \pm j3.873$ (Sistema Estável)
- **Ganho DC**: $T(0) = \frac{8}{19} \approx 0.421$

---

### Simulação 14: Realimentação Positiva / Regenerativa (+ no Somador)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_14.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_14.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_14.svg)
- **Descrição**: Planta $G(s)=\frac{4}{s+5}$ com malha de realimentação positiva $H=0.5$, resultando em sinal subtrativo $(-)$ no denominador canônico.
- **Passo a Passo**: Como a malha entra com sinal $(+)$, a equação característica torna-se $1 - GH = 1 - \frac{2}{s+5} = \frac{s+3}{s+5}$:
- **Memorial em LaTeX**:
$$\begin{aligned} T(s) &= \frac{G(s)}{1 - G(s)H(s)} = \frac{\frac{4}{s + 5}}{1 - \left(\frac{4}{s + 5}\right) \cdot 0.5} \\ &= \frac{\frac{4}{s + 5}}{1 - \frac{2}{s + 5}} = \frac{\frac{4}{s + 5}}{\frac{(s + 5) - 2}{s + 5}} = \frac{4}{s + 3} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{4}{s + 3}}$
- **Ordem**: 1ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = -3$ (Estável; o polo foi deslocado de $-5$ para $-3$ sem cruzar para o semiplano direito)
- **Ganho DC**: $T(0) = \frac{4}{3} \approx 1.333$

---

### Simulação 15: Controle de Posição com Realimentação Tacométrica de Velocidade
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_15.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_15.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_15.svg)
- **Descrição**: Planta de 2ª ordem com polo integrador $G(s) = \frac{12}{s^2 + 2s}$ estabilizada com sensor de posição e velocidade $H(s) = s + 1$.
- **Passo a Passo**: O produto $G(s)H(s)$ adiciona $12(s+1)$ ao polinômio característico: $(s^2 + 2s) + 12s + 12 = s^2 + 14s + 12$:
- **Memorial em LaTeX**:
$$\begin{aligned} T(s) &= \frac{\frac{12}{s^2 + 2s}}{1 + \left(\frac{12}{s^2 + 2s}\right)(s + 1)} \\ &= \frac{\frac{12}{s^2 + 2s}}{\frac{(s^2 + 2s) + 12(s + 1)}{s^2 + 2s}} = \frac{12}{s^2 + 14s + 12} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{12}{s^2 + 14s + 12}}$
- **Ordem**: 2ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = -13.083$, $s_2 = -0.917$ (Estável Superamortecido, $\Delta = 148 > 0$, eliminação completa de oscilações)
- **Ganho DC**: $T(0) = \frac{12}{12} = 1.0$ (Erro estático nulo a degrau)

---

## 4. Topologia 4 — Topologias Mistas / Aninhadas

Topologias compostas combinam associações em cascata, malhas internas de realimentação e malhas de contorno externas.

### Simulação 16: Malha Interna Aninhada com Malha Global Externa
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_16.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_16.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_16.svg)
- **Descrição**: Bloco de ganho prévio $G_1=2$, malha fechada interna $G_2=\frac{4}{s+1}$ com retorno unitário, e malha externa com $H_2=0.5$.
- **Passo a Passo**: 1º: Malha interna $G_{\text{int}} = \frac{G_2}{1 + G_2 \cdot 1} = \frac{4}{s+5}$. 2º: Ramo direto é $G_1 \cdot G_{\text{int}} = \frac{8}{s+5}$. 3º: Fecha-se com $H_2=0.5$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{int}}(s) &= \frac{\frac{4}{s + 1}}{1 + \frac{4}{s + 1}} = \frac{4}{s + 5} \\[6pt] G_{\text{direto}}(s) &= 2 \cdot G_{\text{int}}(s) = \frac{8}{s + 5} \\[6pt] T(s) &= \frac{\frac{8}{s + 5}}{1 + \left(\frac{8}{s + 5}\right) \cdot 0.5} = \frac{8}{(s + 5) + 4} = \frac{8}{s + 9} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{8}{s + 9}}$
- **Ordem**: 1ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = -9$ (Estável, polo real no semiplano esquerdo)
- **Ganho DC**: $T(0) = \frac{8}{9} \approx 0.889$

---

### Simulação 17: Ramificação Intermediária entre Dois Blocos Diretos
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_17.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_17.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_17.svg)
- **Descrição**: Linha direta com $G_1=\frac{2}{s+1}$ e $G_2=\frac{3}{s+2}$, com derivação intermediária retornando via $H_2=2$ e saída retornando via $H_1=1$.
- **Passo a Passo**: Caminho direto $P_1 = G_1 G_2 = \frac{6}{(s+1)(s+2)}$. Laços $L_1 = -G_1 H_2$ e $L_2 = -G_1 G_2 H_1$. Determinante $\Delta = 1 - L_1 - L_2$:
- **Memorial em LaTeX**:
$$\begin{aligned} \Delta &= 1 + \frac{4}{s + 1} + \frac{6}{(s + 1)(s + 2)} = \frac{s^2 + 7s + 16}{(s + 1)(s + 2)} \\[6pt] T(s) &= \frac{P_1 \cdot 1}{\Delta} = \frac{\frac{6}{(s + 1)(s + 2)}}{\frac{s^2 + 7s + 16}{(s + 1)(s + 2)}} = \frac{6}{s^2 + 7s + 16} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{6}{s^2 + 7s + 16}}$
- **Ordem**: 2ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_{1,2} = -3.5 \pm j1.936$ (Estável Subamortecido, $\omega_n = 4$ rad/s, $\zeta = 0.875$)
- **Ganho DC**: $T(0) = \frac{6}{16} = 0.375$

---

### Simulação 18: Bloco Pré-Filtro + Malha Fechada + Integrador Pós em Cascata
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_18.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_18.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_18.svg)
- **Descrição**: Filtro de entrada $G_1=5$ em série com malha fechada interna ($G_2=\frac{10}{s+3}, H=1$) seguido por integrador puro $G_3=\frac{2}{s}$.
- **Passo a Passo**: 1º: Malha intermediária $G_{\text{mf}} = \frac{10}{s + 3 + 10} = \frac{10}{s + 13}$. 2º: Multiplica-se em cascata $G_1 \cdot G_{\text{mf}} \cdot G_3 = 5 \cdot \left[\frac{10}{s+13}\right] \cdot \left[\frac{2}{s}\right]$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{mf}}(s) &= \frac{\frac{10}{s + 3}}{1 + \frac{10}{s + 3}} = \frac{10}{s + 13} \\[6pt] T(s) &= G_1(s) \cdot G_{\text{mf}}(s) \cdot G_3(s) = 5 \cdot \left(\frac{10}{s + 13}\right) \cdot \left(\frac{2}{s}\right) = \frac{100}{s^2 + 13s} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{100}{s^2 + 13s}}$
- **Ordem**: 2ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = 0$, $s_2 = -13$ (Marginalmente Estável, polo na origem)
- **Ganho DC**: $T(0) \to \infty$

---

### Simulação 19: Feedforward Direto em Paralelo com Malha Fechada
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_19.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_19.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_19.svg)
- **Descrição**: Arquitetura com canal feedforward direto $G_{\text{ff}}=1$ somado em paralelo com uma malha fechada ($G=\frac{6}{s+2}, H=1$).
- **Passo a Passo**: 1º: Malha fechada inferior $G_{\text{mf}} = \frac{6}{s + 2 + 6} = \frac{6}{s + 8}$. 2º: Soma em paralelo com o feedforward $G_{\text{ff}} = 1$:
- **Memorial em LaTeX**:
$$\begin{aligned} G_{\text{mf}}(s) &= \frac{\frac{6}{s + 2}}{1 + \frac{6}{s + 2}} = \frac{6}{s + 8} \\[6pt] T(s) &= G_{\text{ff}}(s) + G_{\text{mf}}(s) = 1 + \frac{6}{s + 8} = \frac{(s + 8) + 6}{s + 8} = \frac{s + 14}{s + 8} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{s + 14}{s + 8}}$
- **Ordem**: 1ª Ordem | **Zeros**: $z_1 = -14$
- **Polos**: $s_1 = -8$ (Sistema Estável)
- **Ganho DC**: $T(0) = \frac{14}{8} = 1.75$

---

### Simulação 20: Duas Malhas Fechadas Consecutivas em Cascata (Dois Estágios)
- **Arquivos**: [Relatório HTML](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/simulacao_20.html) | [Print PNG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/simulacao_20.png) | [Diagrama SVG](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/simulacao_20.svg)
- **Descrição**: Estágio 1 ($G_1=\frac{10}{s+1}, H_1=1$) acoplado diretamente em cascata com Estágio 2 ($G_2=\frac{4}{s+4}, H_2=2$).
- **Passo a Passo**: 1º: Estágio 1 $T_1 = \frac{10}{s+1+10} = \frac{10}{s+11}$. 2º: Estágio 2 $T_2 = \frac{4}{s+4+8} = \frac{4}{s+12}$. 3º: Cascata $T(s) = T_1 \cdot T_2$:
- **Memorial em LaTeX**:
$$\begin{aligned} T_1(s) &= \frac{\frac{10}{s + 1}}{1 + \frac{10}{s + 1}} = \frac{10}{s + 11} \\[6pt] T_2(s) &= \frac{\frac{4}{s + 4}}{1 + \left(\frac{4}{s + 4}\right) \cdot 2} = \frac{4}{(s + 4) + 8} = \frac{4}{s + 12} \\[6pt] T(s) &= T_1(s) \cdot T_2(s) = \left(\frac{10}{s + 11}\right) \cdot \left(\frac{4}{s + 12}\right) = \frac{40}{s^2 + 23s + 132} \end{aligned}$$
- **Função Equivalente**: $T(s) = \frac{C(s)}{R(s)} = \mathbf{\frac{40}{s^2 + 23s + 132}}$
- **Ordem**: 2ª Ordem | **Zeros**: Nenhum zero finito
- **Polos**: $s_1 = -11$, $s_2 = -12$ (Sistema Estável, polos reais no semiplano esquerdo)
- **Ganho DC**: $T(0) = \frac{40}{132} \approx 0.303$

---

## Quadro Resumo Geral das 20 Simulações

| ID | Topologia | Título | Ordem | Zeros | Polos | Estabilidade | Ganho DC |
|:---|:---|:---|:---:|:---|:---|:---:|:---:|
| 01 | Cascata | Dois Polos Reais em Cascata | 2ª | Nenhum | $-1, -2$ | Estável | 10.00 |
| 02 | Cascata | Cascata de Três Blocos (Ganho + Integrador + Polo) | 2ª | Nenhum | $0, -5$ | Marginal | $\infty$ |
| 03 | Cascata | Compensador Lead em Cascata com Planta | 2ª | $-3$ | $-1, -4$ | Estável | 1.50 |
| 04 | Cascata | Controlador PI em Série com Dois Estágios | 3ª | $-0.5$ | $0, -2, -6$ | Marginal | $\infty$ |
| 05 | Cascata | Ganho Proporcional com Sistema 2ª Ordem | 2ª | Nenhum | $-1 \pm j2$ | Estável | 2.00 |
| 06 | Paralelo | Dois Ramos em Paralelo Aditivo (+ e +) | 2ª | $-3.333$ | $-2, -4$ | Estável | 3.75 |
| 07 | Paralelo | Controlador PI na Forma Paralela (P + I) | 1ª | $-0.4$ | $0$ | Marginal | $\infty$ |
| 08 | Paralelo | Paralelo Subtrativo (+ e - / Feedforward) | 2ª | $-3.667$ | $-1, -3$ | Estável | 7.333 |
| 09 | Paralelo | Três Ramos em Paralelo (PID Completo) | 2ª | $-1.6, -5.2$ | $0, -10$ | Marginal | $\infty$ |
| 10 | Paralelo | Compensador Duplo Lead-Lag em Paralelo | 2ª | $-2.5 \pm j1.32$ | $-2, -5$ | Estável | 2.40 |
| 11 | Realimentação | Realimentação Negativa Unitária | 1ª | Nenhum | $-12$ | Estável | 0.833 |
| 12 | Realimentação | Sistema Tipo 1 com Sensor ($H=2$) | 2ª | Nenhum | $-0.5 \pm j3.12$ | Estável | 0.50 |
| 13 | Realimentação | Dinâmica no Sensor $H(s) = \frac{2}{s+1}$ | 2ª | $-1$ | $-2 \pm j3.87$ | Estável | 0.421 |
| 14 | Realimentação | Realimentação Positiva / Regenerativa | 1ª | Nenhum | $-3$ | Estável | 1.333 |
| 15 | Realimentação | Realimentação Tacométrica de Velocidade | 2ª | Nenhum | $-13.08, -0.92$ | Estável | 1.00 |
| 16 | Mistas | Malha Interna Aninhada com Malha Global | 1ª | Nenhum | $-9$ | Estável | 0.889 |
| 17 | Mistas | Ramificação Intermediária entre Dois Blocos | 2ª | Nenhum | $-3.5 \pm j1.94$ | Estável | 0.375 |
| 18 | Mistas | Pré-Filtro + Malha Fechada + Integrador | 2ª | Nenhum | $0, -13$ | Marginal | $\infty$ |
| 19 | Mistas | Feedforward Direto em Paralelo com Malha | 1ª | $-14$ | $-8$ | Estável | 1.75 |
| 20 | Mistas | Duas Malhas Fechadas Consecutivas em Cascata | 2ª | Nenhum | $-11, -12$ | Estável | 0.303 |