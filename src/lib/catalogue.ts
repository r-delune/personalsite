import type { Chapter } from "./tracklist.mjs";
import feed from "../fixtures/showcase.sample.json";
import mixData from "../fixtures/mixes.json";
import { isPreview } from "./content";
export { time } from "./format";
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const releases = feed.albums
  .filter((a) => a.active !== false)
  .map((a) => ({
    slug: slugify(a.name),
    title: a.name,
    artist: a.artist_name || "",
    year: a.release_date || "",
    artwork: `/artwork/optimized/${slugify(a.name)}.webp`,
    tracks: a.tracks
      .filter((t) => t.is_published === true && t.r2_url && t.format === "mp3")
      .map((t) => ({
        id: String(t.id),
        title: t.title,
        src: t.r2_url!,
        duration: t.duration_seconds || 0,
        artist: a.artist_name || "",
        artwork: `/artwork/optimized/${slugify(a.name)}.webp`,
        href: `/music/${slugify(a.name)}`,
      })),
  }))
  .filter((a) => a.tracks.length);
export const tracks = releases.flatMap((a) => a.tracks);
const mediaBase =
  import.meta.env.PUBLIC_MIX_MEDIA_BASE?.replace(/\/$/, "") || "";
export const mixes = mixData
  .map((mix) => ({
    ...mix,
    tracklist: mix.tracklist as Chapter[],
    src:
      mix.filename && mediaBase && (isPreview || /^https:\/\//.test(mediaBase))
        ? `${mediaBase}/${mediaBase.endsWith("/__local-media") ? mix.filename : mix.streamFilename || mix.filename}`
        : "",
    scoreUrl: mix.score ?? null,
    kind: "mix" as const,
    artist: "Roam",
    artwork: mix.cover,
    href: `/mixes/${mix.slug}`,
  }))
  .filter(
    (mix) => isPreview || (mix.src && !mix.title.includes("TODO(") && mix.year),
  );
export const visibleYearRange = (items: { year: string | null }[]) => {
  const years = items.flatMap((i) =>
    i.year && /^\d{4}$/.test(i.year) ? [Number(i.year)] : [],
  );
  return years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "";
};
