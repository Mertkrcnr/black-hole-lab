import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LabShell } from "@/components/lab/LabShell";
import { Button } from "@/components/ui/button";
import { objects } from "@/lib/lab-data";

export const Route = createFileRoute("/real-objects")({
  head: () => ({
    meta: [
      { title: "Real Objects — BLACK HOLE LAB" },
      {
        name: "description",
        content:
          "Explore known astrophysical black holes and load their observed parameters into the laboratory.",
      },
      { property: "og:title", content: "Real Objects — BLACK HOLE LAB" },
      {
        property: "og:description",
        content:
          "Explore known astrophysical black holes and load their observed parameters into the laboratory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RealObjects,
});

function RealObjects() {
  return (
    <LabShell>
      <main className="content-page">
        <div className="technical text-primary">CATALOG · 3 TARGETS</div>
        <h1>Astrophysical Targets</h1>
        <p className="intro">
          From stellar-mass stellar remnants to supermassive galactic titans. Load a real black hole
          into the laboratory to examine its Kerr horizons, photon orbit, and relativistic shadow.
        </p>
        <div className="object-grid">
          {objects.map((o) => (
            <article className="object-item" key={o.id}>
              <div className="technical text-muted-foreground">{o.location}</div>
              <h2>{o.name}</h2>
              <p>{o.description}</p>
              <div className="technical text-muted-foreground">MASS</div>
              <div className="object-metric">{o.mass.toLocaleString("en-US")} M☉</div>
              <div className="technical text-muted-foreground">SPIN a*</div>
              <div className="object-spin">{o.spin.toFixed(2)}</div>
              <Button asChild variant="outline">
                <Link to="/" search={{ object: o.id }}>
                  Load into Simulation <ArrowRight />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </main>
    </LabShell>
  );
}
