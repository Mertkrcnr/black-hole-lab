import { createFileRoute } from "@tanstack/react-router";
import { LabShell } from "@/components/lab/LabShell";
import { NasaLivePanel } from "@/components/lab/NasaLivePanel";

export const Route = createFileRoute("/nasa-live")({
  head: () => ({
    meta: [
      { title: "Live NASA Data — BLACK HOLE LAB" },
      {
        name: "description",
        content:
          "Live queries against NASA's open-data APIs: Image & Video Library imagery and HEASARC Xamin TAP catalog rows for each catalog black hole.",
      },
      { property: "og:title", content: "Live NASA Data — BLACK HOLE LAB" },
      {
        property: "og:description",
        content:
          "Live queries against NASA's open-data APIs: Image & Video Library imagery and HEASARC Xamin TAP catalog rows for each catalog black hole.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NasaLive,
});

function NasaLive() {
  return (
    <LabShell>
      <main className="content-page">
        <div className="technical text-primary">NASA OPEN DATA · LIVE</div>
        <h1>Live NASA Archive Integration</h1>
        <p className="intro">
          Every value and image on this page is fetched live at load time from NASA's public
          APIs — the Image &amp; Video Library for observatory imagery, and the HEASARC Xamin
          TAP service for catalog coordinates of X-ray binaries. Pair it with the EHT overlay
          in the simulation view to see theory meet observation.
        </p>
        <NasaLivePanel />
      </main>
    </LabShell>
  );
}
