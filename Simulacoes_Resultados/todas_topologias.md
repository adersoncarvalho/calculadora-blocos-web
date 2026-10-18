# Super-Topologia Unificada: Todas as Topologias Possíveis de Diagramas de Blocos

Este documento apresenta a formulação analítica, diagrama vetorial esquemático, memorial passo a passo e comprovação matemática de um **Circuito de Controle Integrado Mestre** que reúne, de forma simultânea e consistente, todas as topologias e regras de transformação canônicas da Álgebra de Diagramas de Blocos da Engenharia de Controle Clássico.

---

## Acesso Direto aos Arquivos da Super-Topologia

- **Relatório Interativo em HTML**: [super_topologia.html](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/relatorios_html/super_topologia.html)
- **Captura de Tela em Alta Resolução (Print)**: [super_topologia.png](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/prints/super_topologia.png)
- **Diagrama Vetorial Standalone (SVG)**: [super_topologia.svg](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/diagramas_svg/super_topologia.svg)
- **Painel Geral de Simulações**: [index.html](file:///c:/Users/Usuário/Desktop/controle/Simulacoes_Resultados/index.html)

---

## 1. Catálogo Completo das Topologias Canônicas Presentes no Circuito

O circuito integra simultaneamente 10 configurações e propriedades fundamentais:

| Nº | Topologia / Transformação | Descrição no Circuito Mestre | Expressão Canônica |
|:---:|:---|:---|:---:|
| **1** | **Cascata / Série** | Pré-filtro de entrada $G_{\text{pre}}(s)$ e acoplamento entre as plantas $G_1(s)$ e $G_2(s)$. | $G_{\text{eq}} = G_a \cdot G_b$ |
| **2** | **Paralelo Aditivo (Soma)** | Controlador PI composto por ramo proporcional $K_p = 2$ e integrador $K_i/s = 4/s$ somados em $\Sigma_c$. | $G_c = K_p + \frac{K_i}{s} = \frac{2s + 4}{s}$ |
| **3** | **Canal Feedforward Direto** | Ramo de avanço $G_{\text{ff}} = 1$ contornando a malha de controle da entrada até a saída $\Sigma_4$. | $V(s) = Y(s) + G_{\text{ff}} R_1(s)$ |
| **4** | **Malha Fechada Aninhada** | Laço interno secundário de velocidade/taxa envolvendo a planta $G_1(s) = \frac{3}{s+1}$. | $\Sigma_2 \to G_1 \to \text{retorno}$ |
| **5** | **Realimentação Positiva** | Retorno regenerativo com sinal positivo $(+)$ no somador interno $\Sigma_2$ via $H_1 = 1$. | $G_{\text{int}} = \frac{G_1}{1 - G_1 H_1} = \frac{3}{s - 2}$ |
| **6** | **Realimentação Negativa** | Laço clássico estabilizador com sinal subtrativo $(-)$ no somador principal $\Sigma_1$. | $T = \frac{G}{1 + GH}$ |
| **7** | **Malhas Sobrepostas / Cruzadas** | Dois laços de realimentação sobrepostos: taxa em $X$ ($H_{\text{taxa}} = 1$) e posição em $Y$ ($H_{\text{ext}} = 2$). | $\Delta(s) = 1 - L_1(s) - L_2(s)$ |
| **8** | **Injeção de Distúrbio de Carga** | Ponto somador de perturbação $D(s)$ inserido entre o atuador e a planta interna. | $U_d(s) = U_c(s) + D(s)$ |
| **9** | **Transposição de Blocos** | Equivalência exata entre redução gráfica por transposição de nós e Fórmula de Mason. | $P_k \Delta_k / \Delta$ |
| **10** | **Rejeição em Regime Permanente** | Princípio do Modelo Interno: erro estático nulo a distúrbio de degrau devido à ação integral. | $T_D(0) = \lim_{s \to 0} \frac{6s}{\text{den}} = 0$ |

---

## 2. Parâmetros Numéricos e Polinomiais dos Blocos

- **Pré-filtro de Entrada em Cascata**:
  $$G_{\text{pre}}(s) = \frac{2}{s + 2}$$
- **Controlador Proporcional-Integral em Paralelo**:
  $$G_c(s) = K_p + \frac{K_i}{s} = 2 + \frac{4}{s} = \frac{2(s + 2)}{s}$$
- **Planta 1 (Malha Interna)**:
  $$G_1(s) = \frac{3}{s + 1}$$
- **Sensor da Malha Interna (Feedback Positivo)**:
  $$H_1 = 1 \quad (\text{sinal } + \text{ em } \Sigma_2)$$
- **Planta 2 (Acoplamento Serial Direto)**:
  $$G_2(s) = \frac{2}{s + 3}$$
- **Sensor de Taxa Intermediário (Laço Cruzado 1)**:
  $$H_{\text{taxa}} = 1 \quad (\text{sinal } - \text{ em } \Sigma_1)$$
- **Sensor Global de Posição (Laço Externo 2)**:
  $$H_{\text{ext}} = 2 \quad (\text{sinal } - \text{ em } \Sigma_1)$$
- **Canal Feedforward de Avanço Direto**:
  $$G_{\text{ff}} = 1 \quad (\text{sinal } + \text{ em } \Sigma_4)$$

---

## 3. Resolução Analítica Passo a Passo

### Etapa 1: Resolução do Controlador PI na Topologia Paralela
O sinal de erro $E_1(s)$ proveniente do somador principal $\Sigma_1$ bifurca em dois ramos paralelos:
$$G_c(s) = 2 + \frac{4}{s} = \frac{2s + 4}{s} = \frac{2(s + 2)}{s}$$

---

### Etapa 2: Fechamento da Malha Interna com Realimentação Positiva
A planta interna $G_1(s)$ possui retorno unitário com sinal aditivo $(+)$ no somador $\Sigma_2$. Pela fórmula de realimentação positiva:
$$G_{\text{int}}(s) = \frac{G_1(s)}{1 - G_1(s)H_1} = \frac{\frac{3}{s + 1}}{1 - \left(\frac{3}{s + 1}\right) \cdot 1} = \frac{3}{(s + 1) - 3} = \frac{3}{s - 2}$$

> **Observação Teórica**: A malha interna isolada possui um pólo em $s = +2$ (sistema de malha aberta instável). Esse comportamento é característico de sistemas aeroespaciais (aeronaves de caça instáveis) e mecatrônicos de levitação, onde a estabilização global é garantida pelas malhas de retorno externas.

---

### Etapa 3: Ramo Direto em Cascata com a Segunda Planta $G_2(s)$
O caminho direto atravessa o somador de distúrbio $\Sigma_d$, a malha interna $G_{\text{int}}(s)$ e a planta $G_2(s)$:
$$P_1(s) = G_c(s) \cdot G_{\text{int}}(s) \cdot G_2(s) = \left(\frac{2(s + 2)}{s}\right) \cdot \left(\frac{3}{s - 2}\right) \cdot \left(\frac{2}{s + 3}\right) = \frac{12(s + 2)}{s(s - 2)(s + 3)}$$

---

### Etapa 4: Resolução das Malhas Sobrepostas e Determinante $\Delta(s)$
O Somador Principal $\Sigma_1$ recebe dois laços de realimentação negativa:
1. **Laço de Taxa Intermediária** a partir do nó $X$:
   $$L_1(s) = - \left[ G_c(s) \cdot G_{\text{int}}(s) \right] \cdot H_{\text{taxa}} = - \left(\frac{6(s + 2)}{s(s - 2)}\right) \cdot 1 = - \frac{6(s + 2)}{s(s - 2)}$$
2. **Laço Global de Posição** a partir do nó $Y$:
   $$L_2(s) = - P_1(s) \cdot H_{\text{ext}} = - \left(\frac{12(s + 2)}{s(s - 2)(s + 3)}\right) \cdot 2 = - \frac{24(s + 2)}{s(s - 2)(s + 3)}$$

Como ambos os laços compartilham o caminho direto do controlador $G_c(s)$, eles se tocam em $\Sigma_1$. O determinante da malha é:
$$\Delta(s) = 1 - L_1(s) - L_2(s) = 1 + \frac{6(s + 2)}{s(s - 2)} + \frac{24(s + 2)}{s(s - 2)(s + 3)}$$

Reduzindo ao denominador comum $s(s - 2)(s + 3)$:
$$\begin{aligned}
\text{Numerador}(\Delta) &= s(s - 2)(s + 3) + 6(s + 2)(s + 3) + 24(s + 2) \\
&= (s^3 + s^2 - 6s) + 6(s^2 + 5s + 6) + (24s + 48) \\
&= s^3 + s^2 - 6s + 6s^2 + 30s + 36 + 24s + 48 \\
&= s^3 + 7s^2 + 48s + 84
\end{aligned}$$

Portanto:
$$\Delta(s) = \frac{s^3 + 7s^2 + 48s + 84}{s(s - 2)(s + 3)}$$

---

### Etapa 5: Resposta da Malha de Controle Principal $T_{Y/R_1}(s)$
Aplicando a relação $T = \frac{P_1}{\Delta}$:
$$T_{Y/R_1}(s) = \frac{\frac{12(s + 2)}{s(s - 2)(s + 3)}}{\frac{s^3 + 7s^2 + 48s + 84}{s(s - 2)(s + 3)}} = \frac{12s + 24}{s^3 + 7s^2 + 48s + 84}$$

---

### Etapa 6: Adição do Canal Feedforward e Pré-Filtro em Cascata
No somador final $\Sigma_4$, o sinal da malha direta $Y(s)$ soma-se ao canal feedforward $G_{\text{ff}} = 1$:
$$V(s) = Y(s) + G_{\text{ff}} \cdot R_1(s) = \left( \frac{12s + 24}{s^3 + 7s^2 + 48s + 84} + 1 \right) R_1(s) = \left( \frac{s^3 + 7s^2 + 60s + 108}{s^3 + 7s^2 + 48s + 84} \right) R_1(s)$$

Como $R_1(s) = G_{\text{pre}}(s) \cdot R(s) = \left(\frac{2}{s + 2}\right) R(s)$:
$$T(s) = \frac{C(s)}{R(s)} = \left(\frac{2}{s + 2}\right) \cdot \left( \frac{s^3 + 7s^2 + 60s + 108}{s^3 + 7s^2 + 48s + 84} \right) = \mathbf{\frac{2s^3 + 14s^2 + 120s + 216}{s^4 + 9s^3 + 62s^2 + 180s + 168}}$$

---

### Etapa 7: Função de Transferência de Rejeição a Distúrbio $T_D(s) = \frac{C(s)}{D(s)}$
Com entrada de referência nula ($R = 0$), a entrada de perturbação $D(s)$ propaga-se diretamente através de $G_{\text{int}}(s) \cdot G_2(s)$:
$$P_D(s) = \left(\frac{3}{s - 2}\right) \cdot \left(\frac{2}{s + 3}\right) = \frac{6}{(s - 2)(s + 3)}$$

Dividindo pelo determinante da malha $\Delta(s)$:
$$T_D(s) = \frac{C(s)}{D(s)} = \frac{\frac{6}{(s - 2)(s + 3)}}{\frac{s^3 + 7s^2 + 48s + 84}{s(s - 2)(s + 3)}} = \mathbf{\frac{6s}{s^3 + 7s^2 + 48s + 84}}$$

---

## 4. Análise de Pólos, Zeros e Estabilidade

### Pólos do Sistema
Resolvendo as raízes do denominador $(s + 2)(s^3 + 7s^2 + 48s + 84) = 0$:
- $s_1 = -2.000$ (Pólo real introduzido pelo pré-filtro)
- $s_2 = -2.251$ (Pólo real da malha fechada)
- $s_{3,4} = -2.374 \pm j5.628$ (Par de pólos complexos conjugados subamortecidos)

**Critério de Estabilidade**: Todos os 4 pólos possuem parte real estritamente negativa ($\text{Re}\{s_i\} \le -2.000$). O sistema é **assintoticamente estável** com margem de estabilidade acentuada.

### Zeros do Sistema
Resolvendo as raízes do numerador $2(s^3 + 7s^2 + 60s + 108) = 0$:
- $z_1 = -2.182$
- $z_{2,3} = -2.409 \pm j6.609$

Todos os zeros residem no semiplano esquerdo (sistema de fase mínima).

### Ganho DC em Regime Permanente
$$T(0) = \lim_{s \to 0} T(s) = \frac{216}{168} = \frac{9}{7} \approx 1.286$$

### Rejeição Total de Perturbação de Carga
Para uma perturbação degrau $D(s) = \frac{A}{s}$:
$$c_{\text{est, D}} = \lim_{s \to 0} s \cdot \left[ T_D(s) \frac{A}{s} \right] = \lim_{s \to 0} \frac{6s \cdot A}{s^3 + 7s^2 + 48s + 84} = 0$$

O erro estático induzido por distúrbios constantes na planta é **estritamente nulo**, comprovando a eficácia do Princípio do Modelo Interno proporcionado pela ação integral em paralelo do controlador $G_c(s)$.
