import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  applyVersion,
  bumpVersion,
  classifyPullRequestTitle,
  prepareRelease,
  selectLatestVersion,
} from "./release-version.mjs";

test("classifies releasing Conventional Commit PR titles", () => {
  const cases = [
    ["fix: correct timezone handling", "patch"],
    ["fix(ui): correct timezone handling", "patch"],
    ["feat: add CSV export", "minor"],
    ["feat(stats): add CSV export", "minor"],
    ["feat!: replace the storage format", "major"],
    ["refactor(storage)!: replace the storage format", "major"],
  ];

  for (const [title, expected] of cases) {
    assert.equal(classifyPullRequestTitle(title), expected);
  }
});

test("does not release other or malformed PR titles", () => {
  for (const title of [
    "docs: update README",
    "refactor: simplify calculations",
    "Feat: wrong case",
    "feat without a colon",
    "feat(): empty scope",
    "",
  ]) {
    assert.equal(classifyPullRequestTitle(title), null);
  }
});

test("increments semantic versions", () => {
  assert.equal(bumpVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
});

test("selects the highest strict stable release tag", () => {
  assert.equal(
    selectLatestVersion(["v1.9.0", "v1.10.0", "v2.0.0-beta.1", "release/v9.0.0", "v2.0.0"]),
    "2.0.0",
  );
  assert.equal(selectLatestVersion(["latest", "v1.0", "v1.0.0.1"]), null);
});

test("uses the configured version for the first release", () => {
  assert.deepEqual(
    prepareRelease({
      title: "fix: first automated release",
      mergeSha: "abc123",
      tags: [],
      tagsAtCommit: [],
      fallbackVersion: "1.0.0",
    }),
    {
      shouldRelease: true,
      bump: "patch",
      version: "1.0.0",
      tag: "v1.0.0",
      reused: false,
      mergeSha: "abc123",
    },
  );
});

test("uses an exact requested version for a manual recovery", () => {
  assert.deepEqual(
    prepareRelease({
      title: "",
      mergeSha: "abc123",
      tags: ["v1.0.0"],
      tagsAtCommit: [],
      fallbackVersion: "1.0.0",
      requestedVersion: "1.1.0",
    }),
    {
      shouldRelease: true,
      bump: "manual",
      version: "1.1.0",
      tag: "v1.1.0",
      reused: false,
      mergeSha: "abc123",
    },
  );
});

test("reuses a semantic tag already pointing at the merged commit", () => {
  const result = prepareRelease({
    title: "feat: add dashboard",
    mergeSha: "abc123",
    tags: ["v1.0.0", "v1.1.0"],
    tagsAtCommit: ["v1.1.0"],
    fallbackVersion: "1.0.0",
  });

  assert.equal(result.version, "1.1.0");
  assert.equal(result.reused, true);
});

test("skips release preparation for non-releasing titles", () => {
  assert.deepEqual(
    prepareRelease({
      title: "test: improve coverage",
      mergeSha: "abc123",
      tags: ["v1.0.0"],
      tagsAtCommit: [],
      fallbackVersion: "1.0.0",
    }),
    { shouldRelease: false },
  );
});

test("applies one version consistently to every manifest", () => {
  const projectRoot = mkdtempSync(join(tmpdir(), "cash-dial-release-"));
  mkdirSync(join(projectRoot, "src-tauri"));

  try {
    writeFileSync(join(projectRoot, "package.json"), '{"name":"cash-dial-desktop","version":"1.0.0"}');
    writeFileSync(
      join(projectRoot, "package-lock.json"),
      '{"name":"cash-dial-desktop","version":"1.0.0","packages":{"":{"version":"1.0.0"}}}',
    );
    writeFileSync(join(projectRoot, "src-tauri/tauri.conf.json"), '{"version":"1.0.0"}');
    writeFileSync(
      join(projectRoot, "src-tauri/Cargo.toml"),
      '[package]\nname = "cash-dial-desktop"\nversion = "1.0.0"\n\n[dependencies]\n',
    );
    writeFileSync(
      join(projectRoot, "src-tauri/Cargo.lock"),
      '[[package]]\nname = "cash-dial-desktop"\nversion = "1.0.0"\n',
    );

    applyVersion("2.3.4", projectRoot);

    assert.equal(JSON.parse(readFileSync(join(projectRoot, "package.json"))).version, "2.3.4");
    assert.equal(
      JSON.parse(readFileSync(join(projectRoot, "package-lock.json"))).packages[""].version,
      "2.3.4",
    );
    assert.equal(
      JSON.parse(readFileSync(join(projectRoot, "src-tauri/tauri.conf.json"))).version,
      "2.3.4",
    );
    assert.match(readFileSync(join(projectRoot, "src-tauri/Cargo.toml"), "utf8"), /2\.3\.4/);
    assert.match(readFileSync(join(projectRoot, "src-tauri/Cargo.lock"), "utf8"), /2\.3\.4/);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
