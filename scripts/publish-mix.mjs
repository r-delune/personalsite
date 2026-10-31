// Explicit deployment command. Source audio is never copied into the repository.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/publish-mix.mjs /absolute/path/to/ROAM_MIX_2026.mp3",
  );
const mix = JSON.parse(await readFile("src/content/mixes.json", "utf8")).find(
  (mix) => mix.slug === "roam-mix-2026",
);
const hash = createHash("sha256");
for await (const chunk of createReadStream(source)) hash.update(chunk);
if (
  hash.digest("hex") !== mix.sourceSha256 ||
  (await stat(source)).size !== mix.sourceBytes
)
  throw new Error(
    "Audio differs from the analysed release. Regenerate and review its metadata before uploading.",
  );
const result = spawnSync(
  "wrangler",
  [
    "r2",
    "object",
    "put",
    `roam-tracks/mixes/${mix.streamFilename}`,
    "--file",
    source,
    "--content-type",
    "audio/mpeg",
    "--cache-control",
    "public, max-age=31536000, immutable",
    "--remote",
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
