import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Use the normal Node installation when compatible. On this Mac, Codex already
// provides a compatible runtime; no global installation or shell changes needed.
const supported = (version) => {
  const [major, minor, patch] = version
    .replace(/^v/, "")
    .split(".")
    .map(Number);
  return (
    major > 22 || (major === 22 && (minor > 23 || (minor === 23 && patch >= 4)))
  );
};
const candidates = [
  process.execPath,
  process.env.PERSONALSITE_NODE,
  join(
    homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
  ),
].filter(Boolean);
const runtime = candidates.find(
  (path) =>
    existsSync(path) &&
    supported(
      spawnSync(path, ["--version"], { encoding: "utf8" }).stdout?.trim() ||
        "0.0.0",
    ),
);
if (!runtime) {
  console.error(
    "Astro 7 requires Node >=22.23.4. Install a compatible Node version or set PERSONALSITE_NODE to its executable.",
  );
  process.exit(1);
}
const result = spawnSync(
  runtime,
  ["node_modules/astro/bin/astro.mjs", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
