import {
  calculateEhtTheoreticalShadow,
  objects,
  defaultParameters,
  getReadouts,
  getLightDeflectionCurve,
  getErgosphereCrossSection,
  getSpacetimeCurvatureData,
  getBoyerLindquistMetric,
} from "../src/lib/lab-data";
import {
  kerrEquatorialDeflection,
  shadowEquatorialDiameter,
  photonSphereRadii,
  criticalImpactParameter,
  staticTimeDilation,
} from "../src/lib/physics";

console.log("=== EHT comparison (exact engine) ===");
for (const o of objects) {
  if (!o.ehtData) continue;
  const isMpc = !!o.distanceMpc;
  const dist = isMpc ? o.distanceMpc! : o.distanceKpc!;
  const { theoreticalShadowUas, thetaG_uas } = calculateEhtTheoreticalShadow(
    o.mass,
    dist,
    isMpc,
    o.spin,
  );
  const obs = o.ehtData.shadowDiameterUas;
  const err = o.ehtData.shadowErrorUas;
  const sigma = Math.abs(theoreticalShadowUas - obs) / err;
  console.log(
    `${o.id}: theo=${theoreticalShadowUas.toFixed(2)} μas  obs=${obs} ±${err}  ` +
      `delta=${(theoreticalShadowUas - obs).toFixed(2)}  sigma=${sigma.toFixed(2)}σ  ` +
      `theta_g=${thetaG_uas.toFixed(4)} μas`,
  );
}

console.log("\n=== getReadouts(defaultParameters) — engine-driven values ===");
const rows = getReadouts(defaultParameters);
for (const row of rows) {
  console.log(
    `${row.label.padEnd(24)} ${row.value} ${row.unit.padEnd(6)} [${row.source}] ${row.sourceLabel}`,
  );
}

console.log("\n=== getLightDeflectionCurve(0.65) — first/last points ===");
const curve = getLightDeflectionCurve(0.65);
console.log(`n=${curve.length}`);
console.log(`first: b=${curve[0].impactParameter} exact=${curve[0].exactDeflectionDeg} deg`);
console.log(
  `last:  b=${curve[curve.length - 1].impactParameter} exact=${curve[curve.length - 1].exactDeflectionDeg} deg`,
);

console.log("\n=== getSpacetimeCurvatureData(10, 0.65) spot checks ===");
const curv = getSpacetimeCurvatureData(10, 0.65);
console.log(
  `n=${curv.length}, first: r=${curv[0].radiusM} dil=${curv[0].timeDilation} tidal=${curv[0].tidalAccMs2.toExponential(2)}`,
);
console.log(
  `last:  r=${curv[curv.length - 1].radiusM} dil=${curv[curv.length - 1].timeDilation} tidal=${curv[curv.length - 1].tidalAccMs2.toExponential(2)}`,
);

console.log("\n=== getErgosphereCrossSection(0.9) — equator & poles ===");
const ergo = getErgosphereCrossSection(0.9);
const eq = ergo.find((c) => c.angleDeg === 90)!;
const pole = ergo.find((c) => c.angleDeg === 0)!;
console.log(`equator: ergoX=${eq.ergoX} (expect 2.000)`);
console.log(
  `pole:    ergoZ=${pole.ergoZ} (expect 1 + sqrt(1-0.81) = ${(1 + Math.sqrt(1 - 0.81)).toFixed(3)})`,
);

console.log("\n=== cross-checks: deflection vs analytic limits ===");
const a = 0.65;
const { prograde, retrograde } = photonSphereRadii(a);
const bPro = criticalImpactParameter(a, prograde);
const bRetro = criticalImpactParameter(a, retrograde);
console.log(
  `a=0.65: b_pro=+${bPro.toFixed(4)}  b_retro=${bRetro.toFixed(4)}  D_eq=${shadowEquatorialDiameter(a).toFixed(4)} M`,
);
console.log(
  `defl(b=50): ${((kerrEquatorialDeflection(a, 50) * 180) / Math.PI).toFixed(4)} deg (weak 4/50 = ${(((4 / 50) * 180) / Math.PI).toFixed(4)} deg)`,
);
console.log(
  `defl just above b_pro: ${((kerrEquatorialDeflection(a, bPro + 0.02) * 180) / Math.PI).toFixed(1)} deg (divergent regime)`,
);
console.log(`dilation(50) = ${staticTimeDilation(50, a).toFixed(6)} (weak 1.020408)`);
