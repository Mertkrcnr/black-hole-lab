/**
 * Plain-JS mirror of parseHeasarcText() from nasa-client.ts, kept byte-for-byte
 * in sync for the scripts/verify-nasa-live.mjs probe (which runs under bare
 * node and cannot import TypeScript). If you change the parsing logic, change
 * it in BOTH places.
 */
export function parseHeasarcText(payload) {
  const lines = payload.split("\n");
  const rows = [];

  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cols = line.split("|").map((c) => c.trim());
    if (cols[0] === "name") continue;

    const num = (raw) => {
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
