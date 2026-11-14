# BLACK HOLE LAB

Interactive black hole laboratory — exact Kerr/Schwarzschild relativistic physics computed entirely in the browser, validated against Event Horizon Telescope observations.

## Physics Engine

All values are computed by an exact engine (`src/lib/physics.ts`) — no backend, no hardcoded tables:

- **Exact Kerr geometry** (Boyer–Lindquist): inner/outer event horizons, ergosphere (static limit), photon spheres, horizon angular velocities
- **Bardeen (1973) shadow**: critical impact parameters from spherical photon orbits, prograde + retrograde families, shadow diameter at arbitrary inclination
- **Null geodesic integration**: RK4 solver for light deflection in Kerr spacetime; equatorial deflection via exact quadrature (retrograde deflection = 2|φ½| − π)
- **Time dilation** for static observers: √(−gtt/gtt→∞), exact Boyer–Lindquist metric
- **Tidal acceleration**: Kerr Riemann electric part E^(r)(r) along radial freeness

Every readout in the UI is derived from these functions at the current slider state — mass (M☉), dimensionless spin a* (0–0.998), observer distance (GM/c²), and camera inclination.

## EHT Validation

Theoretical shadow diameters from the engine compared with published Event Horizon Telescope results (`scripts/verify-eht.ts`):

| Object   | Engine shadow | EHT observed | Deviation |
|----------|--------------|--------------|-----------|
| M87*     | 39.05 μas    | 42 ± 3 μas   | 0.98σ     |
| Sgr A*   | 52.87 μas    | 51.8 ± 2.3 μas | 0.47σ   |

Both within 1σ. Reproduce with:

```
npx tsx scripts/verify-eht.ts
```

## Laboratory Views

- **Overview** — orbit camera around the rendered scene
- **Geometry** — event horizons, ergosphere cross-section, photon spheres
- **Light Ray** — null geodesics and lensing deflection curves
- **Spacetime** — time dilation and tidal acceleration profiles
- **Observation** — angular sizes as seen from Earth
- **Real Data** — M87*, Sgr A*, Cygnus X-1 with EHT overlay comparison

## Getting Started

```
npm install
npm run dev        # development server
npm run test       # vitest suite (unit + engine consistency)
npx tsc --noEmit   # type check
npx tsx scripts/verify-eht.ts   # EHT validation script
```

## Tech Stack

TanStack Start (React 19 + TypeScript + Vite), TanStack Router/Query, Three.js + @react-three/fiber, Tailwind CSS, Radix UI, recharts, vitest.
