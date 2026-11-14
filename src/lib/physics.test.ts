import { describe, expect, it } from "vitest";
import {
  criticalImpactParameter,
  iscoRadius,
  kerrHorizons,
  numericalCriticalImpact,
  photonSphereRadii,
  schwarzschildCriticalB,
  schwarzschildDeflection,
  shadowBoundaryCurve,
  shadowEquatorialDiameter,
  staticTimeDilation,
  tidalAccelerationMs2,
  gravitationalRadiusKm,
  hawkingTemperatureK,
  horizonAngularVelocity,
  horizonAreaFactor,
  horizonAreaKm2,
  horizonEntropyJK,
  iscoSpecificAngularMomentum,
  iscoSpecificEnergy,
} from "./physics";

/** Carter potential R and dR/dr for equatorial null rays (E = 1, M = 1). */
function carterR(r: number, a: number, b: number): number {
  const A = r * r + a * a - a * b;
  const delta = r * r - 2 * r + a * a;
  return A * A - delta * (b - a) * (b - a);
}
function carterdRdr(r: number, a: number, b: number): number {
  const A = r * r + a * a - a * b;
  return 4 * r * A - 2 * (r - 1) * (b - a) * (b - a);
}

describe("exact Kerr geometry (analytic)", () => {
  it("gives horizon radii r± = 1 ± √(1−a²)", () => {
    expect(kerrHorizons(0)).toEqual({ rPlus: 2, rMinus: 0 });
    const h = kerrHorizons(0.9);
    expect(h.rPlus).toBeCloseTo(1.435889894354067, 12);
    expect(h.rMinus).toBeCloseTo(0.564110105645933, 12);
  });

  it("photon orbits: 3M at a=0; approach M and 4M at a→1 (Bardeen limits)", () => {
    expect(photonSphereRadii(0).prograde).toBeCloseTo(3, 10);
    expect(photonSphereRadii(0).retrograde).toBeCloseTo(3, 10);
    const pro = photonSphereRadii(0.999).prograde;
    const retro = photonSphereRadii(0.999).retrograde;
    expect(pro).toBeGreaterThan(1.0);
    expect(pro).toBeLessThan(1.06);
    expect(retro).toBeGreaterThan(3.95);
    expect(retro).toBeLessThan(4.05);
  });

  it("critical impact parameters satisfy R = 0 and dR/dr = 0 (spherical-photon conditions)", () => {
    for (const a of [0.0, 0.3, 0.5, 0.7, 0.9, 0.98, 0.999]) {
      const { prograde, retrograde } = photonSphereRadii(a);
      for (const rPh of [prograde, retrograde]) {
        const b = criticalImpactParameter(a, rPh);
        expect(Math.abs(carterR(rPh, a, b))).toBeLessThan(1e-8);
        expect(Math.abs(carterdRdr(rPh, a, b))).toBeLessThan(1e-6);
      }
    }
  });

  it("b limits: ±√27 at a=0; prograde → 2 and retrograde → −7 as a → 1", () => {
    expect(Math.abs(criticalImpactParameter(0, 3))).toBeCloseTo(Math.sqrt(27), 10);
    const bPro = criticalImpactParameter(0.999, photonSphereRadii(0.999).prograde);
    expect(bPro).toBeGreaterThan(2.0);
    expect(bPro).toBeLessThan(2.2);
    const bRetro = criticalImpactParameter(0.999, photonSphereRadii(0.999).retrograde);
    expect(bRetro).toBeCloseTo(-7.0, 2);
  });

  it("equatorial shadow diameter: 2√27 at a=0; shrinks with spin", () => {
    expect(shadowEquatorialDiameter(0)).toBeCloseTo(10.392304845413264, 10);
    expect(shadowEquatorialDiameter(0.9)).toBeGreaterThan(9.0);
    expect(shadowEquatorialDiameter(0.9)).toBeLessThan(10.0);
    expect(shadowEquatorialDiameter(0.9)).toBeLessThan(shadowEquatorialDiameter(0));
  });

  it("ISCO: 6M at a=0, 1M at extremal, 4.233M at a=0.5 (Bardeen–Press–Teukolsky)", () => {
    expect(iscoRadius(0)).toBeCloseTo(6, 10);
    expect(iscoRadius(0.999)).toBeCloseTo(1.1817, 3);
    expect(iscoRadius(0.5)).toBeCloseTo(4.233, 3);
    expect(iscoRadius(0.9)).toBeCloseTo(2.3209, 3);
  });

  it("shadow boundary curve at i=90°: correct extents, α=0 crossing, closed tips", () => {
    const pts = shadowBoundaryCurve(0.9, Math.PI / 2, 200);
    expect(pts.length).toBeGreaterThan(100);
    const alphas = pts.map((p) => Math.abs(p.alpha));
    const betas = pts.map((p) => Math.abs(p.beta));
    // Horizontal extent: |α| up to the retrograde critical impact parameter ≈ 6.83.
    expect(Math.max(...alphas)).toBeGreaterThan(6.5);
    expect(Math.max(...alphas)).toBeLessThan(7.0);
    // The boundary crosses α ≈ 0 (L_z = 0 spherical photon orbit is visible edge-on).
    expect(Math.min(...alphas)).toBeLessThan(0.5);
    // Vertical extent stays below the Schwarzschild √27 value.
    expect(Math.max(...betas)).toBeGreaterThan(4.5);
    expect(Math.max(...betas)).toBeLessThan(5.3);
    // Dense sampling approaches the equatorial tips (η → 0 like √(r−r_ph)):
    // with 20000 samples the expected min |β| ≈ 0.09; allow generous headroom.
    const dense = shadowBoundaryCurve(0.9, Math.PI / 2, 20000);
    const minBeta = Math.min(...dense.map((p) => Math.abs(p.beta)));
    expect(minBeta).toBeLessThan(0.12);
    // Tips sit at α = ∓b_ph within sampling resolution.
    const atTip = dense.filter((p) => Math.abs(p.beta) < 0.12);
    for (const p of atTip) {
      expect(Math.abs(p.alpha)).toBeGreaterThan(2.7);
      expect(Math.abs(p.alpha)).toBeLessThan(7.0);
    }
  });
});

describe("numerical null geodesics — Schwarzschild (Binet + RK4)", () => {
  it("weak field matches Einstein 4M/b to better than 1%", () => {
    const deg = (schwarzschildDeflection(1000) * 180) / Math.PI;
    expect(deg).toBeGreaterThan(0.2290);
    expect(deg).toBeLessThan(0.2300);
  });

  it("b = 50 matches 2nd-order series 4/b + 15π/4b² + 128/3b³", () => {
    const b = 50;
    const series = 4 / b + (15 * Math.PI) / (4 * b * b) + 128 / (3 * b ** 3);
    expect(Math.abs(schwarzschildDeflection(b) - series)).toBeLessThan(5e-4);
  });

  it("deflection is monotonically decreasing in b", () => {
    expect(schwarzschildDeflection(6)).toBeGreaterThan(schwarzschildDeflection(10));
    expect(schwarzschildDeflection(10)).toBeGreaterThan(schwarzschildDeflection(50));
  });

  it("capture threshold reproduces √27 by bisection", () => {
    const bc = schwarzschildCriticalB(1e-4);
    expect(Math.abs(bc - Math.sqrt(27))).toBeLessThan(2e-3);
  });

  it("b just above √27 gives multi-loop deflection (> 180°)", () => {
    const deg = (schwarzschildDeflection(Math.sqrt(27) + 0.02) * 180) / Math.PI;
    expect(deg).toBeGreaterThan(180);
  });
});

describe("numerical null geodesics — Kerr Hamiltonian cross-check", () => {
  it("numerical critical |b| matches analytic spherical-photon values (a = 0.5)", () => {
    const a = 0.5;
    const { prograde, retrograde } = photonSphereRadii(a);
    const bPro = Math.abs(criticalImpactParameter(a, prograde));
    const bRetro = Math.abs(criticalImpactParameter(a, retrograde));
    const numPro = numericalCriticalImpact(a, true);
    const numRetro = numericalCriticalImpact(a, false);
    expect(Math.abs(numPro - bPro)).toBeLessThan(0.08);
    expect(Math.abs(numRetro - bRetro)).toBeLessThan(0.08);
  }, 120000);
});

describe("observer physics", () => {
  it("static time dilation: 1/√(1−2Mr/Σ), infinite inside ergosphere", () => {
    expect(staticTimeDilation(10, 0.9)).toBeCloseTo(1 / Math.sqrt(0.8), 10); // equator: spin-independent
    expect(staticTimeDilation(1.5, 0.9, Math.PI / 2)).toBe(Number.POSITIVE_INFINITY); // inside equatorial ergo (2M)
    const r = 1.5;
    const a = 0.9;
    const pole = 1 / Math.sqrt(1 - (2 * r) / (r * r + a * a)); // pole: Σ = r² + a²
    expect(staticTimeDilation(r, a, 0)).toBeCloseTo(pole, 10);
  });

  it("tidal acceleration uses exact 2GM·L/r³ with r in units of M", () => {
    const expected =
      (2 * 6.6743e-11 * 10 * 1.98847e30) /
      Math.pow(1000 * gravitationalRadiusKm(10) * 1000, 3);
    expect(tidalAccelerationMs2(10, 1000, 1)).toBeCloseTo(expected, 6);
  });
});

describe("ISCO energetics & black-hole thermodynamics", () => {
  it("ISCO specific energy: √(8/9) at a=0, decreasing with spin, → 1/√3 at extremal", () => {
    expect(iscoSpecificEnergy(0)).toBeCloseTo(Math.sqrt(8 / 9), 4);
    expect(iscoSpecificEnergy(0.5)).toBeLessThan(iscoSpecificEnergy(0));
    expect(iscoSpecificEnergy(0.9)).toBeLessThan(iscoSpecificEnergy(0.5));
    // Thorne's a* = 0.998 ceiling: η ≈ 32% → E ≈ 0.68, above the extremal 1/√3.
    expect(iscoSpecificEnergy(0.998)).toBeGreaterThan(1 / Math.sqrt(3));
    expect(iscoSpecificEnergy(0.998)).toBeLessThan(0.7);
  });

  it("ISCO specific angular momentum: 2√3 at a=0 (Schwarzschild)", () => {
    expect(iscoSpecificAngularMomentum(0)).toBeCloseTo(2 * Math.sqrt(3), 4);
  });

  it("horizon area: 16π M² at a=0; SI value matches 4π(2r_g)² for Schwarzschild", () => {
    expect(horizonAreaFactor(0)).toBeCloseTo(16 * Math.PI, 10);
    expect(horizonAreaFactor(0.9)).toBeLessThan(horizonAreaFactor(0));
    const expected = 4 * Math.PI * Math.pow(2 * gravitationalRadiusKm(10), 2);
    expect(horizonAreaKm2(10, 0)).toBeCloseTo(expected, 4);
  });

  it("horizon angular velocity: 0 at a=0, positive and finite at a=0.9", () => {
    expect(horizonAngularVelocity(10, 0)).toBe(0);
    const w = horizonAngularVelocity(10, 0.9);
    expect(w).toBeGreaterThan(0);
    expect(Number.isFinite(w)).toBe(true);
  });

  it("Hawking temperature: 6.17e-8 K per M☉ at a=0; decreases with spin; → 0 at extremal", () => {
    const t = hawkingTemperatureK(1, 0);
    expect(t).toBeGreaterThan(6.0e-8);
    expect(t).toBeLessThan(6.4e-8);
    expect(hawkingTemperatureK(1, 0.9)).toBeLessThan(t);
    // Exact analytic Kerr ratio: T(a)/T(0) = 2√(1−a²)/(1+√(1−a²)).
    const s = Math.sqrt(1 - 0.9995 ** 2);
    expect(hawkingTemperatureK(1, 0.9995) / t).toBeCloseTo((2 * s) / (1 + s), 10);
  });

  it("Bekenstein–Hawking entropy: S/k_B ≈ 1.05e77 for 1 M☉ Schwarzschild", () => {
    const sOverKb = horizonEntropyJK(1, 0) / 1.380649e-23;
    expect(sOverKb).toBeGreaterThan(1.0e77);
    expect(sOverKb).toBeLessThan(1.1e77);
  });
});
