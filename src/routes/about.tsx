import { createFileRoute } from "@tanstack/react-router";
import { LabShell } from "@/components/lab/LabShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — BLACK HOLE LAB" },
      { name: "description", content: "BLACK HOLE LAB and the spacetime visualization framework." },
      { property: "og:title", content: "About — BLACK HOLE LAB" },
      {
        property: "og:description",
        content: "BLACK HOLE LAB and the spacetime visualization framework.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <LabShell>
      <main className="content-page">
        <div className="technical text-primary">ABOUT THE LABORATORY</div>
        <h1>Visualizing the Geometry of Gravity</h1>
        <p className="intro">
          BLACK HOLE LAB is an interactive relativistic astrophysics platform designed to explore
          how mass, spin, and observer distance shape spacetime curvature, null geodesics, and time
          dilation.
        </p>
        <section className="about-row">
          <div className="technical text-muted-foreground">01 · VISUALIZATION</div>
          <p>
            The interactive scene renders the turbulent accretion disk, unstable photon ring, and
            gravitationally lensed stellar field of a rotating Kerr black hole. The procedural WebGL
            shader runs completely locally without external media assets.
          </p>
        </section>
        <section className="about-row">
          <div className="technical text-muted-foreground">02 · SCIENTIFIC METRICS</div>
          <p>
            Exact analytical solutions describe the outer event horizon, inner Cauchy horizon, and
            equatorial ergosphere in the Kerr metric. The photon sphere, shadow boundary, deflection
            angle, and tidal metrics are browser-safe scientific models prepared to receive rigorous
            high-precision backend calculations.
          </p>
        </section>
        <section className="about-row">
          <div className="technical text-muted-foreground">03 · WORKFLOW & MODES</div>
          <p>
            The platform follows a continuous scientific workflow: INPUT → CALCULATION → RESULTS →
            VISUALIZATION → REPORT. Geometry, Light Ray, Spacetime, and Observer modes expose
            complementary physical layers of the simulation.
          </p>
        </section>
      </main>
    </LabShell>
  );
}
