import test from "node:test";
import assert from "node:assert/strict";
import {
  sharedRelease,
  createTransitionCleanup,
} from "../src/lib/navigation-state.ts";

const url = (path: string) => new URL(path, "https://example.com");
test("artwork pairing follows routes for title clicks, return links and history", () => {
  assert.equal(
    sharedRelease(url("/music"), url("/music/anna-doni")),
    "anna-doni",
  );
  assert.equal(
    sharedRelease(url("/music/anna-doni?track=2"), url("/music/#albums")),
    "anna-doni",
  );
  assert.equal(
    sharedRelease(url("/music/"), url("/music/anna-doni/")),
    "anna-doni",
  );
  for (const [from, to] of [
    ["/music/anna-doni", "/work"],
    ["/music/anna-doni", "/music/another-release"],
    ["/music", "/music/anna-doni/extra"],
    ["/music", "https://external.example/music/anna-doni"],
  ])
    assert.equal(sharedRelease(url(from), url(to)), null);
});

test("superseded completion cannot clear the latest transition; abort cleanup is idempotent", () => {
  const scope = createTransitionCleanup();
  const cleaned: string[] = [];
  const finishOld = scope.begin();
  scope.add(() => cleaned.push("old"));
  const finishNew = scope.begin();
  assert.deepEqual(cleaned, ["old"]);
  scope.add(() => cleaned.push("new"));
  finishOld();
  assert.deepEqual(cleaned, ["old"]);
  finishNew();
  finishNew();
  assert.deepEqual(cleaned, ["old", "new"]);
});
