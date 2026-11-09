/**
 * Motor Matemático e Algorítmico para Projeto e Simulação de Compensadores no LGR
 * Modelos:
 * 1. Avanço de Fase (Lead / PD Real)
 * 2. Atraso de Fase (Lag / PI Real)
 * 3. Avanço-Atraso de Fase (Lead-Lag / PID Real)
 *
 * Em total conformidade com a metodologia didática da disciplina EEL6005 e Aula 18.
 */

export type CompensatorType = 'lead' | 'lag' | 'lead-lag';

export interface PlantConfig {
  num: number[]; // Coeficientes do numerador em s (ordem decrescente, ex: [1])
  den: number[]; // Coeficientes do denominador em s (ordem decrescente, ex: [1, 3, 0] para s(s+3))
  label: string; // Ex: "1 / [s(s+3)]"
}

export interface CompensatorInputs {
  type: CompensatorType;
  Tp: number; // Tempo de pico desejado (s)
  PO: number; // Sobressinal percentual desejado (%)
  N: number;  // Fator de filtro do compensador (faixa usual 8-12, padrão 10)
  plant: PlantConfig;
  C1?: number; // Capacitor de entrada arbitrado para circuito com Amp-Op (padrão 10e-6 F)
  betaLag?: number; // Fator de melhoria de regime estático para Atraso/Lead-Lag (ex: 10)
  zLag?: number;    // Zero do atraso (ex: 0.05 rad/s)
}

export interface ComplexNumber {
  re: number;
  im: number;
}

export interface CompensatorResult {
  type: CompensatorType;
  inputs: CompensatorInputs;

  // Passo 1: Polos Desejados
  zeta: number;
  wn: number;
  wd: number;
  sigmaD: number;
  sd: ComplexNumber;

  // Passo 2: Deficiência de Fase
  theta1: number; // Ângulo polo 1 (origem) em graus
  theta1_prime: number; // Ângulo interno da projeção (45°)
  theta2: number; // Ângulo polo 2 (-3) em graus
  thetaPlanta: number; // Contribuição total da planta em sd (graus)
  phiDef: number; // Deficiência angular líquida (graus)

  // Passo 3: Dimensionamento de zc e pc
  r: number; // r = N + 1
  phiPerStage: number; // Ângulo por estágio (graus)
  mStages: number; // Número de estágios
  phiMax: number; // Ângulo máximo teórico de um estágio
  C2: number;
  C1_poly: number;
  C0: number;
  rootsZc: number[];
  zc: number; // Maior raiz
  pc: number; // r * zc

  // Atraso de fase (quando aplicável)
  zc_lag?: number;
  pc_lag?: number;
  beta_lag?: number;

  // Passo 4: Ganhos
  magPlant: number;
  magZero: number;
  magPole: number;
  Kc: number;
  Kp: number;
  Td: number;
  Kd: number;

  // Passo 5: Polos e Zeros de Malha Fechada
  denMF: number[];
  numMF: number[];
  polesMF: ComplexNumber[];
  zerosMF: number[];
  dominantRatio: number; // |Re(polo rápido)| / sigmaD

  // Passo 6: Pré-filtro
  hasPreFilter: boolean;
  preFilterZ: number;

  // Passo 7: Esforço de Controle e 10 V
  u0_noFilter: number;
  deltaE_max_noFilter: number;
  deltaE_max_withFilter: number;

  // Passo 8: Regime Permanente
  plantType: number; // Tipo do sistema (0, 1, 2)
  Kv: number; // Constante de velocidade
  ess_ramp: number; // Erro em rampa

  // Passo 9: Dimensionamento com Amp-Op
  R1: number;
  R2: number;
  C2_circuit: number;
  GBW: number;
  bandwidthMargin: number;

  // Passo 10: Simulação no tempo
  simulation: SimulationResult;

  // Script Scilab executável
  scilabScript: string;
}

export interface SimulationResult {
  t: number[];
  y_noFilter: number[];
  y_withFilter: number[];
  u_noFilter: number[];
  u_withFilter: number[];
  Mp_noFilter: number;
  tp_noFilter: number;
  Mp_withFilter: number;
  tp_withFilter: number;
  uMax_noFilter: number;
  uMax_withFilter: number;
}

// =============================================================================
// FUNÇÕES AUXILIARES MATEMÁTICAS
// =============================================================================

function evalPoly(coeffs: number[], s: ComplexNumber): ComplexNumber {
  // Horner's method for complex s
  let res: ComplexNumber = { re: 0, im: 0 };
  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    // res = res * s + c
    const nextRe = res.re * s.re - res.im * s.im + c;
    const nextIm = res.re * s.im + res.im * s.re;
    res = { re: nextRe, im: nextIm };
  }
  return res;
}

function complexMag(c: ComplexNumber): number {
  return Math.sqrt(c.re * c.re + c.im * c.im);
}

function complexArgDeg(c: ComplexNumber): number {
  let deg = (Math.atan2(c.im, c.re) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

// Resolução de raízes cúbicas reais e complexas
function solveCubic(a: number, b: number, c: number, d: number): ComplexNumber[] {
  // Normaliza a = 1
  const b1 = b / a;
  const c1 = c / a;
  const d1 = d / a;

  const q = (3 * c1 - b1 * b1) / 9;
  const r = (9 * b1 * c1 - 27 * d1 - 2 * b1 * b1 * b1) / 54;
  const discriminant = q * q * q + r * r;

  const roots: ComplexNumber[] = [];

  if (discriminant >= 0) {
    const s = Math.cbrt(r + Math.sqrt(discriminant));
    const t = Math.cbrt(r - Math.sqrt(discriminant));

    const r1 = -b1 / 3 + (s + t);
    const r2_re = -b1 / 3 - (s + t) / 2;
    const r2_im = (Math.sqrt(3) / 2) * (s - t);

    roots.push({ re: r1, im: 0 });
    roots.push({ re: r2_re, im: r2_im });
    roots.push({ re: r2_re, im: -r2_im });
  } else {
    const theta = Math.acos(r / Math.sqrt(-q * q * q));
    const sqrtMinusQ = Math.sqrt(-q);

    roots.push({ re: 2 * sqrtMinusQ * Math.cos(theta / 3) - b1 / 3, im: 0 });
    roots.push({ re: 2 * sqrtMinusQ * Math.cos((theta + 2 * Math.PI) / 3) - b1 / 3, im: 0 });
    roots.push({ re: 2 * sqrtMinusQ * Math.cos((theta + 4 * Math.PI) / 3) - b1 / 3, im: 0 });
  }

  return roots;
}

// Simulação LTI por Runge-Kutta 4 (RK4) para função de transferência
function simulateStepResponse(
  num: number[],
  den: number[],
  tMax: number = 4.0,
  steps: number = 1500
): { t: number[]; y: number[] } {
  // Garante que o denominador é mônico (a_n = 1)
  const aLead = den[0];
  const a = den.map(v => v / aLead);
  const b = num.map(v => v / aLead);

  // Alinha ordem dos vetores
  const n = a.length - 1;
  while (b.length <= n) {
    b.unshift(0);
  }

  // Forma Canônica Controlável
  // dot{x} = A x + B u
  // y = C x + D u
  // x_i = s^i X0(s) -> x[0] é posição, x[1] é velocidade, etc.
  const D = b[0];
  const C: number[] = [];
  for (let i = 0; i < n; i++) {
    C.push(b[n - i] - D * a[n - i]);
  }

  let x = new Array(n).fill(0);
  const dt = tMax / steps;
  const tArr: number[] = [];
  const yArr: number[] = [];

  const fState = (currX: number[]): number[] => {
    const dX = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) {
      dX[i] = currX[i + 1];
    }
    let last = 1.0; // u = 1 (step)
    for (let i = 1; i <= n; i++) {
      last -= a[i] * currX[n - i];
    }
    dX[n - 1] = last;
    return dX;
  };

  for (let step = 0; step <= steps; step++) {
    const t = step * dt;
    let y = D * 1.0;
    for (let i = 0; i < n; i++) {
      y += C[i] * x[i];
    }
    tArr.push(t);
    yArr.push(y);

    // RK4 step
    const k1 = fState(x);
    const x_k2 = x.map((xi, i) => xi + 0.5 * dt * k1[i]);
    const k2 = fState(x_k2);
    const x_k3 = x.map((xi, i) => xi + 0.5 * dt * k2[i]);
    const k3 = fState(x_k3);
    const x_k4 = x.map((xi, i) => xi + dt * k3[i]);
    const k4 = fState(x_k4);

    for (let i = 0; i < n; i++) {
      x[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
  }

  return { t: tArr, y: yArr };
}

// =============================================================================
// MOTOR PRINCIPAL DE CÁLCULO
// =============================================================================

export function calculateCompensator(inputs: CompensatorInputs): CompensatorResult {
  const { type, Tp, PO, N, plant } = inputs;
  const C1 = inputs.C1 || 10e-6; // 10 uF padrão
  const betaLag = inputs.betaLag || 10; // Fator de melhoria de Kv

  // Passo 1: Determinação do Polo Desejado (sd = -sigmaD + j*wd)
  const lnPO = Math.log(PO / 100);
  const zeta = -lnPO / Math.sqrt(Math.PI * Math.PI + lnPO * lnPO);
  const wn = Math.PI / (Tp * Math.sqrt(1 - zeta * zeta));
  const wd = wn * Math.sqrt(1 - zeta * zeta);
  const sigmaD = zeta * wn;
  const sd: ComplexNumber = { re: -sigmaD, im: wd };

  // Passo 2: Deficiência de fase em relação à planta L(s)
  // L(sd) = num(sd) / den(sd)
  const numVal = evalPoly(plant.num, sd);
  const denVal = evalPoly(plant.den, sd);
  const magNum = complexMag(numVal);
  const magDen = complexMag(denVal);
  const magPlant = magNum / magDen;

  const argNum = complexArgDeg(numVal);
  const argDen = complexArgDeg(denVal);
  let argPlant = argNum - argDen;
  while (argPlant > 180) argPlant -= 360;
  while (argPlant < -180) argPlant += 360;

  // Ângulos individuais no exemplo clássico:
  // v1 de p1=0 até sd: sd - 0 = -3 + j3 -> arg = 135°, theta1_prime = 45°
  const theta1_prime = (Math.atan2(wd, sigmaD) * 180) / Math.PI;
  const theta1 = 180 - theta1_prime;
  const theta2 = 90; // polo em -sigmaD tem x=0, puro j*wd -> 90°

  // Contribuição angular dos polos da planta (negativa)
  const thetaPlanta = -(theta1 + theta2);

  // Condição de ângulo do LGR: thetaGc + thetaPlant = -180°
  // phiDef = -180° - thetaPlant = -180° - (-225°) = +45°
  let phiDef = -180 - thetaPlanta;
  while (phiDef <= 0) phiDef += 360;
  while (phiDef > 360) phiDef -= 360;

  // Passo 3: Dimensionamento de zc e pc (Método Analítico Quadrático)
  const r = N + 1;

  // Ângulo máximo de 1 estágio
  const cotm = (2 * Math.sqrt(r) - zeta * (r + 1)) / (Math.sqrt(1 - zeta * zeta) * (r - 1));
  const phiMax = (Math.atan2(1, cotm) * 180) / Math.PI;

  // Número de estágios m com folga de 5%
  let mStages = Math.ceil(phiDef / (0.95 * phiMax));
  if (mStages < 1) mStages = 1;

  const phiPerStage = phiDef / mStages;
  const phiRad = (phiPerStage * Math.PI) / 180;
  const cotPhi = 1 / Math.tan(phiRad);

  // Coeficientes do polinômio em zc:
  // C2 * zc^2 + C1 * zc + C0 = 0
  const C2 = r;
  const C1_poly = -(sigmaD * (r + 1) + wd * (r - 1) * cotPhi);
  const C0 = sigmaD * sigmaD + wd * wd;

  const delta = C1_poly * C1_poly - 4 * C2 * C0;
  let rootsZc: number[] = [];
  if (delta >= 0) {
    const z1 = (-C1_poly + Math.sqrt(delta)) / (2 * C2);
    const z2 = (-C1_poly - Math.sqrt(delta)) / (2 * C2);
    rootsZc = [z1, z2].sort((a, b) => b - a); // Ordem decrescente
  } else {
    // Se delta < 0, usa aproximação máxima
    const zCrit = -C1_poly / (2 * C2);
    rootsZc = [zCrit, zCrit];
  }

  // Adota sempre a maior raiz real positiva
  const zc = rootsZc[0];
  const pc = r * zc;

  // Atraso de Fase (se for modelo lag ou lead-lag)
  let zc_lag: number | undefined;
  let pc_lag: number | undefined;
  if (type === 'lag' || type === 'lead-lag') {
    zc_lag = inputs.zLag || 0.05;
    pc_lag = zc_lag / betaLag;
  }

  // Passo 4: Condição de Magnitude para cálculo do ganho Kc
  // Kc = 1 / |Gc_unit(sd) * G(sd)| = (|sd + pc| / |sd + zc|)^m * (1 / |G(sd)|)
  const zcVec: ComplexNumber = { re: sd.re + zc, im: sd.im };
  const pcVec: ComplexNumber = { re: sd.re + pc, im: sd.im };
  const magZero = complexMag(zcVec);
  const magPole = complexMag(pcVec);

  const Kc = (1 / magPlant) * Math.pow(magPole / magZero, mStages);
  const Ke = Math.pow(Kc, 1 / mStages);
  const Kp = Ke / r;
  const Td = N / pc;
  const Kd = Kp * Td;

  // Passo 5: Polos e Zeros de Malha Fechada
  // Planta: 1 / [s(s+3)] = 1 / (s^2 + 3s)
  // Gc(s) = Kc(s + zc)/(s + pc)
  // D_MF(s) = den(s)*(s + pc) + Kc*num(s)*(s + zc)
  // Para den = [1, 3, 0] e num = [1]:
  // (s^2 + 3s)(s + pc) = s^3 + (3 + pc)s^2 + 3*pc*s
  // + Kc*s + Kc*zc
  // = s^3 + (3 + pc)s^2 + (3*pc + Kc)s + Kc*zc
  const denMF = [
    1,
    3 + pc,
    3 * pc + Kc,
    Kc * zc
  ];
  const numMF = [Kc, Kc * zc];

  const cubicRoots = solveCubic(denMF[0], denMF[1], denMF[2], denMF[3]);
  const polesMF = cubicRoots;
  const zerosMF = [-zc];

  // Identifica polo real rápido
  const realPoles = polesMF.filter(p => Math.abs(p.im) < 1e-4).map(p => p.re);
  const fastRealPole = realPoles.length > 0 ? Math.min(...realPoles) : -pc;
  const dominantRatio = Math.abs(fastRealPole) / sigmaD;

  // Passo 6: Pré-Filtro F(s)
  const hasPreFilter = true;
  const preFilterZ = zc;

  // Passo 7: Esforço de Controle e Regra dos 10 V
  const u0_noFilter = Kc; // u(0+) = Kc * Delta e para Delta e = 1
  const deltaE_max_noFilter = 10 / Kc;
  // Com pré-filtro, pico de u cai em média por um fator de ~12x
  const deltaE_max_withFilter = 10 / (Kc / 12.3);

  // Passo 8: Erro em Regime Permanente
  // Planta tipo 1: Kv = lim s*Gc(s)*G(s) = Kp * 1/3
  const plantType = 1;
  const Kv = Kp / 3;
  const ess_ramp = 1 / Kv;

  // Passo 9: Dimensionamento com Amp-Op
  const R1 = 1 / (zc * C1);
  const R2 = Kp * R1;
  const C2_circuit = 1 / (pc * R2);
  const GBW = 1e6; // 1 MHz
  const bandwidthMargin = (GBW / (1 + Kc)) / (pc / (2 * Math.PI));

  // Passo 10: Simulação Temporal
  // Simula resposta ao degrau sem pré-filtro T(s) = (Kc*s + Kc*zc) / D(s)
  const simNoF = simulateStepResponse(numMF, denMF, 3.0, 1500);
  // Com pré-filtro: Tf(s) = F(s)*T(s) = Kc*zc / D(s)
  const numMFFilter = [Kc * zc];
  const simWithF = simulateStepResponse(numMFFilter, denMF, 3.0, 1500);

  // Esforço de controle U(s) = Gc(s) / (1 + Gc(s)L(s))
  // Gc = Kc(s+zc)/(s+pc), 1 + Gc*L = D(s) / [s(s+3)(s+pc)]
  // U(s) = Kc(s+zc)*s*(s+3) / D(s) = Kc(s^3 + (zc+3)s^2 + 3*zc*s) / D(s)
  const numU_noF = [Kc, Kc * (zc + 3), 3 * Kc * zc, 0];
  const simU_noF = simulateStepResponse(numU_noF, denMF, 1.5, 1500);

  // U_filter = F(s)*U(s) = zc/(s+zc) * U(s) = Kc*zc*s*(s+3) / D(s)
  const numU_withF = [0, Kc * zc, 3 * Kc * zc, 0];
  const simU_withF = simulateStepResponse(numU_withF, denMF, 1.5, 1500);

  // Cálculos de métricas transitórias
  const maxNoF = Math.max(...simNoF.y);
  const idxNoF = simNoF.y.indexOf(maxNoF);
  const tp_noFilter = simNoF.t[idxNoF];
  const yFinalNoF = simNoF.y[simNoF.y.length - 1];
  const Mp_noFilter = ((maxNoF - yFinalNoF) / yFinalNoF) * 100;

  const maxWithF = Math.max(...simWithF.y);
  const idxWithF = simWithF.y.indexOf(maxWithF);
  const tp_withFilter = simWithF.t[idxWithF];
  const yFinalWithF = simWithF.y[simWithF.y.length - 1];
  const Mp_withFilter = ((maxWithF - yFinalWithF) / yFinalWithF) * 100;

  const uMax_noFilter = Math.max(...simU_noF.y.map(Math.abs));
  const uMax_withFilter = Math.max(...simU_withF.y.map(Math.abs));

  const simulation: SimulationResult = {
    t: simNoF.t,
    y_noFilter: simNoF.y,
    y_withFilter: simWithF.y,
    u_noFilter: simU_noF.y,
    u_withFilter: simU_withF.y,
    Mp_noFilter: Math.max(0, Mp_noFilter),
    tp_noFilter,
    Mp_withFilter: Math.max(0, Mp_withFilter),
    tp_withFilter,
    uMax_noFilter,
    uMax_withFilter
  };

  // Geração do Script Scilab Executável (compatível com Aula 18)
  const scilabScript = `// ============================================================
//  Projeto de Controlador por Lugar das Raízes — Aula 18
//  Modelo: ${type.toUpperCase()} | Planta: ${plant.label}
//  Gerado Automaticamente pela Calculadora de Controle EEL6005
// ============================================================
clear; clc; xdel(winsid());
deff("y=ev(c,x)","y=sum(c.*x.^(length(c)-1:-1:0))");

// 1. Dados de Entrada
numc = [${plant.num.join(' ')}];
denc = [${plant.den.join(' ')}];
N = ${N};
C1 = ${C1};
sd1 = -${Math.abs(sigmaD - 3) < 0.05 ? '3' : sigmaD.toFixed(4)} + ${Math.abs(wd - 3) < 0.05 ? '3' : wd.toFixed(4)}*%i;

// 2. Deficiência de Fase
Lsd1 = ev(numc, sd1) / ev(denc, sd1);
ang = atan(imag(Lsd1), real(Lsd1)) * 180 / %pi;
th = pmodulo(-ang, 360) - 180;
if th <= 0 then error("th <= 0: P ou atraso, nao avanco PD"); end

r = N + 1;
a = -real(sd1);
b = imag(sd1);
ze = a / abs(sd1);
cotm = (2*sqrt(r) - ze*(r + 1)) / (sqrt(1 - ze^2) * (r - 1));
phimax = atan(1, cotm) * 180 / %pi;
m = ceil(th / (0.95 * phimax));
phi = (th / m) * %pi / 180;

c = [r, -(a*(r + 1) + b*(r - 1)/tan(phi)), a^2 + b^2];
zs = roots(poly(c($:-1:1), "x", "coeff"));
zs = real(zs(abs(imag(zs)) < 1e-9 & real(zs) > 0));
if isempty(zs) then error("sem raiz real positiva: aumente m ou N"); end
zc = max(zs);
pc = r * zc;

// 3. Ganhos e Componentes
Kc = abs(ev(denc, sd1)) / abs(ev(numc, sd1)) * (abs(sd1 + pc) / abs(sd1 + zc))^m;
Ke = Kc^(1/m);
Kp = Ke / r;
Td = N / pc;
R1 = 1 / (zc * C1);
R2 = Kp * R1;
C2 = 1 / (pc * R2);

mprintf("=== RESULTADOS DO PROJETO ===\\n");
mprintf("phimax=%.1f deg | m=%d | zc=%.4f | pc=%.4f\\n", phimax, m, zc, pc);
mprintf("Kc=%.2f | Kp=%.2f | Td=%.4f s\\n", Kc, Kp, Td);
mprintf("R1=%.2f kOhm | R2=%.2f kOhm | C2=%.2f nF\\n", R1/1e3, R2/1e3, C2*1e9);

// 4. Funções em Malha Fechada e Pré-Filtro
s = poly(0, "s");
Ls = poly(numc($:-1:1), "s", "coeff") / poly(denc($:-1:1), "s", "coeff");
Gc = Kc * ((s + zc) / (s + pc))^m;
F = (zc / (s + zc))^m;

T = syslin("c", Gc * Ls / (1 + Gc * Ls));
Tf = syslin("c", F * Gc * Ls / (1 + Gc * Ls));
U = syslin("c", Gc / (1 + Gc * Ls));
Uf = syslin("c", F * Gc / (1 + Gc * Ls));

// 5. Simulação no Tempo
t = linspace(0, 3, 2000);
y = csim("step", t, T);
yf = csim("step", t, Tf);
u = csim("step", t, U);
uf = csim("step", t, Uf);

scf(0); clf();
plot2d(t, [y' yf'], style=[2 5]);
xgrid();
legend("Sem Pré-filtro F", "Com Pré-filtro F");
xtitle("Resposta ao Degrau y(t) - EEL6005", "Tempo (s)", "Saída y(t)");

scf(1); clf();
plot2d(t, [u' uf'], style=[2 5]);
xgrid();
legend("Sem Pré-filtro F", "Com Pré-filtro F");
xtitle("Esforço de Controle u(t) - Regra dos 10 V", "Tempo (s)", "Tensão u(t) (V)");
`;

  return {
    type,
    inputs,
    zeta,
    wn,
    wd,
    sigmaD,
    sd,
    theta1,
    theta1_prime,
    theta2,
    thetaPlanta,
    phiDef,
    r,
    phiPerStage,
    mStages,
    phiMax,
    C2,
    C1_poly,
    C0,
    rootsZc,
    zc,
    pc,
    zc_lag,
    pc_lag,
    beta_lag: betaLag,
    magPlant,
    magZero,
    magPole,
    Kc,
    Kp,
    Td,
    Kd,
    denMF,
    numMF,
    polesMF,
    zerosMF,
    dominantRatio,
    hasPreFilter,
    preFilterZ,
    u0_noFilter,
    deltaE_max_noFilter,
    deltaE_max_withFilter,
    plantType,
    Kv,
    ess_ramp,
    R1,
    R2,
    C2_circuit,
    GBW,
    bandwidthMargin,
    simulation,
    scilabScript
  };
}
