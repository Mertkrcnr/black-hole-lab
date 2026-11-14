import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getErgosphereCrossSection,
  getLightDeflectionCurve,
  getSpacetimeCurvatureData,
  type Parameters,
} from "@/lib/lab-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ScientificCharts({ parameters }: { parameters: Parameters }) {
  const [activeTab, setActiveTab] = useState<"deflection" | "ergo" | "tidal">("deflection");

  const deflectionData = useMemo(() => getLightDeflectionCurve(parameters.spin), [parameters.spin]);

  const ergoData = useMemo(() => getErgosphereCrossSection(parameters.spin), [parameters.spin]);

  const curvatureData = useMemo(
    () => getSpacetimeCurvatureData(parameters.mass, parameters.spin),
    [parameters.mass, parameters.spin],
  );

  return (
    <div className="scientific-charts-panel glass-panel">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div>
          <div className="technical text-primary">2D SCIENTIFIC PLOTS & GEODESICS</div>
          <h3 className="text-base font-medium tracking-tight mt-0.5">
            Differential Equations & Relativistic Coordinate Trajectories
          </h3>
        </div>
        <div className="technical text-muted-foreground text-xs">
          SOLVER: RUNGE–KUTTA 4TH ORDER EQUATIONS OF MOTION
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-3">
        <TabsList className="bg-secondary/60 border border-border">
          <TabsTrigger value="deflection" className="text-xs font-mono">
            Light Deflection α(b)
          </TabsTrigger>
          <TabsTrigger value="ergo" className="text-xs font-mono">
            Ergosphere Cross-Section
          </TabsTrigger>
          <TabsTrigger value="tidal" className="text-xs font-mono">
            Time Dilation & Tidal Shear
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Light Ray Deflection Curve */}
        <TabsContent value="deflection" className="mt-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
            <span>
              Deflection angle <strong className="text-foreground">α (degrees)</strong> as a
              function of impact parameter <strong className="text-foreground">b (GM/c²)</strong>.
            </span>
            <span className="font-mono text-[10px] text-primary">
              CRITICAL CAPTURE RADIUS b_crit ≈{" "}
              {(Math.sqrt(27) * (1 - 0.03 * parameters.spin)).toFixed(2)} M
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={deflectionData}
                margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260 / 40%)" />
                <XAxis
                  dataKey="impactParameter"
                  stroke="oklch(0.62 0.02 250)"
                  label={{
                    value: "Impact Parameter b (GM/c²)",
                    position: "insideBottom",
                    offset: -10,
                    fill: "oklch(0.62 0.02 250)",
                    fontSize: 11,
                  }}
                  fontSize={10}
                />
                <YAxis
                  stroke="oklch(0.62 0.02 250)"
                  label={{
                    value: "Deflection Angle α (°)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "oklch(0.62 0.02 250)",
                    fontSize: 11,
                  }}
                  fontSize={10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.018 264)",
                    borderColor: "oklch(0.28 0.01 260)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <ReferenceLine
                  x={parseFloat((Math.sqrt(27) * (1 - 0.03 * parameters.spin)).toFixed(2))}
                  stroke="oklch(0.64 0.17 48)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Photon Capture (b_crit)",
                    fill: "oklch(0.64 0.17 48)",
                    fontSize: 10,
                    position: "top",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="exactDeflectionDeg"
                  name="Strong Field (Kerr Geodesic Solver)"
                  stroke="oklch(0.78 0.14 62)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="weakDeflectionDeg"
                  name="Einstein 4M/b (Weak Field Limit)"
                  stroke="oklch(0.76 0.09 215)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>

        {/* Tab 2: Ergosphere Cross-Section */}
        <TabsContent value="ergo" className="mt-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
            <span>
              Meridional cross-section in Cartesian coordinates{" "}
              <strong className="text-foreground">(x, z)</strong> showing the rotation axis and
              frame-dragging boundary.
            </span>
            <span className="font-mono text-[10px] text-primary">
              EQUATOR: r_e = 2.00 M · POLE: r_e ={" "}
              {(1 + Math.sqrt(Math.max(0, 1 - parameters.spin * parameters.spin))).toFixed(2)} M
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <svg
              viewBox="-3 -3 6 6"
              className="w-full h-full max-h-64"
              style={{ background: "oklch(0.08 0.01 264 / 60%)", borderRadius: "8px" }}
            >
              {/* Coordinate grid */}
              <line
                x1="-3"
                y1="0"
                x2="3"
                y2="0"
                stroke="oklch(0.28 0.01 260 / 50%)"
                strokeWidth="0.02"
              />
              <line
                x1="0"
                y1="-3"
                x2="0"
                y2="3"
                stroke="oklch(0.28 0.01 260 / 50%)"
                strokeWidth="0.02"
              />
              <circle
                cx="0"
                cy="0"
                r="1"
                fill="none"
                stroke="oklch(0.28 0.01 260 / 25%)"
                strokeWidth="0.015"
                strokeDasharray="0.05 0.05"
              />
              <circle
                cx="0"
                cy="0"
                r="2"
                fill="none"
                stroke="oklch(0.28 0.01 260 / 25%)"
                strokeWidth="0.015"
                strokeDasharray="0.05 0.05"
              />

              {/* Ergosphere polygon */}
              <polygon
                points={ergoData.map((p) => `${p.ergoX},${p.ergoZ}`).join(" ")}
                fill="oklch(0.78 0.14 62 / 12%)"
                stroke="oklch(0.78 0.14 62)"
                strokeWidth="0.04"
              />

              {/* Outer Horizon polygon */}
              <polygon
                points={ergoData.map((p) => `${p.outerHorizonX},${p.outerHorizonZ}`).join(" ")}
                fill="oklch(0.64 0.17 48 / 25%)"
                stroke="oklch(0.64 0.17 48)"
                strokeWidth="0.04"
              />

              {/* Inner Cauchy Horizon polygon */}
              <polygon
                points={ergoData.map((p) => `${p.innerHorizonX},${p.innerHorizonZ}`).join(" ")}
                fill="oklch(0.1 0.01 264)"
                stroke="oklch(0.76 0.09 215)"
                strokeWidth="0.03"
                strokeDasharray="0.06 0.04"
              />

              {/* Central Singularity */}
              <circle
                cx="0"
                cy="0"
                r="0.06"
                fill="#000"
                stroke="oklch(0.78 0.14 62)"
                strokeWidth="0.03"
              />

              {/* Axis Label */}
              <text
                x="0.1"
                y="-2.7"
                fill="oklch(0.62 0.02 250)"
                fontSize="0.22"
                fontFamily="var(--font-mono)"
              >
                Rotation Axis (z)
              </text>
              <text
                x="1.8"
                y="-0.1"
                fill="oklch(0.62 0.02 250)"
                fontSize="0.22"
                fontFamily="var(--font-mono)"
              >
                Equator (x)
              </text>
            </svg>
          </div>
          <div className="flex gap-4 justify-center mt-2 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="size-2 rounded-full bg-primary inline-block" /> Ergosphere Boundary
              rₑ(θ)
            </span>
            <span className="flex items-center gap-1.5 text-disk">
              <span className="size-2 rounded-full bg-disk inline-block" /> Outer Event Horizon r₊
            </span>
            <span className="flex items-center gap-1.5 text-signal">
              <span className="size-2 rounded-full bg-signal inline-block" /> Inner Cauchy Horizon
              r₋
            </span>
          </div>
        </TabsContent>

        {/* Tab 3: Spacetime Curvature & Tidal Spaghettification */}
        <TabsContent value="tidal" className="mt-3">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
            <span>
              Radial profile of{" "}
              <strong className="text-foreground">Time Dilation factor (Δt)</strong> and{" "}
              <strong className="text-foreground">
                Tidal Spaghettification Acceleration (m/s²)
              </strong>
              .
            </span>
            <span className="font-mono text-[10px] text-destructive">
              LETHAL SHEAR THRESHOLD: 10.0 m/s²
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curvatureData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260 / 40%)" />
                <XAxis
                  dataKey="radiusM"
                  stroke="oklch(0.62 0.02 250)"
                  label={{
                    value: "Distance from Singularity r (GM/c²)",
                    position: "insideBottom",
                    offset: -10,
                    fill: "oklch(0.62 0.02 250)",
                    fontSize: 11,
                  }}
                  fontSize={10}
                />
                <YAxis
                  yAxisId="left"
                  stroke="oklch(0.76 0.09 215)"
                  label={{
                    value: "Time Dilation (Δt)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "oklch(0.76 0.09 215)",
                    fontSize: 11,
                  }}
                  fontSize={10}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="oklch(0.64 0.17 48)"
                  label={{
                    value: "Tidal Acceleration (m/s²)",
                    angle: 90,
                    position: "insideRight",
                    fill: "oklch(0.64 0.17 48)",
                    fontSize: 11,
                  }}
                  fontSize={10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "oklch(0.18 0.018 264)",
                    borderColor: "oklch(0.28 0.01 260)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <ReferenceLine
                  yAxisId="right"
                  y={10.0}
                  stroke="oklch(0.577 0.245 27.325)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Spaghettification Threshold (10 m/s²)",
                    fill: "oklch(0.577 0.245 27.325)",
                    fontSize: 10,
                    position: "top",
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="timeDilation"
                  name="Gravitational Time Dilation 1/√(1 - 2M/r)"
                  stroke="oklch(0.76 0.09 215)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tidalAccMs2"
                  name="Tidal Force (Δg across 1m)"
                  stroke="oklch(0.64 0.17 48)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
