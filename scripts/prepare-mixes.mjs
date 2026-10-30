import { readFileSync, writeFileSync } from "node:fs";
import { parseTracklist, validateTracklist } from "../src/lib/tracklist.mjs";
// Build-time ingest projection: only named, validated chapters reach HTML/client JSON.
const mixes = JSON.parse(readFileSync("src/content/mixes.json", "utf8")).map(
  (mix) => {
    const { tracklistFile, tracklist = [], ...rest } = mix;
    let chapters = validateTracklist(tracklist, mix.duration);
    if (tracklistFile) {
      const result = parseTracklist(
        readFileSync(tracklistFile, "utf8"),
        mix.duration,
      );
      chapters = result.chapters;
      if (result.droppedLines.length)
        console.log(
          `${mix.slug}: dropped ${result.droppedLines.length} TODO tracklist lines (${result.droppedLines.join(", ")})`,
        );
    }
    return { ...rest, tracklist: chapters };
  },
);
const path = "src/fixtures/mixes.json",
  output = JSON.stringify(mixes, null, 2) + "\n";
let previous = "";
try {
  previous = readFileSync(path, "utf8");
} catch {}
if (previous !== output) writeFileSync(path, output);
