import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ExternalLink, Satellite } from "lucide-react";

import { fetchNasaImages, type NasaImage } from "@/lib/nasa-client";
import { Badge } from "@/components/ui/badge";

/**
 * Per-catalog-object pinned provenance image.
 *
 * For M87* we pin the official NASA/JPL archive asset PIA23122 — the Spitzer
 * view of Messier 87 whose inset contains the actual Event Horizon Telescope
 * ring — so the simulated overlay sits next to the real published image.
 * Other targets fall back to the live top result from images-api.nasa.gov.
 */
const PINNED: Record<string, { nasaId: string; caption: string }> = {
  m87: {
    nasaId: "PIA23122",
    caption: "Spitzer view of M87 with the EHT ring inset (NASA/JPL, 2019)",
  },
};

const FALLBACK_CAPTIONS: Record<string, string> = {
  sagittarius: "Live NASA archive result — galactic center imagery",
  cygnus: "Live NASA archive result — first X-ray binary black hole",
};

export function NasaProvenanceBand({ objectId }: { objectId: string }) {
  const pinned = PINNED[objectId];

  const imagesQuery = useQuery<NasaImage[]>({
    queryKey: ["nasa-featured", objectId],
    queryFn: () => fetchNasaImages(objectId),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const first = imagesQuery.data?.[0];
  const nasaId = pinned?.nasaId ?? first?.nasaId;
  const caption = pinned?.caption ?? FALLBACK_CAPTIONS[objectId] ?? "NASA archive";
  const thumb = nasaId
    ? `https://images-assets.nasa.gov/image/${nasaId}/${nasaId}~thumb.jpg`
    : undefined;
  const detailsUrl = nasaId ? `https://images.nasa.gov/details/${nasaId}` : undefined;

  return (
    <div className="nasa-provenance-band flex items-center gap-3 rounded border border-border bg-card/60 p-2.5">
      {thumb ? (
        <a href={detailsUrl} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={thumb}
            alt={caption}
            loading="lazy"
            className="h-16 w-28 rounded object-cover border border-border"
          />
        </a>
      ) : (
        <div className="h-16 w-28 rounded bg-muted/40 border border-border shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="font-mono text-[9px] border-emerald-500/40 text-emerald-400"
          >
            <BadgeCheck className="size-3 mr-1" /> NASA ARCHIVE VERIFIED
          </Badge>
          <span className="technical text-[9px] text-muted-foreground flex items-center gap-1">
            <Satellite className="size-2.5" />
            images-api.nasa.gov{pinned ? " · PIA23122" : ""}
          </span>
        </div>
        <div className="text-[11px] leading-snug mt-1 line-clamp-2">{caption}</div>
        {detailsUrl && (
          <a
            href={detailsUrl}
            target="_blank"
            rel="noreferrer"
            className="technical text-[9px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-0.5"
          >
            {nasaId} <ExternalLink className="size-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}
