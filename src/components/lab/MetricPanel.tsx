import { Info } from "lucide-react";
import { LabTip } from "@/components/lab/LabTip";
import type { Readout } from "@/lib/lab-data";

export function MetricPanel({ readouts }: { readouts: Readout[] }) {
  return (
    <aside className="side-panel readouts glass-panel" aria-label="Scientific observables">
      <div className="panel-title technical">
        <span>OBSERVABLES</span>
        <span>02</span>
      </div>
      {readouts.map((r) => (
        <LabTip key={r.id || r.label} text={r.note}>
          <div className="readout">
            <div className="readout-label">
              <span>{r.label}</span>
              <span>{r.symbol}</span>
            </div>
            <div className="readout-value">
              {r.value}
              <small>{r.unit}</small>
            </div>
            <div className={`source-tag ${r.source === "kerr" ? "is-kerr" : "is-illust"}`}>
              {r.sourceLabel}
            </div>
          </div>
        </LabTip>
      ))}
      <div className="illustrative">
        <Info className="size-3 shrink-0" />
        All 16 observables are exact analytic Kerr results (Bardeen 1973, BPT 1972, Hawking 1974)
        or numerically cross-checked — no fitted parameters.
      </div>
    </aside>
  );
}
