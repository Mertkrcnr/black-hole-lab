import { useEffect, useRef, useState } from "react";
import { shadowBoundaryCurve } from "@/lib/physics";
import type { ShadowRenderParams } from "@/lib/shadow-tracer";
import type { Parameters } from "@/lib/lab-data";
import { Button } from "@/components/ui/button";
// Vite worker constructor import — resolves the module through the bundler,
// avoiding fragile relative new URL(...) resolution from component directories.
import ShadowWorkerCtor from "@/lib/shadow-worker?worker";
import { RefreshCw } from "lucide-react";

/**
 * ShadowRayTrace — 2D geodesic shadow renderer.
 *
 * Every pixel is one backward-traced Kerr null geodesic (RK4 Hamiltonian
 * integration, src/lib/physics.ts). Captured rays paint the true shadow;
 * escaped rays that wound >=1 turn around the hole paint the photon ring.
 * The analytic Carter spherical-photon boundary (exact quadrature) is drawn
 * on top as an independent cross-check of the numerical result.
 *
 * Rendering runs in a Web Worker pool (shadow-worker.ts) so the UI stays at
 * 60fps; strips arrive progressively and are blitted as they complete.
 */

const RENDER_W = 200;

interface StripMsg {
  type: "strip";
  rowStart: number;
  rows: number;
  buffer: ArrayBuffer;
  maxDrift: number;
  capturedCount: number;
  elapsedMs: number;
}

interface Props {
  parameters: Parameters;
}

export function ShadowRayTrace({ parameters }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(1);
  const [stats, setStats] = useState<{
    rays: number;
    captured: number;
    maxDrift: number;
    ms: number;
  } | null>(null);
  const [runId, setRunId] = useState(0);

  const spin = parameters.spin;
  const incRad = (parameters.cameraAngle * Math.PI) / 180;

  // Adaptive screen framing from the exact analytic boundary (cheap pre-pass).
  const fov = (() => {
    const curve = shadowBoundaryCurve(spin, incRad, 240);
    let aMax = 0;
    let bMax = 0;
    for (const p of curve) {
      if (!Number.isFinite(p.beta)) continue;
      aMax = Math.max(aMax, Math.abs(p.alpha));
      bMax = Math.max(bMax, Math.abs(p.beta));
    }
    return {
      alphaMax: Math.max(6, aMax * 1.18),
      betaMax: Math.max(4, bMax * 1.35),
    };
  })();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const H = Math.max(
      2,
      Math.round((2 * fov.betaMax * RENDER_W) / (2 * fov.alphaMax)),
    );
    canvas.width = RENDER_W;
    canvas.height = H;

    // Background while tracing.
    ctx.fillStyle = "#05060c";
    ctx.fillRect(0, 0, RENDER_W, H);
    ctx.fillStyle = "rgba(140,160,220,0.75)";
    ctx.font = "9px monospace";
    ctx.fillText("INTEGRATING NULL GEODESICS...", 12, H / 2);

    const nWorkers = Math.min(6, Math.max(2, navigator.hardwareConcurrency || 4));
    const totalRows = H;
    const chunk = Math.ceil(totalRows / (nWorkers * 2));
    const totalStrips = Math.ceil(totalRows / chunk);

    let cancelled = false;
    let stripsDone = 0;
    let capturedTotal = 0;
    let maxDrift = 0;
    let cpuMs = 0;
    const t0 = performance.now();
    const workers: Worker[] = [];

    const finish = () => {
      if (cancelled) return;
      setProgress(1);
      setStats({
        rays: RENDER_W * totalRows,
        captured: capturedTotal,
        maxDrift,
        ms: Math.round(performance.now() - t0),
      });
      drawOverlay();
      workers.forEach((w) => w.terminate());
    };

    const drawOverlay = () => {
      if (cancelled) return;
      const curve = shadowBoundaryCurve(spin, incRad, 240);
      ctx.save();
      // Draw the boundary as a point cloud, not a polyline: the curve's point
      // ordering zig-zags between the +beta and -beta branches at each alpha
      // (two spherical-photon roots per screen angle), so a connected path
      // would criss-cross the shadow interior with vertical scan lines.
      ctx.fillStyle = "rgba(255,176,80,0.9)";
      for (const p of curve) {
        if (!Number.isFinite(p.beta)) continue;
        const x = ((p.alpha + fov.alphaMax) / (2 * fov.alphaMax)) * RENDER_W;
        const y = ((fov.betaMax - p.beta) / (2 * fov.betaMax)) * H;
        if (x < -2 || x > RENDER_W + 2 || y < -2 || y > H + 2) continue;
        ctx.fillRect(x - 0.5, y - 0.5, 1.4, 1.4);
      }
      ctx.restore();
    };

    const onMessage = (ev: MessageEvent<StripMsg>) => {
      if (cancelled) return;
      const msg = ev.data;
      const rgba = new Uint8ClampedArray(msg.buffer);
      ctx.putImageData(
        new ImageData(rgba, RENDER_W, msg.rows),
        0,
        msg.rowStart,
      );
      capturedTotal += msg.capturedCount;
      if (msg.maxDrift > maxDrift) maxDrift = msg.maxDrift;
      cpuMs += msg.elapsedMs;
      stripsDone++;
      setProgress(stripsDone / totalStrips);
      if (stripsDone === totalStrips) finish();
    };

    for (let w = 0; w < nWorkers; w++) {
      const worker = new ShadowWorkerCtor();
      worker.onmessage = onMessage;
      workers.push(worker);
    }

    // Dispatch strips round-robin; each worker processes its queue serially.
    let nextRow = 0;
    for (const worker of workers) {
      const pump = () => {
        if (cancelled || nextRow >= totalRows) return;
        const rows = Math.min(chunk, totalRows - nextRow);
        const params: ShadowRenderParams = {
          spin,
          inclinationRad: incRad,
          alphaMax: fov.alphaMax,
          betaMax: fov.betaMax,
          width: RENDER_W,
          rowStart: nextRow,
          rows,
          totalRows,
          rStart: 600,
        };
        nextRow += rows;
        worker.postMessage({ type: "render", params });
      };
      pump();
      worker.onmessage = (ev: MessageEvent<StripMsg>) => {
        onMessage(ev);
        pump(); // queue next strip for this worker
      };
    }

    return () => {
      cancelled = true;
      workers.forEach((w) => w.terminate());
    };
    // Trace re-runs on spin/inclination change; fov recompute is cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin, incRad, runId]);

  const capturePct = stats ? ((stats.captured / stats.rays) * 100).toFixed(1) : null;

  return (
    <div className="mt-3">
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
        <span>
          Backward ray tracing on the Kerr metric —{" "}
          <strong className="text-foreground">one RK4 null geodesic per pixel</strong>.
          Amber curve: exact Carter spherical-photon boundary (independent check).
        </span>
        <Button
          variant="outline"
          size="sm"
          className="text-[11px] h-7 font-mono gap-1.5"
          onClick={() => setRunId((n) => n + 1)}
        >
          <RefreshCw className="size-3" />
          Re-trace
        </Button>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-border bg-[#05060c]">
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ imageRendering: "pixelated", aspectRatio: "auto" }}
          aria-label="Geodesically traced black hole shadow"
        />
        {progress < 1 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-secondary/40">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-4 justify-center mt-2 font-mono text-[11px] flex-wrap">
        <span className="text-primary">
          {RENDER_W}×{stats ? Math.round((RENDER_W * fov.betaMax) / fov.alphaMax) : "…"} px ·{" "}
          {stats ? `${(stats.ms / 1000).toFixed(1)}s` : "tracing…"}
        </span>
        <span className="text-signal">CAPTURED {capturePct ?? "—"}% OF RAYS</span>
        <span className="text-muted-foreground">
          max |ΔH| {stats ? stats.maxDrift.toExponential(1) : "—"}
        </span>
        <span className="text-muted-foreground">
          FOV α {fov.alphaMax.toFixed(1)} M · β {fov.betaMax.toFixed(1)} M
        </span>
        {stats && <span className="text-muted-foreground">{stats.ms} ms wall</span>}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
        Screen coordinates (α, β) in gravitational radii GM/c². At low inclination the
        shadow elongates horizontally as b/sin i — raise CAMERA INCLINATION for a
        rounder view. Mass sets the physical scale only (geometric units M = 1).
      </p>
    </div>
  );
}
