'use client';

import React, { useMemo, useRef, useState } from 'react';
import { parseRatExpr } from '@/core/algebra/parser';
import { toUnivariateArr, trimUni } from '@/core/algebra/polynomial';
import { ratMul, RatFunc } from '@/core/algebra/rational';
import { computeRootsPoly, ComplexNumber } from '@/core/analysis/stability';
import { MathView } from '@/components/MathView';
import { InteractiveTimeChart, ChartSeries } from '@/components/InteractiveTimeChart';
import { SPlaneChart } from '@/components/SPlaneChart';
import {
  buildClosedLoopTf,
  buildControlEffortTf,
  simulateInputResponseRK4,
  simulateClosedLoopWithSaturationRK4
} from './controllersData';
import { ControllerBlockDiagram } from './ControllerBlockDiagram';
import { OpAmpCircuitDiagram } from './OpAmpCircuitDiagram';
import { printElementAsPdf } from '@/utils/printMemorial';

type DesignerMode = 'Auto' | 'P' | 'PD' | 'PI' | 'Lead' | 'Lag' | 'LeadLag' | 'PD_PI';
type SpecMode = 'sd' | 'mpts';
type InputKind = 'step' | 'ramp';
type LeadCriterion = 'bissetriz' | 'rfixed';

interface MemorialStep {
  title: string;
  description: string;
  latex: string;
}

interface DesignerResult {
  chosenType: 'P' | 'PD' | 'PI' | 'Lead' | 'Lag' | 'LeadLag' | 'PD_PI';
  reason: string;
  systemType: number;
  order: number;
  sd: { re: number; im: number };
  zeta: number;
  thetaDefDeg: number;
  plantLatex: string;
  controllerExpr: string;
  controllerLatex: string;
  prefilterZc: number | null;
  steps: MemorialStep[];
  scilabCode: string;
  tMax: number;
}

function renderRichMathText(text: string): React.ReactNode {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <MathView key={`rm-${idx}`} math={part.slice(1, -1)} inline />;
    }
    return <React.Fragment key={`rt-${idx}`}>{part}</React.Fragment>;
  });
}

const fmtPt = (v: number, digits = 3): string => {
  if (!Number.isFinite(v)) return '0';
  const rounded = Number(v.toFixed(digits));
  const s = rounded.toFixed(digits).replace(/\.?0+$/, '');
  return s.replace('.', '{,}');
};

const fmtNum = (v: number, digits = 4): string => {
  if (!Number.isFinite(v)) return '0';
  return Number(v.toFixed(digits)).toString();
};

function evalPolyComplex(coeffs: number[], s: ComplexNumber): ComplexNumber {
  let re = 0;
  let im = 0;
  let pRe = 1;
  let pIm = 0;
  for (let i = 0; i < coeffs.length; i++) {
    re += coeffs[i] * pRe;
    im += coeffs[i] * pIm;
    const nextRe = pRe * s.re - pIm * s.im;
    const nextIm = pRe * s.im + pIm * s.re;
    pRe = nextRe;
    pIm = nextIm;
  }
  return { re, im };
}

function complexDiv(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  const denom = b.re * b.re + b.im * b.im;
  if (denom < 1e-18) return { re: 0, im: 0 };
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom
  };
}

function complexAbs(z: ComplexNumber): number {
  return Math.hypot(z.re, z.im);
}

function complexArgDeg(z: ComplexNumber): number {
  let deg = (Math.atan2(z.im, z.re) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function formatPolyLatex(coeffs: number[]): string {
  const deg = coeffs.length - 1;
  if (deg < 0) return '0';
  const terms: string[] = [];
  for (let i = deg; i >= 0; i--) {
    const c = coeffs[i];
    if (Math.abs(c) < 1e-9) continue;
    const sign = c < 0 ? '-' : terms.length > 0 ? '+' : '';
    const absC = Math.abs(c);
    const coeffStr =
      i === 0
        ? fmtPt(absC, 3)
        : Math.abs(absC - 1) < 1e-6
        ? ''
        : fmtPt(absC, 3);
    const varStr = i === 0 ? '' : i === 1 ? 's' : `s^{${i}}`;
    terms.push(`${sign}${coeffStr}${varStr}`);
  }
  return terms.length > 0 ? terms.join(' ') : '0';
}

function formatFactorList(roots: ComplexNumber[]): string {
  if (roots.length === 0) return '1';
  const parts: string[] = [];
  for (let i = 0; i < roots.length; i++) {
    const r = roots[i];
    if (Math.abs(r.im) < 1e-4) {
      if (Math.abs(r.re) < 1e-4) {
        parts.push('s');
      } else {
        const val = -r.re;
        parts.push(val >= 0 ? `(s + ${fmtPt(val, 3)})` : `(s - ${fmtPt(-val, 3)})`);
      }
    } else if (r.im > 0) {
      const b = -2 * r.re;
      const c = r.re * r.re + r.im * r.im;
      parts.push(`(s^2 ${b >= 0 ? '+' : '-'} ${fmtPt(Math.abs(b), 3)}s + ${fmtPt(c, 3)})`);
      // pula conjugado
      if (i + 1 < roots.length && Math.abs(roots[i + 1].re - r.re) < 1e-3 && Math.abs(roots[i + 1].im + r.im) < 1e-3) {
        i++;
      }
    }
  }
  return parts.join('');
}

function buildLiteralMagnitudeStep(
  label: string,
  gainK: number,
  zeros: ComplexNumber[],
  poles: ComplexNumber[],
  sd: ComplexNumber,
  extraZero?: number,
  extraPole?: number
): { latex: string; value: number } {
  const allZeros = [...zeros, ...(extraZero !== undefined ? [{ re: -extraZero, im: 0 }] : [])];
  const allPoles = [...poles, ...(extraPole !== undefined ? [{ re: -extraPole, im: 0 }] : [])];

  const fmtSdShift = (r: ComplexNumber) => {
    const dRe = sd.re - r.re;
    const dIm = sd.im - r.im;
    const imPart = dIm >= 0 ? `+ j${fmtPt(dIm, 3)}` : `- j${fmtPt(-dIm, 3)}`;
    return `${fmtPt(dRe, 3)} ${imPart}`;
  };

  const fmtRootSq = (r: ComplexNumber) => {
    const dRe = sd.re - r.re;
    const dIm = sd.im - r.im;
    const reStr = dRe < 0 ? `(${fmtPt(dRe, 3)})^2` : `${fmtPt(dRe, 3)}^2`;
    const imStr = dIm < 0 ? `(${fmtPt(dIm, 3)})^2` : `${fmtPt(dIm, 3)}^2`;
    return `\\sqrt{${reStr} + ${imStr}}`;
  };

  const fmtRootSum = (r: ComplexNumber) => {
    const dRe = sd.re - r.re;
    const dIm = sd.im - r.im;
    return `\\sqrt{${fmtPt(dRe * dRe, 3)} + ${fmtPt(dIm * dIm, 3)}}`;
  };

  const fmtRootVal = (r: ComplexNumber) => {
    const dRe = sd.re - r.re;
    const dIm = sd.im - r.im;
    return `\\sqrt{${fmtPt(dRe * dRe + dIm * dIm, 3)}}`;
  };

  const gainStr = Math.abs(gainK - 1) < 1e-6 ? '' : `${fmtPt(Math.abs(gainK), 3)}\\cdot `;
  const numMod = allZeros.length > 0 ? gainStr + allZeros.map(z => `|${fmtSdShift(z)}|`).join('\\cdot ') : fmtPt(Math.abs(gainK), 3);
  const denMod = allPoles.length > 0 ? allPoles.map(p => `|${fmtSdShift(p)}|`).join('\\cdot ') : '1';

  const numSq = allZeros.length > 0 ? gainStr + allZeros.map(fmtRootSq).join('\\cdot ') : fmtPt(Math.abs(gainK), 3);
  const denSq = allPoles.length > 0 ? allPoles.map(fmtRootSq).join('\\cdot ') : '1';

  const numSum = allZeros.length > 0 ? gainStr + allZeros.map(fmtRootSum).join('\\cdot ') : fmtPt(Math.abs(gainK), 3);
  const denSum = allPoles.length > 0 ? allPoles.map(fmtRootSum).join('\\cdot ') : '1';

  const numRad = allZeros.length > 0 ? gainStr + allZeros.map(fmtRootVal).join('\\cdot ') : fmtPt(Math.abs(gainK), 3);
  const denRad = allPoles.length > 0 ? allPoles.map(fmtRootVal).join('\\cdot ') : '1';

  const numProdVal =
    Math.abs(gainK) * allZeros.reduce((acc, z) => acc * Math.hypot(sd.re - z.re, sd.im - z.im), 1);
  const denProdVal =
    allPoles.reduce((acc, p) => acc * Math.hypot(sd.re - p.re, sd.im - p.im), 1);

  const ratio = numProdVal / denProdVal;
  const Kval = 1 / ratio;

  const latex =
    `${label} = \\frac{1}{\\frac{${numMod}}{${denMod}}} = \\frac{1}{\\frac{${numSq}}{${denSq}}} \\;;\\; ` +
    `${label} = \\frac{1}{\\frac{${numSum}}{${denSum}}} = \\frac{1}{\\frac{${numRad}}{${denRad}}} = \\frac{1}{\\frac{${fmtPt(numProdVal, 3)}}{${fmtPt(denProdVal, 3)}}} = \\frac{1}{${fmtPt(ratio, 5)}} \\approx \\mathbf{${fmtPt(Kval, 3)}}`;

  return { latex, value: Kval };
}

function renderStackedMath(latex: string): React.ReactNode {
  const lines = latex
    .split(/\\qquad;\s*\\qquad|\\quad;\s*\\quad|\\;;\\;|\\;\s*;\s*\\;|\s+;\s+/g)
    .map(s => s.trim())
    .filter(Boolean);
  if (lines.length <= 1) {
    return (
      <div className="stacked-math-line">
        <MathView math={latex} block />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', width: '100%' }}>
      {lines.map((line, i) => (
        <div key={`dm-line-${i}`} className="stacked-math-line">
          <MathView math={line} block />
        </div>
      ))}
    </div>
  );
}

const PRESETS = [
  {
    name: 'Tipo 0 • Atraso (Slide 13)',
    plantExpr: '1/((s+1)*(s+5))',
    specMode: 'sd' as SpecMode,
    sigma: '3',
    omega: '3',
    mp: '5',
    ts: '1.33',
    inputKind: 'step' as InputKind,
    essReq: '5',
    mode: 'Lag' as DesignerMode
  },
  {
    name: 'Tipo 1 • Regra da Cauda (Slide 15)',
    plantExpr: '1/(s*(s+4))',
    specMode: 'sd' as SpecMode,
    sigma: '2',
    omega: '2',
    mp: '5',
    ts: '2',
    inputKind: 'ramp' as InputKind,
    essReq: '10',
    mode: 'Lag' as DesignerMode
  },
  {
    name: 'PD Real • Avanço (N = 10)',
    plantExpr: '1/(s*(s+2))',
    specMode: 'sd' as SpecMode,
    sigma: '3',
    omega: '3',
    mp: '5',
    ts: '1.33',
    inputKind: 'step' as InputKind,
    essReq: '0',
    mode: 'PD' as DesignerMode
  },
  {
    name: 'Avanço • Bissetriz',
    plantExpr: '1/(s*(s+2))',
    specMode: 'sd' as SpecMode,
    sigma: '2',
    omega: '2',
    mp: '5',
    ts: '2',
    inputKind: 'step' as InputKind,
    essReq: '0',
    mode: 'Lead' as DesignerMode
  },
  {
    name: 'Tipo 0 • PI Erro Nulo',
    plantExpr: '1/((s+1)*(s+5))',
    specMode: 'sd' as SpecMode,
    sigma: '3',
    omega: '3',
    mp: '5',
    ts: '1.33',
    inputKind: 'step' as InputKind,
    essReq: '0',
    mode: 'PI' as DesignerMode
  }
];

export const PlantDesignerView: React.FC = () => {
  const [plantExpr, setPlantExpr] = useState('1/((s+1)*(s+5))');
  const [specMode, setSpecMode] = useState<SpecMode>('sd');
  const [sigmaStr, setSigmaStr] = useState('3');
  const [omegaStr, setOmegaStr] = useState('3');
  const [mpStr, setMpStr] = useState('5');
  const [tsStr, setTsStr] = useState('1.33');
  const [inputKind, setInputKind] = useState<InputKind>('step');
  const [essReqStr, setEssReqStr] = useState('5');
  const [mode, setMode] = useState<DesignerMode>('Auto');
  const [pdNStr, setPdNStr] = useState('10');
  const [leadCrit, setLeadCrit] = useState<LeadCriterion>('bissetriz');
  const [subTab, setSubTab] = useState<'memorial' | 'graficos' | 'scilab'>('memorial');
  const [usePrefilter, setUsePrefilter] = useState<boolean>(false);
  const [useSaturation, setUseSaturation] = useState<boolean>(false);
  const [copiedScilab, setCopiedScilab] = useState<boolean>(false);
  const memorialRef = useRef<HTMLDivElement | null>(null);

  const design = useMemo<{ result: DesignerResult | null; error: string | null }>(() => {
    try {
      const G = parseRatExpr(plantExpr);
      const numG = trimUni(toUnivariateArr(G.num));
      const denG = trimUni(toUnivariateArr(G.den));
      if (denG.length < 2 || numG.length === 0) {
        return { result: null, error: 'Informe uma planta G(s) válida com polo em s (ex.: 1/((s+1)*(s+5))).' };
      }

      const poles = computeRootsPoly(denG);
      const zeros = numG.length > 1 ? computeRootsPoly(numG) : [];
      const leadGain = numG[numG.length - 1] / denG[denG.length - 1];
      const order = denG.length - 1;
      const systemType = poles.filter(p => Math.hypot(p.re, p.im) < 1e-4).length;

      // Calcula sd = -sigma + j*omega
      let sigma = Number(sigmaStr.replace(',', '.'));
      let omega = Number(omegaStr.replace(',', '.'));
      let zeta = 0.707;
      let specStepLatex = '';

      if (specMode === 'mpts') {
        const mpPct = Number(mpStr.replace(',', '.'));
        const tsVal = Number(tsStr.replace(',', '.'));
        if (!(mpPct > 0 && mpPct < 100 && tsVal > 0)) {
          return { result: null, error: 'Informe Mp (%) entre 0 e 100 e ts > 0.' };
        }
        const lnMp = Math.log(mpPct / 100);
        zeta = -lnMp / Math.sqrt(Math.PI * Math.PI + lnMp * lnMp);
        sigma = 4 / tsVal;
        omega = sigma * (Math.sqrt(1 - zeta * zeta) / zeta);
        specStepLatex =
          `\\zeta = \\frac{-\\ln(${fmtPt(mpPct / 100, 3)})}{\\sqrt{\\pi^2 + \\ln^2(${fmtPt(mpPct / 100, 3)})}} = ${fmtPt(zeta, 3)} \\;;\\; ` +
          `\\sigma_d = \\frac{4}{t_s} = \\frac{4}{${fmtPt(tsVal, 2)}} = ${fmtPt(sigma, 3)} \\;;\\; ` +
          `\\omega_d = \\sigma_d\\frac{\\sqrt{1-\\zeta^2}}{\\zeta} = ${fmtPt(omega, 3)} \\implies \\mathbf{s_d = -${fmtPt(sigma, 3)} + j${fmtPt(omega, 3)}}`;
      } else {
        if (!(sigma > 0 && omega > 0)) {
          return { result: null, error: 'Informe σd > 0 e ωd > 0 para o polo desejado sd = -σd + jωd.' };
        }
        zeta = sigma / Math.hypot(sigma, omega);
        specStepLatex = `s_d = -\\sigma_d + j\\omega_d = \\mathbf{-${fmtPt(sigma, 3)} + j${fmtPt(omega, 3)}} \\;;\\; \\zeta = \\frac{\\sigma_d}{\\sqrt{\\sigma_d^2+\\omega_d^2}} = ${fmtPt(zeta, 3)}`;
      }

      const sd: ComplexNumber = { re: -sigma, im: omega };

      // Condição de ângulo em sd
      const zeroAngles = zeros.map(z => complexArgDeg({ re: sd.re - z.re, im: sd.im - z.im }));
      const poleAngles = poles.map(p => complexArgDeg({ re: sd.re - p.re, im: sd.im - p.im }));
      const sumZeros = zeroAngles.reduce((a, b) => a + b, 0);
      const sumPoles = poleAngles.reduce((a, b) => a + b, 0);
      let angleG = sumZeros - sumPoles;
      while (angleG > 180) angleG -= 360;
      while (angleG <= -180) angleG += 360;

      let thetaDef = -180 - angleG;
      while (thetaDef > 180) thetaDef -= 360;
      while (thetaDef <= -180) thetaDef += 360;
      if (Math.abs(thetaDef) < 0.8) thetaDef = 0;

      // Polo não-nulo mais lento |s_lenta|
      const nonZeroPoles = poles.filter(p => Math.hypot(p.re, p.im) > 1e-4);
      const sLenta = nonZeroPoles.length > 0 ? Math.min(...nonZeroPoles.map(p => Math.hypot(p.re, p.im))) : 1;

      // Ganho DC ou Kv sem compensação (para K0 = 1/|G(sd)|)
      const GsdVal = complexDiv(evalPolyComplex(numG, sd), evalPolyComplex(denG, sd));
      const K0Mag = buildLiteralMagnitudeStep('K_0', leadGain, zeros, poles, sd);
      const K0 = K0Mag.value;

      // Constante estática da planta G0 = lim_{s->0} s^type * G(s)
      const num0 = numG[0];
      const denNonZeroIdx = denG.findIndex(c => Math.abs(c) > 1e-12);
      const G0 = denNonZeroIdx >= 0 ? num0 / denG[denNonZeroIdx] : 1;
      const Ka = K0 * Math.abs(G0);

      const essReqPct = Math.max(0, Number(essReqStr.replace(',', '.')));
      const essReqFrac = essReqPct / 100;

      // Triagem automática do controlador
      let chosenType: 'P' | 'PD' | 'PI' | 'Lead' | 'Lag' | 'LeadLag' | 'PD_PI';
      let reason = '';
      if (mode !== 'Auto') {
        chosenType = mode;
        reason = `Modo selecionado manualmente: ${mode === 'LeadLag' ? 'Avanço + Atraso (2 estágios)' : mode === 'PD_PI' ? 'PD Real + PI (PID Real)' : mode}.`;
      } else if (thetaDef > 2) {
        if (inputKind === 'step' && systemType === 0 && essReqPct === 0) {
          chosenType = 'PD_PI';
          reason = `Como $\\theta_{\\text{def}} = +${fmtPt(thetaDef, 1)}^\\circ > 0^\\circ$ e exige erro nulo ao degrau em planta Tipo 0, projeta-se em 2 estágios: 1º **PD Real** (transitório em $s_d$) + 2º **PI** (erro nulo).`;
        } else if (
          (inputKind === 'step' && systemType === 0 && essReqPct > 0 && essReqPct <= 10) ||
          (inputKind === 'ramp' && systemType === 1 && essReqPct > 0)
        ) {
          chosenType = 'LeadLag';
          reason = `Como $\\theta_{\\text{def}} = +${fmtPt(thetaDef, 1)}^\\circ > 0^\\circ$ e também há especificação rigorosa de erro estacionário, projeta-se em 2 estágios: 1º **Avanço de Fase** (transitório) + 2º **Atraso de Fase** (erro).`;
        } else {
          chosenType = 'PD';
          reason = `Como $\\theta_{\\text{def}} = +${fmtPt(thetaDef, 1)}^\\circ > 0^\\circ$, o ponto $s_d$ está à esquerda do LGR original e exige adiantamento de fase (PD Real ou Avanço de Fase).`;
        }
      } else if (inputKind === 'step' && systemType === 0 && essReqPct === 0) {
        chosenType = 'PI';
        reason = `Planta Tipo 0 com $\\theta_{\\text{def}} \\approx 0^\\circ$ e requisito de erro nulo ao degrau ($e_{ss} = 0$) → Controlador PI.`;
      } else if (
        (inputKind === 'step' && systemType === 0 && essReqPct > 0 && 1 / (1 + Ka) > essReqFrac) ||
        (inputKind === 'ramp' && systemType === 1 && essReqPct > 0 && 1 / Ka > essReqFrac)
      ) {
        chosenType = 'Lag';
        reason = `O transitório já passa por $s_d$ ($\\theta_{\\text{def}} \\approx 0^\\circ$), mas o erro estacionário com $K_0$ supera o limite pedido → Compensador por Atraso de Fase (Lag).`;
      } else {
        chosenType = 'P';
        reason = `O ponto desejado $s_d$ pertence ao LGR original ($\\theta_{\\text{def}} \\approx 0^\\circ$) e o erro já atende à especificação → Controlador Proporcional (P).`;
      }

      const plantLatex = `\\frac{${formatPolyLatex(numG)}}{${formatFactorList(poles)}}`;
      const steps: MemorialStep[] = [];

      // Passo 1: Triagem + sd + Ângulo
      steps.push({
        title: '1. Triagem da Planta, Polo Desejado $s_d$ e Condição de Ângulo',
        description: `Planta Tipo ${systemType}, ${order}ª ordem, $|s_{\\text{lenta}}| = ${fmtPt(sLenta, 3)}$. Avaliando $\\angle G(s_d) = \\sum\\angle(s_d-z_i) - \\sum\\angle(s_d-p_j)$ e $\\theta_{\\text{def}} = -180^\\circ - \\angle G(s_d)$:`,
        latex:
          `${specStepLatex} \\;;\\; ` +
          `\\angle G(s_d) = ${zeroAngles.length > 0 ? zeroAngles.map(a => `${fmtPt(a, 1)}^\\circ`).join(' + ') : '0^\\circ'} - (${poleAngles.map(a => `${fmtPt(a, 1)}^\\circ`).join(' + ')}) = ${fmtPt(angleG, 1)}^\\circ \\;;\\; ` +
          `\\theta_{\\text{def}} = -180^\\circ - (${fmtPt(angleG, 1)}^\\circ) = \\mathbf{${thetaDef >= 0 ? '+' : ''}${fmtPt(thetaDef, 1)}^\\circ}`
      });

      let controllerExpr = fmtNum(K0, 4);
      let controllerLatex = `G_c(s) = ${fmtPt(K0, 3)}`;
      let prefilterZc: number | null = null;
      let scilabCode = '';

      if (chosenType === 'P') {
        steps.push({
          title: '2. Ganho Proporcional $K$ pela Condição de Módulo (Regra dos 7 Passos)',
          description: 'Aplicando $K = \\frac{1}{|G(s_d)|}$ sem inverter antecipadamente:',
          latex: K0Mag.latex
        });
        const essFinal = systemType === 0 ? 1 / (1 + Ka) : 0;
        steps.push({
          title: '3. Verificação do Erro Estacionário',
          description: `Com $K = ${fmtPt(K0, 3)}$:`,
          latex:
            systemType === 0
              ? `K_p = K\\cdot G(0) = ${fmtPt(Ka, 3)} \\implies e_{ss}(\\text{degrau}) = \\frac{1}{1 + K_p} = \\mathbf{${fmtPt(essFinal * 100, 2)}\\%}`
              : `K_v = K\\lim_{s\\to 0} s G(s) = ${fmtPt(Ka, 3)} \\implies e_{ss}(\\text{rampa}) = \\frac{1}{K_v} = \\mathbf{${fmtPt(1 / Ka, 4)}}`
        });
        controllerExpr = fmtNum(K0, 4);
        controllerLatex = `G_c(s) = K = ${fmtPt(K0, 3)}`;
      } else if (chosenType === 'PD' || chosenType === 'Lead') {
        const phiNeeded = Math.max(5, thetaDef > 0 ? thetaDef : 20);
        const N = Math.max(2, Number(pdNStr.replace(',', '.')) || 10);
        let zc = 1;
        let pc = 10;
        let r = N + 1;
        let step2Desc = '';
        let step2Latex = '';

        if (chosenType === 'Lead' && leadCrit === 'bissetriz') {
          const betaAng = (Math.acos(zeta) * 180) / Math.PI;
          const halfPhi = phiNeeded / 2;
          const angZ = (180 - betaAng) / 2 + halfPhi;
          const angP = (180 - betaAng) / 2 - halfPhi;
          // tan(ang) = omega / (x - sigma) => x = sigma + omega / tan(ang)
          zc = sigma + omega / Math.tan((angZ * Math.PI) / 180);
          pc = sigma + omega / Math.tan((angP * Math.PI) / 180);
          if (zc <= 0.05) zc = 0.2 * sigma;
          if (pc <= zc) pc = zc * 5;
          r = pc / zc;
          step2Desc = `Critério da Bissetriz ($\\beta = \\arccos\\zeta = ${fmtPt(betaAng, 1)}^\\circ$, bissetriz em $\\frac{180^\\circ - \\beta}{2} = ${fmtPt((180 - betaAng) / 2, 1)}^\\circ$):`;
          step2Latex =
            `\\theta_z = ${fmtPt(angZ, 2)}^\\circ \\;;\\; \\theta_p = ${fmtPt(angP, 2)}^\\circ \\;;\\; ` +
            `z_c = \\sigma_d + \\frac{\\omega_d}{\\tan(\\theta_z)} = \\mathbf{${fmtPt(zc, 3)}} \\;;\\; ` +
            `p_c = \\sigma_d + \\frac{\\omega_d}{\\tan(\\theta_p)} = \\mathbf{${fmtPt(pc, 3)}} \\;;\\; r = \\frac{p_c}{z_c} = ${fmtPt(r, 2)}`;
        } else {
          // Polinômio quadrático r*zc^2 - [sigma*(r+1) + omega*(r-1)*cot(phi)]*zc + (sigma^2 + omega^2) = 0
          const phiMax = (Math.asin((r - 1) / (r + 1)) * 180) / Math.PI;
          const phiUse = Math.min(phiNeeded, phiMax - 0.5);
          const cotPhi = 1 / Math.tan((phiUse * Math.PI) / 180);
          const c2 = r;
          const c1 = -(sigma * (r + 1) + omega * (r - 1) * cotPhi);
          const c0 = sigma * sigma + omega * omega;
          const delta = Math.max(0, c1 * c1 - 4 * c2 * c0);
          zc = (-c1 + Math.sqrt(delta)) / (2 * c2);
          pc = r * zc;
          step2Desc = `Adotando $N = ${fmtPt(N, 1)}$ ($r = N+1 = ${fmtPt(r, 1)}$, $\\varphi_{\\max} = ${fmtPt(phiMax, 1)}^\\circ$) e escolhendo a maior raiz positiva do polinômio em $z_c$:`;
          step2Latex =
            `c_2 = ${fmtPt(c2, 2)} \\;;\\; c_1 = -[${fmtPt(sigma, 2)}(${fmtPt(r + 1, 1)}) + ${fmtPt(omega, 2)}(${fmtPt(r - 1, 1)})\\cdot ${fmtPt(cotPhi, 3)}] = ${fmtPt(c1, 2)} \\;;\\; c_0 = ${fmtPt(c0, 2)} \\;;\\; ` +
            `\\Delta = (${fmtPt(c1, 2)})^2 - 4\\cdot ${fmtPt(c2, 2)}\\cdot ${fmtPt(c0, 2)} = ${fmtPt(delta, 2)} \\;(\\sqrt{\\Delta} = ${fmtPt(Math.sqrt(delta), 2)}) \\;;\\; ` +
            `z_c = \\frac{${fmtPt(-c1, 2)} + ${fmtPt(Math.sqrt(delta), 2)}}{2\\cdot ${fmtPt(c2, 2)}} = \\mathbf{${fmtPt(zc, 3)}} \\;;\\; p_c = r\\cdot z_c = \\mathbf{${fmtPt(pc, 3)}}`;
        }

        steps.push({
          title: `2. Posição do Zero $z_c$ e do Polo $p_c$ (${chosenType === 'PD' ? 'PD Real' : 'Avanço de Fase'})`,
          description: step2Desc,
          latex: step2Latex
        });

        const KcMag = buildLiteralMagnitudeStep('K_c', leadGain, zeros, poles, sd, zc, pc);
        const Kc = KcMag.value;
        const Kp = Kc / r;
        const Td = (r - 1) / (r * zc);

        steps.push({
          title: '3. Ganho $K_c$ pela Condição de Módulo Literal (Regra dos 7 Passos) e Parâmetros',
          description: 'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ sem inverter antecipadamente:',
          latex: `${KcMag.latex} \\;;\\; K_p = \\frac{K_c}{r} = \\mathbf{${fmtPt(Kp, 3)}} \\;;\\; T_d = \\frac{r-1}{r\\cdot z_c} = \\mathbf{${fmtPt(Td, 3)}\\text{ s}}`
        });

        const C1 = 10e-6;
        const C2 = C1 / Kc;
        const R1 = 1 / (zc * C1);
        const R2 = 1 / (pc * C2);
        steps.push({
          title: '4. Regra dos 10 V, Pré-Filtro e Circuito Analógico ($C_1 = 10\\,\\mu\\text{F}$)',
          description: `Verificando o pico inicial $u(0^+) = K_c\\cdot 1$ (${Kc <= 10 ? 'dentro' : 'ACIMA'} da regra dos $10\\text{ V}$) e dimensionando $R_1, R_2, C_2$:`,
          latex:
            `u(0^+) = K_c = \\mathbf{${fmtPt(Kc, 2)}\\text{ V}} \\;;\\; F(s) = \\frac{z_c}{s + z_c} = \\frac{${fmtPt(zc, 3)}}{s + ${fmtPt(zc, 3)}} \\;;\\; ` +
            `R_1 = \\frac{1}{z_c C_1} = \\mathbf{${fmtPt(R1 / 1e3, 1)}\\text{ k}\\Omega} \\;;\\; C_2 = \\frac{C_1}{K_c} = ${fmtPt(C2 * 1e6, 2)}\\,\\mu\\text{F} \\;;\\; R_2 = \\frac{1}{p_c C_2} = \\mathbf{${fmtPt(R2 / 1e3, 1)}\\text{ k}\\Omega}`
        });

        controllerExpr = `${fmtNum(Kc, 4)}*(s+${fmtNum(zc, 4)})/(s+${fmtNum(pc, 4)})`;
        controllerLatex = `G_c(s) = ${fmtPt(Kc, 3)}\\frac{s + ${fmtPt(zc, 3)}}{s + ${fmtPt(pc, 3)}}`;
        prefilterZc = zc;
      } else if (chosenType === 'PI') {
        const eP = 1 / (1 + Ka);
        const phiDeg = eP <= 0.02 ? 5 : 10;
        const angSd = complexArgDeg(sd);
        const angZi = angSd - phiDeg;
        const ziMax = sigma + omega / Math.tan((angZi * Math.PI) / 180);
        const ziDipolo = sLenta / 1.1;
        const zi = Math.max(0.02, Math.min(ziMax > 0 ? ziMax : ziDipolo, ziDipolo));
        const perdaReal = Math.abs(complexArgDeg({ re: sd.re + zi, im: sd.im }) - angSd);

        steps.push({
          title: '2. Ganho Inicial $K_0$, Erro Atual $e_P$ e Tolerância Angular $\\varphi$',
          description: 'Aplicando $K_0 = \\frac{1}{|G(s_d)|}$ pela Regra dos 7 Passos e avaliando $e_P = \\frac{1}{1+K_a}$:',
          latex: `${K0Mag.latex} \\;;\\; K_a = K_0 G(0) = ${fmtPt(Ka, 3)} \\;;\\; e_P = \\frac{1}{1 + ${fmtPt(Ka, 3)}} = ${fmtPt(eP * 100, 2)}\\% \\implies \\varphi = \\mathbf{${phiDeg}^\\circ}`
        });

        steps.push({
          title: '3. Zero do PI ($z_i$) e Perda Angular Real $\\Delta\\theta_{\\text{perda}}$',
          description: 'Comparando $z_{i,\\max}(\\varphi)$ com o limite do dipolo $|s_{\\text{lenta}}|/1{,}1$:',
          latex:
            `z_{i,\\max} = \\sigma_d + \\frac{\\omega_d}{\\tan(\\angle s_d - \\varphi)} = ${fmtPt(ziMax, 3)} \\;;\\; z_{i,\\text{dipolo}} = \\frac{|s_{\\text{lenta}}|}{1{,}1} = ${fmtPt(ziDipolo, 3)} \\;;\\; ` +
            `z_i = \\min(z_{i,\\max}\\,;\\, z_{i,\\text{dipolo}}) = \\mathbf{${fmtPt(zi, 3)}} \\;;\\; ` +
            `\\Delta\\theta_{\\text{perda}} = |\\angle(s_d+z_i) - \\angle s_d| = \\mathbf{${fmtPt(perdaReal, 2)}^\\circ}`
        });

        const KcMag = buildLiteralMagnitudeStep('K_c', leadGain, zeros, poles, sd, zi, 0);
        const Kc = KcMag.value;
        const R1 = 10e3;
        const R2 = Kc * R1;
        const C = 1 / (zi * R2);

        steps.push({
          title: '4. Ganho $K_c$ pela Condição de Módulo (Regra dos 7 Passos) e Circuito ($R_1 = 10\\text{ k}\\Omega$)',
          description: 'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ com $\\bar{G}_c(s) = \\frac{s+z_i}{s}$:',
          latex: `${KcMag.latex} \\;;\\; R_2 = K_c R_1 = \\mathbf{${fmtPt(R2 / 1e3, 1)}\\text{ k}\\Omega} \\;;\\; C = \\frac{1}{z_i R_2} = \\mathbf{${fmtPt(C * 1e6, 2)}\\,\\mu\\text{F}} \\;;\\; e_{ss}(\\text{degrau}) = \\mathbf{0}`
        });

        controllerExpr = `${fmtNum(Kc, 4)}*(s+${fmtNum(zi, 4)})/s`;
        controllerLatex = `G_c(s) = ${fmtPt(Kc, 3)}\\frac{s + ${fmtPt(zi, 3)}}{s}`;
      } else if (chosenType === 'LeadLag' || chosenType === 'PD_PI') {
        // Projeto Combinado em 2 Estágios: 1º Estágio (PD Real / Avanço) + 2º Estágio (PI ou Atraso)
        const phiNeeded = Math.max(5, thetaDef > 0 ? thetaDef : 20);
        const N = Math.max(2, Number(pdNStr.replace(',', '.')) || 10);
        const r = N + 1;
        const phiMax = (Math.asin((r - 1) / (r + 1)) * 180) / Math.PI;
        const phiUse = Math.min(phiNeeded, phiMax - 0.5);
        const cotPhi = 1 / Math.tan((phiUse * Math.PI) / 180);
        const c2 = r;
        const c1 = -(sigma * (r + 1) + omega * (r - 1) * cotPhi);
        const c0 = sigma * sigma + omega * omega;
        const delta = Math.max(0, c1 * c1 - 4 * c2 * c0);
        const zc = (-c1 + Math.sqrt(delta)) / (2 * c2);
        const pc = r * zc;

        const K1Mag = buildLiteralMagnitudeStep('K_{c1}', leadGain, zeros, poles, sd, zc, pc);
        const Kc1 = K1Mag.value;
        const Ka1 = Kc1 * (zc / pc) * Math.abs(G0);

        steps.push({
          title: '2. Estágio 1 — Adiantamento de Fase ($z_c, p_c$ e $K_{c1}$ pela Regra dos 7 Passos)',
          description: `Fixando $N = ${fmtPt(N, 1)}$ ($r = ${fmtPt(r, 1)}$) para fornecer $\\theta_{\\text{def}} = ${fmtPt(phiUse, 1)}^\\circ$ em $s_d$ e calculando $K_{c1} = \\frac{1}{|\\bar{G}_{c1}(s_d)G(s_d)|}$:`,
          latex:
            `c_2 = ${fmtPt(c2, 2)} \\;;\\; c_1 = ${fmtPt(c1, 2)} \\;;\\; c_0 = ${fmtPt(c0, 2)} \\;;\\; \\Delta = ${fmtPt(delta, 2)} \\implies z_c = \\mathbf{${fmtPt(zc, 3)}} \\;;\\; p_c = r z_c = \\mathbf{${fmtPt(pc, 3)}} \\;;\\; ` +
            `${K1Mag.latex}`
        });

        if (chosenType === 'PD_PI') {
          // Estágio 2: PI (zero zi e polo na origem)
          const angSd = complexArgDeg(sd);
          const phiPI = 5;
          const ziMax = sigma + omega / Math.tan(((angSd - phiPI) * Math.PI) / 180);
          const ziDipolo = sLenta / 1.1;
          const zi = Math.max(0.02, Math.min(ziMax > 0 ? ziMax : ziDipolo, ziDipolo));
          const perdaPI = Math.abs(complexArgDeg({ re: sd.re + zi, im: sd.im }) - angSd);

          const allZ = [...zeros, { re: -zc, im: 0 }, { re: -zi, im: 0 }];
          const allP = [...poles, { re: -pc, im: 0 }, { re: 0, im: 0 }];
          const KcTotMag = buildLiteralMagnitudeStep('K_c', leadGain, allZ, allP, sd);
          const KcTot = KcTotMag.value;

          steps.push({
            title: '3. Estágio 2 — Integrador PI ($z_i$) e Ganho Total $K_c$ (Regra dos 7 Passos)',
            description: 'Com o transitório já ajustado em $s_d$, adiciona-se $\\frac{s+z_i}{s}$ com perda angular $\\le 5^\\circ$ para zerar $e_{ss}$ ao degrau:',
            latex:
              `z_i = \\min\\!\\left(${fmtPt(ziMax, 3)}\\,;\\, \\frac{${fmtPt(sLenta, 3)}}{1{,}1}\\right) = \\mathbf{${fmtPt(zi, 3)}} \\;;\\; \\Delta\\theta_{\\text{perda}} = \\mathbf{${fmtPt(perdaPI, 2)}^\\circ} \\;;\\; ` +
              `${KcTotMag.latex} \\;;\\; e_{ss}(\\text{degrau}) = \\mathbf{0}`
          });

          controllerExpr = `${fmtNum(KcTot, 4)}*(s+${fmtNum(zc, 4)})*(s+${fmtNum(zi, 4)})/(s*(s+${fmtNum(pc, 4)}))`;
          controllerLatex = `G_c(s) = ${fmtPt(KcTot, 3)}\\frac{(s + ${fmtPt(zc, 3)})(s + ${fmtPt(zi, 3)})}{s(s + ${fmtPt(pc, 3)})}`;
          prefilterZc = zc;
        } else {
          // Estágio 2: Atraso de Fase (z_lag, p_lag)
          const isTipo1 = systemType >= 1 && inputKind === 'ramp';
          const Kreq = isTipo1 ? 1 / Math.max(0.005, essReqFrac) : Math.max(1, 1 / Math.max(0.005, essReqFrac) - 1);
          const beta = Math.max(1.5, Kreq / Math.max(1e-4, Ka1));
          const phiLag = 5;
          const cotLag = 1 / Math.tan((phiLag * Math.PI) / 180);
          const l2 = beta;
          const l1 = -(sigma * (beta + 1) + omega * (beta - 1) * cotLag);
          const l0 = sigma * sigma + omega * omega;
          const dLag = Math.max(0, l1 * l1 - 4 * l2 * l0);
          const pMax = (-l1 - Math.sqrt(dLag)) / (2 * l2);
          const zMax = beta * pMax;
          const zDipolo = sLenta / 1.1;
          const zCauda = isTipo1 && 1 / Ka1 > 1 / Kreq ? 0.02 / (1 / Ka1 - 1 / Kreq) : Infinity;
          const zLag = Math.max(0.005, Math.min(zMax, zDipolo, zCauda));
          const pLag = zLag / beta;
          const perdaLag = Math.abs(
            complexArgDeg({ re: sd.re + zLag, im: sd.im }) - complexArgDeg({ re: sd.re + pLag, im: sd.im })
          );

          const allZ = [...zeros, { re: -zc, im: 0 }, { re: -zLag, im: 0 }];
          const allP = [...poles, { re: -pc, im: 0 }, { re: -pLag, im: 0 }];
          const KcTotMag = buildLiteralMagnitudeStep('K_c', leadGain, allZ, allP, sd);
          const KcTot = KcTotMag.value;
          const Knovo = KcTot * (zc / pc) * (zLag / pLag) * Math.abs(G0);
          const essNovo = isTipo1 ? 1 / Knovo : 1 / (1 + Knovo);

          steps.push({
            title: '3. Estágio 2 — Atraso de Fase ($\\beta, z_{\\text{lag}}, p_{\\text{lag}}$) e Ganho Total $K_c$',
            description: 'Com $K_{a,1}$ do 1º estágio, calcula-se $\\beta = K_{\\text{req}}/K_{a,1}$, posiciona-se o dipolo com $\\varphi = 5^\\circ$ e recalcula-se $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$:',
            latex:
              `K_{a,1} = ${fmtPt(Ka1, 3)} \\;;\\; \\beta = \\frac{${fmtPt(Kreq, 2)}}{${fmtPt(Ka1, 3)}} = \\mathbf{${fmtPt(beta, 2)}} \\;;\\; z_{\\text{lag}} = \\mathbf{${fmtPt(zLag, 4)}} \\;;\\; p_{\\text{lag}} = \\mathbf{${fmtPt(pLag, 5)}} \\;;\\; \\Delta\\theta_{\\text{perda}} = \\mathbf{${fmtPt(perdaLag, 2)}^\\circ} \\;;\\; ` +
              `${KcTotMag.latex} \\;;\\; e_{ss,\\text{final}} = \\mathbf{${isTipo1 ? fmtPt(essNovo, 4) : `${fmtPt(essNovo * 100, 2)}\\%`}}`
          });

          controllerExpr = `${fmtNum(KcTot, 4)}*(s+${fmtNum(zc, 4)})*(s+${fmtNum(zLag, 5)})/((s+${fmtNum(pc, 4)})*(s+${fmtNum(pLag, 6)}))`;
          controllerLatex = `G_c(s) = ${fmtPt(KcTot, 3)}\\frac{(s + ${fmtPt(zc, 3)})(s + ${fmtPt(zLag, 4)})}{(s + ${fmtPt(pc, 3)})(s + ${fmtPt(pLag, 5)})}`;
          prefilterZc = zc;
        }
      } else {
        // Compensador por Atraso de Fase (Lag) — Passos 0 a 7
        const isTipo1 = systemType >= 1 && inputKind === 'ramp';
        const Kreq = isTipo1
          ? 1 / Math.max(0.005, essReqFrac)
          : Math.max(1, 1 / Math.max(0.005, essReqFrac) - 1);
        const beta = Math.max(1.5, Kreq / Math.max(1e-4, Ka));
        const eP = 1 / (1 + Ka);
        const phiDeg = isTipo1 || eP > 0.02 ? 10 : 5;
        const cotPhi = 1 / Math.tan((phiDeg * Math.PI) / 180);

        const c2 = beta;
        const c1 = -(sigma * (beta + 1) + omega * (beta - 1) * cotPhi);
        const c0 = sigma * sigma + omega * omega;
        const delta = Math.max(0, c1 * c1 - 4 * c2 * c0);
        const pMax = (-c1 - Math.sqrt(delta)) / (2 * c2);
        const zMax = beta * pMax;
        const zDipolo = sLenta / 1.1;
        const zCauda = isTipo1 && 1 / Ka > 1 / Kreq ? 0.02 / (1 / Ka - 1 / Kreq) : Infinity;
        const z = Math.max(0.005, Math.min(zMax, zDipolo, zCauda));
        const p = z / beta;
        const perdaReal = Math.abs(
          complexArgDeg({ re: sd.re + z, im: sd.im }) - complexArgDeg({ re: sd.re + p, im: sd.im })
        );

        steps.push({
          title: '2. Passos 1 a 3 — Ganho $K_0$, Constante Atual $K_a$, Fator $\\beta$ e Tolerância $\\varphi$',
          description: 'Aplicando $K_0 = \\frac{1}{|G(s_d)|}$ pela Regra dos 7 Passos:',
          latex:
            `${K0Mag.latex} \\;;\\; K_a = ${fmtPt(Ka, 3)} \\;;\\; K_{\\text{req}} = ${fmtPt(Kreq, 2)} \\;;\\; ` +
            `\\beta = \\frac{K_{\\text{req}}}{K_a} = \\mathbf{${fmtPt(beta, 2)}} \\;;\\; \\varphi = \\mathbf{${phiDeg}^\\circ}`
        });

        steps.push({
          title: '3. Passo 4 — Polinômio Trigonométrico, Dipolo, Cauda e Perda Angular $\\Delta\\theta_{\\text{perda}}$',
          description: 'Resolvendo $\\beta p^2 - [\\sigma_d(\\beta+1)+\\omega_d(\\beta-1)\\cot\\varphi]p + (\\sigma_d^2+\\omega_d^2) = 0$ por Bhaskara:',
          latex:
            `c_2 = ${fmtPt(c2, 2)} \\;;\\; c_1 = ${fmtPt(c1, 2)} \\;;\\; c_0 = ${fmtPt(c0, 2)} \\;;\\; ` +
            `\\Delta = ${fmtPt(delta, 2)} \\;(\\sqrt{\\Delta} = ${fmtPt(Math.sqrt(delta), 2)}) \\implies p_{\\max} = ${fmtPt(pMax, 4)} \\implies z_{\\max} = ${fmtPt(zMax, 3)} \\;;\\; ` +
            `z_{\\text{dipolo}} = \\frac{|s_{\\text{lenta}}|}{1{,}1} = ${fmtPt(zDipolo, 3)}` +
            (Number.isFinite(zCauda) ? ` \\;;\\; z_{\\text{cauda}} = \\frac{0{,}02}{1/${fmtPt(Ka, 3)} - 1/${fmtPt(Kreq, 2)}} = ${fmtPt(zCauda, 4)}` : '') +
            ` \\;;\\; z = \\mathbf{${fmtPt(z, 4)}} \\;;\\; p = \\frac{z}{\\beta} = \\mathbf{${fmtPt(p, 5)}} \\;;\\; ` +
            `\\Delta\\theta_{\\text{perda}} = |\\angle(s_d+z) - \\angle(s_d+p)| = \\mathbf{${fmtPt(perdaReal, 2)}^\\circ}`
        });

        const KcMag = buildLiteralMagnitudeStep('K_c', leadGain, zeros, poles, sd, z, p);
        const Kc = KcMag.value;
        const Knovo = Kc * (z / p) * Math.abs(G0);
        const essNovo = isTipo1 ? 1 / Knovo : 1 / (1 + Knovo);
        const C = 10e-6;
        const R1 = 1 / (z * C);
        const R2 = beta * R1;
        const R4 = Kc * 10e3;

        steps.push({
          title: '4. Passos 5 a 7 — Ganho $K_c$ (Regra dos 7 Passos), Erro Final e Componentes ($C=10\\,\\mu\\text{F}, R_3=10\\text{ k}\\Omega$)',
          description: 'Aplicando $K_c = \\frac{1}{|\\bar{G}_c(s_d)G(s_d)|}$ sem atalhos e conferindo o erro final:',
          latex:
            `${KcMag.latex} \\;;\\; K_{\\text{novo}} = ${fmtPt(Knovo, 2)} \\implies e_{ss,\\text{final}} = \\mathbf{${isTipo1 ? fmtPt(essNovo, 4) : `${fmtPt(essNovo * 100, 2)}\\%`}} \\;;\\; ` +
            `R_1 = \\frac{1}{z C} = \\mathbf{${fmtPt(R1 / 1e3, 1)}\\text{ k}\\Omega} \\;;\\; R_2 = \\beta R_1 = \\mathbf{${fmtPt(R2 / 1e3, 1)}\\text{ k}\\Omega} \\;;\\; R_4 = K_c R_3 = \\mathbf{${fmtPt(R4 / 1e3, 1)}\\text{ k}\\Omega}`
        });

        controllerExpr = `${fmtNum(Kc, 4)}*(s+${fmtNum(z, 5)})/(s+${fmtNum(p, 6)})`;
        controllerLatex = `G_c(s) = ${fmtPt(Kc, 3)}\\frac{s + ${fmtPt(z, 4)}}{s + ${fmtPt(p, 5)}}`;
      }

      const tMax = Math.max(3, Math.min(15, Number((8 / Math.max(0.4, sigma)).toFixed(1))));
      scilabCode = `// Projeto Automático (${chosenType}) — Controle Clássico
s = poly(0, 's');
G = syslin('c', ${plantExpr});
Gc = syslin('c', ${controllerExpr});
T_sem = G / (1 + G);
T_com = (Gc * G) / (1 + Gc * G);
Tu = Gc / (1 + Gc * G);
t = 0:0.01:${tMax};
y_sem = csim('${inputKind}', t, T_sem);
y_com = csim('${inputKind}', t, T_com);
u_com = csim('${inputKind}', t, Tu);
clf();
subplot(2,1,1); plot(t, y_sem, 'r--', t, y_com, 'b-', 'LineWidth', 2);
legend(['Sem Controlador', 'Com ${chosenType}']); xgrid();
subplot(2,1,2); plot(t, u_com, 'm-', 'LineWidth', 2);
title('Esforço de Controle u(t) — Regra dos 10 V'); xgrid();`;

      return {
        result: {
          chosenType,
          reason,
          systemType,
          order,
          sd,
          zeta,
          thetaDefDeg: thetaDef,
          plantLatex,
          controllerExpr,
          controllerLatex,
          prefilterZc,
          steps,
          scilabCode,
          tMax
        },
        error: null
      };
    } catch {
      return { result: null, error: 'Não foi possível interpretar G(s). Use sintaxe como 1/((s+1)*(s+5)) ou (s+4)/((s+1)*(s+2)*(s+8)).' };
    }
  }, [plantExpr, specMode, sigmaStr, omegaStr, mpStr, tsStr, inputKind, essReqStr, mode, pdNStr, leadCrit]);

  const sim = useMemo(() => {
    if (!design.result) return null;
    try {
      const G = parseRatExpr(plantExpr);
      const Gc = parseRatExpr(design.result.controllerExpr);
      const Gone: RatFunc = { num: [{ coeff: 1, vars: {} }], den: [{ coeff: 1, vars: {} }] };
      const T_sem = buildClosedLoopTf(G, Gone);
      const T_com = buildClosedLoopTf(G, Gc);
      const Tu = buildControlEffortTf(G, Gc);
      const inputFn = inputKind === 'ramp' ? (t: number) => t : () => 1;

      const sSem = simulateInputResponseRK4(T_sem, inputFn, design.result.tMax, 280);
      const sCom = simulateInputResponseRK4(T_com, inputFn, design.result.tMax, 280);
      const sU = simulateInputResponseRK4(Tu, inputFn, design.result.tMax, 280);
      if (!sSem || !sCom) return null;

      let yPref: number[] | null = null;
      let uPref: number[] | null = null;
      if (design.result.prefilterZc) {
        const zc = design.result.prefilterZc;
        const F: RatFunc = {
          num: [{ coeff: zc, vars: {} }],
          den: [{ coeff: 1, vars: { s: 1 } }, { coeff: zc, vars: {} }]
        };
        const sp = simulateInputResponseRK4(ratMul(F, T_com), inputFn, design.result.tMax, 280);
        const sup = simulateInputResponseRK4(ratMul(F, Tu), inputFn, design.result.tMax, 280);
        if (sp) yPref = sp.y;
        if (sup) uPref = sup.y;
      }

      const t = sCom.t;
      const r = t.map(inputFn);

      if (useSaturation) {
        const satSim = simulateClosedLoopWithSaturationRK4(
          G,
          Gc,
          inputFn,
          design.result.tMax,
          280,
          10,
          usePrefilter ? design.result.prefilterZc : null
        );
        if (satSim) {
          const uPeakSat = Number(Math.max(...satSim.u.map(v => Math.abs(v))).toFixed(2));
          return { t: satSim.t, r, ySem: sSem.y, yActive: satSim.y, eActive: satSim.e, uActive: satSim.u, uPeak: uPeakSat };
        }
      }

      const yActive = usePrefilter && yPref ? yPref : sCom.y;
      const uActive = usePrefilter && uPref ? uPref : sU?.y ?? null;
      const eActive = r.map((rv, i) => Number((rv - yActive[i]).toFixed(5)));
      const uPeak = uActive ? Number(Math.max(...uActive.map(v => Math.abs(v))).toFixed(2)) : null;

      return { t, r, ySem: sSem.y, yActive, eActive, uActive, uPeak };
    } catch {
      return null;
    }
  }, [design.result, plantExpr, inputKind, usePrefilter, useSaturation]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    background: 'var(--code-bg)',
    border: '1px solid var(--card-border)',
    color: 'var(--text)',
    fontSize: '0.84rem',
    fontFamily: 'inherit'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Cabeçalho + Presets rápidos */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '10px',
          padding: '16px 20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.12rem', color: 'var(--primary)' }}>
              🧮 Projetar Planta Nova — Gerador Automático de Memorial (Regra dos 7 Passos)
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Digite qualquer G(s) e especificação de prova para gerar automaticamente a triagem, memorial detalhado, gráficos (y, u, LGR) e script Scilab.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setPlantExpr(p.plantExpr);
                  setSpecMode(p.specMode);
                  setSigmaStr(p.sigma);
                  setOmegaStr(p.omega);
                  setMpStr(p.mp);
                  setTsStr(p.ts);
                  setInputKind(p.inputKind);
                  setEssReqStr(p.essReq);
                  setMode(p.mode);
                  setUsePrefilter(false);
                }}
                style={{
                  padding: '5px 9px',
                  borderRadius: '6px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'var(--code-bg)',
                  color: 'var(--primary)',
                  border: '1px solid var(--card-border)'
                }}
              >
                ⚡ {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Formulário Compacto em Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              PLANTA G(s) (ex.: 1/((s+1)*(s+5)), 1/(s*(s+4)))
            </label>
            <input
              type="text"
              value={plantExpr}
              onChange={e => setPlantExpr(e.target.value)}
              style={{ ...inputStyle, fontFamily: '"JetBrains Mono", Consolas, monospace' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              ESPECIFICAÇÃO DO TRANSITÓRIO
            </label>
            <select value={specMode} onChange={e => setSpecMode(e.target.value as SpecMode)} style={inputStyle}>
              <option value="sd">Polo direto sd = −σd + jωd</option>
              <option value="mpts">Sobressinal Mp (%) e ts (s)</option>
            </select>
          </div>

          {specMode === 'sd' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  σd (parte real positiva)
                </label>
                <input type="text" value={sigmaStr} onChange={e => setSigmaStr(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ωd (parte imaginária)
                </label>
                <input type="text" value={omegaStr} onChange={e => setOmegaStr(e.target.value)} style={inputStyle} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Sobressinal Mp (%)
                </label>
                <input type="text" value={mpStr} onChange={e => setMpStr(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Tempo de Acomodação ts (s)
                </label>
                <input type="text" value={tsStr} onChange={e => setTsStr(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              ENTRADA / ERRO MÁX. (%)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select value={inputKind} onChange={e => setInputKind(e.target.value as InputKind)} style={{ ...inputStyle, width: '55%' }}>
                <option value="step">Degrau</option>
                <option value="ramp">Rampa</option>
              </select>
              <input
                type="text"
                value={essReqStr}
                onChange={e => setEssReqStr(e.target.value)}
                placeholder="ess %"
                style={{ ...inputStyle, width: '45%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              CONTROLADOR
            </label>
            <select value={mode} onChange={e => setMode(e.target.value as DesignerMode)} style={inputStyle}>
              <option value="Auto">Automático (Triagem θdef + ess)</option>
              <option value="P">P (Proporcional)</option>
              <option value="PD">PD Real (N = 10)</option>
              <option value="PI">PI (Erro Nulo)</option>
              <option value="Lead">Avanço de Fase (Lead)</option>
              <option value="Lag">Atraso de Fase (Lag)</option>
              <option value="LeadLag">Avanço + Atraso (2 Estágios)</option>
              <option value="PD_PI">PD Real + PI (PID Real)</option>
            </select>
          </div>

          {(mode === 'PD' || mode === 'Lead' || design.result?.chosenType === 'PD' || design.result?.chosenType === 'Lead') && (
            <div>
              <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                {mode === 'Lead' ? 'CRITÉRIO DO AVANÇO' : 'FILTRO DERIVATIVO N (r = N+1)'}
              </label>
              {mode === 'Lead' ? (
                <select value={leadCrit} onChange={e => setLeadCrit(e.target.value as LeadCriterion)} style={inputStyle}>
                  <option value="bissetriz">Critério da Bissetriz</option>
                  <option value="rfixed">r = N + 1 fixo</option>
                </select>
              ) : (
                <input type="text" value={pdNStr} onChange={e => setPdNStr(e.target.value)} style={inputStyle} />
              )}
            </div>
          )}
        </div>
      </div>

      {design.error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.84rem',
            fontWeight: 600
          }}
        >
          ⚠️ {design.error}
        </div>
      )}

      {design.result && (
        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* Barra de Sub-abas + Salvar PDF */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(
                [
                  ['memorial', '📝 Memorial de Cálculo'],
                  ['graficos', '📈 Gráficos & LGR'],
                  ['scilab', '💻 Código Scilab']
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSubTab(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: subTab === key ? 'var(--primary)' : 'var(--code-bg)',
                    color: subTab === key ? '#fff' : 'var(--text)',
                    border: `1px solid ${subTab === key ? 'var(--primary)' : 'var(--card-border)'}`
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {subTab === 'memorial' && (
              <button
                type="button"
                onClick={() =>
                  printElementAsPdf(
                    memorialRef.current,
                    `Projeto ${design.result!.chosenType} — G(s) = ${plantExpr}`
                  )
                }
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'var(--code-bg)',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)'
                }}
              >
                🖨️ Salvar Memorial em PDF
              </button>
            )}
          </div>

          {subTab === 'memorial' && (
            <div ref={memorialRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  background: 'var(--code-bg)',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '0.83rem',
                  color: 'var(--text)'
                }}
              >
                <strong>🎯 Controlador Projetado ({design.result.chosenType === 'LeadLag' ? 'Avanço + Atraso' : design.result.chosenType === 'PD_PI' ? 'PD Real + PI' : design.result.chosenType}):</strong>{' '}
                {renderRichMathText(design.result.reason)}
              </div>

              <ControllerBlockDiagram
                title={`Diagrama de Blocos — Controlador ${design.result.chosenType} Projetado`}
                showControllerBlock={true}
                controllerLabel={`Controlador ${design.result.chosenType}`}
                controllerLatex={design.result.controllerLatex}
                plantLatex={design.result.plantLatex}
                plantExpr={plantExpr}
                controllerExpr={design.result.controllerExpr}
              />

              {design.result.steps.map((st, idx) => (
                <div
                  key={`dstep-${idx}`}
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '6px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.87rem', color: 'var(--text)', marginBottom: '4px' }}>
                    {renderRichMathText(st.title)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {renderRichMathText(st.description)}
                  </div>
                  {renderStackedMath(st.latex)}
                </div>
              ))}

              <OpAmpCircuitDiagram
                controllerType={design.result.chosenType}
                controllerExpr={design.result.controllerExpr}
              />
            </div>
          )}

          {subTab === 'graficos' && sim && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {sim.uPeak !== null && (
                    <span
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: sim.uPeak <= 10 ? 'rgba(5,150,105,0.14)' : 'rgba(220,38,38,0.14)',
                        color: sim.uPeak <= 10 ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${sim.uPeak <= 10 ? 'var(--success)' : 'var(--danger)'}`
                      }}
                    >
                      Pico |u(t)| = {sim.uPeak} V {sim.uPeak <= 10 ? '✓ (Regra dos 10 V OK)' : '⚠️ (> 10 V — Saturação!)'}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setUseSaturation(p => !p)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: useSaturation ? '#dc2626' : 'var(--code-bg)',
                      color: useSaturation ? '#fff' : 'var(--text)',
                      border: `1px solid ${useSaturation ? '#dc2626' : 'var(--card-border)'}`
                    }}
                  >
                    {useSaturation ? '⚡ Saturação ±10 V Ativa (Anti-Windup)' : '○ Simular Saturação Real (±10 V)'}
                  </button>
                  {design.result.prefilterZc !== null && (
                    <button
                      type="button"
                      onClick={() => setUsePrefilter(p => !p)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: usePrefilter ? 'var(--primary)' : 'var(--code-bg)',
                        color: usePrefilter ? '#fff' : 'var(--text)',
                        border: `1px solid ${usePrefilter ? 'var(--primary)' : 'var(--card-border)'}`
                      }}
                    >
                      {usePrefilter ? '✓ Pré-Filtro F(s) Ativo' : '○ Ativar Pré-Filtro F(s)'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
                <InteractiveTimeChart
                  title="Saída y(t) vs. Referência r(t)"
                  xValues={sim.t}
                  inputType={inputKind}
                  series={
                    [
                      { id: 'ref', label: 'Referência r(t)', values: sim.r, color: '#94a3b8', dashed: true, strokeWidth: 1.6 },
                      { id: 'sem', label: 'Sem Controlador', values: sim.ySem, color: '#dc2626', dashed: true, strokeWidth: 1.8 },
                      {
                        id: 'com',
                        label: usePrefilter ? `Com ${design.result.chosenType} + Pré-Filtro` : `Com ${design.result.chosenType}`,
                        values: sim.yActive,
                        color: '#0284c7',
                        strokeWidth: 2.4,
                        showLandmarks: true,
                        landmarkMode: 'output'
                      }
                    ] as ChartSeries[]
                  }
                />

                {sim.uActive && (
                  <InteractiveTimeChart
                    title="Esforço de Controle u(t) — Regra dos ±10 V"
                    xValues={sim.t}
                    inputType={inputKind}
                    series={[
                      {
                        id: 'u-ctrl',
                        label: usePrefilter ? 'u(t) com Pré-Filtro' : 'u(t) sem Pré-Filtro',
                        values: sim.uActive,
                        color: '#a855f7',
                        strokeWidth: 2.3
                      }
                    ]}
                    referenceLines={[
                      { y: 10, label: '+10 V (Limite)', color: '#ef4444' },
                      { y: -10, label: '−10 V', color: '#ef4444' }
                    ]}
                  />
                )}
              </div>

              <SPlaneChart
                title="Plano s — Lugar das Raízes (LGR Original vs. Compensado)"
                plantExpr={plantExpr}
                controllerExpr={design.result.controllerExpr}
                zetaTarget={design.result.zeta}
                desiredPole={design.result.sd}
              />
            </div>
          )}

          {subTab === 'scilab' && (
            <div style={{ background: 'var(--code-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>
                  💻 Script Scilab (.sce) — Projeto Automático ({design.result.chosenType})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(design.result!.scilabCode);
                    setCopiedScilab(true);
                    setTimeout(() => setCopiedScilab(false), 2200);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    color: copiedScilab ? 'var(--success)' : 'var(--primary)',
                    cursor: 'pointer'
                  }}
                >
                  {copiedScilab ? '✓ Copiado!' : 'Copiar Scilab'}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '12px 14px',
                  fontSize: '0.77rem',
                  lineHeight: 1.5,
                  fontFamily: '"JetBrains Mono", Consolas, monospace',
                  color: 'var(--text)',
                  overflowX: 'auto'
                }}
              >
                <code>{design.result.scilabCode}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
