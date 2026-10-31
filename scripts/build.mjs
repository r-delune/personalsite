import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const preview = process.argv.includes("--preview");
// Failed production checks must not leave an apparently publishable artifact.
rmSync("dist", { recursive: true, force: true });
const commands = [
  ["scripts/generate-pwa-icons.mjs"],
  ["scripts/prepare-fixture.mjs"],
  ["scripts/check-media.mjs"],
  ["scripts/astro.mjs", "build", ...(preview ? ["--mode", "preview"] : [])],
  ["scripts/build-pwa.mjs", ...(preview ? ["--preview"] : [])],
  ...(!preview ? [["scripts/check-content.mjs"]] : []),
  ["scripts/check-site.mjs", ...(preview ? ["--preview"] : [])],
  ["scripts/check-pwa.mjs", ...(preview ? ["--preview"] : [])],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error.message);
    rmSync("dist", { recursive: true, force: true });
    console.error("Build failed; dist was removed. No publishable output remains.");
    process.exit(result.status || 1);
  }
}
