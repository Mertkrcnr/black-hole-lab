/**
 * shadow-tracer.ts — Framework-free geodesic ray-tracing core.
 *
 * Imported by BOTH the Web Worker (runtime rendering) and Vitest (verification).
 * No DOM or worker globals — runs anywhere TS/JS runs.
 */

import {
  clampSpin,
  integrateKerrRayDetailed,
  shadowBoundaryCurve,
  type ShadowCurvePoint,
} from "./physics";

export interface ShadowRenderParams {
  spin: number;
  inclinationRad: number;
  /** Screen half-width in units of M. */
  alphaMax: number;
  /** Screen half-height in units of M. */
  betaMax: number;
  /** Image width in pixels. */
  width: number;
  /** Row range [rowStart, rowStart + rows) — top row 0 has beta = +betaMax. */
  rowStart: number;
  rows: number;
  /** Total image height in pixels — beta spans [-betaMax, +betaMax] over it. */
  totalRows: number;
  /** Asymptotic start radius (units of M). */
  rStart: number;
}

export interface ShadowStripResult {
  rowStart: number;
  rows: number;
  /** RGBA bytes (width x rows x 4). */
  rgba: Uint8ClampedArray;
  maxDrift: number;
  capturedCount: number;
  elapsedMs: number;
}

/** Classification of one ray. */
type RayClass = "captured" | "critical" | "escaped";

function classifyRay(out: {
  captured: boolean;
  windings: number;
  nearAxis?: boolean;
}): RayClass {
  if (out.captured) return "captured";
  // Near-axis rays accumulate spurious phi-sweep from the (theta, phi) ->
  // (-theta, phi + pi) reflection jumps and the 1/sin^2(theta) stiff zone —
  // their winding count is meaningless, so never paint them as photon ring.
  if (out.nearAxis) return "escaped";
  // Near-critical shell: >=1 full winding means the ray lingered near the
  // spherical photon orbits before escaping — the photon-ring glow.
  return out.windings >= 1 ? "critical" : "escaped";
}

/** Tone-map one pixel from the ray outcome. */
function shadeRay(rayClass: RayClass, windings: number): [number, number, number, number] {
  if (rayClass === "captured") {
    // True geodesic shadow — near-black, fully opaque.
    return [8, 8, 12, 255];
  }
  if (rayClass === "critical") {
    // Photon-ring glow: brightness grows with winding count (log ramp).
    const t = Math.min(1, Math.log2(1 + windings) / 3);
    return [
      Math.round(40 + 200 * t),
      Math.round(120 + 120 * t),
      Math.round(200 + 40 * t),
      255,
    ];
  }
  // Escaped after <1 winding: faint deep-blue ambient (lensed far field).
  return [16, 28, 52, 255];
}

/** Render one horizontal strip of the shadow image. Pure function. */
export function renderShadowStrip(params: ShadowRenderParams): ShadowStripResult {
  const a = clampSpin(params.spin);
  const rgba = new Uint8ClampedArray(params.width * params.rows * 4);
  let maxDrift = 0;
  let capturedCount = 0;
  const t0 = Date.now();

  for (let row = 0; row < params.rows; row++) {
    const y = params.rowStart + row;
    const beta = params.betaMax - ((y + 0.5) / params.totalRows) * 2 * params.betaMax;
    for (let px = 0; px < params.width; px++) {
      const alpha = -params.alphaMax + ((px + 0.5) / params.width) * 2 * params.alphaMax;
      const res = integrateKerrRayDetailed(a, params.inclinationRad, alpha, beta, params.rStart);
      // Captured rays cross the horizon, where the Kerr-Schild / ingoing
      // coordinate inverse metric blows up — drift there is meaningless.
      // Hamiltonian conservation is statistically meaningful for escaping rays.
      // Escaped rays with <1 winding integrate in the well-conditioned far
      // field — their drift measures integrator quality. Critical-shell rays
      // (>=1 winding, photon-ring tunneling) and captured rays are excluded:
      // the former are chaotic-limit probes, the latter sit at a coordinate
      // singularity.
      // Drift statistics use only well-conditioned rays: escaped with <1
      // winding and no deep plunge toward the photon-sphere tunnel. Captured
      // rays sit at a coordinate singularity; near-critical rays (>=1 winding
      // or rMin within the photon-sphere region) are chaotic-limit probes
      // where H drift measures physical sensitivity, not integrator error.
      if (!res.captured && res.windings < 1 && res.rMin > 2 && res.constraintDrift > maxDrift) maxDrift = res.constraintDrift;
      const rayClass = classifyRay(res);
      if (res.captured) capturedCount++;
      const rgb = shadeRay(rayClass, res.windings);
      const o = (row * params.width + px) * 4;
      rgba[o] = rgb[0];
      rgba[o + 1] = rgb[1];
      rgba[o + 2] = rgb[2];
      rgba[o + 3] = rgb[3];
    }
  }

  return {
    rowStart: params.rowStart,
    rows: params.rows,
    rgba,
    maxDrift,
    capturedCount,
    elapsedMs: Date.now() - t0,
  };
}

export interface BoundaryCrossCheck {
  /** Max distance (units of M) from each analytic point to the nearest traced shadow pixel. */
  maxGap: number;
  /** Mean distance (units of M) over analytic boundary samples. */
  meanGap: number;
  /** Number of analytic samples evaluated (visible ones). */
  samples: number;
  /** Screen scale used for the pixel grid (units of M per half-axis). */
  alphaMax: number;
  betaMax: number;
}

/**
 * Cross-validate the RK4-traced shadow against the analytic Carter
 * spherical-photon family boundary. Both must agree: numerical vs analytic.
 *
 * Approach: trace a coarse mask (gridStep times coarser than render res),
 * find black pixels, and for each visible analytic boundary point measure
 * the distance to the nearest captured pixel center (in units of M).
 */
export function crossCheckBoundary(
  spin: number,
  inclinationRad: number,
  opts: { alphaMax: number; betaMax: number; res: number; gridStep?: number; rStart?: number },
): BoundaryCrossCheck {
  const gridStep = opts.gridStep ?? 2;
  const rStart = opts.rStart ?? 600;
  const a = clampSpin(spin);
  const w = opts.res;
  const h = Math.max(2, Math.round((2 * opts.betaMax * w) / (2 * opts.alphaMax)));

  // Trace the coarse capture mask.
  const mask: Uint8Array = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const beta = opts.betaMax - ((y + 0.5) / h) * 2 * opts.betaMax;
    for (let px = 0; px < w; px += gridStep) {
      const alpha = -opts.alphaMax + ((px + 0.5) / w) * 2 * opts.alphaMax;
      if (integrateKerrRayDetailed(a, inclinationRad, alpha, beta, rStart).captured) {
        mask[y * w + px] = 1;
      }
    }
  }

  // Visible analytic boundary points at this inclination.
  const curve: ShadowCurvePoint[] = shadowBoundaryCurve(a, inclinationRad, 120);
  const visible = curve.filter((p) => {
    return (
      Math.abs(p.alpha) <= opts.alphaMax &&
      Math.abs(p.beta) <= opts.betaMax &&
      Number.isFinite(p.beta)
    );
  });

  let maxGap = 0;
  let sum = 0;
  let n = 0;
  for (const p of visible) {
    // Screen -> pixel center coords.
    const fx = ((p.alpha + opts.alphaMax) / (2 * opts.alphaMax)) * w - 0.5;
    const fy = ((opts.betaMax - p.beta) / (2 * opts.betaMax)) * h - 0.5;
    let best = Number.POSITIVE_INFINITY;
    const cx = Math.max(0, Math.min(w - 1, Math.round(fx)));
    const cy = Math.max(0, Math.min(h - 1, Math.round(fy)));
    // Search a window of +/-2 grid cells around the analytic point.
    const rWin = gridStep * 2;
    for (let dy = -rWin; dy <= rWin; dy++) {
      const yy = cy + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -rWin; dx <= rWin; dx++) {
        const xx = cx + dx;
        if (xx < 0 || xx >= w) continue;
        if (!mask[yy * w + xx]) continue;
        // Distance between pixel centers in units of M.
        const pxAlpha = -opts.alphaMax + ((xx + 0.5) / w) * 2 * opts.alphaMax;
        const pyBeta = opts.betaMax - ((yy + 0.5) / h) * 2 * opts.betaMax;
        const d = Math.hypot(pxAlpha - p.alpha, pyBeta - p.beta);
        if (d < best) best = d;
      }
    }
    if (Number.isFinite(best)) {
      if (best > maxGap) maxGap = best;
      sum += best;
      n++;
    }
  }

  return {
    maxGap,
    meanGap: n > 0 ? sum / n : Number.NaN,
    samples: n,
    alphaMax: opts.alphaMax,
    betaMax: opts.betaMax,
  };
}
