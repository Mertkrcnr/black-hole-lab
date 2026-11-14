import { Slider } from "@/components/ui/slider";
import { LabTip } from "@/components/lab/LabTip";

export function ParameterControl({
  label,
  symbol,
  value,
  unit,
  min,
  max,
  step,
  current,
  onChange,
  range,
  tip,
}: {
  label: string;
  symbol: string;
  value: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (value: number) => void;
  range: string[];
  tip: string;
}) {
  return (
    <div className="parameter">
      <LabTip text={tip}>
        <button type="button" className="parameter-label">
          <span>{label}</span>
          <span>{symbol}</span>
        </button>
      </LabTip>
      <div className="parameter-value">
        {value}
        <small>{unit ?? symbol}</small>
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[current]}
        onValueChange={([v]) => {
          if (v !== undefined) onChange(v);
        }}
      />
      <div className="range-labels">
        <span>{range[0]}</span>
        <span>{range[1]}</span>
      </div>
    </div>
  );
}
