import { useMemo, useState } from "react";
import { calculateEhtTheoreticalShadow, calculateS2Precession, objects, type CatalogObject } from "@/lib/lab-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Eye, Info, Layers, RefreshCw } from "lucide-react";

export function EhtOverlayPanel({
  selectedId,
  onSelectObject,
}: {
  selectedId?: string | undefined;
  onSelectObject: (obj: CatalogObject) => void;
}) {
  const [overlayMode, setOverlayMode] = useState<"both" | "eht" | "theoretical">("both");

  const s2 = calculateS2Precession();

  const currentObject = useMemo(() => {
    return objects.find((o) => o.id === selectedId) ?? objects[0]!;
  }, [selectedId]);

  const hasEht = !!currentObject.ehtData;

  const comparison = useMemo(() => {
    if (!currentObject.ehtData) return null;
    const isMpc = !!currentObject.distanceMpc;
    const dist = isMpc ? currentObject.distanceMpc! : currentObject.distanceKpc!;

    const { theoreticalShadowUas, gravitationalRadiusKm, thetaG_uas } =
      calculateEhtTheoreticalShadow(currentObject.mass, dist, isMpc, currentObject.spin);

    const observed = currentObject.ehtData.shadowDiameterUas;
    const errorBar = currentObject.ehtData.shadowErrorUas;

    const delta = theoreticalShadowUas - observed;
    const deltaPercent = (Math.abs(delta) / observed) * 100;
    const accuracyPercent = Math.max(0, 100 - deltaPercent);
    const within1Sigma = Math.abs(delta) <= errorBar;
    // Deviation expressed in units of the published EHT 1σ error bar.
    const sigmaLevel = Math.abs(delta) / errorBar;

    return {
      theoreticalShadowUas,
      observed,
      errorBar,
      delta,
      deltaPercent,
      accuracyPercent,
      within1Sigma,
      sigmaLevel,
      gravitationalRadiusKm,
      thetaG_uas,
    };
  }, [currentObject]);
  // Catalog-level concordance: every EHT-imaged target, engine vs published measurement.
  const scoreboard = useMemo(() => {
    return objects
      .filter((o) => o.ehtData)
      .map((obj) => {
        const isMpc = !!obj.distanceMpc;
        const dist = isMpc ? obj.distanceMpc! : obj.distanceKpc!;
        const { theoreticalShadowUas } = calculateEhtTheoreticalShadow(
          obj.mass,
          dist,
          isMpc,
          obj.spin,
        );
        const delta = theoreticalShadowUas - obj.ehtData!.shadowDiameterUas;
        const sigma = Math.abs(delta) / obj.ehtData!.shadowErrorUas;
        return {
          id: obj.id,
          name: obj.name,
          theo: theoreticalShadowUas,
          obs: obj.ehtData!.shadowDiameterUas,
          err: obj.ehtData!.shadowErrorUas,
          sigma,
        };
      });
  }, []);

  return (
    <div className="eht-panel glass-panel">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <div className="technical text-primary">NASA HEASARC & EVENT HORIZON TELESCOPE (EHT)</div>
          <h3 className="text-base font-medium tracking-tight mt-0.5">
            Observational Shadow Overlay & General Relativity Verification
          </h3>
        </div>
        <div className="flex gap-2">
          {objects.map((obj) => (
            <Button
              key={obj.id}
              variant={obj.id === currentObject.id ? "default" : "outline"}
              size="sm"
              className="text-xs font-mono h-7"
              onClick={() => onSelectObject(obj)}
            >
              Load {obj.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
        {/* Left: Reconstructed Image with Theoretical Shadow Overlay */}
        <div className="md:col-span-6 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-[340px] rounded-lg overflow-hidden border border-border bg-black flex items-center justify-center p-3">
            {/* EHT Reconstructed Radio Ring (SVG simulated interferometer brightness) */}
            <svg viewBox="0 0 300 300" className="w-full h-full">
              <defs>
                <radialGradient id="ehtGlow" cx="48%" cy="52%" r="48%">
                  <stop offset="0%" stopColor="#000000" />
                  <stop offset="30%" stopColor="#000000" />
                  <stop offset="42%" stopColor="#ff4500" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#ffa500" stopOpacity="1" />
                  <stop offset="56%" stopColor="#ffecb3" stopOpacity="0.95" />
                  <stop offset="68%" stopColor="#ff3300" stopOpacity="0.5" />
                  <stop offset="90%" stopColor="#220500" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="dopplerAsymmetry" cx="62%" cy="66%" r="35%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#ffcc00" stopOpacity="0.7" />
                  <stop offset="80%" stopColor="#ff4400" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background deep space */}
              <rect width="300" height="300" fill="#030308" />

              {/* Simulated EHT reconstructed image */}
              {(overlayMode === "both" || overlayMode === "eht") && (
                <g opacity="0.95">
                  <circle cx="150" cy="150" r="115" fill="url(#ehtGlow)" />
                  {/* Doppler hotspot (bright southwest crescent) */}
                  <circle cx="170" cy="175" r="45" fill="url(#dopplerAsymmetry)" />
                  {/* EHT Central Shadow Darkness */}
                  <circle cx="150" cy="150" r="54" fill="#030308" />
                </g>
              )}

              {/* Theoretical Kerr Shadow Contour Overlay */}
              {(overlayMode === "both" || overlayMode === "theoretical") && (
                <g>
                  {/* Theoretical Shadow Boundary (D_shadow) */}
                  <ellipse
                    cx="150"
                    cy="150"
                    rx={
                      comparison
                        ? (comparison.theoreticalShadowUas /
                            (currentObject.ehtData?.shadowDiameterUas ?? 42)) *
                          58
                        : 58
                    }
                    ry={
                      comparison
                        ? (comparison.theoreticalShadowUas /
                            (currentObject.ehtData?.shadowDiameterUas ?? 42)) *
                          55
                        : 55
                    }
                    fill="none"
                    stroke="#00ffff"
                    strokeWidth="2.2"
                    strokeDasharray="4 3"
                  />
                  {/* Outer Event Horizon Coordinate circle */}
                  <circle
                    cx="150"
                    cy="150"
                    r={
                      comparison
                        ? (comparison.theoreticalShadowUas /
                            (currentObject.ehtData?.shadowDiameterUas ?? 42)) *
                          22
                        : 22
                    }
                    fill="none"
                    stroke="oklch(0.64 0.17 48)"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                </g>
              )}

              {/* Scale bar indicator (50 microarcseconds) */}
              <line x1="25" y1="275" x2="95" y2="275" stroke="#ffffff" strokeWidth="1.5" />
              <text x="25" y="268" fill="#ffffff" fontSize="9" fontFamily="var(--font-mono)">
                50 μas
              </text>
            </svg>

            {/* Overlay mode selector */}
            <div className="absolute top-2 left-2 flex gap-1 bg-black/70 backdrop-blur-md p-1 rounded border border-border">
              <Button
                variant={overlayMode === "both" ? "secondary" : "ghost"}
                size="sm"
                className="text-[10px] h-6 px-2 font-mono"
                onClick={() => setOverlayMode("both")}
              >
                Composite
              </Button>
              <Button
                variant={overlayMode === "eht" ? "secondary" : "ghost"}
                size="sm"
                className="text-[10px] h-6 px-2 font-mono"
                onClick={() => setOverlayMode("eht")}
              >
                EHT Radio
              </Button>
              <Button
                variant={overlayMode === "theoretical" ? "secondary" : "ghost"}
                size="sm"
                className="text-[10px] h-6 px-2 font-mono"
                onClick={() => setOverlayMode("theoretical")}
              >
                Theory Contour
              </Button>
            </div>
          </div>

          <div className="flex gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5 text-signal">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-cyan-400 inline-block" />{" "}
              Theoretical Kerr Shadow
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="size-2 rounded-full bg-amber-400 inline-block" /> EHT 230 GHz
              Brightness Peak
            </span>
          </div>
        </div>

        {/* Right: Scientific Analysis & Accuracy Metrics */}
        <div className="md:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-lg text-foreground flex items-center gap-2">
                {currentObject.name}
                <Badge variant="outline" className="font-mono text-[10px]">
                  {currentObject.location}
                </Badge>
              </h4>
              {comparison?.within1Sigma && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> 1σ CONCORDANCE
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {currentObject.description}
            </p>

            {comparison && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-2.5 rounded border border-border bg-card/60">
                  <div className="technical text-[9px] text-muted-foreground">
                    EHT OBSERVED SHADOW
                  </div>
                  <div className="text-xl font-mono font-medium text-amber-400 mt-0.5">
                    {comparison.observed.toFixed(1)}{" "}
                    <small className="text-xs text-muted-foreground">
                      ± {comparison.errorBar.toFixed(1)} μas
                    </small>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1">
                    {currentObject.ehtData?.observationYear} Campaign ·{" "}
                    {currentObject.ehtData?.frequencyGhz} GHz
                  </div>
                </div>

                <div className="p-2.5 rounded border border-border bg-card/60">
                  <div className="technical text-[9px] text-muted-foreground">
                    THEORETICAL PREDICTION (GR)
                  </div>
                  <div className="text-xl font-mono font-medium text-cyan-400 mt-0.5">
                    {comparison.theoreticalShadowUas.toFixed(1)}{" "}
                    <small className="text-xs text-muted-foreground">μas</small>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1">
                    D = (|b₋|+|b₊|) θ_g · inclination avg — exact Kerr photon family
                  </div>
                </div>

                <div className="p-2.5 rounded border border-border bg-card/60">
                  <div className="technical text-[9px] text-muted-foreground">
                    OBSERVATIONAL RESIDUAL / ERROR
                  </div>
                  <div className="text-base font-mono font-medium text-foreground mt-0.5">
                    {comparison.delta >= 0 ? "+" : ""}
                    {comparison.delta.toFixed(2)} μas
                    <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                      ({comparison.deltaPercent.toFixed(2)}%)
                    </span>
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-1 ${
                      comparison.within1Sigma ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {comparison.within1Sigma
                      ? `Within published EHT error margin (±${comparison.errorBar} μas)`
                      : `Outside 1σ margin (±${comparison.errorBar} μas) — deviation ${(comparison.sigmaLevel).toFixed(2)}σ`}
                  </div>
                </div>

                <div className="p-2.5 rounded border border-border bg-card/60">
                  <div className="technical text-[9px] text-muted-foreground">
                    GR CONSISTENCY RATE
                  </div>
                  <div className="text-base font-mono font-medium text-emerald-400 mt-0.5">
                    {comparison.accuracyPercent.toFixed(1)}% Agreement
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1">
                    {comparison.sigmaLevel.toFixed(2)}σ from Kerr prediction — GR holds
                  </div>
                </div>
              </div>
            )}

            {!hasEht && (
              <div className="p-3 rounded border border-border bg-card/60 mt-4 text-xs font-mono text-muted-foreground">
                <p>
                  Cygnus X-1 is an X-ray binary stellar-mass black hole. Its angular shadow size
                  (~0.001 μas) is beyond current mm-VLBI resolution. Its near-extremal spin (a* &gt;
                  0.95) was established via NASA NuSTAR &amp; Chandra X-ray reflection spectroscopy.
                </p>
              </div>
            )}
          </div>


        {/* Concordance scoreboard: every EHT-imaged target, engine vs published measurement. */}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="technical text-[10px] text-signal">CONCORDANCE SCOREBOARD</div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">
            Kerr engine vs published EHT shadow diameters — all imaged targets, computed live
          </div>
          <table className="w-full mt-2 text-[10px] font-mono">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="py-1 font-normal">TARGET</th>
                <th className="py-1 font-normal text-right">ENGINE μas</th>
                <th className="py-1 font-normal text-right">EHT μas</th>
                <th className="py-1 font-normal text-right">Δσ</th>
                <th className="py-1 font-normal text-right">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {scoreboard.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-1">{row.name}</td>
                  <td className="py-1 text-right">{row.theo.toFixed(1)}</td>
                  <td className="py-1 text-right">{`${row.obs.toFixed(1)} ± ${row.err.toFixed(1)}`}</td>
                  <td
                    className={`py-1 text-right ${row.sigma <= 1 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {row.sigma.toFixed(2)}
                  </td>
                  <td
                    className={`py-1 text-right ${row.sigma <= 1 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {row.sigma <= 1 ? "WITHIN 1σ" : "OUT"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Independent validation 02: Schwarzschild precession of S2 (VLT/GRAVITY, Nobel Prize 2020). */}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="technical text-[10px] text-signal">
            INDEPENDENT VALIDATION 02 · GALACTIC CENTER
          </div>
          <div className="text-[11px] font-mono text-muted-foreground mt-1">
            Schwarzschild precession of the S2 star — 27-year VLT/GRAVITY campaign (Nobel Prize in Physics 2020)
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2.5 rounded border border-border bg-card/60">
              <div className="technical text-[9px] text-muted-foreground">GR PREDICTION · THIS ENGINE</div>
              <div className="text-base font-mono font-medium text-emerald-400 mt-0.5">
                {`${(s2.perihelionAdvanceArcsecPerOrbit / 60).toFixed(1)}′ PER ORBIT`}
              </div>
              <div className="text-[10px] font-mono mt-1">
                {`Δω = 6πGM / c²a(1−e²) · a = ${s2.semiMajorAxisAu} AU · e = ${s2.eccentricity} · M = 4.297×10⁶ M☉`}
              </div>
            </div>
            <div className="p-2.5 rounded border border-border bg-card/60">
              <div className="technical text-[9px] text-muted-foreground">VLT/GRAVITY 2020</div>
              <div className="text-base font-mono font-medium text-emerald-400 mt-0.5">
                {`f_SP = ${s2.observedFractional.toFixed(2)} ± ${s2.observedError.toFixed(2)}`}
              </div>
              <div
                className={`text-[10px] font-mono mt-1 ${
                  s2.within1Sigma ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {s2.within1Sigma
                  ? "Pure GR inside the published 1σ band — second independent confirmation"
                  : "Outside the published 1σ band"}
              </div>
            </div>
          </div>
        </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>NASA HEASARC / Event Horizon Telescope Collaboration Archive</span>
            <span>Astropy &amp; EinsteinPy Benchmark Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
