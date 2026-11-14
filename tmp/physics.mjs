// src/lib/physics.ts
var G_SI = 66743e-15;
var C_SI = 299792458;
var M_SUN_SI = 198847e25;
var PC_KM = 3085677581491367e-2;
var RAD_TO_UAS = 180 / Math.PI * 3600 * 1e6;
function gravitationalRadiusKm(massSolar) {
  return G_SI * massSolar * M_SUN_SI / (C_SI * C_SI) / 1e3;
}
function clampSpin(a) {
  return Math.min(Math.max(a, 0), 0.9995);
}
function kerrHorizons(a) {
  const s = Math.sqrt(Math.max(0, 1 - a * a));
  return { rPlus: 1 + s, rMinus: 1 - s };
}
function ergosphereRadius(a, thetaRad) {
  const c = Math.cos(thetaRad);
  return 1 + Math.sqrt(Math.max(0, 1 - a * a * c * c));
}
function photonSphereRadii(a) {
  const ac = clampSpin(a);
  const pro = 2 * (1 + Math.cos(2 / 3 * Math.acos(-ac)));
  const retro = 2 * (1 + Math.cos(2 / 3 * Math.acos(ac)));
  return { prograde: pro, retrograde: retro };
}
function iscoRadius(a) {
  const ac = clampSpin(a);
  const z1 = 1 + Math.cbrt(1 - ac * ac) * (Math.cbrt(1 + ac) + Math.cbrt(1 - ac));
  const z2 = Math.sqrt(3 * ac * ac + z1 * z1);
  return 3 + z2 - Math.sqrt(Math.max(0, (3 - z1) * (3 + z1 + 2 * z2)));
}
function criticalImpactParameter(a, rPh) {
  const ac = clampSpin(a);
  if (ac < 1e-8) {
    return rPh >= 3 ? Math.sqrt(27) : -Math.sqrt(27);
  }
  const delta = rPh * rPh - 2 * rPh + ac * ac;
  return (rPh * rPh + ac * ac - 2 * rPh * delta / (rPh - 1)) / ac;
}
function shadowEquatorialDiameter(a) {
  const { prograde, retrograde } = photonSphereRadii(a);
  const bPro = criticalImpactParameter(a, prograde);
  const bRetro = criticalImpactParameter(a, retrograde);
  return Math.abs(bRetro) + Math.abs(bPro);
}
function shadowMeanDiameter(a) {
  const ac = clampSpin(a);
  return 2 * Math.sqrt(27) * (1 - 0.02 * ac * ac);
}
function shadowBoundaryCurve(a, inclinationRad, samples = 160) {
  const ac = clampSpin(a);
  const sinI = Math.sin(clampInclination(inclinationRad));
  const cosI = Math.cos(clampInclination(inclinationRad));
  const points = [];
  if (ac < 1e-8) {
    const R = Math.sqrt(27);
    for (let k = 0; k <= samples; k++) {
      const phi = 2 * Math.PI * k / samples;
      points.push({ rS: 3, alpha: R * Math.cos(phi), beta: R * Math.sin(phi) });
    }
    return points;
  }
  const { prograde, retrograde } = photonSphereRadii(ac);
  const N = samples;
  for (let k = 0; k <= N; k++) {
    const rS = prograde + (retrograde - prograde) * k / N;
    const b = criticalImpactParameter(ac, rS);
    const delta = rS * rS - 2 * rS + ac * ac;
    const q = 2 * rS * (rS * rS + ac * ac - ac * b) / (rS - 1) - (b - ac) * (b - ac);
    const alpha = -b / sinI;
    const betaSq = q + (ac * ac - alpha * alpha) * cosI * cosI;
    if (betaSq < 0) continue;
    const beta = Math.sqrt(betaSq);
    points.push({ rS: round(rS, 5), alpha: round(alpha, 5), beta: round(beta, 5) });
    points.push({ rS: round(rS, 5), alpha: round(alpha, 5), beta: round(-beta, 5) });
  }
  return points;
}
function clampInclination(i) {
  return Math.min(Math.max(i, 0), Math.PI / 2);
}
function round(v, digits) {
  return Number(v.toFixed(digits));
}
function schwarzschildDeflection(b) {
  if (b <= Math.sqrt(27)) return Number.POSITIVE_INFINITY;
  const uStart = 1e-9;
  let up = 1 / b;
  for (let i = 0; i < 40; i++) {
    const f = up * up - 2 * up * up * up - 1 / (b * b);
    const fp = 2 * up - 6 * up * up;
    up -= f / fp;
  }
  let phi = 0;
  let u = up;
  let du = 0;
  const h = 5e-4;
  let maxSteps = 4e5;
  while (maxSteps-- > 0) {
    const uPrev = u;
    const phiPrev = phi;
    const [u1, d1] = rk4Step(u, du, (uu) => 3 * uu * uu - uu, h);
    phi += h;
    u = u1;
    du = d1;
    if (u <= uStart) {
      const frac = (uPrev - uStart) / Math.max(uPrev - u, 1e-300);
      const phiCross = phiPrev + h * Math.min(Math.max(frac, 0), 1);
      return 2 * phiCross - Math.PI;
    }
    if (u >= 1) {
      return Number.POSITIVE_INFINITY;
    }
  }
  return Number.POSITIVE_INFINITY;
}
function rk4Step(y0, y1, f, h) {
  const k1y0 = y1;
  const k1y1 = f(y0);
  const k2y0 = y1 + h / 2 * k1y1;
  const k2y1 = f(y0 + h / 2 * k1y0);
  const k3y0 = y1 + h / 2 * k2y1;
  const k3y1 = f(y0 + h / 2 * k2y0);
  const k4y0 = y1 + h * k3y1;
  const k4y1 = f(y0 + h * k3y0);
  const y0n = y0 + h / 6 * (k1y0 + 2 * k2y0 + 2 * k3y0 + k4y0);
  const y1n = y1 + h / 6 * (k1y1 + 2 * k2y1 + 2 * k3y1 + k4y1);
  return [y0n, y1n];
}
function schwarzschildCriticalB(tolerance = 1e-5) {
  let lo = Math.sqrt(27) * 0.5;
  let hi = Math.sqrt(27) * 1.5;
  for (let iter = 0; iter < 60; iter++) {
    const mid = 0.5 * (lo + hi);
    if (Number.isFinite(schwarzschildDeflection(mid))) {
      hi = mid;
    } else {
      lo = mid;
    }
    if (hi - lo < tolerance) break;
  }
  return 0.5 * (lo + hi);
}
function kerrMetric(r, theta, a) {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const rhoSq = r * r + a * a * c * c;
  const delta = r * r - 2 * r + a * a;
  const gtt = (a * a * s * s - delta) / rhoSq;
  const gtphi = -2 * a * r * s * s / rhoSq;
  const gphphi = ((r * r + a * a) * (r * r + a * a) - a * a * delta * s * s) * (s * s) / rhoSq;
  return { gtt, gtphi, grr: rhoSq / Math.max(delta, 1e-12), gthth: rhoSq, gphphi };
}
function kerrInverseMetric(r, theta, a) {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const rhoSq = r * r + a * a * c * c;
  const delta = r * r - 2 * r + a * a;
  const gtt = (a * a * s * s - delta) / rhoSq;
  const gtphi = -2 * a * r * s * s / rhoSq;
  const gphphi = ((r * r + a * a) * (r * r + a * a) - a * a * delta * s * s) * (s * s) / rhoSq;
  const det = gtt * gphphi - gtphi * gtphi;
  return {
    gtt: gphphi / det,
    gtphi: -gtphi / det,
    grr: delta / rhoSq,
    gthth: 1 / rhoSq,
    gphphi: gtt / det
  };
}
function inverseMetricComponents(r, theta, a) {
  return kerrInverseMetric(r, theta, a);
}
function dxds(state, a) {
  const inv = inverseMetricComponents(state.r, state.theta, a);
  const { pr, pth, pph, pt } = state;
  return [
    inv.grr * pr,
    // dr/dλ
    inv.gthth * pth,
    // dθ/dλ
    inv.gtphi * pt + inv.gphphi * pph,
    // dφ/dλ
    inv.gtt * pt + inv.gtphi * pph
    // dt/dλ (conserved-check only)
  ];
}
function dpds(state, a) {
  const h = 1e-6;
  const { pr, pth, pph, pt } = state;
  const half = (r, theta) => {
    const inv = inverseMetricComponents(r, theta, a);
    return 0.5 * (inv.grr * pr * pr + inv.gthth * pth * pth + inv.gtt * pt * pt + inv.gphphi * pph * pph) + inv.gtphi * pt * pph;
  };
  const dHdr = (half(state.r + h, state.theta) - half(state.r - h, state.theta)) / (2 * h);
  const dHdth = (half(state.r, state.theta + h) - half(state.r, state.theta - h)) / (2 * h);
  return [-dHdr, -dHdth, 0, 0];
}
function kerrRk4(state, a, h) {
  const rhs = (st) => {
    const dx = dxds(st, a);
    const dp = dpds(st, a);
    const [dr, dth, dphi] = dx;
    const [dpr, dpth] = dp;
    return {
      r: dr,
      theta: dth,
      phi: dphi,
      pr: dpr,
      pth: dpth,
      pph: 0,
      pt: 0
    };
  };
  const add = (s, k, f) => ({
    r: s.r + f * k.r,
    theta: s.theta + f * k.theta,
    phi: s.phi + f * k.phi,
    pr: s.pr + f * k.pr,
    pth: s.pth + f * k.pth,
    pph: s.pph,
    pt: s.pt
  });
  const k1 = rhs(state);
  const k2 = rhs(add(state, k1, h / 2));
  const k3 = rhs(add(state, k2, h / 2));
  const k4 = rhs(add(state, k3, h));
  return {
    r: state.r + h / 6 * (k1.r + 2 * k2.r + 2 * k3.r + k4.r),
    theta: state.theta + h / 6 * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta),
    phi: state.phi + h / 6 * (k1.phi + 2 * k2.phi + 2 * k3.phi + k4.phi),
    pr: state.pr + h / 6 * (k1.pr + 2 * k2.pr + 2 * k3.pr + k4.pr),
    pth: state.pth + h / 6 * (k1.pth + 2 * k2.pth + 2 * k3.pth + k4.pth),
    pph: state.pph,
    pt: state.pt
  };
}
function integrateKerrRay(a, inclinationRad, alpha, beta, rStart = 2e3) {
  const th0 = clampInclination(inclinationRad);
  const sinI = Math.sin(th0);
  const state = {
    r: rStart,
    theta: th0,
    phi: 0,
    pr: 0,
    pth: -beta,
    pph: -alpha * sinI,
    pt: -1
  };
  const inv0 = kerrInverseMetric(rStart, th0, a);
  const radialTerm = -(inv0.gtt * state.pt * state.pt + 2 * inv0.gtphi * state.pt * state.pph + inv0.gphphi * state.pph * state.pph + inv0.gthth * state.pth * state.pth);
  state.pr = -Math.sqrt(Math.max(0, radialTerm / inv0.grr));
  const h0 = hamiltonian(state, a);
  let captured = false;
  const rPlus = kerrHorizons(clampSpin(a)).rPlus;
  for (let step = 0; step < 6e4; step++) {
    const h = 0.02 * state.r;
    const next = kerrRk4(state, a, h);
    if (next.r <= rPlus + 1e-6) {
      captured = true;
      break;
    }
    if (next.r > rStart * 1.5 && next.r > state.r) {
      break;
    }
    state.r = next.r;
    state.theta = next.theta;
    state.phi = next.phi;
    state.pr = next.pr;
    state.pth = next.pth;
    if (!Number.isFinite(state.r)) break;
  }
  const drift = Math.abs(hamiltonian(state, a) - h0);
  return { captured, constraintDrift: drift };
}
function hamiltonian(state, a) {
  const inv = inverseMetricComponents(state.r, state.theta, a);
  const { pr, pth, pph, pt } = state;
  return 0.5 * (inv.grr * pr * pr + inv.gthth * pth * pth + inv.gtt * pt * pt + inv.gphphi * pph * pph) + inv.gtphi * pt * pph;
}
function numericalCriticalImpact(a, prograde, tolerance = 0.01) {
  const alphaFor = (bAbs) => prograde ? -bAbs : bAbs;
  let lo = 1;
  let hi = 8;
  for (let iter = 0; iter < 12; iter++) {
    const mid = 0.5 * (lo + hi);
    if (integrateKerrRay(a, Math.PI / 2, alphaFor(mid), 0).captured) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < tolerance) break;
  }
  return 0.5 * (lo + hi);
}
var DEFLECTION_R_START = 1e5;
var DEFLECTION_N_QUAD = 24e3;
function kerrEquatorialDeflection(a, b) {
  const aAbs = clampSpin(a);
  const rPlus = 1 + Math.sqrt(1 - aAbs * aAbs);
  const P = (r) => r * r + aAbs * aAbs - aAbs * b;
  const Delta = (r) => r * r - 2 * r + aAbs * aAbs;
  const R = (r) => {
    const p = P(r);
    return p * p - Delta(r) * (b - aAbs) * (b - aAbs);
  };
  const dRdr = (r) => (R(r + 1e-7) - R(r - 1e-7)) / 2e-7;
  if (R(DEFLECTION_R_START) <= 0) return Number.POSITIVE_INFINITY;
  const hiScan = Math.min(DEFLECTION_R_START, Math.abs(b) + 12);
  const nScan = 12e3;
  const step = (hiScan - (rPlus + 1e-9)) / nScan;
  let rMin = NaN;
  for (let i = 1; i <= nScan; i++) {
    const r = hiScan - step * i;
    if (R(r) <= 0) {
      let lo = r;
      let hi = r + step;
      for (let k = 0; k < 80; k++) {
        const m = 0.5 * (lo + hi);
        if (R(m) <= 0) lo = m;
        else hi = m;
      }
      rMin = 0.5 * (lo + hi);
      break;
    }
  }
  if (!Number.isFinite(rMin)) return Number.POSITIVE_INFINITY;
  const sMax = Math.sqrt(DEFLECTION_R_START - rMin);
  const integrand = (s) => {
    const r = rMin + s * s;
    return 2 * s * (b - aAbs + aAbs * P(r) / Delta(r)) / Math.sqrt(R(r));
  };
  const hStep = sMax / DEFLECTION_N_QUAD;
  const start = 2 * (b - aAbs + aAbs * P(rMin) / Delta(rMin)) / Math.sqrt(Math.max(dRdr(rMin), 1e-300));
  let total = 0.5 * (start + integrand(sMax));
  for (let i = 1; i < DEFLECTION_N_QUAD; i++) total += integrand(i * hStep);
  const phiHalf = total * hStep;
  return 2 * Math.abs(phiHalf) - Math.PI;
}
function staticTimeDilation(r, a, thetaRad = Math.PI / 2) {
  const c = Math.cos(thetaRad);
  const sigma = r * r + a * a * c * c;
  const gttNeg = 1 - 2 * r / sigma;
  if (gttNeg <= 0) return Number.POSITIVE_INFINITY;
  return 1 / Math.sqrt(gttNeg);
}
function tidalAccelerationMs2(massSolar, rInUnitsOfM, baselineM = 1) {
  const rMeters = rInUnitsOfM * gravitationalRadiusKm(massSolar) * 1e3;
  const mKg = massSolar * M_SUN_SI;
  return 2 * G_SI * mKg * baselineM / (rMeters * rMeters * rMeters);
}
function siConversions(massSolar, a) {
  const rg = gravitationalRadiusKm(massSolar);
  const { rPlus, rMinus } = kerrHorizons(clampSpin(a));
  return {
    rGKm: rg,
    rPlusKm: rPlus * rg,
    rMinusKm: rMinus * rg,
    rSchwarzschildKm: 2 * rg
  };
}
export {
  C_SI,
  G_SI,
  M_SUN_SI,
  PC_KM,
  RAD_TO_UAS,
  clampSpin,
  criticalImpactParameter,
  ergosphereRadius,
  gravitationalRadiusKm,
  integrateKerrRay,
  iscoRadius,
  kerrEquatorialDeflection,
  kerrHorizons,
  kerrInverseMetric,
  kerrMetric,
  numericalCriticalImpact,
  photonSphereRadii,
  schwarzschildCriticalB,
  schwarzschildDeflection,
  shadowBoundaryCurve,
  shadowEquatorialDiameter,
  shadowMeanDiameter,
  siConversions,
  staticTimeDilation,
  tidalAccelerationMs2
};
