/**
 * shadow-worker.ts — Web Worker wrapper around the framework-free
 * shadow-tracer core. Receives a strip request, renders it, transfers the
 * RGBA buffer back. No business logic here — all math lives in shadow-tracer.
 */

/// <reference lib="webworker" />

import { renderShadowStrip, type ShadowRenderParams } from "./shadow-tracer";

export type { ShadowRenderParams };

export interface ShadowWorkerResponse {
  type: "strip";
  rowStart: number;
  rows: number;
  /** RGBA bytes, width * rows * 4 (transferred). */
  buffer: ArrayBuffer;
  maxDrift: number;
  capturedCount: number;
  elapsedMs: number;
}

self.onmessage = (ev: MessageEvent<{ type: "render"; params: ShadowRenderParams }>) => {
  const msg = ev.data;
  if (msg.type !== "render") return;
  const result = renderShadowStrip(msg.params);
  const response: ShadowWorkerResponse = {
    type: "strip",
    rowStart: result.rowStart,
    rows: result.rows,
    buffer: result.rgba.buffer as ArrayBuffer,
    maxDrift: result.maxDrift,
    capturedCount: result.capturedCount,
    elapsedMs: result.elapsedMs,
  };
  (self as unknown as {
    postMessage: (m: unknown, t?: Transferable[]) => void;
  }).postMessage(response, [result.rgba.buffer]);
};
