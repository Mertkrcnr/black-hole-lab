import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Radio, RefreshCw, Satellite } from "lucide-react";

import { fetchNasaImages, type NasaImage } from "@/lib/nasa-client";
import { fetchHeasarcSources } from "@/lib/nasa-server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TARGETS: { id: string; name: string; note: string }[] = [
  { id: "m87", name: "M87*", note: "Spitzer · Chandra · EHT inset" },
  { id: "sagittarius", name: "Sagittarius A*", note: "Chandra galactic center" },
  { id: "cygnus", name: "Cygnus X-1", note: "HEAO-2 / Einstein first X-ray BH" },
];

function yearOf(dateCreated: string): string {
  const d = new Date(dateCreated);
  return Number.isNaN(d.getTime()) ? "—" : String(d.getUTCFullYear());
}

function formatDeg(value: number, digits = 4): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

export function NasaLivePanel() {
  const [targetId, setTargetId] = useState("m87");

  const target = useMemo(
    () => TARGETS.find((t) => t.id === targetId) ?? TARGETS[0]!,
    [targetId],
  );

  const imagesQuery = useQuery<NasaImage[]>({
    queryKey: ["nasa-images", targetId],
    queryFn: () => fetchNasaImages(targetId),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const heasarcQuery = useQuery({
    queryKey: ["heasarc", "xrbcat"],
    queryFn: () => fetchHeasarcSources(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const images = imagesQuery.data ?? [];
  const heasarc = heasarcQuery.data;
  const cygRow = heasarc?.rows[0];

  return (
    <div className="nasa-live-panel glass-panel">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-border">
        <div>
          <div className="technical text-primary flex items-center gap-2">
            <Satellite className="size-3.5" />
            NASA OPEN DATA · LIVE QUERY
          </div>
          <h3 className="text-base font-medium tracking-tight mt-0.5">
            Live NASA Archive Integration
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Images and catalog rows below are fetched live from NASA's public APIs at page
            load — images-api.nasa.gov from the browser, HEASARC Xamin TAP through the app
            server. No cached or hand-entered science values.
          </p>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-[10px] border-emerald-500/40 text-emerald-400"
        >
          <Radio className="size-3 mr-1" /> LIVE
        </Badge>
      </div>

      {/* Target selector */}
      <div className="flex flex-wrap gap-2 mt-4">
        {TARGETS.map((t) => (
          <Button
            key={t.id}
            variant={t.id === targetId ? "default" : "outline"}
            size="sm"
            className="text-xs font-mono h-7"
            onClick={() => setTargetId(t.id)}
          >
            {t.name}
          </Button>
        ))}
        <span className="technical text-muted-foreground self-center ml-1 hidden sm:inline">
          {target.note}
        </span>
      </div>

      {/* Imagery */}
      <div className="mt-4">
        {imagesQuery.isLoading && (
          <div className="text-xs font-mono text-muted-foreground p-4 rounded border border-border bg-card/60">
            Querying images-api.nasa.gov…
          </div>
        )}

        {imagesQuery.isError && (
          <div className="text-xs font-mono text-red-400 p-4 rounded border border-red-500/30 bg-red-500/5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              NASA Image Library unreachable ({String(imagesQuery.error)})
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] font-mono"
              onClick={() => imagesQuery.refetch()}
            >
              <RefreshCw className="size-3" /> Retry
            </Button>
          </div>
        )}

        {imagesQuery.isSuccess && images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {images.map((img) => (
              <figure
                key={img.nasaId}
                className="rounded border border-border bg-card/60 overflow-hidden group"
              >
                <a
                  href={`https://images.nasa.gov/details/${img.nasaId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={img.thumbUrl}
                    alt={img.title}
                    loading="lazy"
                    className="w-full aspect-video object-cover"
                  />
                </a>
                <figcaption className="p-2">
                  <div className="text-[11px] leading-snug line-clamp-2">{img.title}</div>
                  <div className="technical text-[9px] text-muted-foreground mt-1 flex items-center justify-between">
                    <span>
                      {img.center} · {yearOf(img.dateCreated)}
                    </span>
                    <a
                      href={`https://images.nasa.gov/details/${img.nasaId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-primary"
                    >
                      NASA <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* HEASARC live catalog row */}
      <div className="mt-4 p-3 rounded border border-border bg-card/60">
        <div className="flex items-center justify-between">
          <div className="technical text-[9px] text-muted-foreground">
            HEASARC XAMIN TAP · public.xrbcat · ADQL ILIKE QUERY
          </div>
          {heasarc && (
            <div className="text-[9px] font-mono text-muted-foreground">
              queried {new Date(heasarc.queriedAt).toISOString().slice(0, 19)}Z
            </div>
          )}
        </div>

        {heasarcQuery.isLoading && (
          <div className="text-xs font-mono text-muted-foreground mt-2">
            Querying heasarc.gsfc.nasa.gov via server bridge…
          </div>
        )}

        {heasarcQuery.isError && (
          <div className="text-xs font-mono text-red-400 mt-2 flex items-center gap-2">
            <AlertTriangle className="size-3.5" />
            HEASARC unreachable ({String(heasarcQuery.error)})
          </div>
        )}

        {heasarcQuery.isSuccess && cygRow && (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <div className="technical text-[9px] text-muted-foreground">DESIGNATION</div>
              <div className="font-mono text-sm text-primary">{cygRow.name}</div>
            </div>
            <div>
              <div className="technical text-[9px] text-muted-foreground">RA (J2000)</div>
              <div className="font-mono text-sm">{formatDeg(cygRow.raDeg)}°</div>
            </div>
            <div>
              <div className="technical text-[9px] text-muted-foreground">DEC (J2000)</div>
              <div className="font-mono text-sm">{formatDeg(cygRow.decDeg)}°</div>
            </div>
            <div>
              <div className="technical text-[9px] text-muted-foreground">P<sub>orb</sub></div>
              <div className="font-mono text-sm">
                {cygRow.orbitalPeriodDays !== null ? `${cygRow.orbitalPeriodDays} d` : "—"}
              </div>
            </div>
            <div>
              <div className="technical text-[9px] text-muted-foreground">F<sub>x max</sub></div>
              <div className="font-mono text-sm">
                {cygRow.peakFlux !== null ? cygRow.peakFlux : "—"}
              </div>
            </div>
          </div>
        )}

        {heasarcQuery.isSuccess && !cygRow && (
          <div className="text-xs font-mono text-muted-foreground mt-2">
            HEASARC returned 0 rows for CYG X-1.
          </div>
        )}
      </div>

      {/* Honest footer */}
      <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
        <span>
          GET images-api.nasa.gov/search · GET heasarc.gsfc.nasa.gov/xamin/vo/tap/sync
        </span>
        <span>Rendered from live responses · {TARGETS.length} targets</span>
      </div>
    </div>
  );
}
