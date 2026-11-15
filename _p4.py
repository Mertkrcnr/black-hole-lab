# -*- coding: utf-8 -*-
"""index.tsx mission/ehtBadge/tour (real unicode chars) + EHT 1-sigma test. lab-data already done."""
import io
import re

BASE = r"C:\Users\mertk\Desktop\black-hole-lab"


def read(rel):
    return io.open(BASE + "\\" + rel, encoding="utf-8").read()


def write(rel, s):
    io.open(BASE + "\\" + rel, "w", encoding="utf-8", newline="\n").write(s)


def swap(s, old, new, n=1, tag=""):
    assert old in s, "ANCHOR NOT FOUND: " + tag
    return s.replace(old, new, n)


# ---------- 1) index.tsx ----------
p = "src\\routes\\index.tsx"
s = read(p)
if "ehtBadge" not in s:
    s = swap(
        s,
        'import { lazy, Suspense, useEffect, useState } from "react";',
        'import { lazy, Suspense, useEffect, useMemo, useState } from "react";',
        1,
        "react import",
    )
    s = swap(
        s,
        """import {
  defaultParameters,
  getReadouts,
  objects,""",
        """import {
  calculateEhtTheoreticalShadow,
  defaultParameters,
  getReadouts,
  missionStatement,
  objects,""",
        1,
        "lab-data import",
    )
    s = swap(
        s,
        """  const selected = objects.find((o) => o.id === object);
""",
        """  const selected = objects.find((o) => o.id === object);

  // Live EHT validation badge: first-principles shadow diameter for the current
  // mass/spin vs the published Event Horizon Telescope measurement of the target.
  const ehtBadge = useMemo(() => {
    if (!selected?.ehtData) return null;
    const isMpc = !!selected.distanceMpc;
    const dist = isMpc ? selected.distanceMpc! : selected.distanceKpc!;
    const { theoreticalShadowUas } = calculateEhtTheoreticalShadow(
      parameters.mass,
      dist,
      isMpc,
      parameters.spin,
    );
    const delta = theoreticalShadowUas - selected.ehtData.shadowDiameterUas;
    return {
      name: selected.name,
      year: selected.ehtData.observationYear,
      delta,
      sigma: Math.abs(delta) / selected.ehtData.shadowErrorUas,
    };
  }, [selected, parameters]);
""",
        1,
        "ehtBadge hook",
    )
    s = swap(
        s,
        """            {selected ? selected.location : "SIMULATION 01 · COMPUTATIONAL SOLVER"}
          </div>""",
        """            {selected ? selected.location : "SIMULATION 01 · COMPUTATIONAL SOLVER"}
          </div>
          <p className="technical text-[10px] text-muted-foreground mt-1">{missionStatement}</p>
          {ehtBadge && (
            <button
              type="button"
              onClick={() => setCenterView("eht")}
              className="technical text-[10px] text-signal hover:underline cursor-pointer mt-1"
              aria-label="Open NASA EHT validation panel"
            >
              {`MODEL vs EHT ${ehtBadge.year} · ${ehtBadge.name}: Δ ${
                ehtBadge.delta >= 0 ? "+" : "−"
              }${Math.abs(ehtBadge.delta).toFixed(1)} μas (${ehtBadge.sigma.toFixed(1)}σ) ↗`}
            </button>
          )}""",
        1,
        "heading block",
    )
    s = swap(
        s,
        '"Ten live quantities - event horizons, photon sphere, shadow radius, time dilation - update as you drag. Hover any row for the physics behind it.",',
        '"Sixteen live quantities - horizons, photon sphere, ISCO energetics, Hawking temperature, entropy - update as you drag. Hover any row for the physics behind it.",',
        1,
        "tour text",
    )
    write(p, s)
    print("index.tsx OK")
else:
    print("index.tsx SKIP (already patched)")

# ---------- 2) lab-data.test.ts: EHT 1-sigma test ----------
p = "src\\lib\\lab-data.test.ts"
t = read(p)
if "published EHT 1" not in t:
    m = re.search(r'import\s*\{([^}]*)\}\s*from\s*"@/lib/lab-data";', t)
    assert m, "lab-data import not found"
    names = [n.strip() for n in m.group(1).split(",")]
    for extra in ("calculateEhtTheoreticalShadow", "objects"):
        if extra not in names:
            names.append(extra)
    t = t[: m.start()] + "import { " + ", ".join(names) + ' } from "@/lib/lab-data";' + t[m.end():]
    idx = t.rstrip().rfind("});")
    test_code = '''
  it("first-principles shadow diameter lands within the published EHT 1σ error bar", () => {
    const m87 = objects.find((o) => o.id === "m87")!;
    const m87T = calculateEhtTheoreticalShadow(m87.mass, m87.distanceMpc!, true, m87.spin);
    expect(Math.abs(m87T.theoreticalShadowUas - m87.ehtData!.shadowDiameterUas))
      .toBeLessThanOrEqual(m87.ehtData!.shadowErrorUas);
    const sgr = objects.find((o) => o.id === "sagittarius")!;
    const sgrT = calculateEhtTheoreticalShadow(sgr.mass, sgr.distanceKpc!, false, sgr.spin);
    expect(Math.abs(sgrT.theoreticalShadowUas - sgr.ehtData!.shadowDiameterUas))
      .toBeLessThanOrEqual(sgr.ehtData!.shadowErrorUas);
  });
'''
    t = t[:idx] + test_code + t[idx:]
    write(p, t)
    print("lab-data.test.ts OK")
else:
    print("test SKIP (already patched)")
