import { describe, expect, it } from "vitest";
import {
  calculateEhtTheoreticalShadow,
  defaultParameters,
  getBoyerLindquistMetric,
  getErgosphereCrossSection,
  getLightDeflectionCurve,
  getReadouts,
  getSpacetimeCurvatureData,
  objects,
} from "./lab-data";

describe("scientific results interface model", () => {
  it("provides all 16 scientific observables (10 core + 6 advanced) with finite readouts", () => {
    const rows = getReadouts(defaultParameters);
    expect(rows).toHaveLength(16);
    // The 10 core observables must keep their canonical positions 0..9.
    const coreIds = [
      "schwarzschild-radius",
      "inner-event-horizon",
      "outer-event-horizon",
      "ergosphere-boundaries",
      "photon-sphere",
      "shadow-radius",
      "shadow-angular-size",
      "deflection-angle",
      "time-dilation",
      "tidal-acceleration",
    ];
    coreIds.forEach((id, i) => expect(rows[i]?.id).toBe(id));
    for (const row of rows) {
      expect(row.label).toBeTruthy();
      expect(row.symbol).toBeTruthy();
      expect(row.unit).toBeTruthy();
      expect(row.note).toBeTruthy();
      expect(row.source).toBe("kerr");
    }
  });

  it("exposes ISCO energetics: Schwarzschild efficiency 5.72%, extremal 42.3%", () => {
    const eff = (spin: number) => {
      const row = getReadouts({ ...defaultParameters, spin }).find(
        (r) => r.id === "accretion-efficiency",
      );
      return Number(row?.value);
    };
    expect(eff(0)).toBeCloseTo(5.72, 2);
    expect(eff(0.998)).toBeGreaterThan(30);
    expect(eff(0.9995)).toBeCloseTo(35.55, 1); // at clampSpin ceiling a*=0.9995; the 42.3% limit is reached only as a*->1
  });

  it("calculates the Schwarzschild radius at 2 GM/c²", () => {
    const rows = getReadouts(defaultParameters);
    const rs = rows.find((r) => r.id === "schwarzschild-radius");
    expect(rs?.value).toBe("2.000");
  });

  it("returns the non-rotating outer event horizon at 2 GM/c² and inner horizon at 0", () => {
    const nonRotating = getReadouts({ ...defaultParameters, spin: 0 });
    const outer = nonRotating.find((r) => r.id === "outer-event-horizon");
    const inner = nonRotating.find((r) => r.id === "inner-event-horizon");
    expect(outer?.value).toBe("2.000");
    expect(inner?.value).toBe("0.000");
  });

  it("computes realistic theoretical shadow size for M87* (~40-42 μas)", () => {
    const m87 = objects.find((o) => o.id === "m87")!;
    const { theoreticalShadowUas } = calculateEhtTheoreticalShadow(
      m87.mass,
      m87.distanceMpc!,
      true,
      m87.spin,
    );
    expect(theoreticalShadowUas).toBeGreaterThan(38);
    expect(theoreticalShadowUas).toBeLessThan(45);
  });

  it("computes realistic theoretical shadow size for Sgr A* (~48-54 μas)", () => {
    const sgr = objects.find((o) => o.id === "sagittarius")!;
    const { theoreticalShadowUas } = calculateEhtTheoreticalShadow(
      sgr.mass,
      sgr.distanceKpc!,
      false,
      sgr.spin,
    );
    expect(theoreticalShadowUas).toBeGreaterThan(48);
    expect(theoreticalShadowUas).toBeLessThan(55);
  });

  it("generates 2D light deflection curve data", () => {
    const curve = getLightDeflectionCurve(0.65);
    expect(curve.length).toBeGreaterThan(5);
    expect(curve[0]!.exactDeflectionDeg).toBeGreaterThan(
      curve[curve.length - 1]!.exactDeflectionDeg,
    );
  });

  it("generates 2D ergosphere cross-section coordinates", () => {
    const coords = getErgosphereCrossSection(0.9);
    expect(coords.length).toBeGreaterThan(10);
    // At equator (theta = 90), ergo radius is 2M
    const equator = coords.find((c) => c.angleDeg === 90);
    expect(equator?.ergoX).toBeCloseTo(2.0, 1);
  });

  it("evaluates Boyer-Lindquist metric tensor components", () => {
    const metric = getBoyerLindquistMetric(10, 45, 1, 0.5);
    expect(Number(metric.g_tt)).toBeLessThan(0);
    expect(Number(metric.g_rr)).toBeGreaterThan(0);
    expect(Number(metric.g_thth)).toBeGreaterThan(0);
    expect(Number(metric.g_phiphi)).toBeGreaterThan(0);
  });

  it("first-principles shadow diameter lands within the published EHT 1σ error bar", () => {
    const m87 = objects.find((o) => o.id === "m87")!;
    const m87T = calculateEhtTheoreticalShadow(m87.mass, m87.distanceMpc!, true, m87.spin);
    expect(Math.abs(m87T.theoreticalShadowUas - m87.ehtData!.shadowDiameterUas))
      .toBeLessThanOrEqual(m87.ehtData!.shadowErrorUas);
    const sgr = objects.find((o) => o.id === "sagittarius")!;
    const sgrT = calculateEhtTheoreticalShadow(sgr.mass, sgr.distanceKpc!, false, sgr.spin);
    expect(Math.abs(sgrT.theoreticalShadowUas - sgr.ehtData!.shadowDiameterUas))
      .toBeLessThanOrEqual(sgr.ehtData!.shadowErrorUas);
  });
});
