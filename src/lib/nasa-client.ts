/**
 * NASA open-data clients.
 *
 * Two live NASA sources power the "Real Data" view:
 *
 * 1. images-api.nasa.gov — NASA Image & Video Library (REST, CORS-enabled).
 *    Served straight from the browser via TanStack Query. Returns real
 *    Chandra / Spitzer / Hubble imagery metadata for each catalog target.
 *
 * 2. heasarc.gsfc.nasa.gov — HEASARC Xamin TAP service (VO protocol).
 *    Xamin sends NO Access-Control-Allow-Origin header, so the browser cannot
 *    call it directly; a TanStack Start server function (nasa-server.ts)
 *    proxies the ADQL query and parses the pipe-separated `FORMAT=text` reply.
 *
 * Every response is shaped into a small, typed interface so the UI never
 * touches raw API payloads.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface NasaImage {
  nasaId: string;
  title: string;
  description: string;
  dateCreated: string;
  center: string;
  photographer?: string;
  keywords: string[];
  /** Collection manifest URL (JSON listing all renditions). */
  href: string;
  /** Direct thumbnail URL — verified pattern: {asset}/{asset}~thumb.jpg */
  thumbUrl: string;
  /** Direct medium-size URL. */
  mediumUrl: string;
}

export interface HeasarcSource {
  /** Catalog designation, e.g. "CYG X-1". */
  name: string;
  /** Right ascension, degrees (J2000). */
  raDeg: number;
  /** Declination, degrees (J2000). */
  decDeg: number;
  /** Binary orbital period, days (null for isolated holes). */
  orbitalPeriodDays: number | null;
  /** Peak X-ray flux, catalog units. */
  peakFlux: number | null;
}

export class NasaApiError extends Error {
  readonly source: "images-api" | "heasarc";
  constructor(source: "images-api" | "heasarc", message: string) {
    super(message);
    this.name = "NasaApiError";
    this.source = source;
  }
}

// ---------------------------------------------------------------------------
// 1) NASA Image & Video Library — https://images-api.nasa.gov
// ---------------------------------------------------------------------------

const IMAGES_API = "https://images-api.nasa.gov/search";

/** Per-catalog-target query strings, tuned against the live archive. */
const IMAGE_QUERIES: Record<string, string> = {
  m87: "Messier 87 black hole",
  sagittarius: "Sagittarius A black hole",
  cygnus: "Cygnus X-1 black hole",
};

interface ImagesApiItem {
  href?: string;
  data?: Array<{
    nasa_id?: string;
    title?: string;
    description?: string;
    date_created?: string;
    center?: string;
    photographer?: string;
    keywords?: string[];
  }>;
}

interface ImagesApiResponse {
  collection?: { items?: ImagesApiItem[] };
}

/** Rendition URL pattern verified against images-assets.nasa.gov (HTTP 200). */
function assetUrls(nasaId: string): { thumbUrl: string; mediumUrl: string } {
  return {
    thumbUrl: `https://images-assets.nasa.gov/image/${nasaId}/${nasaId}~thumb.jpg`,
    mediumUrl: `https://images-assets.nasa.gov/image/${nasaId}/${nasaId}~medium.jpg`,
  };
}

/**
 * Fetch curated NASA imagery metadata for a catalog target.
 * Runs in the browser (images-api sends `Access-Control-Allow-Origin: *`).
 */
export async function fetchNasaImages(objectId: string): Promise<NasaImage[]> {
  const query = IMAGE_QUERIES[objectId];
  if (!query) throw new NasaApiError("images-api", `Unknown target: ${objectId}`);

  const url = `${IMAGES_API}?q=${encodeURIComponent(query)}&media_type=image&page_size=8`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new NasaApiError("images-api", `HTTP ${response.status} from images-api`);
  }

  const payload = (await response.json()) as ImagesApiResponse;
  const items = payload.collection?.items ?? [];

  const images: NasaImage[] = [];
  for (const item of items) {
    const meta = item.data?.[0];
    const nasaId = meta?.nasa_id;
    if (!nasaId || !meta.title) continue;
    const image: NasaImage = {
      nasaId,
      title: meta.title,
      description: meta.description ?? "",
      dateCreated: meta.date_created ?? "",
      center: meta.center ?? "",
      keywords: meta.keywords ?? [],
      href: item.href ?? "",
      ...assetUrls(nasaId),
    };
    if (meta.photographer !== undefined) image.photographer = meta.photographer;
    images.push(image);
    if (images.length >= 6) break;
  }

  if (images.length === 0) {
    throw new NasaApiError("images-api", `No imagery returned for ${objectId}`);
  }
  return images;
}

// ---------------------------------------------------------------------------
// 2) HEASARC Xamin TAP — https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync
//    (parsed by the server function in nasa-server.ts)
// ---------------------------------------------------------------------------

export const HEASARC_XRB_TABLE = "public.xrbcat";

/**
 * Build the ADQL query for a source designation.
 * ILIKE because catalog designations are upper-case ("CYG X-1").
 */
export function heasarcQuery(designation: string): string {
  return (
    `SELECT name, ra, dec, porb, fxmax FROM ${HEASARC_XRB_TABLE} ` +
    `WHERE name ILIKE '%${designation}%'`
  );
}

/**
 * Parse Xamin's `FORMAT=text` pipe-separated reply into typed rows.
 * Format: header row of column names, then `value | value | ...` rows,
 * terminated by a "Number of rows: N" footer.
 */
export function parseHeasarcText(payload: string): HeasarcSource[] {
  const lines = payload.split("\n");
  const rows: HeasarcSource[] = [];

  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cols = line.split("|").map((c) => c.trim());
    // Skip the header row: its first cell is the literal column name.
    if (cols[0] === "name") continue;

    const num = (raw: string | undefined): number | null => {
      if (raw === undefined) return null;
      const cleaned = raw.replace(/\s+/g, "");
      if (cleaned === "" || cleaned === "null") return null;
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    };

    rows.push({
      name: cols[0] ?? "",
      raDeg: num(cols[1]) ?? Number.NaN,
      decDeg: num(cols[2]) ?? Number.NaN,
      orbitalPeriodDays: num(cols[3]),
      peakFlux: num(cols[4]),
    });
  }

  return rows.filter((r) => r.name !== "" && Number.isFinite(r.raDeg));
}
