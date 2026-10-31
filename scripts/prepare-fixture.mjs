import "./prepare-mixes.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const feed = JSON.parse(
  readFileSync("src/fixtures/showcase.sample.json", "utf8"),
);
assert(Array.isArray(feed.albums), "Fixture must contain upstream albums");
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
// Section times come from the feed. Manual ones are hand-placed; detected ones
// come from the upstream analysis and are what rdelune-productions ships
// (TRUST_DETECTED_SECTION_TIMES). Fallback/unknown sources are guesses: skip.
const TRUSTED_SECTION_SOURCES = new Set(["manual", "detected"]);
// Detected boundaries closer than this are merged; a visual section shorter
// than a few seconds reads as a glitch, not a section.
const MIN_DETECTED_SECTION_SEC = 6;
function boundaries(t) {
  if (
    !TRUSTED_SECTION_SOURCES.has(t.section_times_source) ||
    !Array.isArray(t.section_times)
  )
    return [];
  const minGap =
    t.section_times_source === "detected" ? MIN_DETECTED_SECTION_SEC : 0.75;
  const duration = t.duration_seconds,
    hasDuration = Number.isFinite(duration) && duration > 0;
  const cleaned = [];
  for (const n of [...t.section_times]
    .filter(
      (n) =>
        Number.isFinite(n) &&
        n > (hasDuration ? 8 : 0) &&
        n <= (hasDuration ? Math.max(8, duration - 8) : Infinity),
    )
    .sort((a, b) => a - b))
    if (!cleaned.length || n - cleaned[cleaned.length - 1] >= minGap)
      cleaned.push(n);
  return hasDuration &&
    cleaned.length === 1 &&
    (cleaned[0] < 15 || duration - cleaned[0] < 15)
    ? []
    : cleaned;
}
const tracks = [];
const seen = new Set();
for (const album of feed.albums) {
  assert(typeof album.name === "string");
  assert(Array.isArray(album.tracks));
  if (album.active === false) continue;
  for (const track of album.tracks) {
    if (track.is_published !== true) continue;
    assert(
      Number.isInteger(track.id),
      "Published tracks require a stable numeric id",
    );
    assert(typeof track.title === "string");
    assert(track.format === "mp3", `Published ${track.id} must be an MP3`);
    assert(
      typeof track.r2_url === "string" &&
        new URL(track.r2_url).protocol === "https:",
      `Published ${track.id} requires an upstream r2_url`,
    );
    assert(!seen.has(track.id), `Duplicate track id ${track.id}`);
    seen.add(track.id);
    tracks.push({
      peaksUrl: null,
      boundariesSec: boundaries(track),
      boundariesSource: boundaries(track).length
        ? track.section_times_source
        : null,
      bpm: Number.isFinite(track.bpm) ? track.bpm : null,
      beatStartAtSec: Number.isFinite(track.beat_start_at)
        ? track.beat_start_at
        : null,
      id: String(track.id),
      title: track.title,
      artist: album.artist_name || "",
      src: track.r2_url,
      duration: track.duration_seconds || 0,
      artwork: `/artwork/optimized/${slug(album.name)}.webp`,
      href: `/music/${slug(album.name)}`,
    });
  }
}
assert(tracks.length > 0, "Fixture must contain playable tracks");
// Only this minimal, published-media projection may enter the client bundle.
// Raw notes, credits, unpublished tracks and ingestion fields remain server-side.
const output = JSON.stringify(tracks, null, 2) + "\n";
let previous = "";
try {
  previous = readFileSync("src/fixtures/playable-tracks.json", "utf8");
} catch {}
if (previous !== output)
  writeFileSync("src/fixtures/playable-tracks.json", output);
console.log(
  `Prepared ${tracks.length} eligible tracks for the preview player.`,
);
