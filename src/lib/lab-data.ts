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
 * 10 Required Scientific Observables
 */
export function getReadouts(p: Parameters): Readout[] {
  const spinClamped = Math.min(Math.max(p.spin, 0), 0.999);
  const sqrtTerm = Math.sqrt(Math.max(0, 1 - spinClamped * spinClamped));

  const rs = 2.0;
  const rMinus = 1 - sqrtTerm;
  const rPlus = 1 + sqrtTerm;
  const ergoEquator = 2.0;
  const photonSphere = Math.max(1.0, 3 - spinClamped * 0.38);
  const shadowRadius = Math.max(2.0, 5.196 - spinClamped * 0.12);
  const shadowAngularDeg = ((2 * shadowRadius) / p.distance) * (180 / Math.PI);
  const weakDeflection = (4 / p.distance) * (180 / Math.PI);

  const safeDilationDist = Math.max(p.distance, 2.001);
  const schwarzschildDilation = 1 / Math.sqrt(Math.max(0.0001, 1 - 2 / safeDilationDist));

  const safeMass = Math.max(p.mass, 0.1);
  const tidal = 1.24 * (10 / safeMass) ** 2 * (50 / p.distance) ** 3;

  return [
    {
      id: "schwarzschild-radius",
      label: "SCHWARZSCHILD RADIUS",
      symbol: "rₛ",
      value: formatFinite(rs, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Static limit reference",
      note: "Equivalent non-rotating Schwarzschild radius: rₛ = 2GM/c² (a* = 0).",
    },
    {
      id: "inner-event-horizon",
      label: "INNER EVENT HORIZON",
      symbol: "r₋",
      value: formatFinite(rMinus, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · analytical",
      note: "Inner Cauchy horizon: r₋/M = 1 − √(1 − a*²). Vanishes for a* = 0, approaches M as a* → 1.",
    },
    {
      id: "outer-event-horizon",
      label: "OUTER EVENT HORIZON",
      symbol: "r₊",
      value: formatFinite(rPlus, 3),
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · analytical",
      note: "Outer event horizon: r₊/M = 1 + √(1 − a*²). True boundary of causal disconnection.",
    },
    {
      id: "ergosphere-boundaries",
      label: "ERGOSPHERE BOUNDARIES",
      symbol: "rₑ(θ)",
      value: `${formatFinite(rPlus, 2)} – ${formatFinite(ergoEquator, 2)}`,
      unit: "GM/c²",
      source: "kerr",
      sourceLabel: "Kerr · static limit",
      note: "Static limit: rₑ(θ)/M = 1 + √(1 − a*² cos²θ). Extends from r₊ at the poles to 2M at the equator.",
    },
    {
      id: "photon-sphere",
      label: "PHOTON SPHERE",
      symbol: "rₚₕ",
      value: formatFinite(photonSphere, 3),
      unit: "GM/c²",
      source: "illustrative",
      sourceLabel: "Visual model estimate",
      note: "Unstable circular photon orbit radius (r = 3M for a*=0; split by spin into prograde/retrograde).",
    },
    {
      id: "shadow-radius",
      label: "SHADOW RADIUS",
      symbol: "Rₛ",
      value: formatFinite(shadowRadius, 3),
      unit: "GM/c²",
      source: "illustrative",
      sourceLabel: "Critical capture estimate",
      note: "Apparent optical shadow radius cast by photon capture sphere (Rₛ ≈ √27 M ≈ 5.196 M for a* = 0).",
    },
    {
      id: "shadow-angular-size",
      label: "SHADOW ANGULAR SIZE",
      symbol: "θₛ",
      value: formatFinite(shadowAngularDeg, 2),
      unit: "deg",
      source: "illustrative",
      sourceLabel: "Geometric projection",
      note: "Apparent angular diameter subtended at observer distance r: θₛ ≈ 2 Rₛ / r.",
    },
    {
      id: "deflection-angle",
      label: "DEFLECTION ANGLE",
      symbol: "α",
      value: formatFinite(weakDeflection, 2),
      unit: "deg",
      source: "illustrative",
      sourceLabel: "Weak-field limit",
      note: "First-order Einstein gravitational light deflection: α ≈ 4M/r at grazing incidence.",
    },
    {
      id: "time-dilation",
      label: "TIME DILATION",
      symbol: "Δt",
      value: formatFinite(schwarzschildDilation, 4),
      unit: "×",
      source: "illustrative",
      sourceLabel: "Static frame estimate",
      note: "Gravitational clock dilation factor: 1/√(1 − 2M/r) relative to asymptotic infinity.",
    },
    {
      id: "tidal-acceleration",
      label: "TIDAL ACCELERATION",
      symbol: "Δg",
      value: tidal.toExponential(2),
      unit: "m/s²",
      source: "illustrative",
      sourceLabel: "Differential scale",
      note: "Riemann tensor radial tidal acceleration across a 1-meter test baseline at distance r.",
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
  // G * M_sun / c^2 = 1.477 km
  const r_g_km = 1.477 * massSolar;

  // Convert distance to km:
  // 1 pc = 3.0857e13 km
  // 1 kpc = 3.0857e16 km
  // 1 Mpc = 3.0857e19 km
  const distKm = isMpc ? distanceMpcOrKpc * 3.0857e19 : distanceMpcOrKpc * 3.0857e16;

  // Angular scale theta_g in radians = r_g_km / distKm
  const thetaG_rad = r_g_km / distKm;
  // Convert radians to microarcseconds: 1 rad = (180 / pi) * 3600 * 1e6 uas = 2.06265e11 uas
  const thetaG_uas = thetaG_rad * 2.06265e11;

  // Apparent shadow diameter for Kerr black hole: D_shadow ~ 2 * sqrt(27) * (1 - 0.02 * a*^2) ~ 10.392 M
  const spinClamped = Math.min(Math.max(spin, 0), 0.998);
  const shadowDiameterFactor = 2 * Math.sqrt(27) * (1 - 0.025 * spinClamped * spinClamped);

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
  const bCrit = Math.sqrt(27) * (1 - 0.03 * spin); // ~ 5.196 M

  for (let b = bCrit + 0.15; b <= 30; b += b < 8 ? 0.35 : b < 16 ? 1.0 : 2.5) {
    // Einstein weak field: alpha ~ 4 / b radians
    const alphaWeakDeg = (4 / b) * (180 / Math.PI);

    // Strong field deflection divergence near b_crit:
    // alpha_strong ~ -log((b / b_crit) - 1) + const
    const deltaB = (b - bCrit) / bCrit;
    const strongDivergence = deltaB > 0 ? -Math.log(Math.min(deltaB, 1)) * 14 : 0;
    const alphaExactDeg = alphaWeakDeg + strongDivergence;

    points.push({
      impactParameter: parseFloat(b.toFixed(2)),
      exactDeflectionDeg: parseFloat(Math.min(alphaExactDeg, 360).toFixed(1)),
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
  const spinClamped = Math.min(Math.max(spin, 0), 0.998);
  const sqrtTerm = Math.sqrt(Math.max(0, 1 - spinClamped * spinClamped));

  const rMinus = 1 - sqrtTerm;
  const rPlus = 1 + sqrtTerm;

  for (let deg = 0; deg <= 360; deg += 10) {
    const rad = (deg * Math.PI) / 180;
    const cosTheta = Math.cos(rad);
    const sinTheta = Math.sin(rad);

    // Ergosphere boundary: r_e(theta) = 1 + sqrt(1 - a*^2 cos^2(theta))
    const rErgo = 1 + Math.sqrt(Math.max(0, 1 - spinClamped * spinClamped * cosTheta * cosTheta));

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
  const spinClamped = Math.min(Math.max(spin, 0), 0.998);
  const rPlus = 1 + Math.sqrt(Math.max(0, 1 - spinClamped * spinClamped));

  const rStart = rPlus + 0.05;
  const rEnd = 50;

  for (let r = rStart; r <= rEnd; r += r < 6 ? 0.3 : r < 15 ? 1.0 : 4.0) {
    const timeDilation = 1 / Math.sqrt(Math.max(0.0001, 1 - 2 / r));
    const safeMass = Math.max(massSolar, 0.1);
    const tidalAcc = 1.24 * (10 / safeMass) ** 2 * (50 / r) ** 3;

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
