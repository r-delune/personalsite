import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const runtime = join(
  homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node",
);
const result = spawnSync(
  existsSync(runtime) ? runtime : process.execPath,
  [
    "--experimental-strip-types",
    "--test",
    "tests/stage-bridge.test.ts",
    "tests/phase2b.test.ts",
    "tests/visual.test.ts",
    "tests/navigation.test.ts",
    "tests/pwa.test.ts",
    "tests/launch.test.ts",
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
