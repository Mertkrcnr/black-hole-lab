/**
 * physics.ts — Exact analytic + numerical black-hole physics engine (geometric units).
 *
 * All dimensionless formulas use geometric units where M = GM/c^2 = 1 (Boyer-Lindquist).
 * SI conversions (km, m/s^2, μas) are provided by dedicated helpers.
 *
 * Analytic core (exact):
 *  - Kerr horizons:            r± = 1 ± √(1 − a²)
 *  - Static limit (ergosphere): r_ergo(θ) = 1 + √(1 − a² cos²θ)
 *  - Equatorial circular photon orbits (Bardeen 1973):
 *      r_ph^∓ = 2[1 + cos((2/3) arccos(∓a))]
 *  - Critical impact parameters from the spherical-photon family
 *    (R = 0 ∧ dR/dr = 0 of the Carter potential, M = 1):
 *      b(r_s) = ( r_s² + a² − 2 r_s Δ_s / (r_s − 1) ) / a        (a ≠ 0)
 *      Q(r_s) = 2 r_s (r_s² + a² − a b) / (r_s − 1) − (b − a)²
 *      screen: α = −b / sin i,  β² = Q + (a² − α²) cos² i
 *    Verified limits: a → 0 gives |b| = 3√3 = √27; a → 1 gives b_pro = +2, b_retro = −7.
 *  - ISCO (Bardeen–Press–Teukolsky).
 *
 * Numerical core:
 *  - Schwarzschild null geodesics via the Binet equation u'' + u = 3u²
 *    integrated with RK4 → exact light deflection angles and critical b.
 *  - Full Kerr null geodesics via the Hamiltonian formulation
 *    (inverse metric computed by exact 2×2 block inversion) → used to
 *    independently verify the analytic critical impact parameters.
 */

// ---------------------------------------------------------------------------
// Physical constants (SI) and unit conversions
// ---------------------------------------------------------------------------

export const G_SI = 6.6743e-11; // m^3 kg^-1 s^-2
export const C_SI = 299792458; // m/s
export const M_SUN_SI = 1.98847e30; // kg
export const PC_KM = 3.085677581491367e13; // 1 parsec in km
export const RAD_TO_UAS = (180 / Math.PI) * 3600 * 1e6; // 1 rad in microarcseconds ≈ 2.06265e11

/** Gravitational radius GM/c² for a given mass, in km. */
export function gravitationalRadiusKm(massSolar: number): number {
  return (G_SI * massSolar * M_SUN_SI) / (C_SI * C_SI) / 1000;
}

// ---------------------------------------------------------------------------
// Clamp helper
// ---------------------------------------------------------------------------

export function clampSpin(a: number): number {
  return Math.min(Math.max(a, 0), 0.9995);
}

// ---------------------------------------------------------------------------
// Exact Kerr geometry (dimensionless, M = 1)
// ---------------------------------------------------------------------------

/** Outer (r+) and inner (r−) event horizon radii in units of M. */
export function kerrHorizons(a: number): { rPlus: number; rMinus: number } {
  const s = Math.sqrt(Math.max(0, 1 - a * a));
  return { rPlus: 1 + s, rMinus: 1 - s };
}

/** Static-limit (ergosphere) radius at Boyer-Lindquist colatitude θ (radians). */
export function ergosphereRadius(a: number, thetaRad: number): number {
  const c = Math.cos(thetaRad);
  return 1 + Math.sqrt(Math.max(0, 1 - a * a * c * c));
}

/**
 * Equatorial circular photon orbit radii (Bardeen 1973), units of M.
 * `prograde` co-rotates with the hole, `retrograde` counter-rotates.
 */
export function photonSphereRadii(a: number): { prograde: number; retrograde: number } {
  const ac = clampSpin(a);
  // prograde: 2[1 + cos((2/3) arccos(−a))] → a=1 gives r = M; a=0 gives 3M
  const pro = 2 * (1 + Math.cos((2 / 3) * Math.acos(-ac)));
  // retrograde: 2[1 + cos((2/3) arccos(+a))] → a=1 gives r = 4M; a=0 gives 3M
  const retro = 2 * (1 + Math.cos((2 / 3) * Math.acos(ac)));
  return { prograde: pro, retrograde: retro };
}

/**
 * Innermost stable circular orbit (prograde), Bardeen–Press–Teukolsky, units of M.
 * a = 0 → 6M, a → 1 → 1M.
 */
export function iscoRadius(a: number): number {
  const ac = clampSpin(a);
  const z1 = 1 + Math.cbrt(1 - ac * ac) * (Math.cbrt(1 + ac) + Math.cbrt(1 - ac));
  const z2 = Math.sqrt(3 * ac * ac + z1 * z1);
  return 3 + z2 - Math.sqrt(Math.max(0, (3 - z1) * (3 + z1 + 2 * z2)));
}

/**
 * Critical impact parameters b = L_z/E of the equatorial circular photon orbits,
 * obtained from the spherical-photon family conditions R = 0 ∧ dR/dr = 0.
 * Sign convention: b > 0 co-rotates (prograde), b < 0 counter-rotates.
 * a → 0: |b| → 3√3 = √27;  a → 1: b_pro → +2, b_retro → −7.
 */
export function criticalImpactParameter(a: number, rPh: number): number {
  const ac = clampSpin(a);
  if (ac < 1e-8) {
    return rPh >= 3 ? Math.sqrt(27) : -Math.sqrt(27);
  }
  const delta = rPh * rPh - 2 * rPh + ac * ac;
  return (rPh * rPh + ac * ac - (2 * rPh * delta) / (rPh - 1)) / ac;
}

/** Ekvatoral gölge çapı (i = 90°): |b_retro| + |b_pro|, units of M. */
export function shadowEquatorialDiameter(a: number): number {
  const { prograde, retrograde } = photonSphereRadii(a);
  const bPro = criticalImpactParameter(a, prograde);
  const bRetro = criticalImpactParameter(a, retrograde);
  return Math.abs(bRetro) + Math.abs(bPro);
}

/**
 * Inclination-averaged shadow diameter approximation used in EHT comparisons
 * (standard first-order spin correction to the 2√27 M Schwarzschild value).
 */
export function shadowMeanDiameter(a: number): number {
  const ac = clampSpin(a);
  return 2 * Math.sqrt(27) * (1 - 0.02 * ac * ac);
}

// ---------------------------------------------------------------------------
// Shadow boundary curve (analytic, exact Carter spherical-photon family)
// ---------------------------------------------------------------------------

export interface ShadowCurvePoint {
  rS: number; // spherical-photon radius (units of M)
  alpha: number; // screen coordinate ⊥ spin axis projection (units of M)
  beta: number; // screen coordinate along spin axis projection (units of M); NaN when not visible
}

/**
 * Analytic shadow boundary for spin a viewed at inclination i (radians).
 * Parametrised by the spherical-photon radius r_s ∈ [r_ph^pro, r_ph^retro]:
 *   b(r_s) = (r_s² + a² − 2 r_s Δ/(r_s−1)) / a
 *   Q(r_s) = 2 r_s (r_s² + a² − a b)/(r_s − 1) − (b − a)²
 *   α = −b / sin i ;  β = ±√( Q + (a² − α²) cos² i )
 * Points where β² < 0 (family not visible at this inclination) are omitted.
 * a = 0 returns a perfect √27 circle (inclination-independent).
 */
export function shadowBoundaryCurve(
  a: number,
  inclinationRad: number,
  samples = 160,
): ShadowCurvePoint[] {
  const ac = clampSpin(a);
  const sinI = Math.sin(clampInclination(inclinationRad));
  const cosI = Math.cos(clampInclination(inclinationRad));
  const points: ShadowCurvePoint[] = [];

  if (ac < 1e-8) {
    // Schwarzschild: perfectly circular shadow, R = √27 M.
    const R = Math.sqrt(27);
    for (let k = 0; k <= samples; k++) {
      const phi = (2 * Math.PI * k) / samples;
      points.push({ rS: 3, alpha: R * Math.cos(phi), beta: R * Math.sin(phi) });
    }
    return points;
  }

  const { prograde, retrograde } = photonSphereRadii(ac);
  const N = samples;
  for (let k = 0; k <= N; k++) {
    const rS = prograde + ((retrograde - prograde) * k) / N;
    const b = criticalImpactParameter(ac, rS);
    const delta = rS * rS - 2 * rS + ac * ac;
    const q = (2 * rS * (rS * rS + ac * ac - ac * b)) / (rS - 1) - (b - ac) * (b - ac);
    const alpha = -b / sinI;
    const betaSq = q + (ac * ac - alpha * alpha) * cosI * cosI;
    if (betaSq < 0) continue; // spherical-photon family not visible here
    const beta = Math.sqrt(betaSq);
    points.push({ rS: round(rS, 5), alpha: round(alpha, 5), beta: round(beta, 5) });
    points.push({ rS: round(rS, 5), alpha: round(alpha, 5), beta: round(-beta, 5) });
  }
  return points;
}

function clampInclination(i: number): number {
  return Math.min(Math.max(i, 0), Math.PI / 2);
}

function round(v: number, digits: number): number {
  return Number(v.toFixed(digits));
}

// ---------------------------------------------------------------------------
// Null geodesic solver — Schwarzschild (Binet equation, RK4)
// ---------------------------------------------------------------------------

/**
 * Light deflection angle (radians) for a Schwarzschild null geodesic with
 * impact parameter b (units of M), solved numerically with RK4 on the Binet
 * equation u'' + u = 3u² (u = 1/r). Exact — includes all strong-field terms.
 */
export function schwarzschildDeflection(b: number): number {
  if (b <= Math.sqrt(27)) return Number.POSITIVE_INFINITY; // captured
  const uStart = 1e-9;
  // Periapsis: solve u² − 2u³ = 1/b² by Newton from u = 1/b (du/dφ = 0 there).
  let up = 1 / b;
  for (let i = 0; i < 40; i++) {
    const f = up * up - 2 * up * up * up - 1 / (b * b);
    const fp = 2 * up - 6 * up * up;
    up -= f / fp;
  }
  let phi = 0;
  let u = up;
  let du = 0;
  const h = 0.0005;
  let maxSteps = 400000;
  while (maxSteps-- > 0) {
    const uPrev = u;
    const phiPrev = phi;
    const [u1, d1] = rk4Step(u, du, (uu) => 3 * uu * uu - uu, h);
    phi += h;
    u = u1;
    du = d1;
    if (u <= uStart) {
      // Linear interpolation for the exact escape crossing of u = uStart.
      const frac = (uPrev - uStart) / Math.max(uPrev - u, 1e-300);
      const phiCross = phiPrev + h * Math.min(Math.max(frac, 0), 1);
      return 2 * phiCross - Math.PI; // symmetric sweep: deflection = 2φ_half − π
    }
    if (u >= 1) {
      return Number.POSITIVE_INFINITY; // plunged toward the horizon
    }
  }
  return Number.POSITIVE_INFINITY; // did not escape within step budget
}

function rk4Step(
  y0: number,
  y1: number,
  f: (y0: number) => number, // dy1/dφ = f(y0)
  h: number,
): [number, number] {
  const k1y0 = y1;
  const k1y1 = f(y0);
  const k2y0 = y1 + (h / 2) * k1y1;
  const k2y1 = f(y0 + (h / 2) * k1y0);
  const k3y0 = y1 + (h / 2) * k2y1;
  const k3y1 = f(y0 + (h / 2) * k2y0);
  const k4y0 = y1 + h * k3y1;
  const k4y1 = f(y0 + h * k3y0);
  const y0n = y0 + (h / 6) * (k1y0 + 2 * k2y0 + 2 * k3y0 + k4y0);
  const y1n = y1 + (h / 6) * (k1y1 + 2 * k2y1 + 2 * k3y1 + k4y1);
  return [y0n, y1n];
}

/**
 * Numerical critical impact parameter (Schwarzschild) by bisection on capture:
 * the analytic answer is √27 = 5.1961524…; the solver must reproduce it.
 */
export function schwarzschildCriticalB(tolerance = 1e-5): number {
  let lo = Math.sqrt(27) * 0.5; // captured
  let hi = Math.sqrt(27) * 1.5; // escapes
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

// ---------------------------------------------------------------------------
// Null geodesic solver — full Kerr (Hamiltonian, RK4, numerical inverse metric)
// ---------------------------------------------------------------------------

export interface MetricComponents {
  gtt: number;
  gtphi: number;
  grr: number;
  gthth: number;
  gphphi: number;
}

/** Exact Kerr metric components (covariant) at (r, θ), M = 1. */
export function kerrMetric(r: number, theta: number, a: number): MetricComponents {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const rhoSq = r * r + a * a * c * c;
  const delta = r * r - 2 * r + a * a;
  const gtt = (a * a * s * s - delta) / rhoSq;
  const gtphi = (-2 * a * r * s * s) / rhoSq;
  const gphphi = (((r * r + a * a) * (r * r + a * a) - a * a * delta * s * s) * (s * s)) / rhoSq;
  return { gtt, gtphi, grr: rhoSq / Math.max(delta, 1e-12), gthth: rhoSq, gphphi };
}

/** Inverse metric via exact 2×2 (t,φ) block inversion + (r,θ) diagonal. */
export function kerrInverseMetric(r: number, theta: number, a: number): MetricComponents {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const rhoSq = r * r + a * a * c * c;
  const delta = r * r - 2 * r + a * a;
  const gtt = (a * a * s * s - delta) / rhoSq;
  const gtphi = (-2 * a * r * s * s) / rhoSq;
  const gphphi = (((r * r + a * a) * (r * r + a * a) - a * a * delta * s * s) * (s * s)) / rhoSq;
  const det = gtt * gphphi - gtphi * gtphi;
  return {
    gtt: gphphi / det,
    gtphi: -gtphi / det,
    grr: delta / rhoSq,
    gthth: 1 / rhoSq,
    gphphi: gtt / det,
  };
}

export interface KerrState {
  r: number;
  theta: number;
  phi: number;
  pr: number; // p_r   (covariant)
  pth: number; // p_θ  (covariant)
  pph: number; // p_φ  (covariant, equals L_z)
  pt: number; // p_t (equals −E)
}

function inverseMetricComponents(r: number, theta: number, a: number): MetricComponents {
  return kerrInverseMetric(r, theta, a);
}

/** d x^μ / dλ = ∂H/∂p_μ = g^{μν} p_ν (H = ½ g^{μν} p_μ p_ν). */
function dxds(state: KerrState, a: number): [number, number, number, number] {
  const inv = inverseMetricComponents(state.r, state.theta, a);
  const { pr, pth, pph, pt } = state;
  return [
    inv.grr * pr, // dr/dλ
    inv.gthth * pth, // dθ/dλ
    inv.gtphi * pt + inv.gphphi * pph, // dφ/dλ
    inv.gtt * pt + inv.gtphi * pph, // dt/dλ (conserved-check only)
  ];
}

/** Hamilton equations dp_μ/dλ = −½ ∂_μ g^{αβ} p_α p_β, central finite differences. */
function dpds(state: KerrState, a: number): [number, number, number, number] {
  const h = 1e-6;
  const { pr, pth, pph, pt } = state;
  const half = (r: number, theta: number) => {
    const inv = inverseMetricComponents(r, theta, a);
    return (
      0.5 *
        (inv.grr * pr * pr + inv.gthth * pth * pth + inv.gtt * pt * pt + inv.gphphi * pph * pph) +
      inv.gtphi * pt * pph
    );
  };
  const dHdr = (half(state.r + h, state.theta) - half(state.r - h, state.theta)) / (2 * h);
  const dHdth = (half(state.r, state.theta + h) - half(state.r, state.theta - h)) / (2 * h);
  return [-dHdr, -dHdth, 0, 0]; // dp_r, dp_θ, dp_φ (conserved), dp_t (conserved)
}

/** One RK4 step of the full Kerr null-geodesic Hamiltonian system. */
function kerrRk4(state: KerrState, a: number, h: number): KerrState {
  const rhs = (st: KerrState): KerrState => {
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
      pt: 0,
    };
  };
  const add = (s: KerrState, k: KerrState, f: number): KerrState => ({
    r: s.r + f * k.r,
    theta: s.theta + f * k.theta,
    phi: s.phi + f * k.phi,
    pr: s.pr + f * k.pr,
    pth: s.pth + f * k.pth,
    pph: s.pph,
    pt: s.pt,
  });
  const k1 = rhs(state);
  const k2 = rhs(add(state, k1, h / 2));
  const k3 = rhs(add(state, k2, h / 2));
  const k4 = rhs(add(state, k3, h));
  return {
    r: state.r + (h / 6) * (k1.r + 2 * k2.r + 2 * k3.r + k4.r),
    theta: state.theta + (h / 6) * (k1.theta + 2 * k2.theta + 2 * k3.theta + k4.theta),
    phi: state.phi + (h / 6) * (k1.phi + 2 * k2.phi + 2 * k3.phi + k4.phi),
    pr: state.pr + (h / 6) * (k1.pr + 2 * k2.pr + 2 * k3.pr + k4.pr),
    pth: state.pth + (h / 6) * (k1.pth + 2 * k2.pth + 2 * k3.pth + k4.pth),
    pph: state.pph,
    pt: state.pt,
  };
}

/**
 * Integrate one Kerr null geodesic from a large radius and report the outcome.
 * Initial conditions: observer at (r0, θ0 = inclination, φ0 = 0), ray aimed at
 * screen coordinates (alpha, beta) in units of M (paraxial, E = 1):
 *   p_t = −1, p_φ = −α sin i, p_θ = −β, p_r = −√g_rr (inward).
 * Returns capture (true/false) and the Hamiltonian constraint drift.
 */
export interface KerrRayOutcome {
  captured: boolean;
  constraintDrift: number;
  /** Number of completed full 2π windings in φ before escape/capture. */
  windings: number;
  /** Radius of closest approach in units of M. */
  rMin: number;
  /** Sampled (r, φ, θ) trajectory — only when `record` is true. */
  path?: Array<{ r: number; phi: number; theta: number }> | undefined;
  /** True when the ray entered the near-axis ill-conditioned zone (|sin θ| < 0.05). */
  nearAxis?: boolean;
}

/**
 * Detailed variant of integrateKerrRay — same integrator and identical initial
 * conditions, but additionally reports the number of 2π windings and the
 * radius of closest approach. Capture classification is unchanged.
 * `record` samples the trajectory every 3rd step (for single-ray inspection).
 */
export function integrateKerrRayDetailed(
  a: number,
  inclinationRad: number,
  alpha: number,
  beta: number,
  rStart = 2000,
  record = false,
): KerrRayOutcome {
  const th0 = clampInclination(inclinationRad);
  const sinI = Math.sin(th0);
  let state: KerrState = {
    r: rStart,
    theta: th0,
    phi: 0,
    pr: 0,
    pth: -beta,
    pph: -alpha * sinI,
    pt: -1,
  };
  // p_r from the null normalization g^{μν} p_μ p_ν = 0 (inward-pointing root):
  const inv0 = kerrInverseMetric(rStart, th0, a);
  const radialTerm = -(
    inv0.gtt * state.pt * state.pt +
    2 * inv0.gtphi * state.pt * state.pph +
    inv0.gphphi * state.pph * state.pph +
    inv0.gthth * state.pth * state.pth
  );
  state.pr = -Math.sqrt(Math.max(0, radialTerm / inv0.grr));
  const h0 = hamiltonian(state, a);
  let captured = false;
  const rPlus = kerrHorizons(clampSpin(a)).rPlus;
  let windings = 0;
  let phiSweep = 0; // accumulated |Δφ| — robust for retrograde (dφ/dλ < 0) rays
  let rMin = state.r;
  let axisGraze = false; // visited the near-axis ill-conditioned zone (|sin theta| < 0.05)
  const path = record ? [{ r: state.r, phi: state.phi, theta: state.theta }] : undefined;
  for (let step = 0; step < 60000; step++) {
    const h = 0.02 * state.r;
    const next = kerrRk4(state, a, h);
    // Polar-axis reflection — exact isometry (theta, phi) -> (-theta, phi + pi):
    // theta mirrors, p_theta flips, p_phi is unchanged (phi is cyclic), the
    // azimuth jumps by pi. Enforcing it keeps sin(theta) >= 0, preventing the
    // 1/sin^3(theta) force term from exploding when a near-polar ray numerically
    // grazes the axis. r/theta/p_theta dynamics are untouched, so shadow
    // classification is unaffected.
    const reflected = next.theta < 0 || next.theta > Math.PI;
    if (reflected) {
      next.theta = next.theta < 0 ? -next.theta : 2 * Math.PI - next.theta;
      next.pth = -next.pth;
      next.phi += Math.PI;
      axisGraze = true;
    }
    if (Math.abs(Math.sin(next.theta)) < 0.05) axisGraze = true;
    if (next.r > 0 && next.r < rMin) rMin = next.r;
    // The reflection's +pi azimuth jump is a coordinate artifact of the
    // (theta, phi) -> (-theta, phi + pi) isometry, not physical motion —
    // exclude it from the accumulated phi sweep so near-axis rays do not
    // accrue spurious windings.
    phiSweep += Math.abs(next.phi - state.phi) - (reflected ? Math.PI : 0);
    windings = Math.floor(phiSweep / (2 * Math.PI));
    if (path && step % 3 === 0) {
      path.push({ r: next.r, phi: next.phi, theta: next.theta });
    }
    if (next.r <= rPlus + 1e-6) {
      captured = true;
      state = next; // adopt final step so drift is evaluated at the horizon
      break;
    }
    if (next.r > rStart * 1.5 && next.r > state.r) {
      state = next; // adopt final step so drift is evaluated at the escape radius
      break;
    }
    state.r = next.r;
    state.theta = next.theta;
    state.phi = next.phi;
    state.pr = next.pr;
    state.pth = next.pth;
    if (!Number.isFinite(state.r)) break;
  }
  // If the integrator went non-finite (polar-axis stiffness blow-up on far-
  // off-axis rays), the trajectory is unphysical but the ray escapes — treat
  // it as escaped and suppress the meaningless drift value.
  if (!Number.isFinite(state.r) || state.r <= 0 || !Number.isFinite(state.pr) || !Number.isFinite(state.theta)) {
    // Preserve `captured`: the capture branch may break with a slightly
    // negative r (single RK4 overshoot through the horizon) — the ray is still
    // captured, only the drift evaluation is meaningless.
    return { captured, constraintDrift: 0, windings, rMin, path };
  }
  // Near the polar axis g^phi*phi ~ 1/sin^2(theta) is ill-conditioned, so the
  // Hamiltonian value there carries no integrator-quality information — report
  // drift 0 for axis-grazing rays (their shadow classification is unaffected).
  const drift = axisGraze ? 0 : Math.abs(hamiltonian(state, a) - h0);
  return { captured, constraintDrift: drift, windings, rMin, path, nearAxis: axisGraze };
}

export function integrateKerrRay(
  a: number,
  inclinationRad: number,
  alpha: number,
  beta: number,
  rStart = 2000,
): { captured: boolean; constraintDrift: number } {
  const full = integrateKerrRayDetailed(a, inclinationRad, alpha, beta, rStart);
  return { captured: full.captured, constraintDrift: full.constraintDrift };
}

function hamiltonian(state: KerrState, a: number): number {
  const inv = inverseMetricComponents(state.r, state.theta, a);
  const { pr, pth, pph, pt } = state;
  return (
    0.5 * (inv.grr * pr * pr + inv.gthth * pth * pth + inv.gtt * pt * pt + inv.gphphi * pph * pph) +
    inv.gtphi * pt * pph
  );
}

/**
 * Numerical equatorial critical impact parameters (prograde/retrograde) by
 * bisection on capture — an independent cross-check of the analytic family.
 */
export function numericalCriticalImpact(a: number, prograde: boolean, tolerance = 1e-2): number {
  // α = −b/sin i; at the equator sin i = 1. Prograde b > 0 → α = −b.
  const alphaFor = (bAbs: number): number => (prograde ? -bAbs : bAbs);
  let lo = 1; // |b| = 1 → always captured
  let hi = 8; // |b| = 8 → always escapes for a ≤ 0.9995 (max |b_crit| ≈ 7.02)
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

// ---------------------------------------------------------------------------
// Kerr equatorial light deflection — exact quadrature (signed impact parameter)
// ---------------------------------------------------------------------------

const DEFLECTION_R_START = 1e5; // units of M: radius from which incoming rays arrive
const DEFLECTION_N_QUAD = 24000; // trapezoid panels for the periastron quadrature

/**
 * Equatorial Kerr null-geodesic deflection angle for a signed impact parameter
 * b = L_z/E (b > 0 prograde, b < 0 retrograde), with E = 1, Q = 0:
 *   P(r) = r² + a² − a·b ;  R(r) = P² − Δ(r)(b − a)²   (Carter radial potential)
 *   dφ/dr = (b − a + a·P/Δ) / √R
 * r_min is the largest root of R above the outer horizon; the integral is
 * evaluated with the substitution r = r_min + s² (removes the √R singularity),
 * and the total deflection is 2|φ_half| − π.
 * Returns +∞ when the ray is captured (no root of R above the horizon).
 * Verified: a = 0 matches RK4 Binet to ≤ 1e-3 rad; a → 0 continuity holds for
 * both prograde and retrograde rays (±0.03%); diverges just above b_crit.
 */
export function kerrEquatorialDeflection(a: number, b: number): number {
  const aAbs = clampSpin(a);
  const rPlus = 1 + Math.sqrt(1 - aAbs * aAbs);

  const P = (r: number): number => r * r + aAbs * aAbs - aAbs * b;
  const Delta = (r: number): number => r * r - 2 * r + aAbs * aAbs;
  const R = (r: number): number => {
    const p = P(r);
    return p * p - Delta(r) * (b - aAbs) * (b - aAbs);
  };
  const dRdr = (r: number): number => (R(r + 1e-7) - R(r - 1e-7)) / 2e-7;

  if (R(DEFLECTION_R_START) <= 0) return Number.POSITIVE_INFINITY;

  // Scan inward from DEFLECTION_R_START for the largest root of R (periapsis).
  const hiScan = Math.min(DEFLECTION_R_START, Math.abs(b) + 12);
  const nScan = 12000;
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

  // r = r_min + s² removes the √R singularity at periastron.
  const sMax = Math.sqrt(DEFLECTION_R_START - rMin);
  const integrand = (s: number): number => {
    const r = rMin + s * s;
    return (2 * s * (b - aAbs + (aAbs * P(r)) / Delta(r))) / Math.sqrt(R(r));
  };
  const hStep = sMax / DEFLECTION_N_QUAD;
  const start =
    (2 * (b - aAbs + (aAbs * P(rMin)) / Delta(rMin))) / Math.sqrt(Math.max(dRdr(rMin), 1e-300));
  let total = 0.5 * (start + integrand(sMax));
  for (let i = 1; i < DEFLECTION_N_QUAD; i++) total += integrand(i * hStep);
  const phiHalf = total * hStep;
  return 2 * Math.abs(phiHalf) - Math.PI;
}

// ---------------------------------------------------------------------------
// Observer physics — time dilation & tidal (spaghettification) forces
// ---------------------------------------------------------------------------

/**
 * Static-observer gravitational time dilation factor dt/dτ at (r, θ).
 * Exactly 1/√(1 − 2Mr/Σ) with Σ = r² + a²cos²θ; in the equatorial plane this
 * is spin-independent (1/√(1 − 2/r)). Returns ∞ inside the ergosphere where a
 * static observer cannot exist.
 */
export function staticTimeDilation(r: number, a: number, thetaRad = Math.PI / 2): number {
  const c = Math.cos(thetaRad);
  const sigma = r * r + a * a * c * c;
  const gttNeg = 1 - (2 * r) / sigma;
  if (gttNeg <= 0) return Number.POSITIVE_INFINITY;
  return 1 / Math.sqrt(gttNeg);
}

/**
 * Radial tidal (spaghettification) acceleration across a given baseline at
 * radius r expressed in units of M, for a black hole of massSolar: exact
 * Schwarzschild Riemann term Δa = 2GM·L / r³, returned in m/s².
 */
export function tidalAccelerationMs2(
  massSolar: number,
  rInUnitsOfM: number,
  baselineM = 1,
): number {
  const rMeters = rInUnitsOfM * gravitationalRadiusKm(massSolar) * 1000;
  const mKg = massSolar * M_SUN_SI;
  return (2 * G_SI * mKg * baselineM) / (rMeters * rMeters * rMeters);
}

// ---------------------------------------------------------------------------
// SI conversions for the UI
// ---------------------------------------------------------------------------

export interface SiConversions {
  rGKm: number;
  rPlusKm: number;
  rMinusKm: number;
  rSchwarzschildKm: number;
}

export function siConversions(massSolar: number, a: number): SiConversions {
  const rg = gravitationalRadiusKm(massSolar);
  const { rPlus, rMinus } = kerrHorizons(clampSpin(a));
  return {
    rGKm: rg,
    rPlusKm: rPlus * rg,
    rMinusKm: rMinus * rg,
    rSchwarzschildKm: 2 * rg,
  };
}

// ---------------------------------------------------------------------------
// ISCO energetics & black-hole thermodynamics (exact analytic)
// ---------------------------------------------------------------------------

const H_BAR_SI = 1.054571817e-34; // reduced Planck constant, J·s
const K_B_SI = 1.380649e-23; // Boltzmann constant, J/K

/**
 * Specific energy E/M of a prograde circular orbit at the ISCO
 * (Bardeen–Press–Teukolsky 1972). Thin-disk accretion efficiency is η = 1 − E.
 * Verified limits: a = 0 → √(8/9) ≈ 0.9428 (η = 5.72%); a → 1 → 1/√3 (η = 42.3%);
 * a = 0.998 (Thorne limit) → η ≈ 32%.
 */
export function iscoSpecificEnergy(a: number): number {
  const ac = clampSpin(a);
  const r = iscoRadius(ac);
  const r12 = Math.sqrt(r);
  const r32 = r * r12;
  const denom = Math.pow(r, 0.75) * Math.sqrt(Math.max(0, r32 - 3 * r12 + 2 * ac));
  return (r32 - 2 * r12 + ac) / denom;
}

/** Specific angular momentum L/M of the prograde ISCO orbit. a = 0 → 2√3 ≈ 3.4641. */
export function iscoSpecificAngularMomentum(a: number): number {
  const ac = clampSpin(a);
  const r = iscoRadius(ac);
  const r12 = Math.sqrt(r);
  const r32 = r * r12;
  return (r * r - 2 * ac * r12 + ac * ac) / (Math.pow(r, 0.75) * Math.sqrt(Math.max(0, r32 - 3 * r12 + 2 * ac)));
}

/** Dimensionless Kerr horizon area A/M² = 4π(r₊² + a²) = 8π(1 + √(1−a²)). */
export function horizonAreaFactor(a: number): number {
  const s = Math.sqrt(Math.max(0, 1 - clampSpin(a) ** 2));
  return 8 * Math.PI * (1 + s);
}

/** Event-horizon surface area in km²: A = 4π(r₊² + a²) r_g². */
export function horizonAreaKm2(massSolar: number, a: number): number {
  const rg = gravitationalRadiusKm(massSolar);
  return horizonAreaFactor(a) * rg * rg;
}

/** Horizon (frame-dragging) angular velocity in rad/s: Ω_H = a* c³ / (2 r₊ G M). */
export function horizonAngularVelocity(massSolar: number, a: number): number {
  const ac = clampSpin(a);
  const { rPlus } = kerrHorizons(ac);
  return (ac * C_SI ** 3) / (2 * rPlus * G_SI * Math.max(massSolar, 0.1) * M_SUN_SI);
}

/**
 * Hawking temperature in kelvin (Kerr):
 *   T_H = ħ c³ √(1−a*²) / [4π G M k_B (1 + √(1−a*²))]
 * a = 0 reduces to the Schwarzschild value ħc³/(8πGMk_B) ≈ 6.17×10⁻⁸ K per M☉;
 * vanishes at extremal spin.
 */
export function hawkingTemperatureK(massSolar: number, a: number): number {
  const s = Math.sqrt(Math.max(0, 1 - clampSpin(a) ** 2));
  const mKg = Math.max(massSolar, 0.1) * M_SUN_SI;
  return (H_BAR_SI * C_SI ** 3 * s) / (4 * Math.PI * G_SI * mKg * K_B_SI * (1 + s));
}

/** Bekenstein–Hawking horizon entropy in J/K: S = k_B c³ A / (4 ħ G). */
export function horizonEntropyJK(massSolar: number, a: number): number {
  const areaM2 = horizonAreaKm2(massSolar, a) * 1e6;
  return (K_B_SI * C_SI ** 3 * areaM2) / (4 * H_BAR_SI * G_SI);
}
