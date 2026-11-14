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

## Why No Backend

The physics is pure, deterministic TypeScript — every readout is computed client-side from the current slider state:

- **Latency-free interaction** — exact Kerr geometry, Bardeen shadow and null-geodesic integration recompute per frame; a server round-trip would break the 60 fps feel of the 3D scene.
- **Zero infrastructure** — the whole lab is a static bundle: any CDN hosts it, nothing to keep alive, no database, no secrets.
- **One auditable code path** — the same engine module backs the UI, the vitest suite and `scripts/verify-eht.ts`; what the jury sees on screen is exactly what the tests assert.
- **Data lives where it belongs** — peer-reviewed masses are typed constants in the repo; live imagery and catalog rows are fetched on demand from NASA's open APIs.

The only server-side code is a ~50-line TanStack Start server function that exists for a single reason: NASA's HEASARC Xamin service sends no CORS headers, so a browser cannot query it directly. The function is a transparent proxy — no logic, no state, no storage.

## Live NASA Open Data

The lab is wired to NASA's public APIs **live** — values and images are fetched at page load, not stored in the repo:

- **images-api.nasa.gov** (NASA Image & Video Library) — observatory imagery for M87*, Sagittarius A* and Cygnus X-1 on the `/nasa-live` view; queried directly from the browser (CORS-enabled).
- **heasarc.gsfc.nasa.gov** (Xamin TAP service) — ADQL query against the `public.xrbcat` catalog returns the live CYG X-1 row (J2000 coordinates, orbital period, peak X-ray flux); proxied through a TanStack Start server function because Xamin sends no CORS headers.
- **Pinned provenance** — the EHT validation view carries the official NASA/JPL asset `PIA23122` (Spitzer view of M87 with the Event Horizon Telescope ring inset) next to the theoretical shadow overlay.

Reproduce the live-source check without starting the app:

```
node scripts/verify-nasa-live.mjs
```

## Laboratory Views

- **Overview** — orbit camera around the rendered scene
- **Geometry** — event horizons, ergosphere cross-section, photon spheres
- **Light Ray** — null geodesics and lensing deflection curves
- **Spacetime** — time dilation and tidal acceleration profiles
- **Observation** — angular sizes as seen from Earth
- **Real Data** — M87*, Sgr A*, Cygnus X-1 with EHT overlay comparison
- **NASA Live** — live imagery and catalog rows fetched from NASA's open APIs

## Getting Started

```
npm install
npm run dev        # development server
npm run test       # vitest suite (unit + engine consistency)
npx tsc --noEmit   # type check
npx tsx scripts/verify-eht.ts   # EHT validation script
node scripts/verify-nasa-live.mjs   # live NASA API probe
```

## Tech Stack

TanStack Start (React 19 + TypeScript + Vite), TanStack Router/Query, Three.js + @react-three/fiber, Tailwind CSS, Radix UI, recharts, vitest.
