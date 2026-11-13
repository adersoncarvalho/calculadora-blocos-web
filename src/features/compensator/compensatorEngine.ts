/**
 * Motor Matemático e Algorítmico para Projeto e Simulação de Compensadores no LGR
 * Modelos:
 * 1. Avanço de Fase (Lead / PD Real - Aula 18)
 * 2. Controlador PI para Erro Nulo ao Degrau (Aula 19 - EEL6005)
 * 3. Atraso de Fase (Lag / PI Real)
 * 4. Avanço-Atraso de Fase (Lead-Lag / PID Real)
 *
 * Em total conformidade com a metodologia didática da disciplina EEL6005 (Aulas 18 e 19).
 */

export type CompensatorType = 'lead' | 'pi' | 'lag' | 'lead-lag';
export type LeadCriterion = 'bissetriz' | 'cancelamento' | 'r_fixo' | 'erro_regime';

export interface PlantConfig {
  num: number[]; // Coeficientes do numerador em s (ordem decrescente, ex: [1])
  den: number[]; // Coeficientes do denominador em s (ordem decrescente, ex: [1, 3, 0] para s(s+3))
  label: string; // Ex: "1 / [s(s+3)]"
  poles?: number[]; // Polos conhecidos para determinação exata da singularidade lenta
  zeros?: number[]; // Zeros conhecidos
}

export interface CompensatorInputs {
  type: CompensatorType;
  leadCriterion?: LeadCriterion;
  Tp: number; // Tempo de pico desejado (s)
  PO: number; // Sobressinal percentual desejado (%)
  N: number;  // Fator de filtro do compensador (faixa usual 8-12, padrão 10)
  plant: PlantConfig;
  C1?: number; // Capacitor de entrada arbitrado para circuito com Amp-Op (padrão 10e-6 F)
  R1?: number; // Resistor R1 de entrada para o circuito PI (padrão 47k, 22k ou 10k)
  betaLag?: number; // Fator de melhoria de regime estático para Atraso/Lead-Lag (ex: 10)
  zLag?: number;    // Zero do atraso (ex: 0.05 rad/s)
  sdManual?: ComplexNumber; // Polo desejado manual (ex: -3.97 + j3.98 da Aula 19)
  forcedPhiDeg?: number; // Forçar orçamento de ângulo (ex: 5° ou 10° no PI)
}

export interface ComplexNumber {
  re: number;
  im: number;
}

export interface PIDetails {
  K0: number; // Ganho do P puro em sd
  Ka: number; // Ganho DC de malha aberta com P: K0 * G(0)
  eP: number; // Erro em regime do P puro ao degrau: 1 / (1 + Ka)
  phiBudgetDeg: number; // Orçamento de ângulo (5° ou 10°)
  betaDeg: number; // Ângulo entre o eixo real negativo e sd
  s_lenta: number; // Singularidade mais lenta da planta |s_lenta|
  zi_dipolo: number; // Limite do dipolo: |s_lenta| / 1.1
  zi_max: number; // Limite da lei dos senos: |sd| * sin(phi) / sin(beta + phi)
  zi_lim: number; // min(zi_max, zi_dipolo)
  limitingFactor: 'angulo' | 'dipolo'; // Quem limitou a escolha de zi
  phiRealDeg: number; // Perda de fase real com zi
  R1: number;
  R2: number;
  C: number;
  deltaE_max: number;
  polesP?: ComplexNumber[];
  polesPI?: ComplexNumber[];
  simPureP?: {
    t: number[];
    y: number[];
    Mp: number;
    tp: number;
    ts2pct: number;
    yFinal: number;
  };
  simPI?: {
    t: number[];
    y: number[];
    Mp: number;
    tp: number;
    ts2pct: number;
    yFinal: number;
  };
  simPI_F?: {
    t: number[];
    y: number[];
    Mp: number;
    tp: number;
    ts2pct: number;
    yFinal: number;
  };
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
  leadCriterion?: LeadCriterion;
  qBissetriz?: number;
  r: number; // r = N + 1 ou r = q^2 (Bissetriz)
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

  // Detalhes da Aula 19 (Controlador PI)
  piDetails?: PIDetails;

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
// FUNÇÕES AUXILIARES MATEMÁTICAS E POLINOMIAIS
// =============================================================================

export function polyMul(a: number[], b: number[]): number[] {
  const res = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      res[i + j] += a[i] * b[j];
    }
  }
  return res;
}

export function polyAdd(a: number[], b: number[]): number[] {
  const maxLen = Math.max(a.length, b.length);
  const aPadded = new Array(maxLen - a.length).fill(0).concat(a);
  const bPadded = new Array(maxLen - b.length).fill(0).concat(b);
  return aPadded.map((v, i) => v + bPadded[i]);
}

export function polyScale(p: number[], k: number): number[] {
  return p.map(v => v * k);
}

function evalPoly(coeffs: number[], s: ComplexNumber): ComplexNumber {
  // Horner para s complexo
  let res: ComplexNumber = { re: 0, im: 0 };
  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
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
  const b1 = b / a;
  const c1 = c / a;
  const d1 = d / a;

  const q = (3 * c1 - b1 * b1) / 9;
  const r = (9 * b1 * c1 - 27 * d1 - 2 * b1 * b1 * b1) / 54;
  const disc = q * q * q + r * r;

  const roots: ComplexNumber[] = [];

  if (disc > 0) {
    const s = Math.cbrt(r + Math.sqrt(disc));
    const t = Math.cbrt(r - Math.sqrt(disc));

    const realPart = -(s + t) / 2 - b1 / 3;
    const imagPart = (Math.sqrt(3) * (s - t)) / 2;

    roots.push({ re: s + t - b1 / 3, im: 0 });
    roots.push({ re: realPart, im: imagPart });
    roots.push({ re: realPart, im: -imagPart });
  } else {
    const theta = Math.acos(r / Math.sqrt(-q * q * q));
    const sqrtMinusQ = Math.sqrt(-q);

    roots.push({ re: 2 * sqrtMinusQ * Math.cos(theta / 3) - b1 / 3, im: 0 });
    roots.push({ re: 2 * sqrtMinusQ * Math.cos((theta + 2 * Math.PI) / 3) - b1 / 3, im: 0 });
    roots.push({ re: 2 * sqrtMinusQ * Math.cos((theta + 4 * Math.PI) / 3) - b1 / 3, im: 0 });
  }

  return roots;
}

function computeTs2Pct(t: number[], y: number[]): number {
  const yFinal = y[y.length - 1];
  if (Math.abs(yFinal) < 1e-6) return t[t.length - 1];
  const lower = 0.98 * yFinal;
  const upper = 1.02 * yFinal;
  let lastOutIdx = 0;
  for (let i = 0; i < y.length; i++) {
    if (y[i] < lower || y[i] > upper) {
      lastOutIdx = i;
    }
  }
  return t[lastOutIdx];
}

// Simulação LTI por Runge-Kutta 4 (RK4) para função de transferência
function simulateStepResponse(
  num: number[],
  den: number[],
  tMax: number = 4.0,
  steps: number = 1500
): { t: number[]; y: number[] } {
  const aLead = den[0];
  const a = den.map(v => v / aLead);
  const b = num.map(v => v / aLead);

  const n = a.length - 1;
  while (b.length <= n) {
    b.unshift(0);
  }

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

    const k1 = fState(x);
    const x2 = x.map((xi, idx) => xi + 0.5 * dt * k1[idx]);
    const k2 = fState(x2);
    const x3 = x.map((xi, idx) => xi + 0.5 * dt * k2[idx]);
    const k3 = fState(x3);
    const x4 = x.map((xi, idx) => xi + dt * k3[idx]);
    const k4 = fState(x4);

    for (let i = 0; i < n; i++) {
      x[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
    }
  }

  return { t: tArr, y: yArr };
}

// =============================================================================
// MOTOR PRINCIPAL DE CÁLCULO DE COMPENSADORES (AULAS 18 E 19)
// =============================================================================

export function calculateCompensator(inputs: CompensatorInputs): CompensatorResult {
  const { type, Tp, PO, N, plant } = inputs;
  const C1 = inputs.C1 || 10e-6; // 10 uF padrão
  const betaLag = inputs.betaLag || 10;

  // Determinação do Polo Desejado (sd = -sigmaD + j*wd)
  let zeta: number;
  let wn: number;
  let wd: number;
  let sigmaD: number;
  let sd: ComplexNumber;

  if (inputs.sdManual) {
    sd = inputs.sdManual;
    sigmaD = -sd.re;
    wd = sd.im;
    wn = Math.sqrt(sigmaD * sigmaD + wd * wd);
    zeta = sigmaD / wn;
  } else {
    const lnPO = Math.log(PO / 100);
    zeta = -lnPO / Math.sqrt(Math.PI * Math.PI + lnPO * lnPO);
    wn = Math.PI / (Tp * Math.sqrt(1 - zeta * zeta));
    wd = wn * Math.sqrt(1 - zeta * zeta);
    sigmaD = zeta * wn;
    sd = { re: -sigmaD, im: wd };
  }

  // Avaliação da Planta em sd
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

  // Ângulos individuais dos polos da planta
  const p1 = plant.poles && plant.poles.length > 0 ? plant.poles[0] : 0;
  const p2 = plant.poles && plant.poles.length > 1 ? plant.poles[1] : -3;
  const theta1 = (Math.atan2(wd, sd.re - p1) * 180) / Math.PI;
  const theta1_prime = 180 - theta1;
  const theta2 = (Math.atan2(wd, sd.re - p2) * 180) / Math.PI;
  const thetaPlanta = -(theta1 + theta2);

  let phiDef = -180 - thetaPlanta;
  while (phiDef <= 0) phiDef += 360;
  while (phiDef > 360) phiDef -= 360;

  // =========================================================================
  // MODELO ESPECÍFICO: CONTROLADOR PI PARA ERRO NULO AO DEGRAU (AULA 19)
  // =========================================================================
  if (type === 'pi') {
    // 1. Ganho K0 do P puro em sd
    const K0 = 1 / magPlant;

    // 2. Ganho DC da planta G(0)
    const num0 = plant.num[plant.num.length - 1];
    const den0 = plant.den[plant.den.length - 1];
    const G0 = den0 !== 0 ? num0 / den0 : 0;
    const Ka = K0 * G0;

    // Erro ao degrau do P puro
    const eP = 1 / (1 + Ka);

    // Orçamento de ângulo phi: 5° se eP <= 2%, senão 10°
    const phiBudgetDeg = inputs.forcedPhiDeg || (eP <= 0.02 ? 5 : 10);
    const phiRad = (phiBudgetDeg * Math.PI) / 180;

    // Ângulo beta (entre o eixo real negativo e sd)
    const betaDeg = (Math.atan2(wd, sigmaD) * 180) / Math.PI;
    const betaRad = (betaDeg * Math.PI) / 180;

    // Limite da Lei dos Senos: zi_max = |sd| * sin(phi) / sin(beta + phi)
    const magSd = complexMag(sd);
    const zi_max = (magSd * Math.sin(phiRad)) / Math.sin(betaRad + phiRad);

    // Singularidade mais lenta da planta
    let s_lenta = 1.0;
    if (plant.poles && plant.poles.length > 0) {
      const allSing = [...plant.poles, ...(plant.zeros || [])].filter(v => Math.abs(v) > 1e-4);
      s_lenta = Math.min(...allSing.map(Math.abs));
    } else {
      // Estima a partir de denc (se última raiz for não-nula)
      s_lenta = den0 !== 0 ? Math.min(Math.abs(den0), 1.0) : 1.0;
    }

    const zi_dipolo = s_lenta / 1.1;
    const zi_lim = Math.min(zi_max, zi_dipolo);
    const limitingFactor: 'angulo' | 'dipolo' = zi_max <= zi_dipolo ? 'angulo' : 'dipolo';

    // Zero do controlador PI
    const zc = zi_lim;
    const pc = 0; // Polo na origem para ação integral pura

    // Perda real de fase
    const argSd = Math.atan2(wd, -sigmaD) * (180 / Math.PI);
    const argSdZi = Math.atan2(wd, zc - sigmaD) * (180 / Math.PI);
    const phiRealDeg = Math.abs(argSd - argSdZi);

    // Ganho Kc pela condição de módulo: Kc = K0 * |sd| / |sd + zi|
    const sdPlusZi: ComplexNumber = { re: -sigmaD + zc, im: wd };
    const magSdPlusZi = complexMag(sdPlusZi);
    const Kc = K0 * (magSd / magSdPlusZi);

    // Componentes analógicos (com R1, padrão 47k ou 22k)
    const R1_circ = inputs.R1 || (limitingFactor === 'dipolo' ? 22e3 : 47e3);
    const R2_circ = Kc * R1_circ;
    const C_circ = 1 / (zc * R2_circ);
    const deltaE_max = 10 / Kc;

    // Polinômios de Malha Fechada com PI:
    // D_MF(s) = s*D(s) + Kc*(s + zi)*N(s)
    const sD = polyMul(plant.den, [1, 0]);
    const Kc_N_sPlusZi = polyScale(polyMul(plant.num, [1, zc]), Kc);
    const denMF = polyAdd(sD, Kc_N_sPlusZi);
    const numMF = Kc_N_sPlusZi;
    const numMFFilter = polyScale(plant.num, Kc * zc);

    // Polinômios de Malha Fechada com P Puro:
    // D_P(s) = D(s) + K0*N(s)
    const denP = polyAdd(plant.den, polyScale(plant.num, K0));
    const numP = polyScale(plant.num, K0);

    // Simulações
    const tMaxSim = 6.0;
    const simP = simulateStepResponse(numP, denP, tMaxSim, 2000);
    const simPI_noF = simulateStepResponse(numMF, denMF, tMaxSim, 2000);
    const simPI_withF = simulateStepResponse(numMFFilter, denMF, tMaxSim, 2000);

    // Esforço de controle U(s)
    const numU_noF = polyMul(polyScale(plant.den, Kc), [1, zc]);
    const simU_noF = simulateStepResponse(numU_noF, denMF, 2.0, 1500);
    const numU_withF = polyScale(plant.den, Kc * zc);
    const simU_withF = simulateStepResponse(numU_withF, denMF, 2.0, 1500);

    // Métricas
    const maxP = Math.max(...simP.y);
    const yFinP = simP.y[simP.y.length - 1];
    const MpP = Math.max(0, ((maxP - yFinP) / yFinP) * 100);
    const tpP = simP.t[simP.y.indexOf(maxP)];
    const ts2P = computeTs2Pct(simP.t, simP.y);

    const maxPI = Math.max(...simPI_noF.y);
    const yFinPI = simPI_noF.y[simPI_noF.y.length - 1];
    const MpPI = Math.max(0, ((maxPI - yFinPI) / yFinPI) * 100);
    const tpPI = simPI_noF.t[simPI_noF.y.indexOf(maxPI)];
    const ts2PI = computeTs2Pct(simPI_noF.t, simPI_noF.y);

    const maxPI_F = Math.max(...simPI_withF.y);
    const yFinPI_F = simPI_withF.y[simPI_withF.y.length - 1];
    const MpPI_F = Math.max(0, ((maxPI_F - yFinPI_F) / yFinPI_F) * 100);
    const tpPI_F = simPI_withF.t[simPI_withF.y.indexOf(maxPI_F)];
    const ts2PI_F = computeTs2Pct(simPI_withF.t, simPI_withF.y);

    const piDetails: PIDetails = {
      K0,
      Ka,
      eP,
      phiBudgetDeg,
      betaDeg,
      s_lenta,
      zi_dipolo,
      zi_max,
      zi_lim,
      limitingFactor,
      phiRealDeg,
      R1: R1_circ,
      R2: R2_circ,
      C: C_circ,
      deltaE_max,
      simPureP: { t: simP.t, y: simP.y, Mp: MpP, tp: tpP, ts2pct: ts2P, yFinal: yFinP },
      simPI: { t: simPI_noF.t, y: simPI_noF.y, Mp: MpPI, tp: tpPI, ts2pct: ts2PI, yFinal: yFinPI },
      simPI_F: { t: simPI_withF.t, y: simPI_withF.y, Mp: MpPI_F, tp: tpPI_F, ts2pct: ts2PI_F, yFinal: yFinPI_F }
    };

    const scilabScript = `// ============================================================
//  Projeto de Controlador PI para Erro Nulo ao Degrau - Aula 19
//  Planta: ${plant.label} | sd = -${sigmaD.toFixed(2)} + ${wd.toFixed(2)}*%i
//  Gerado Automaticamente pela Calculadora de Controle EEL6005
// ============================================================
clear; clc; xdel(winsid());

s = poly(0, "s");
N = ${plant.num.length === 1 ? plant.num[0] : 'poly([' + plant.num.slice().reverse().join(' ') + '], "s", "coeff")'};
D = poly([${plant.den.slice().reverse().join(' ')}], "s", "coeff");

sd = -${sigmaD.toFixed(3)} + ${wd.toFixed(3)}*%i;
R1 = ${R1_circ};

// Passo 0: Triagem
pz = roots(D); zz = roots(N);
if min(abs(pz)) < 1e-9 then error("Planta ja e tipo 1 ou 2: erro ao degrau ja e nulo"); end
if or(real(zz) > 0) then error("Zero no semiplano direito: analise a parte"); end

sl = ${s_lenta.toFixed(4)}; // singularidade mais lenta
K0 = abs(horner(D, sd) / horner(N, sd)); // P em sd
Ka = K0 * horner(N, 0) / horner(D, 0);
eP = 1 / (1 + Ka); // erro do P puro

// Passo 1 & 2: Orçamento de Ângulo e Lei dos Senos
phi = ${phiBudgetDeg};
beta = acos(-real(sd) / abs(sd));
ph = phi * %pi / 180;
zmax = abs(sd) * sin(ph) / sin(beta + ph);
zi = min(zmax, sl / 1.1);

// Passo 3: Ganho Kc e Componentes
lag = (atan(imag(sd), real(sd)) - atan(imag(sd + zi), real(sd + zi))) * 180 / %pi;
Kc = K0 * abs(sd) / abs(sd + zi);
R2 = Kc * R1;
C = 1 / (zi * R2);

LP = K0 * N / D;
LI = Kc * (s + zi) / s * N / D;
t = linspace(0, 10, 10000);
yP = csim("step", t, syslin("c", LP / (1 + LP)));
yI = csim("step", t, syslin("c", LI / (1 + LI)));

mprintf("eP=%.3f | phi=%d deg | zmax=%.3f | zi=%.4f | lag=%.1f deg | Kc=%.2f\\n", eP, phi, zmax, zi, lag, Kc);
mprintf("R1=%.0f kOhm | R2=%.0f kOhm | C=%.2f uF\\n", R1/1e3, R2/1e3, C*1e6);

scf(0); clf();
plot(t, yP, t, yI);
xgrid();
legend(["Puro P", "Com Controlador PI"]);
xtitle("Resposta ao Degrau - Aula 19", "Tempo (s)", "Saida y(t)");
`;

    return {
      type: 'pi',
      inputs,
      zeta,
      wn,
      wd,
      sigmaD,
      sd,
      theta1: 0,
      theta1_prime: betaDeg,
      theta2: 0,
      thetaPlanta: -180 + phiBudgetDeg,
      phiDef: phiBudgetDeg,
      r: 1,
      phiPerStage: phiBudgetDeg,
      mStages: 1,
      phiMax: phiBudgetDeg,
      C2: 0,
      C1_poly: 0,
      C0: 0,
      rootsZc: [zc],
      zc,
      pc: 0,
      piDetails,
      magPlant,
      magZero: magSdPlusZi,
      magPole: magSd,
      Kc,
      Kp: Kc,
      Td: 1 / zc,
      Kd: 0,
      denMF,
      numMF,
      polesMF: solveCubic(denMF[0], denMF[1], denMF[2], denMF[3] || 0),
      zerosMF: [-zc],
      dominantRatio: 1,
      hasPreFilter: true,
      preFilterZ: zc,
      u0_noFilter: Kc,
      deltaE_max_noFilter: deltaE_max,
      deltaE_max_withFilter: deltaE_max * 12.3,
      plantType: 0,
      Kv: Ka,
      ess_ramp: 1 / Ka,
      R1: R1_circ,
      R2: R2_circ,
      C2_circuit: C_circ,
      GBW: 1e6,
      bandwidthMargin: 10,
      simulation: {
        t: simPI_noF.t,
        y_noFilter: simPI_noF.y,
        y_withFilter: simPI_withF.y,
        u_noFilter: simU_noF.y,
        u_withFilter: simU_withF.y,
        Mp_noFilter: MpPI,
        tp_noFilter: tpPI,
        Mp_withFilter: MpPI_F,
        tp_withFilter: tpPI_F,
        uMax_noFilter: Math.max(...simU_noF.y.map(Math.abs)),
        uMax_withFilter: Math.max(...simU_withF.y.map(Math.abs))
      },
      scilabScript
    };
  }

  // =========================================================================
  // MODELO: AVANÇO DE FASE / LEAD / PD REAL (AULAS 18 E 20)
  // =========================================================================
  const leadCriterion: LeadCriterion = inputs.leadCriterion || 'r_fixo';
  let r: number;
  let phiMax = 0;
  let mStages = 1;
  let phiPerStage = phiDef;
  let C2 = 0;
  let C1_poly = 0;
  let C0 = sigmaD * sigmaD + wd * wd;
  let rootsZc: number[] = [];
  let zc = 0;
  let pc = 0;
  let qBissetriz: number | undefined;

  if (leadCriterion === 'bissetriz') {
    // AULA 20: CRITÉRIO DA BISSETRIZ (MENOR r, MENOR Kc E MENOR CHUTE INICIAL)
    const sq = Math.sqrt(1 - zeta * zeta);
    const phiRad = (phiDef * Math.PI) / 180;
    const sinPhi = Math.sin(phiRad);
    const tanPhi = Math.tan(phiRad);
    qBissetriz = (1 + sq / sinPhi) / (zeta + sq / tanPhi);
    r = qBissetriz * qBissetriz;
    const magSd = Math.sqrt(sigmaD * sigmaD + wd * wd);
    zc = magSd / qBissetriz;
    pc = magSd * qBissetriz;
    rootsZc = [zc];
    mStages = 1;
    phiPerStage = phiDef;
    phiMax = phiDef;
    C2 = r;
    C1_poly = -(sigmaD * (r + 1));
  } else if (leadCriterion === 'cancelamento') {
    // AULA 20: CANCELAMENTO DE POLO REAL DA PLANTA
    let plantPoleReal = 3.0;
    if (plant.poles && plant.poles.length > 0) {
      const realPoles = plant.poles.filter(p => p < 0);
      if (realPoles.length > 0) plantPoleReal = Math.abs(realPoles[0]);
    }
    zc = plantPoleReal;
    const thetaZRad = Math.atan2(wd, sd.re + zc);
    const thetaZDeg = (thetaZRad * 180) / Math.PI;
    const thetaPDeg = thetaZDeg - phiDef;
    const thetaPRad = (thetaPDeg * Math.PI) / 180;
    pc = sigmaD + wd / Math.tan(thetaPRad);
    r = pc / zc;
    rootsZc = [zc];
    mStages = 1;
    phiPerStage = phiDef;
    phiMax = phiDef;
    C2 = r;
    C1_poly = -(sigmaD * (r + 1));
  } else {
    // AULA 18: RAZÃO r = N + 1 FIXA (PD REAL CLÁSSICO)
    r = N + 1;
    const cotm = (2 * Math.sqrt(r) - zeta * (r + 1)) / (Math.sqrt(1 - zeta * zeta) * (r - 1));
    phiMax = (Math.atan2(1, cotm) * 180) / Math.PI;

    mStages = Math.ceil(phiDef / (0.95 * phiMax));
    if (mStages < 1) mStages = 1;

    phiPerStage = phiDef / mStages;
    const phiRad = (phiPerStage * Math.PI) / 180;
    const cotPhi = 1 / Math.tan(phiRad);

    C2 = r;
    C1_poly = -(sigmaD * (r + 1) + wd * (r - 1) * cotPhi);
    C0 = sigmaD * sigmaD + wd * wd;

    const delta = C1_poly * C1_poly - 4 * C2 * C0;
    if (delta >= 0) {
      const z1 = (-C1_poly + Math.sqrt(delta)) / (2 * C2);
      const z2 = (-C1_poly - Math.sqrt(delta)) / (2 * C2);
      rootsZc = [z1, z2].sort((a, b) => b - a);
    } else {
      const zCrit = -C1_poly / (2 * C2);
      rootsZc = [zCrit, zCrit];
    }

    zc = rootsZc[0];
    pc = r * zc;
  }

  let zc_lag: number | undefined;
  let pc_lag: number | undefined;
  if (type === 'lag' || type === 'lead-lag') {
    zc_lag = inputs.zLag || 0.05;
    pc_lag = zc_lag / betaLag;
  }

  const zcVec: ComplexNumber = { re: sd.re + zc, im: sd.im };
  const pcVec: ComplexNumber = { re: sd.re + pc, im: sd.im };
  const magZero = complexMag(zcVec);
  const magPole = complexMag(pcVec);

  const Kc = (1 / magPlant) * Math.pow(magPole / magZero, mStages);
  const Ke = Math.pow(Kc, 1 / mStages);
  const Kp = Ke / r;
  const Td = N / pc;
  const Kd = Kp * Td;

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

  const realPoles = polesMF.filter(p => Math.abs(p.im) < 1e-4).map(p => p.re);
  const fastRealPole = realPoles.length > 0 ? Math.min(...realPoles) : -pc;
  const dominantRatio = Math.abs(fastRealPole) / sigmaD;

  const hasPreFilter = true;
  const preFilterZ = zc;

  const u0_noFilter = Kc;
  const deltaE_max_noFilter = 10 / Kc;
  const deltaE_max_withFilter = 10 / (Kc / 12.3);

  const plantType = 1;
  const Kv = Kp / 3;
  const ess_ramp = 1 / Kv;

  const R1 = 1 / (zc * C1);
  const R2 = Kp * R1;
  const C2_circuit = 1 / (pc * R2);
  const GBW = 1e6;
  const bandwidthMargin = (GBW / (1 + Kc)) / (pc / (2 * Math.PI));

  const simNoF = simulateStepResponse(numMF, denMF, 3.0, 1500);
  const numMFFilter = [Kc * zc];
  const simWithF = simulateStepResponse(numMFFilter, denMF, 3.0, 1500);

  const numU_noF = [Kc, Kc * (zc + 3), 3 * Kc * zc, 0];
  const simU_noF = simulateStepResponse(numU_noF, denMF, 1.5, 1500);

  const numU_withF = [0, Kc * zc, 3 * Kc * zc, 0];
  const simU_withF = simulateStepResponse(numU_withF, denMF, 1.5, 1500);

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

  let scilabScript = '';
  if (leadCriterion === 'bissetriz') {
    scilabScript = `// ============================================================
// Projeto de Compensador por Avanço de Fase (Bissetriz) — Aula 20
// Gc(s) = Kc*(s+zc)/(s+pc), com r = pc/zc = q^2
// ============================================================
deff("y=ev(c,x)","y=sum(c.*x.^(length(c)-1:-1:0))");
numc = [${plant.num.join(' ')}];
denc = [${plant.den.join(' ')}];
sd = -${sigmaD.toFixed(4)} + ${wd.toFixed(4)}*%i;
m = 1;
C1 = ${C1};

Lsd = ev(numc, sd) / ev(denc, sd);
ang = atan(imag(Lsd), real(Lsd)) * 180 / %pi;
th = pmodulo(-ang, 360) - 180;
phi = th / m * %pi / 180;
zeta = -real(sd) / abs(sd);
sq = sqrt(1 - zeta^2);

// Passo da Bissetriz (formula analitica fechada)
q = (1 + sq / sin(phi)) / (zeta + sq / tan(phi));
zc = abs(sd) / q;
pc = abs(sd) * q;
r = q^2;

Kc = abs(ev(denc, sd)) / abs(ev(numc, sd)) * (abs(sd + pc) / abs(sd + zc))^m;
Ke = Kc^(1/m);
Kp = Ke / r;

R1 = 1 / (zc * C1);
R2 = Kp * R1;
C2 = 1 / (pc * R2);

mprintf("zc=%.3f pc=%.3f r=%.3f Kc=%.2f Kp=%.2f\\n", zc, pc, r, Kc, Kp);
mprintf("R1=%.1fk R2=%.1fk C2=%.1fnF\\n", R1/1e3, R2/1e3, C2*1e9);

s = poly(0, "s");
Ls = poly(numc($:-1:1), "s", "coeff") / poly(denc($:-1:1), "s", "coeff");
Gc = Kc * (s + zc) / (s + pc);

T = syslin("c", Gc * Ls / (1 + Gc * Ls));
t = linspace(0, 6, 3000);
y = csim("step", t, T);

scf(0); clf();
plot2d(t, y', style=2);
xgrid();
xtitle("Resposta ao Degrau - Avanço por Bissetriz (Aula 20)", "Tempo (s)", "Saida y(t)");
`;
  } else {
    scilabScript = `// ============================================================
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
phi = th / m * %pi / 180;

c = [r, -(a*(r + 1) + b*(r - 1) / tan(phi)), a^2 + b^2];
zs = roots(poly(c($:-1:1), "x", "coeff"));
zs = real(zs(abs(imag(zs)) < 1e-9 & real(zs) > 0));
zc = max(zs);
pc = r * zc;

Kc = abs(ev(denc, sd1)) / abs(ev(numc, sd1)) * (abs(sd1 + pc) / abs(sd1 + zc))^m;
Ke = Kc^(1/m);
Kp = Ke / r;
Td = N / pc;

R1 = 1 / (zc * C1);
R2 = Kp * R1;
C2 = 1 / (pc * R2);

mprintf("Kc=%.2f | zc=%.4f | pc=%.4f | Kp=%.2f | Td=%.4f s\\n", Kc, zc, pc, Kp, Td);
mprintf("R1=%.1f kOhm | R2=%.1f kOhm | C2=%.1f nF\\n", R1/1e3, R2/1e3, C2*1e9);

s = poly(0, "s");
Ls = poly(numc($:-1:1), "s", "coeff") / poly(denc($:-1:1), "s", "coeff");
Gc = Kc * ((s + zc) / (s + pc))^m;
F = (zc / (s + zc))^m;

T = syslin("c", Gc * Ls / (1 + Gc * Ls));
Tf = syslin("c", F * Gc * Ls / (1 + Gc * Ls));
t = linspace(0, 6, 3000);
y = csim("step", t, T);
yf = csim("step", t, Tf);

scf(0); clf();
plot2d(t, [y' yf'], style=[2 5]);
xgrid();
legend(["Sem pre-filtro F(s)", "Com pre-filtro F(s)"]);
xtitle("Resposta ao Degrau - Aula 18", "Tempo (s)", "Saida y(t)");
`;
  }

  return {
    type,
    leadCriterion,
    qBissetriz,
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
