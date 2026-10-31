import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadEnv } from "vite";
const mixes = JSON.parse(await readFile("src/content/mixes.json", "utf8"));
const env = {
  ...loadEnv("production", process.cwd(), "PUBLIC_"),
  ...process.env,
};
const remote = process.argv.includes("--remote");
for (const mix of mixes.filter((mix) => mix.sourceSha256)) {
  for (const field of ["peaks", "score"]) {
    const data = JSON.parse(await readFile(`public${mix[field]}`, "utf8"));
    assert.equal(
      data.sourceSha256,
      mix.sourceSha256,
      `${mix.slug}: ${field} source hash differs`,
    );
    assert(
      Math.abs(data.duration - mix.duration) < 0.1,
      `${mix.slug}: ${field} duration differs`,
    );
    assert(
      mix[field].includes(mix.sourceSha256.slice(0, 8)),
      `${mix.slug}: unversioned ${field} URL`,
    );
  }
  if (!remote) continue;
  const base = env.PUBLIC_MIX_MEDIA_BASE?.replace(/\/$/, "");
  assert(
    base?.startsWith("https://"),
    "Deployment requires an HTTPS PUBLIC_MIX_MEDIA_BASE",
  );
  const url = new URL(`${base}/${mix.streamFilename}`);
  assert(
    !url.username && !url.password,
    "Public media URLs cannot contain credentials",
  );
  const head = await fetch(url, {
    method: "HEAD",
    signal: AbortSignal.timeout(20000),
  });
  assert(head.ok, `${mix.slug}: media HEAD returned ${head.status}`);
  assert(
    head.headers.get("content-type")?.includes("audio/"),
    `${mix.slug}: invalid media content type`,
  );
  assert.equal(
    Number(head.headers.get("content-length")),
    mix.sourceBytes,
    `${mix.slug}: uploaded size differs`,
  );
  const range = await fetch(url, {
    headers: { Range: "bytes=0-0" },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(
    range.status,
    206,
    `${mix.slug}: seeking requires a 206 range response`,
  );
  assert.equal(
    range.headers.get("content-range"),
    `bytes 0-0/${mix.sourceBytes}`,
  );
  await range.body?.cancel();
}
console.log(
  remote
    ? "Verified published mix media size, MIME and byte-range seeking."
    : "Verified waveform/score provenance and duration against mix metadata.",
);
