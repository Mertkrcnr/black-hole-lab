import { createFileRoute, ClientOnly, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  Eye,
  FileText,
  Grid3X3,
  Layers,
  LayoutDashboard,
  LineChart,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  Server,
  Share2,
  Waves,
  Download,
  X,
  Compass,
} from "lucide-react";
import { LabShell } from "@/components/lab/LabShell";
import { MetricPanel } from "@/components/lab/MetricPanel";
import { ModeOverlay } from "@/components/lab/ModeOverlay";
import { ParameterControl } from "@/components/lab/ParameterControl";
import { ScientificCharts } from "@/components/lab/ScientificCharts";
import { EhtOverlayPanel } from "@/components/lab/EhtOverlayPanel";
import { NasaProvenanceBand } from "@/components/lab/NasaProvenanceBand";
import { FastApiBridgeModal } from "@/components/lab/FastApiBridgeModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultParameters,
  getReadouts,
  objects,
  viewCatalog,
  type CatalogObject,
  type Parameters,
  type ViewMode,
} from "@/lib/lab-data";

const BlackHoleScene = lazy(() => import("@/components/lab/BlackHoleScene"));

export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    object?: string | undefined;
    M?: number | undefined;
    a?: number | undefined;
    r?: number | undefined;
    i?: number | undefined;
  } => {
    // Accept both string and number forms — query params arrive as strings.
    const num = (key: string): number | undefined => {
      const v = search[key];
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      object: typeof search["object"] === "string" ? search["object"] : undefined,
      M: num("M"),
      a: num("a"),
      r: num("r"),
      i: num("i"),
    };
  },
  head: () => ({
    meta: [
      { title: "Simulation — BLACK HOLE LAB" },
      {
        name: "description",
        content:
          "Relativistic black hole geometry, differential geodesic solvers, and EHT shadow validation.",
      },
      { property: "og:title", content: "Simulation — BLACK HOLE LAB" },
      {
        property: "og:description",
        content:
          "Relativistic black hole geometry, differential geodesic solvers, and EHT shadow validation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Simulation,
});

const viewIcons: Record<ViewMode, typeof Orbit> = {
  overview: LayoutDashboard,
  geometry: Orbit,
  "light-ray": Activity,
  spacetime: Waves,
  observation: Eye,
  "real-data": Database,
};

// Guided tour: five concise steps mapping the lab workflow for a first-time visitor.
const TOUR_STEPS = [
  {
    target: "parameters" as const,
    title: "Input Parameters",
    body: "Pick an observed NASA target (M87*, Sgr A*, Cygnus X-1) or drag the mass, spin and distance sliders. Every observable recalculates instantly.",
  },
  {
    target: "observable" as const,
    title: "Scientific Observables",
    body: "Ten live quantities - event horizons, photon sphere, shadow radius, time dilation - update as you drag. Hover any row for the physics behind it.",
  },
  {
    target: "view" as const,
    title: "Visualization Modes",
    body: "Switch between OVERVIEW, GEOMETRY, LIGHT RAY, SPACETIME and OBSERVER to inspect the same spacetime solution from different angles.",
  },
  {
    target: "plots" as const,
    title: "2D Charts & EHT",
    body: "Open 2D Geodesic Plots for geodesic integrations, or NASA EHT Validation to compare the simulated shadow against the real M87* image.",
  },
  {
    target: "report" as const,
    title: "Scientific Report",
    body: "Step 5 compiles every parameter and result into a copy-ready analysis report. Share View exports the exact lab state as a URL.",
  },
] as const;

function Simulation() {
  const { object, M, a, r, i } = Route.useSearch();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [parameters, setParameters] = useState<Parameters>(defaultParameters);
  const [mode, setMode] = useState<ViewMode>("overview");
  const [centerView, setCenterView] = useState<"3d" | "plots" | "eht">("3d");
  const [paused, setPaused] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [reset, setReset] = useState(0);
  const [view, setView] = useState({ theta: 82, phi: 0 });
  const [calculationState, setCalculationState] = useState<"synced" | "calculating">("synced");
  const [reportOpen, setReportOpen] = useState(false);
  const [fastApiModalOpen, setFastApiModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);

  const selected = objects.find((o) => o.id === object);

  // Bootstrap physics parameters from shareable URL (?M=&a=&r=&i=) once on mount.
  useEffect(() => {
    if (M === undefined && a === undefined && r === undefined && i === undefined) return;
    setParameters((p) => ({
      ...p,
      ...(M !== undefined ? { mass: M } : {}),
      ...(a !== undefined ? { spin: a } : {}),
      ...(r !== undefined ? { distance: r } : {}),
      ...(i !== undefined ? { cameraAngle: i } : {}),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply object preset when ?object= is present, without overriding any
  // explicitly shared M/a URL params.
  useEffect(() => {
    if (selected) {
      setParameters((p) => ({
        ...p,
        ...(M === undefined ? { mass: selected.mass } : {}),
        ...(a === undefined ? { spin: selected.spin } : {}),
      }));
      setMode("real-data");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const readouts = getReadouts(parameters);

  // Mirror physics state into the URL as shareable ?M=&a=&r=&i= params.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("M", String(+parameters.mass.toPrecision(6)));
    params.set("a", String(+parameters.spin.toFixed(3)));
    params.set("r", String(Math.round(parameters.distance)));
    params.set("i", String(Math.round(parameters.cameraAngle)));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [parameters]);
  const set = (key: keyof Parameters, value: number) => {
    setParameters((p) => ({ ...p, [key]: value }));
  };

  const triggerCalculation = () => {
    setCalculationState("calculating");
    setTimeout(() => {
      setCalculationState("synced");
    }, 250);
  };

  const loadObjectPreset = (obj: CatalogObject) => {
    setParameters((p) => ({ ...p, mass: obj.mass, spin: obj.spin }));
    navigate({ to: "/", search: { object: obj.id } });
    triggerCalculation();
  };

  const copyReportText = () => {
    const reportText = `BLACK HOLE SCIENTIFIC ANALYSIS REPORT
Generated by BLACK HOLE LAB
Target: ${selected?.name ?? "Kerr Singularity"} (${selected ? selected.location : "Synthetic Kerr Spacetime"})
Spacetime Metric: Kerr Metric in Boyer–Lindquist Coordinates
Solver: Exact Kerr quadrature + 4th-order Runge-Kutta geodesic integrator (in-browser)

INPUT PARAMETERS:
- Mass (M): ${parameters.mass > 100 ? parameters.mass.toExponential(3) : parameters.mass.toFixed(2)} M☉
- Spin Parameter (a*): ${parameters.spin.toFixed(3)} (dimensionless, J c / G M²)
- Observer Distance (r): ${parameters.distance.toFixed(1)} GM/c²
- Observer Inclination (i): ${parameters.cameraAngle.toFixed(1)}°
- Accretion Intensity (I): ${parameters.intensity.toFixed(2)}

CALCULATED SCIENTIFIC RESULTS:
1. Schwarzschild Radius (r_s): ${readouts[0]?.value} ${readouts[0]?.unit} [${readouts[0]?.sourceLabel}]
2. Inner Event Horizon (r_-): ${readouts[1]?.value} ${readouts[1]?.unit} [${readouts[1]?.sourceLabel}]
3. Outer Event Horizon (r_+): ${readouts[2]?.value} ${readouts[2]?.unit} [${readouts[2]?.sourceLabel}]
4. Ergosphere Boundaries (r_e): ${readouts[3]?.value} ${readouts[3]?.unit} [${readouts[3]?.sourceLabel}]
5. Photon Sphere (r_ph): ${readouts[4]?.value} ${readouts[4]?.unit} [${readouts[4]?.sourceLabel}]
6. Black Hole Shadow Radius (R_s): ${readouts[5]?.value} ${readouts[5]?.unit} [${readouts[5]?.sourceLabel}]
7. Shadow Angular Size (theta_s): ${readouts[6]?.value} ${readouts[6]?.unit} [${readouts[6]?.sourceLabel}]
8. Gravitational Deflection (alpha): ${readouts[7]?.value} ${readouts[7]?.unit} [${readouts[7]?.sourceLabel}]
9. Time Dilation Factor (Delta t): ${readouts[8]?.value} ${readouts[8]?.unit} [${readouts[8]?.sourceLabel}]
10. Tidal Acceleration (Delta g): ${readouts[9]?.value} ${readouts[9]?.unit} [${readouts[9]?.sourceLabel}]

THEORETICAL CLASSIFICATION:
- Event Horizons and Ergosphere: Analytical Kerr solutions
- Optical and Asymptotic Observables: Exact Kerr quadrature (Bardeen 1973) + RK4 null geodesics`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export: hi-res PNG of the 3D scene + raw JSON of the full lab state.
  // URL stays in sync with physics state, so the JSON embeds its own reproduction link.
  const exportData = async () => {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
      const target = selected?.name ?? "Kerr Black Hole";
      const base = `black-hole-lab_${target.replace(/\s+/g, "-")}_${stamp}`;

      // --- JSON: complete reproducible state ---
      const state = {
        meta: {
          generator: "BLACK HOLE LAB",
          url: window.location.href,
          generatedAt: new Date().toISOString(),
          target: selected?.name ?? null,
          location: selected?.location ?? null,
          solver: "Kerr metric - exact quadrature + RK4 geodesic integrator (in-browser)",
        },
        parameters: {
          massSolarMasses: parameters.mass,
          dimensionlessSpin: parameters.spin,
          observerDistanceGMc2: parameters.distance,
          observerInclinationDeg: parameters.cameraAngle,
          accretionIntensity: parameters.intensity,
        },
        observables: readouts.map((r) => ({
          id: r.id,
          label: r.label,
          symbol: r.symbol,
          value: r.value,
          unit: r.unit,
          source: r.source,
          sourceLabel: r.sourceLabel,
        })),
      };
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${base}.json`;
      a.click();
      URL.revokeObjectURL(a.href);

      // --- PNG: 2x scene capture + scientific figure annotation (params band, observables stamp, timestamp) ---
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const canvas = document.querySelector(".scene canvas") as HTMLCanvasElement | null;
      if (canvas) {
        const img = new Image();
        await new Promise((ok, err) => {
          img.onload = ok;
          img.onerror = err;
          img.src = canvas.toDataURL("image/png");
        });
        const out = document.createElement("canvas");
        const scale = 2;
        const pad = 18 * scale;
        const bandH = 44 * scale;
        out.width = img.width;
        out.height = img.height + bandH + pad;
        const ctx = out.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#05060a";
          ctx.fillRect(0, 0, out.width, out.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, img.width, img.height);

          const mono = (w: number) => `${w}px "JetBrains Mono", "Fira Code", monospace`;

          // Title band: generator, target, location
          const titleY = pad + 12 * scale;
          ctx.fillStyle = "#e8eaf0";
          ctx.font = mono(15 * scale);
          ctx.fillText("BLACK HOLE LAB \u2014 KERR SPACETIME", pad, titleY);
          ctx.font = mono(11 * scale);
          ctx.fillStyle = "#8b93a7";
          const targetLine = `${target}${selected?.location ? ` \u00b7 ${selected.location}` : ""}`;
          ctx.fillText(targetLine, pad, titleY + 17 * scale);

          // Parameter band: full input state on one line
          const bandY = img.height + 14 * scale;
          ctx.fillStyle = "#10131c";
          ctx.fillRect(0, img.height, out.width, bandH + pad);
          ctx.strokeStyle = "#232838";
          ctx.lineWidth = scale;
          ctx.beginPath();
          ctx.moveTo(0, img.height + 0.5 * scale);
          ctx.lineTo(out.width, img.height + 0.5 * scale);
          ctx.stroke();

          const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(2));
          const paramLine = [
            `M = ${fmt(parameters.mass)} M\u2609`,
            `a* = ${parameters.spin.toFixed(3)}`,
            `r = ${fmt(parameters.distance)} GM/c\u00b2`,
            `i = ${parameters.cameraAngle.toFixed(0)}\u00b0`,
            `I = ${parameters.intensity.toFixed(2)}`,
          ].join("   \u00b7   ");
          ctx.fillStyle = "#e8eaf0";
          ctx.font = mono(11.5 * scale);
          ctx.fillText(paramLine, pad, bandY + 14 * scale);

          // Key observables stamp, right-aligned
          const obs = readouts[0] && readouts[2] && readouts[6] && readouts[8]
            ? `r\u209b ${readouts[0].value} ${readouts[0].unit}   r\u208a ${readouts[2].value} ${readouts[2].unit}   R\u209b ${readouts[6].value} ${readouts[6].unit}   \u0394t ${readouts[8].value}${readouts[8].unit}`
            : "";
          ctx.fillStyle = "#6ee7b7";
          ctx.font = mono(10.5 * scale);
          const obsW = ctx.measureText(obs).width;
          ctx.fillText(obs, out.width - pad - obsW, bandY + 14 * scale);

          // Footer: timestamp + reproduction URL
          ctx.fillStyle = "#5a6072";
          ctx.font = mono(9 * scale);
          const foot = `${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC   \u00b7   ${window.location.href}`;
          ctx.fillText(foot, pad, bandY + 30 * scale);
        }
        const a2 = document.createElement("a");
        a2.href = out.toDataURL("image/png");
        a2.download = `${base}.png`;
        a2.click();
      }

      // --- WEBM: 6-second scene recording via captureStream + MediaRecorder ---
      if (canvas && typeof canvas.captureStream === "function" && typeof MediaRecorder !== "undefined") {
        const stream = canvas.captureStream(30);
        const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m));
        if (mime) {
          const chunks: Blob[] = [];
          const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
          rec.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          const done = new Promise<void>((ok) => {
            rec.onstop = () => ok();
          });
          rec.start();
          await new Promise((r) => setTimeout(r, 6000));
          rec.stop();
          await done;
          const vblob = new Blob(chunks, { type: "video/webm" });
          const a3 = document.createElement("a");
          a3.href = URL.createObjectURL(vblob);
          a3.download = `${base}.webm`;
          a3.click();
          URL.revokeObjectURL(a3.href);
        }
      }
    } finally {
      setExporting(false);
    }
  };

  // URL is kept in sync with physics state, so location.href IS the share link.
  const shareView = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const massLabel =
    parameters.mass > 100 ? parameters.mass.toExponential(2) : parameters.mass.toFixed(1);
  const photon = readouts.find((r) => r.id === "photon-sphere")?.value ?? "—";
  const fade = reduceMotion ? { opacity: 1, x: 0 } : undefined;

  return (
    <LabShell>
      <main className="simulation">
        {/* 3D WebGL Background Scene */}
        <ClientOnly fallback={<div className="scene scene-fallback" />}>
          <Suspense fallback={<div className="scene scene-fallback" />}>
            <BlackHoleScene
              parameters={parameters}
              paused={paused || centerView !== "3d"}
              mode={mode}
              showGrid={showGrid}
              reset={reset}
              onView={setView}
            />
          </Suspense>
        </ClientOnly>

        {/* Center Viewport Switcher for 2D Plots & NASA EHT Validation */}
        {centerView === "plots" && (
          <div className="center-display-container" data-tour={tourStep === 3 ? "active" : undefined}>
            <button
              type="button"
              className="center-close"
              onClick={() => setCenterView("3d")}
              aria-label="Close 2D plots and return to 3D view"
            >
              <X className="size-3.5" /> CLOSE
            </button>
            <ScientificCharts parameters={parameters} />
          </div>
        )}

        {centerView === "eht" && (
          <div className="center-display-container" data-tour={tourStep === 3 ? "active" : undefined}>
            <button
              type="button"
              className="center-close"
              onClick={() => setCenterView("3d")}
              aria-label="Close EHT validation and return to 3D view"
            >
              <X className="size-3.5" /> CLOSE
            </button>
            <EhtOverlayPanel selectedId={selected?.id} onSelectObject={loadObjectPreset} />
            <NasaProvenanceBand objectId={selected?.id ?? "m87"} />
          </div>
        )}

        {/* Simulation Heading with View Switcher & Workflow Stepper */}
        <div className="simulation-heading">
          <div className="technical text-muted-foreground">KERR SPACETIME / BOYER–LINDQUIST</div>
          <h1>{selected?.name ?? "Rotating Kerr Black Hole"}</h1>
          <div className="technical text-muted-foreground">
            {selected ? selected.location : "SIMULATION 01 · COMPUTATIONAL SOLVER"}
          </div>

          {/* Workflow Stepper */}
          <div className="workflow-bar" aria-label="Scientific Analysis Workflow">
            <span className="workflow-step is-active">1. INPUT</span>
            <span className="workflow-arrow">→</span>
            <span
              className={`workflow-step ${
                calculationState === "calculating" ? "is-active animate-pulse" : "is-active"
              }`}
            >
              2. CALCULATION
            </span>
            <span className="workflow-arrow">→</span>
            <span className="workflow-step is-active">3. RESULTS</span>
            <span className="workflow-arrow">→</span>
            <span className="workflow-step is-active">4. VISUALIZATION</span>
            <span className="workflow-arrow">→</span>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="workflow-step hover:border-primary cursor-pointer transition-colors"
            >
              5. REPORT ↗
            </button>
          </div>

          {/* View Mode Switcher (3D vs 2D Scientific Plots vs NASA EHT) */}
          <div className="view-switch-bar">
            <Button
              variant={centerView === "3d" ? "secondary" : "ghost"}
              size="sm"
              className="text-[11px] h-7 font-mono gap-1.5"
              onClick={() => setCenterView("3d")}
            >
              <Orbit className="size-3.5" />
              3D Simulation
            </Button>
            <Button
              variant={centerView === "plots" ? "secondary" : "ghost"}
              size="sm"
              className="text-[11px] h-7 font-mono gap-1.5"
              onClick={() => setCenterView("plots")}
            >
              <LineChart className="size-3.5" />
              2D Geodesic Plots
            </Button>
            <Button
              variant={centerView === "eht" ? "secondary" : "ghost"}
              size="sm"
              className="text-[11px] h-7 font-mono gap-1.5"
              onClick={() => setCenterView("eht")}
            >
              <Layers className="size-3.5" />
              NASA EHT Validation
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 font-mono gap-1.5"
              onClick={shareView}
              aria-label="Copy shareable link to this exact view"
            >
              {shareCopied ? (
                <Check className="size-3.5 text-signal" />
              ) : (
                <Share2 className="size-3.5" />
              )}
              {shareCopied ? "Link Copied" : "Share View"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[11px] h-7 font-mono gap-1.5"
              onClick={exportData}
              disabled={exporting}
              aria-label="Export lab state as PNG image and JSON data"
            >
              <Download className="size-3.5" />
              {exporting ? "Exporting" : "Export PNG+JSON+WEBM"}
            </Button>
            <span className="tool-divider" />
            <Button
              variant={tourStep !== null ? "secondary" : "ghost"}
              size="sm"
              className="text-[11px] h-7 font-mono gap-1.5"
              onClick={() => setTourStep(tourStep === null ? 0 : null)}
              aria-label="Start or exit the guided lab tour"
            >
              <Compass className="size-3.5" />
              {tourStep === null ? "Lab Tour" : "Exit Tour"}
            </Button>
          </div>
        </div>

        {/* Left Side Panel: Parameter Controls & Calculation Engine */}
        <motion.aside
          initial={fade ?? { opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="side-panel parameters glass-panel"
          aria-label="Input Parameters"
          data-tour={tourStep === 0 ? "active" : undefined}
        >
          <div className="panel-title technical">
            <span>PARAMETERS</span>
            <span>01</span>
          </div>

          {/* NASA Presets Quick Bar */}
          <div className="mt-3 pb-3 border-b border-border">
            <div className="technical text-[9px] text-muted-foreground mb-1.5 flex justify-between">
              <span>NASA ARCHIVE PRESETS</span>
              <span>OBSERVED</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {objects.map((obj) => (
                <Button
                  key={obj.id}
                  variant={selected?.id === obj.id ? "default" : "outline"}
                  size="sm"
                  className="text-[10px] h-6 px-1 font-mono truncate"
                  onClick={() => loadObjectPreset(obj)}
                >
                  {obj.name}
                </Button>
              ))}
            </div>
          </div>

          <ParameterControl
            label="MASS (M)"
            symbol="M"
            unit="M☉"
            value={massLabel}
            min={1}
            max={selected ? selected.mass * 2 : 100}
            step={selected && selected.mass > 100 ? selected.mass / 100 : 0.1}
            current={parameters.mass}
            onChange={(v) => {
              set("mass", v);
              triggerCalculation();
            }}
            range={[
              "1",
              selected && selected.mass > 100 ? (selected.mass * 2).toExponential(1) : "100",
            ]}
            tip="Solar mass units (M☉). Directly scales Schwarzschild radius, event horizons, and accretion disk dimensions."
          />

          <ParameterControl
            label="SPIN (a*)"
            symbol="a*"
            value={parameters.spin.toFixed(3)}
            min={0}
            max={0.998}
            step={0.001}
            current={parameters.spin}
            onChange={(v) => {
              set("spin", v);
              triggerCalculation();
            }}
            range={["0", "0.998"]}
            tip="Dimensionless angular momentum (0 ≤ a* < 1). Governs frame-dragging, horizon contraction, and shadow shape."
          />

          <ParameterControl
            label="OBSERVER DISTANCE"
            symbol="r"
            unit="GM/c²"
            value={parameters.distance.toFixed(0)}
            min={6}
            max={500}
            step={1}
            current={parameters.distance}
            onChange={(v) => {
              set("distance", v);
              triggerCalculation();
            }}
            range={["6", "500"]}
            tip="Radial distance to the asymptotic observer in gravitational radii. Closer distances magnify lensing deflection."
          />

          <ParameterControl
            label="CAMERA INCLINATION"
            symbol="i"
            unit="deg"
            value={parameters.cameraAngle.toFixed(0)}
            min={0}
            max={55}
            step={1}
            current={parameters.cameraAngle}
            onChange={(v) => set("cameraAngle", v)}
            range={["0°", "55°"]}
            tip="Observer viewing angle from equatorial plane (0°) toward polar axis. Changes observed accretion ellipse."
          />

          <ParameterControl
            label="VISUAL INTENSITY"
            symbol="I"
            value={parameters.intensity.toFixed(2)}
            min={0.4}
            max={1.8}
            step={0.01}
            current={parameters.intensity}
            onChange={(v) => set("intensity", v)}
            range={["0.4", "1.8"]}
            tip="Accretion disk luminosity and relativistic beaming visual scaling factor."
          />

          <div className="calc-action-box">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-mono justify-between"
              onClick={triggerCalculation}
              disabled={calculationState === "calculating"}
            >
              <span className="flex items-center gap-2">
                <Cpu className="size-3.5" />
                {calculationState === "calculating" ? "Computing RK4..." : "Recalculate Geometry"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {calculationState === "calculating" ? "SOLVING" : "SYNCED"}
              </span>
            </Button>

            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="text-[11px] font-mono h-8"
                onClick={() => setReportOpen(true)}
              >
                <FileText className="size-3 mr-1" />
                Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] font-mono h-8"
                onClick={() => setFastApiModalOpen(true)}
              >
                <Server className="size-3 mr-1" />
                FastAPI API
              </Button>
            </div>
          </div>

          <div className="model-box">
            <div className="technical text-muted-foreground">MATHEMATICAL ENGINE</div>
            <strong>Kerr metric · exact quadrature + RK4</strong>
            <div className="technical text-muted-foreground">SOLVER · LOCAL BROWSER ENGINE</div>
          </div>
        </motion.aside>

        {/* Right Side Panel: 10 Required Scientific Observables */}
        <motion.div
          initial={fade ?? { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          data-tour={tourStep === 1 ? "active" : undefined}
        >
          <MetricPanel readouts={readouts} />
        </motion.div>

        {/* HUD Elements for 3D View */}
        {centerView === "3d" && (
          <>
            <div className="orbit-label">
              PHOTON RING
              <br />r ≈ {photon} M
            </div>

            <ModeOverlay mode={mode} parameters={parameters} objectId={selected?.id} />

            <div className="scene-tools">
              <Button
                variant="tool"
                size="icon"
                aria-label={paused ? "Play" : "Pause"}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play /> : <Pause />}
              </Button>
              <Button
                variant="tool"
                size="icon"
                aria-label="Reset view"
                onClick={() => setReset((n) => n + 1)}
              >
                <RotateCcw />
              </Button>
              <span className="tool-divider" />
              <Button
                variant="tool"
                size="icon"
                aria-label="Toggle spacetime grid"
                aria-pressed={showGrid}
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid3X3 />
              </Button>
              <span className="tool-divider" />
              <Button
                variant="tool"
                size="icon"
                aria-label="View 2D scientific charts"
                onClick={() => setCenterView("plots")}
              >
                <LineChart />
              </Button>
              <Button
                variant="tool"
                size="icon"
                aria-label="Open scientific report"
                onClick={() => setReportOpen(true)}
              >
                <FileText />
              </Button>
            </div>

            <div className="scene-scale">
              <div className="scale-line" />
              10 GM/c²
            </div>

            <div className="scene-coordinate">
              θ {view.theta.toFixed(1)}°
              <br />φ {view.phi.toFixed(1)}°
            </div>
          </>
        )}
      </main>

      {/* Bottom Visualization View Mode Navigation */}
      <nav
        className="view-nav"
        aria-label="Visualization modes"
        data-tour={tourStep === 2 ? "active" : undefined}
      >
        {viewCatalog.map(({ id, label, short }) => {
          const Icon = viewIcons[id];
          return (
            <Button
              key={id}
              variant="lab"
              aria-pressed={mode === id && centerView === "3d"}
              onClick={() => {
                setMode(id);
                setCenterView("3d");
              }}
            >
              <Icon />
              <span className="nav-full">{label}</span>
              <span className="nav-short">{short}</span>
            </Button>
          );
        })}
      </nav>

      {/* Guided Lab Tour overlay */}
      {tourStep !== null && (
        <div className="tour-overlay" role="dialog" aria-label="Guided lab tour">
          <div className="tour-card">
            <div className="tour-head">
              <span className="report-chip tour-chip">{`TOUR ${tourStep + 1}/${TOUR_STEPS.length}`}</span>
              <button
                type="button"
                className="tour-x"
                onClick={() => setTourStep(null)}
                aria-label="Exit tour"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="tour-title">{TOUR_STEPS[tourStep]?.title}</div>
            <p className="tour-body">{TOUR_STEPS[tourStep]?.body}</p>
            <div className="tour-dots">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`tour-dot ${i === tourStep ? "is-active" : ""} ${i < tourStep ? "is-done" : ""}`}
                  onClick={() => setTourStep(i)}
                  aria-label={`Go to tour step ${i + 1}`}
                />
              ))}
            </div>
            <div className="tour-actions">
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-[11px]"
                onClick={() => setTourStep(null)}
              >
                Skip
              </Button>
              {tourStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-mono text-[11px]"
                  onClick={() => setTourStep(tourStep - 1)}
                >
                  Back
                </Button>
              )}
              {tourStep < TOUR_STEPS.length - 1 ? (
                <Button
                  variant="default"
                  size="sm"
                  className="font-mono text-[11px]"
                  onClick={() => setTourStep(tourStep + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="font-mono text-[11px]"
                  onClick={() => setTourStep(null)}
                >
                  Start Exploring
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scientific Analysis Report Modal */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="report-modal-content">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="report-chip">WORKFLOW · STEP 5</span>
              <span className="technical text-muted-foreground">KERR METRIC ANALYSIS</span>
            </div>
            <DialogTitle className="text-xl font-medium tracking-tight">
              Scientific Analysis Report
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Target: {selected?.name ?? "Kerr Singularity"} ·{" "}
              {selected ? selected.location : "General Solution"}
            </DialogDescription>
          </DialogHeader>

          <div className="report-scroll">
          <div className="report-section">
            <div className="report-section-title">01 · Input Configuration</div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                  <th style={{ textAlign: "right" }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mass (M)</td>
                  <td className="num">{massLabel}</td>
                  <td className="num">M☉</td>
                </tr>
                <tr>
                  <td>Dimensionless Spin (a*)</td>
                  <td className="num">{parameters.spin.toFixed(3)}</td>
                  <td className="num">J c / G M²</td>
                </tr>
                <tr>
                  <td>Observer Radial Distance (r)</td>
                  <td className="num">{parameters.distance.toFixed(0)}</td>
                  <td className="num">GM/c²</td>
                </tr>
                <tr>
                  <td>Observer Viewing Inclination (i)</td>
                  <td className="num">{parameters.cameraAngle.toFixed(0)}</td>
                  <td className="num">deg</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="report-section">
            <div className="report-section-title">
              02 · Calculated Geometric & Observational Quantities
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Quantity</th>
                  <th>Symbol</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                  <th style={{ textAlign: "right" }}>Unit</th>
                  <th>Classification</th>
                </tr>
              </thead>
              <tbody>
                {readouts.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td className="font-mono text-muted-foreground">{r.symbol}</td>
                    <td className="num font-semibold text-primary">{r.value}</td>
                    <td className="num text-muted-foreground">{r.unit}</td>
                    <td>
                      <span
                        className={`report-chip ${r.source === "kerr" ? "border-signal text-signal" : ""}`}
                      >
                        {r.sourceLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="report-section">
            <div className="report-section-title">03 · Astrophysical & Solver Notes</div>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              Kerr event horizons (r₊, r₋) and the equatorial ergosphere boundary (rₑ) are
              calculated using exact analytical solutions of the vacuum Einstein field equations.
              The shadow radius, deflection angle, and tidal metrics are browser-safe scientific
              representations ready to receive higher-order geodesic raymarching from the backend
              scientific calculation engine.
            </p>
          </div>

          </div>

          <div className="report-modal-footer mt-4 pt-3 border-t border-border flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={copyReportText}
              className="font-mono text-xs gap-2"
            >
              {copied ? <Check className="size-3.5 text-signal" /> : <Copy className="size-3.5" />}
              {copied ? "Report Copied" : "Copy Report Summary"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setReportOpen(false)}
              className="font-mono text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FastAPI Backend Bridge Modal */}
      <FastApiBridgeModal
        open={fastApiModalOpen}
        onOpenChange={setFastApiModalOpen}
        parameters={parameters}
      />
    </LabShell>
  );
}
