/**
 * Live-verification probe for the NASA integration (no app server needed).
 *
 *  1. images-api.nasa.gov  — M87 image search must return >= 1 item.
 *  2. images-assets.nasa.gov — PIA23122 thumbnail must respond HTTP 200.
 *  3. heasarc.gsfc.nasa.gov — ADQL query against public.xrbcat must return
 *     the CYG X-1 row with parseable coordinates.
 *
 * Exit code 0 = all three live sources reachable and correctly shaped.
 */
import { parseHeasarcText } from "../src/lib/heasarc-parse.mjs";

const failures = [];

// --- 1) images-api: M87 search ------------------------------------------------
const searchUrl =
  "https://images-api.nasa.gov/search?q=" +
  encodeURIComponent("Messier 87 black hole") +
  "&media_type=image&page_size=4";
const searchRes = await fetch(searchUrl);
if (!searchRes.ok) failures.push(`images-api HTTP ${searchRes.status}`);
const searchJson = await searchRes.json();
const itemCount = searchJson?.collection?.items?.length ?? 0;
if (itemCount < 1) failures.push("images-api returned 0 items for M87");
console.log(`1) images-api M87 search: HTTP ${searchRes.status}, ${itemCount} items`);

// --- 2) images-assets: EHT inset asset ---------------------------------------
const assetUrl = "https://images-assets.nasa.gov/image/PIA23122/PIA23122~thumb.jpg";
const assetRes = await fetch(assetUrl, { method: "HEAD" });
if (!assetRes.ok) failures.push(`PIA23122 thumb HTTP ${assetRes.status}`);
console.log(`2) images-assets PIA23122~thumb.jpg: HTTP ${assetRes.status}`);

// --- 3) HEASARC Xamin TAP: CYG X-1 row ----------------------------------------
const adql =
  "SELECT name, ra, dec, porb, fxmax FROM public.xrbcat WHERE name ILIKE '%CYG X-1%'";
const tapUrl =
  "https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync?REQUEST=doQuery&LANG=ADQL&FORMAT=text&QUERY=" +
  encodeURIComponent(adql);
const tapRes = await fetch(tapUrl);
if (!tapRes.ok) failures.push(`heasarc HTTP ${tapRes.status}`);
const tapText = await tapRes.text();
const rows = parseHeasarcText(tapText);
const cyg = rows[0];
if (!cyg || cyg.name !== "CYG X-1" || !Number.isFinite(cyg.raDeg)) {
  failures.push(`heasarc CYG X-1 row missing or malformed (got ${rows.length} rows)`);
}
console.log(
  `3) heasarc xrbcat CYG X-1: HTTP ${tapRes.status}, rows=${rows.length}` +
    (cyg ? ` -> ${cyg.name} ra=${cyg.raDeg} dec=${cyg.decDeg} porb=${cyg.orbitalPeriodDays}d` : ""),
);

if (failures.length > 0) {
  console.error("FAILURES:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("VERIFY-NASA-LIVE: ALL OK");
