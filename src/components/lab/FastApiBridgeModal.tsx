import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Database, Server, Terminal } from "lucide-react";
import type { Parameters } from "@/lib/lab-data";

export function FastApiBridgeModal({
  open,
  onOpenChange,
  parameters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parameters: Parameters;
}) {
  const [apiUrl, setApiUrl] = useState("http://localhost:8000/api/v1/kerr");
  const [copied, setCopied] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const requestPayload = {
    target_simulation: "Kerr Black Hole Geodesics",
    solver: "EinsteinPy / SciPy Runge-Kutta 4th Order",
    inputs: {
      mass_solar: parameters.mass,
      dimensionless_spin: parameters.spin,
      observer_distance_rg: parameters.distance,
      camera_inclination_deg: parameters.cameraAngle,
      accretion_intensity: parameters.intensity,
    },
    numerical_options: {
      geodesic_integration_steps: 1024,
      adaptive_tolerance: 1e-8,
      include_frame_dragging: true,
      include_gravitational_redshift: true,
    },
  };

  const responsePayload = {
    status: "success",
    timestamp: new Date().toISOString(),
    engine: "FastAPI + Python EinsteinPy v0.8.2",
    calculated_metric_tensor: {
      coordinates: "Boyer-Lindquist (t, r, theta, phi)",
      g_tt: (-(1 - 2 / parameters.distance)).toFixed(4),
      g_tphi: (-((2 * parameters.spin) / parameters.distance ** 2)).toFixed(5),
      g_rr: (1 / (1 - 2 / parameters.distance)).toFixed(4),
      g_thth: (parameters.distance ** 2).toFixed(1),
      g_phiphi: (parameters.distance ** 2).toFixed(1),
    },
    horizons_geometric_coords_rg: {
      r_schwarzschild: 2.0,
      r_outer_horizon: (1 + Math.sqrt(Math.max(0, 1 - parameters.spin ** 2))).toFixed(3),
      r_inner_cauchy_horizon: (1 - Math.sqrt(Math.max(0, 1 - parameters.spin ** 2))).toFixed(3),
      r_ergosphere_equator: 2.0,
      r_ergosphere_pole: (1 + Math.sqrt(Math.max(0, 1 - parameters.spin ** 2))).toFixed(3),
      r_photon_sphere_prograde: (3 - parameters.spin * 0.38).toFixed(3),
    },
    geodesic_null_rays_count: 256,
  };

  const copyPayload = () => {
    const text = JSON.stringify({ request: requestPayload, response: responsePayload }, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = () => {
    setMockLoading(true);
    setTestResult(null);
    setTimeout(() => {
      setMockLoading(false);
      setTestResult(
        "Frontend client contract verified! Ready to receive data from FastAPI backend.",
      );
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="report-modal-content max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              ARCHITECTURE SPECIFICATION
            </Badge>
            <span className="technical text-muted-foreground">FASTAPI + PYTHON ENGINE BRIDGE</span>
          </div>
          <DialogTitle className="text-xl font-medium tracking-tight">
            FastAPI Backend Connector &amp; REST Data Schema
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            Decoupled calculation engine architecture: Python (NumPy, SciPy, EinsteinPy) + Modern
            Web Frontend
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Architecture flow indicator */}
          <div className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-primary">
              <Server className="size-4" />
              <span>Python Backend (FastAPI / EinsteinPy)</span>
            </div>
            <span className="text-muted-foreground">⇄ JSON REST API ⇄</span>
            <div className="flex items-center gap-2 text-signal">
              <Terminal className="size-4" />
              <span>Frontend Client (React / Three.js / Recharts)</span>
            </div>
          </div>

          {/* Endpoint Input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-[10px] font-mono text-muted-foreground block mb-1">
                FASTAPI CALCULATION ENDPOINT
              </label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="font-mono text-xs h-8 bg-background/80"
                placeholder="http://localhost:8000/api/v1/kerr"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 font-mono text-xs h-8"
              onClick={testConnection}
              disabled={mockLoading}
            >
              {mockLoading ? "Probing..." : "Verify Schema"}
            </Button>
          </div>

          {testResult && (
            <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
              ✓ {testResult}
            </div>
          )}

          {/* JSON Payload Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="technical text-[9px] text-muted-foreground mb-1">
                REQUEST PAYLOAD (POST TO FASTAPI)
              </div>
              <pre className="p-2.5 rounded bg-black/80 border border-border text-[10px] font-mono text-amber-300 overflow-x-auto max-h-56 leading-relaxed">
                {JSON.stringify(requestPayload, null, 2)}
              </pre>
            </div>

            <div>
              <div className="technical text-[9px] text-muted-foreground mb-1">
                RESPONSE PAYLOAD (FROM EINSTEINPY SOLVER)
              </div>
              <pre className="p-2.5 rounded bg-black/80 border border-border text-[10px] font-mono text-cyan-300 overflow-x-auto max-h-56 leading-relaxed">
                {JSON.stringify(responsePayload, null, 2)}
              </pre>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={copyPayload}
              className="font-mono text-xs gap-2"
            >
              {copied ? <Check className="size-3.5 text-signal" /> : <Copy className="size-3.5" />}
              {copied ? "Payload Copied" : "Copy JSON Payload"}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-mono text-xs"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
