import {
  geometryConcepts,
  objects,
  viewCatalog,
  type Parameters,
  type ViewMode,
} from "@/lib/lab-data";

export function ModeOverlay({
  mode,
  parameters,
  objectId,
}: {
  mode: ViewMode;
  parameters: Parameters;
  objectId?: string | undefined;
}) {
  const view = viewCatalog.find((v) => v.id === mode);
  const selected = objects.find((o) => o.id === objectId);

  return (
    <div className="mode-overlay" aria-live="polite">
      <div className="mode-kicker technical">{view?.title}</div>
      <p className="mode-summary">{view?.summary}</p>
      {mode === "geometry" && <GeometryDiagram spin={parameters.spin} />}
      {mode === "light-ray" && <LightRayDiagram />}
      {mode === "spacetime" && <SpacetimeDiagram />}
      {mode === "observation" && (
        <ObservationNotes distance={parameters.distance} angle={parameters.cameraAngle} />
      )}
      {mode === "real-data" && (
        <p className="mode-note">
          {selected
            ? `${selected.name} · ${selected.distanceStr} · catalog mass ${selected.mass.toLocaleString("en-US")} M☉`
            : "Open the Real Objects catalog to load an astrophysical target into the laboratory."}
        </p>
      )}
    </div>
  );
}

function GeometryDiagram({ spin }: { spin: number }) {
  const rPlus = 1 + Math.sqrt(Math.max(0, 1 - spin * spin));
  const photon = 3 - spin * 0.38;
  const scale = 18;
  return (
    <div className="viz-diagram">
      <svg viewBox="0 0 220 88" className="diagram-svg" aria-hidden="true">
        <ellipse
          cx="48"
          cy="44"
          rx={photon * scale * 0.42}
          ry={photon * scale * 0.28}
          className="ring photon"
        />
        <ellipse
          cx="48"
          cy="44"
          rx={2 * scale * 0.42}
          ry={2 * scale * 0.28}
          className="ring ergo"
        />
        <ellipse
          cx="48"
          cy="44"
          rx={rPlus * scale * 0.42}
          ry={rPlus * scale * 0.28}
          className="ring horizon"
        />
        <circle cx="48" cy="44" r="4" className="singularity-dot" />
      </svg>
      <ul className="concept-list">
        {geometryConcepts.map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong>
            <span>{c.blurb}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LightRayDiagram() {
  return (
    <div className="viz-diagram">
      <svg viewBox="0 0 220 88" className="diagram-svg" aria-hidden="true">
        <circle cx="110" cy="44" r="14" className="singularity-dot" />
        <circle cx="110" cy="44" r="22" className="ring horizon" />
        <path d="M8 18 C 70 20, 90 28, 110 44" className="ray captured" />
        <path d="M8 34 C 78 36, 96 38, 200 22" className="ray bent" />
        <path d="M8 50 C 78 50, 96 50, 200 50" className="ray far" />
        <path d="M8 66 C 78 62, 96 58, 200 74" className="ray bent" />
        <path d="M8 78 C 70 72, 90 60, 110 44" className="ray captured" />
      </svg>
      <p className="mode-note">
        Rays with impact parameter below critical threshold are captured. Grazing rays are strongly
        deflected, forming a gravitationally lensed photon ring. Geodesics shown are illustrative.
      </p>
    </div>
  );
}

function SpacetimeDiagram() {
  const lines = Array.from({ length: 7 }, (_, i) => i);
  return (
    <div className="viz-diagram">
      <svg viewBox="0 0 220 88" className="diagram-svg" aria-hidden="true">
        {lines.map((i) => {
          const y = 12 + i * 10;
          const dip = 18 - Math.abs(i - 3) * 4;
          return (
            <path
              key={`h-${i}`}
              d={`M8 ${y} C 70 ${y + dip}, 150 ${y + dip}, 212 ${y}`}
              className="grid-line"
            />
          );
        })}
        {lines.map((i) => {
          const x = 20 + i * 28;
          return (
            <path
              key={`v-${i}`}
              d={`M${x} 8 C ${x} 40, ${110} 52, ${x} 80`}
              className="grid-line"
            />
          );
        })}
        <circle cx="110" cy="52" r="7" className="singularity-dot" />
      </svg>
      <p className="mode-note">
        The embedding grid visualizes equatorial spatial curvature around the gravitational well.
        Kerr frame dragging manifests as azimuthally skewed null paths.
      </p>
    </div>
  );
}

function ObservationNotes({ distance, angle }: { distance: number; angle: number }) {
  return (
    <div className="obs-notes">
      <div>
        <span className="technical">Distance</span>
        <strong>{distance.toFixed(0)} M</strong>
        <p>
          Closer observation distance magnifies accretion disk Doppler beaming and gravitational
          lensing deflection.
        </p>
      </div>
      <div>
        <span className="technical">Inclination</span>
        <strong>{angle.toFixed(0)}°</strong>
        <p>
          Near-equatorial viewing yields a thin asymmetric ring; polar inclination produces a
          symmetric circular silhouette.
        </p>
      </div>
    </div>
  );
}
