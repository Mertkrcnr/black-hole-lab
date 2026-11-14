import {
  clampSpin,
  criticalImpactParameter,
  ergosphereRadius,
  gravitationalRadiusKm,
  hawkingTemperatureK,
  horizonAngularVelocity,
  horizonAreaKm2,
  horizonEntropyJK,
  iscoRadius,
  iscoSpecificEnergy,
  kerrEquatorialDeflection,
  kerrHorizons,
  PC_KM,
  photonSphereRadii,
  RAD_TO_UAS,
  shadowEquatorialDiameter,
  shadowMeanDiameter,
  staticTimeDilation,
  tidalAccelerationMs2,
} from "./physics";

export type ViewMode =
  "overview" | "geometry" | "light-ray" | "spacetime" | "observation" | "real-data";

export interface Parameters {
  mass: number;
  spin: number;
  distance: number;
  cameraAngle: number;
  intensity: number;
}

export type ReadoutSource = "kerr" | "illustrative";

export interface Readout {
  id: string;
  label: string;
  symbol: string;
  value: string;
  unit: string;
  source: ReadoutSource;
  sourceLabel: string;
  note: string;
}

export const defaultParameters: Parameters = {
  mass: 10,
  spin: 0.65,
  distance: 50,
  cameraAngle: 8,
  intensity: 1,
};

export interface EhtObservation {
  shadowDiameterUas: number;
  shadowErrorUas: number;
  observationYear: number;
  telescopes: string;
  frequencyGhz: number;
  wavelengthMm: number;
}

export interface CatalogObject {
  id: string;
  name: string;
  location: string;
  mass: number;
  massError?: number;
  spin: number;
  spinError?: number;
  distanceStr: string;
  distanceMpc?: number;
  distanceKpc?: number;
  description: string;
  ehtData?: EhtObservation;
}

export const objects: CatalogObject[] = [
  {
    id: "m87",
    name: "M87*",
    location: "MESSIER 87 · VIRGO CLUSTER",
    mass: 6500000000,
    massError: 700000000,
    spin: 0.9,
    spinError: 0.05,
    distanceStr: "54.8 million light-years (16.8 Mpc)",
    distanceMpc: 16.8,
    description:
      "Supermassive black hole launching a 5,000-light-year relativistic plasma jet. Subject of the historic first direct black hole shadow image captured by the Event Horizon Telescope in 2019.",
    ehtData: {
      shadowDiameterUas: 42.0,
      shadowErrorUas: 3.0,
      observationYear: 2019,
      telescopes: "ALMA, APEX, IRAM 30m, JCMT, LMT, SMA, SMT, SPT",
      frequencyGhz: 230,
      wavelengthMm: 1.3,
    },
  },
  {
    id: "sagittarius",
    name: "Sagittarius A*",
    location: "MILKY WAY · GALACTIC CENTER",
    mass: 4297000,
    massError: 12000,
    spin: 0.6,
    spinError: 0.1,
    distanceStr: "26,700 light-years (8.28 kpc)",
    distanceKpc: 8.277,
    description:
      "Supermassive black hole at the dynamical center of the Milky Way galaxy. Directly confirmed and imaged by the Event Horizon Telescope collaboration in 2022.",
    ehtData: {
      shadowDiameterUas: 51.8,
      shadowErrorUas: 2.3,
      observationYear: 2022,
      telescopes: "ALMA, APEX, IRAM, NOEMA, JCMT, LMT, SMA, SMT, GLT",
      frequencyGhz: 230,
      wavelengthMm: 1.3,
    },
  },
  {
    id: "cygnus",
    name: "Cygnus X-1",
    location: "CYGNUS · HIGH-MASS X-RAY BINARY",
    mass: 21.2,
    massError: 2.2,
    spin: 0.95,
    spinError: 0.03,
    distanceStr: "7,240 light-years (2.22 kpc)",
    distanceKpc: 2.22,
    description:
      "Galactic stellar-mass black hole pulling matter from its blue supergiant companion star (HDE 226868). Features a near-extremal spin parameter (a* > 0.95) determined via X-ray reflection spectroscopy.",
  },
];

export const viewCatalog: {
  id: ViewMode;
  label: string;
  short: string;
  title: string;
  summary: string;
}[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    short: "ALL",
    title: "Laboratory View",
    summary: "Orbit to rotate camera · Scroll to zoom",
  },
  {
    id: "geometry",
    label: "GEOMETRY",
    short: "GEO",
    title: "Spacetime Geometry",
    summary: "Event horizons, ergosphere, and photon sphere boundaries",
  },
  {
    id: "light-ray",
    label: "LIGHT RAY",
    short: "RAY",
    title: "Light Trajectories",
    summary: "Null geodesics deflected by strong gravitational lensing",
  },
  {
    id: "spacetime",
    label: "SPACETIME",
    short: "SPACE",
    title: "Curved Spacetime",
    summary: "Gravitationally warped coordinate embedding grid",
  },
  {
    id: "observation",
    label: "OBSERVER",
    short: "OBS",
    title: "Observer Frame",
    summary: "Impact of distance, viewing inclination, and relativistic Doppler beaming",
  },
  {
    id: "real-data",
    label: "CATALOG",
    short: "DATA",
    title: "Scientific Catalog",
    summary: "Known astrophysical targets and laboratory parameters",
  },
];

export const geometryConcepts = [
  {
    id: "outer-horizon",
    name: "Outer Event Horizon",
    symbol: "r₊",
    blurb:
      "Surface of no escape. In Kerr metric, contracts inward as dimensionless spin increases toward 1.",
  },
  {
    id: "inner-horizon",
    name: "Inner Event Horizon",
    symbol: "r₋",
    blurb:
      "Inner Cauchy horizon boundary: r₋ = 1 − √(1 − a*²). Separates the interior core from the ergoregion.",
  },
  {
    id: "ergo",
    name: "Ergosphere",
    symbol: "rₑ",
    blurb:
      "Region where frame-dragging prevents any static observer. Extends to r = 2M at the equator and touches r₊ at poles.",
  },
  {
    id: "photon",
    name: "Photon Sphere",
    symbol: "rₚₕ",
    blurb:
      "Unstable circular orbit region where photons orbit before escaping to infinity or plunging across r₊.",
  },
  {
    id: "shadow",
    name: "Black Hole Shadow",
    symbol: "Rₛ",
    blurb:
      "Apparent dark silhouette cast against background light, amplified by critical light bending.",
  },
];

function formatFinite(value: number, digits: number) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

/**
 * Scientific Observables — 10 core + 6 advanced (ISCO energetics & thermodynamics)
 */
export function getReadouts(p: Parameters): Readout[] {
  const spinClamped = clampSpin(p.spin);
  const { rPlus, rMinus } = kerrHorizons(spinClamped);
  const rs = 2.0;
  const ergoEquator = 2.0;
  const { prograde: rPhPro, retrograde: rPhRetro } = photonSphereRadii(spinClamped);
  const bPro = criticalImpactParameter(spinClamped, rPhPro);
  const bRetro = criticalImpactParameter(spinClamped, rPhRetro);
  const photonSphere = (rPhPro + rPhRetro) / 2;
  const shadowRadius = shadowEquatorialDiameter(spinClamped) / 2;
  const shadowAngularDeg = ((2 * shadowRadius) / p.distance) * (180 / Math.PI);
  const weakDeflection = kerrEquatorialDeflection(spinClamped, p.distance) * (180 / Math.PI);
  const safeDilationDist = Math.max(p.distance, kerrHorizons(spinClamped).rPlus + 0.001);
  const schwarzschildDilation = staticTimeDilation(safeDilationDist, spinClamped);
  const safeMass = Math.max(p.mass, 0.1);
  const tidal = tidalAccelerationMs2(safeMass, p.distance, 1);
  const isco = iscoRadius(spinClamped);
  const eIsco = iscoSpecificEnergy(spinClamped);
  const efficiency = (1 - eIsco) * 100;
  const areaKm2 = horizonAreaKm2(safeMass, spinClamped);
  const omegaH = horizonAngularVelocity(safeMass, spinClamped);
  const tHawking = hawkingTemperatureK(safeMass, spinClamped);
  const sBH = horizonEntropyJK(safeMass, spinClamped);

  return [
    {
      id: "schwarzschild-radius",
      label: "SCHWARZSCHILD RADIUS",
      symbol: "rₛ",
      value: formatFinite(rs, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · a* = 0 limit",
      note: `Equivalent non-rotating Schwarzschild radius: rₛ = 2GM/c² = 2.953 km × (M/M☉) — for this mass ${(2 * gravitationalRadiusKm(safeMass)).toFixed(3)} km.`,
    },
    {
      id: "inner-event-horizon",
      label: "INNER EVENT HORIZON",
      symbol: "r₋",
      value: formatFinite(rMinus, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · exact (Boyer–Lindquist)",
      note: "Inner Cauchy horizon: r₋/M = 1 − √(1 − a*²). Vanishes for a* = 0, approaches M as a* → 1.",
    },
    {
      id: "outer-event-horizon",
      label: "OUTER EVENT HORIZON",
      symbol: "r₊",
      value: formatFinite(rPlus, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · exact (Boyer–Lindquist)",
      note: "Outer event horizon: r₊/M = 1 + √(1 − a*²). True boundary of causal disconnection.",
    },
    {
      id: "ergosphere-boundaries",
      label: "ERGOSPHERE BOUNDARIES",
      symbol: "rₑ(θ)",
      value: `${formatFinite(rPlus, 2)} – ${formatFinite(ergoEquator, 2)}`,
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · static limit (exact)",
      note: "Static limit: rₑ(θ)/M = 1 + √(1 − a*² cos²θ). Extends from r₊ at the poles to 2M at the equator.",
    },
    {
      id: "photon-sphere",
      label: "PHOTON SPHERE",
      symbol: "rₚₕ",
      value: `${formatFinite(rPhPro, 3)} / ${formatFinite(rPhRetro, 3)}`,
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · Bardeen (1973)",
      note: "Equatorial circular photon orbits (Bardeen 1973): prograde/retrograde pair. r_ph = 3M for a*=0; splits with spin: prograde → M, retrograde → 4M as a* → 1.",
    },
    {
      id: "shadow-radius",
      label: "SHADOW RADIUS",
      symbol: "Rₛ",
      value: formatFinite(shadowRadius, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · spherical-photon family",
      note: "Equatorial shadow radius Rₛ = (|b_retro| + b_pro)/2 from the exact spherical-photon family (√27/2 ≈ 2.598 M for a* = 0, → 4.5 M as a* → 1).",
    },
    {
      id: "shadow-angular-size",
      label: "SHADOW ANGULAR SIZE",
      symbol: "θₛ",
      value: formatFinite(shadowAngularDeg, 2),
      unit: "deg",
      source: "kerr",
      sourceLabel: "Exact Kerr projection",
      note: "Apparent angular diameter subtended at observer distance r: θₛ ≈ 2 Rₛ / r (exact equatorial shadow diameter).",
    },
    {
      id: "deflection-angle",
      label: "DEFLECTION ANGLE",
      symbol: "α",
      value: formatFinite(weakDeflection, 2),
      unit: "deg",
      source: "kerr",
      sourceLabel: "Exact Kerr quadrature",
      note: "Exact Kerr equatorial null-geodesic deflection for a ray with impact parameter b = r at grazing incidence (weak field → 4M/b).",
    },
    {
      id: "time-dilation",
      label: "TIME DILATION",
      symbol: "Δt",
      value: formatFinite(schwarzschildDilation, 4),
      unit: "×",
      source: "kerr",
      sourceLabel: "Kerr · static observer",
      note: "Gravitational clock dilation for a static observer: dt/dτ = 1/√(1 − 2Mr/Σ), Σ = r² + a²cos²θ (∞ inside the ergosphere).",
    },
    {
      id: "tidal-acceleration",
      label: "TIDAL ACCELERATION",
      symbol: "Δg",
      value: tidal.toExponential(2),
      unit: "m/s²",
      source: "kerr",
      sourceLabel: "Kerr · Riemann exact",
      note: "Radial Riemann tidal acceleration Δa = 2GM·L/r³ across a 1-meter baseline at distance r (SI units).",
    },
    {
      id: "isco-radius",
      label: "ISCO RADIUS",
      symbol: "r_isco",
      value: formatFinite(isco, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · Bardeen–Press–Teukolsky",
      note: "Innermost stable circular orbit (prograde): 6M for a* = 0, → 1M for extremal spin. Sets the inner edge of a thin accretion disk; the retrograde ISCO grows up to 9M.",
    },
    {
      id: "accretion-efficiency",
      label: "ACCRETION EFFICIENCY",
      symbol: "η",
      value: formatFinite(efficiency, 2),
      unit: "%",
      source: "kerr",
      sourceLabel: "Kerr · ISCO binding energy",
      note: "Thin-disk radiative efficiency η = 1 − E_ISCO: the fraction of rest-mass energy radiated as matter spirals in to the ISCO. 5.72% for Schwarzschild; ≈32% at Thorne's a* = 0.998 limit; → 42.3% for extremal spin. This number powers quasars.",
    },
    {
      id: "horizon-area",
      label: "HORIZON AREA",
      symbol: "A₊",
      value: areaKm2.toExponential(3),
      unit: "km²",
      source: "kerr",
      sourceLabel: "Kerr · Smarr exact",
      note: "Event-horizon surface area A = 4π(r₊² + a²) r_g². Grows with mass, shrinks with spin. Hawking's area theorem: no classical process can ever reduce it.",
    },
    {
      id: "horizon-angular-velocity",
      label: "HORIZON ANGULAR VELOCITY",
      symbol: "Ω_H",
      value: omegaH.toExponential(3),
      unit: "rad/s",
      source: "kerr",
      sourceLabel: "Kerr · exact",
      note: "Frame-dragging rate at the horizon: Ω_H = a* c³/(2 r₊ GM). The engine of rotational energy extraction — Penrose process and Blandford–Znajek relativistic jets. Zero for Schwarzschild.",
    },
    {
      id: "hawking-temperature",
      label: "HAWKING TEMPERATURE",
      symbol: "T_H",
      value: tHawking.toExponential(3),
      unit: "K",
      source: "kerr",
      sourceLabel: "Kerr · quantum (QFT in curved space)",
      note: "T_H = ħc³√(1−a*²)/[4π G M k_B (1+√(1−a*²))]. ≈ 6.2×10⁻⁸ K per solar mass — cooler for heavier holes; vanishes at extremal spin. A quantum effect riding on an otherwise classical spacetime.",
    },
    {
      id: "bekenstein-hawking-entropy",
      label: "BEKENSTEIN–HAWKING ENTROPY",
      symbol: "S_BH",
      value: sBH.toExponential(3),
      unit: "J/K",
      source: "kerr",
      sourceLabel: "Kerr · holographic bound",
      note: "S = k_B c³ A/(4ħG): entropy scales with horizon AREA, not volume. S/k_B ≈ 1.05×10⁷⁷ per solar mass — the largest entropy of any object its size, saturating the holographic bound.",
    },
  ];
}

/**
 * Theoretical EHT Angular Shadow Diameter Calculation in Microarcseconds (μas)
 */
export function calculateEhtTheoreticalShadow(
  massSolar: number,
  distanceMpcOrKpc: number,
  isMpc: boolean,
  spin: number,
): {
  theoreticalShadowUas: number;
  gravitationalRadiusKm: number;
  thetaG_uas: number;
} {
  // Exact gravitational radius r_g = GM/c^2 in km.
  const r_g_km = gravitationalRadiusKm(massSolar);

  // Observer distance in km (1 pc = 3.0857e13 km).
  const distKm = isMpc ? distanceMpcOrKpc * PC_KM * 1e6 : distanceMpcOrKpc * PC_KM * 1e3;

  // Angular scale theta_g = r_g / D in radians, converted to μas.
  const thetaG_uas = (r_g_km / distKm) * RAD_TO_UAS;

  // Exact equatorial Kerr shadow diameter from the spherical-photon family
  // (|b_retro| + b_pro), averaged over inclination per EHT convention:
  // D ≈ 2√27 · (1 − 0.02 a*²) (equatorial mean-diameter approximation).
  const spinClamped = clampSpin(spin);
  const shadowDiameterFactor = shadowMeanDiameter(spinClamped);

  const theoreticalShadowUas = shadowDiameterFactor * thetaG_uas;

  return {
    theoreticalShadowUas,
    gravitationalRadiusKm: r_g_km,
    thetaG_uas,
  };
}

/**
 * 2D Light Ray Geodesic Deflection Curve Data
 * Compares exact relativistic strong-field deflection angle vs Einstein 4M/b weak-field limit
 */
export interface DeflectionPoint {
  impactParameter: number; // in GM/c^2
  exactDeflectionDeg: number; // degrees
  weakDeflectionDeg: number; // degrees
}

export function getLightDeflectionCurve(spin: number): DeflectionPoint[] {
  const points: DeflectionPoint[] = [];
  const spinClamped = clampSpin(spin);
  // Exact critical impact parameter of the prograde photon orbit.
  const { prograde } = photonSphereRadii(spinClamped);
  const bCritPro = criticalImpactParameter(spinClamped, prograde);
  // Sample the prograde branch from just above its critical b outward.
  const bStart = bCritPro + 0.15;

  for (let b = bStart; b <= 30; b += b < 8 ? 0.35 : b < 16 ? 1.0 : 2.5) {
    // Einstein weak field: alpha ≈ 4 / b radians.
    const alphaWeakDeg = (4 / b) * (180 / Math.PI);
    // Exact Kerr equatorial deflection (prograde ray, b > 0).
    const alphaExact = kerrEquatorialDeflection(spinClamped, b);
    const alphaExactDeg = Number.isFinite(alphaExact)
      ? Math.min((alphaExact * 180) / Math.PI, 3600)
      : Number.NaN;

    points.push({
      impactParameter: parseFloat(b.toFixed(2)),
      exactDeflectionDeg: parseFloat(alphaExactDeg.toFixed(1)),
      weakDeflectionDeg: parseFloat(alphaWeakDeg.toFixed(1)),
    });
  }

  return points;
}

/**
 * 2D Coordinate Points for Ergosphere, Outer Horizon, and Inner Horizon
 * Meridional cross-section in Cartesian (x, z) coordinates where z is rotation axis
 */
export interface HorizonCrossSectionPoint {
  angleDeg: number;
  ergoX: number;
  ergoZ: number;
  outerHorizonX: number;
  outerHorizonZ: number;
  innerHorizonX: number;
  innerHorizonZ: number;
}

export function getErgosphereCrossSection(spin: number): HorizonCrossSectionPoint[] {
  const points: HorizonCrossSectionPoint[] = [];
  const spinClamped = clampSpin(spin);
  const { rPlus, rMinus } = kerrHorizons(spinClamped);

  for (let deg = 0; deg <= 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const cosTheta = Math.cos(rad);
    const sinTheta = Math.sin(rad);

    // Ergosphere boundary (exact static limit): r_e(θ) = 1 + √(1 − a² cos²θ)
    const rErgo = ergosphereRadius(spinClamped, rad);

    points.push({
      angleDeg: deg,
      ergoX: parseFloat((rErgo * sinTheta).toFixed(3)),
      ergoZ: parseFloat((rErgo * cosTheta).toFixed(3)),
      outerHorizonX: parseFloat((rPlus * sinTheta).toFixed(3)),
      outerHorizonZ: parseFloat((rPlus * cosTheta).toFixed(3)),
      innerHorizonX: parseFloat((rMinus * sinTheta).toFixed(3)),
      innerHorizonZ: parseFloat((rMinus * cosTheta).toFixed(3)),
    });
  }

  return points;
}

/**
 * 2D Spacetime Curvature: Time Dilation & Tidal Spaghettification Profile
 */
export interface CurvatureProfilePoint {
  radiusM: number;
  timeDilation: number;
  tidalAccMs2: number;
  humanThresholdMs2: number;
}

export function getSpacetimeCurvatureData(
  massSolar: number,
  spin: number,
): CurvatureProfilePoint[] {
  const points: CurvatureProfilePoint[] = [];
  const spinClamped = clampSpin(spin);
  const { rPlus } = kerrHorizons(spinClamped);
  const safeMass = Math.max(massSolar, 0.1);

  const rStart = rPlus + 0.05;
  const rEnd = 50;

  for (let r = rStart; r <= rEnd; r += r < 6 ? 0.3 : r < 15 ? 1.0 : 4.0) {
    // Exact static-observer time dilation (equatorial Kerr value).
    const timeDilation = staticTimeDilation(r, spinClamped);
    // Exact Riemann tidal acceleration across a 1 m baseline (SI units).
    const tidalAcc = tidalAccelerationMs2(safeMass, r, 1);

    points.push({
      radiusM: parseFloat(r.toFixed(2)),
      timeDilation: parseFloat(Math.min(timeDilation, 25).toFixed(2)),
      tidalAccMs2: parseFloat(Math.min(tidalAcc, 1000).toFixed(2)),
      humanThresholdMs2: 10.0, // 10 m/s^2 lethal spaghettification shear threshold
    });
  }

  return points;
}

/**
 * Boyer-Lindquist Metric Tensor Components at given (r, theta)
 */
export function getBoyerLindquistMetric(r: number, thetaDeg: number, massM: number, spinA: number) {
  const thetaRad = (thetaDeg * Math.PI) / 180;
  const sinTh = Math.sin(thetaRad);
  const cosTh = Math.cos(thetaRad);

  const rhoSq = r * r + spinA * spinA * cosTh * cosTh;
  const delta = r * r - 2 * massM * r + spinA * spinA;

  const g_tt = -(1 - (2 * massM * r) / rhoSq);
  const g_tphi = -(2 * massM * spinA * r * sinTh * sinTh) / rhoSq;
  const g_rr = rhoSq / Math.max(delta, 0.0001);
  const g_thth = rhoSq;
  const g_phiphi =
    (r * r + spinA * spinA + (2 * massM * spinA * spinA * r * sinTh * sinTh) / rhoSq) *
    sinTh *
    sinTh;

  return {
    rhoSq,
    delta,
    g_tt: g_tt.toFixed(4),
    g_tphi: g_tphi.toFixed(4),
    g_rr: g_rr.toFixed(4),
    g_thth: g_thth.toFixed(4),
    g_phiphi: g_phiphi.toFixed(4),
  };
}
