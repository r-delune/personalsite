import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const failures = [];
function check(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) check(file);
    else if (
      /\.(astro|md|mdx|json|ts|tsx)$/.test(file) &&
      readFileSync(file, "utf8").includes("TODO(copy)")
    )
      failures.push(file);
  }
}
check("src");
if (failures.length) {
  console.error(
    "Production content is not approved. Resolve TODO(copy) before publishing:\n" +
      failures.join("\n"),
  );
  process.exit(1);
}
