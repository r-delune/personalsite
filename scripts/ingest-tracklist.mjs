import { readFileSync, writeFileSync } from "node:fs";
import { parseTracklist } from "../src/lib/tracklist.mjs";
const [slug, file] = process.argv.slice(2);
if (!slug || !file)
  throw new Error(
    "Usage: node scripts/ingest-tracklist.mjs <mix-slug> <tracklist.txt>",
  );
const path = "src/content/mixes.json",
  mixes = JSON.parse(readFileSync(path, "utf8"));
const mix = mixes.find((m) => m.slug === slug);
if (!mix) throw new Error(`Unknown mix: ${slug}`);
const { chapters, droppedLines } = parseTracklist(
  readFileSync(file, "utf8"),
  mix.duration,
);
console.log(
  `Imported ${chapters.length} chapters; dropped TODO lines: ${droppedLines.join(", ") || "none"}`,
);
mix.tracklistFile = file;
mix.tracklist = chapters;
writeFileSync(path, JSON.stringify(mixes, null, 2) + "\n");
await import("./prepare-mixes.mjs");
