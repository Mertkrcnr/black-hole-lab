/**
 * Server-side bridge to the HEASARC Xamin TAP service.
 *
 * Xamin does not send CORS headers, so the browser cannot call it directly.
 * This TanStack Start server function executes on the server (during SSR and
 * on client navigation) and returns parsed, typed catalog rows.
 */
import { createServerFn } from "@tanstack/react-start";

import { heasarcQuery, parseHeasarcText, type HeasarcSource } from "./nasa-client";

const XAMIN_SYNC_URL = "https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync";

/**
 * Live HEASARC lookup for the catalog's binary X-ray sources.
 * Currently queried designation: "CYG X-1" (the only catalog target present
 * in the HEASARC X-ray binary catalog `public.xrbcat`).
 */
export const fetchHeasarcSources = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ source: string; rows: HeasarcSource[]; queriedAt: string }> => {
    const query = heasarcQuery("CYG X-1");
    const params = new URLSearchParams({
      REQUEST: "doQuery",
      LANG: "ADQL",
      FORMAT: "text",
      QUERY: query,
    });

    const response = await fetch(`${XAMIN_SYNC_URL}?${params.toString()}`, {
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      throw new Error(`HEASARC Xamin returned HTTP ${response.status}`);
    }

    const text = await response.text();
    const rows = parseHeasarcText(text);

    return {
      source: "NASA HEASARC · Xamin TAP · public.xrbcat",
      rows,
      queriedAt: new Date().toISOString(),
    };
  },
);
