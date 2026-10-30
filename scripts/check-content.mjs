import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const failures = [];
function check(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) check(file);
    else if (
      file.endsWith(".html") &&
      readFileSync(file, "utf8").includes("TODO(copy)")
    )
      failures.push(file);
  }
}
check(process.argv[2] || "dist");
if (failures.length) {
  console.error(
    "Production content is not approved. Resolve rendered TODO(copy) before publishing:\n" +
      failures.join("\n"),
  );
  process.exit(1);
}
console.log("Rendered production copy contains no TODO(copy).");
