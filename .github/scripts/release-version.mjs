import {
  appendFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PROJECT_ROOT = resolve(dirname(SCRIPT_PATH), "../..");
const VERSION_PATTERN = /^(?:v)?(\d+)\.(\d+)\.(\d+)$/;
const TITLE_PATTERN = /^(?<type>[a-z][a-z0-9-]*)(?:\([^)]+\))?(?<breaking>!)?:\s+\S/;

export function parseVersion(value) {
  const match = VERSION_PATTERN.exec(value);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function compareVersions(left, right) {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  );
}

export function classifyPullRequestTitle(title) {
  const match = TITLE_PATTERN.exec(title.trim());
  if (!match) return null;
  if (match.groups.breaking) return "major";
  if (match.groups.type === "feat") return "minor";
  if (match.groups.type === "fix") return "patch";
  return null;
}

export function bumpVersion(version, bump) {
  const current = typeof version === "string" ? parseVersion(version) : version;
  if (!current) throw new Error(`Invalid semantic version: ${version}`);

  if (bump === "major") return `${current.major + 1}.0.0`;
  if (bump === "minor") return `${current.major}.${current.minor + 1}.0`;
  if (bump === "patch") return `${current.major}.${current.minor}.${current.patch + 1}`;
  throw new Error(`Unsupported semantic version bump: ${bump}`);
}

export function selectLatestVersion(tags) {
  const versions = tags
    .map((tag) => parseVersion(tag))
    .filter((version) => version !== null)
    .sort(compareVersions);

  return versions.length ? formatVersion(versions.at(-1)) : null;
}

export function prepareRelease({
  title,
  mergeSha,
  tags,
  tagsAtCommit,
  fallbackVersion,
  requestedVersion = "",
}) {
  if (requestedVersion) {
    const parsedVersion = parseVersion(requestedVersion);
    if (!parsedVersion) throw new Error(`Invalid requested release version: ${requestedVersion}`);

    const version = formatVersion(parsedVersion);
    return {
      shouldRelease: true,
      bump: "manual",
      version,
      tag: `v${version}`,
      reused: selectLatestVersion(tagsAtCommit) === version,
      mergeSha,
    };
  }

  const bump = classifyPullRequestTitle(title);
  if (!bump) return { shouldRelease: false };

  const existingVersion = selectLatestVersion(tagsAtCommit);
  if (existingVersion) {
    return {
      shouldRelease: true,
      bump,
      version: existingVersion,
      tag: `v${existingVersion}`,
      reused: true,
      mergeSha,
    };
  }

  const currentVersion = selectLatestVersion(tags);
  const fallback = parseVersion(fallbackVersion);
  if (!fallback) throw new Error(`Invalid fallback release version: ${fallbackVersion}`);
  const version = currentVersion
    ? bumpVersion(currentVersion, bump)
    : formatVersion(fallback);

  return {
    shouldRelease: true,
    bump,
    version,
    tag: `v${version}`,
    reused: false,
    mergeSha,
  };
}

function replaceExactlyOnce(contents, pattern, replacement, fileName) {
  let replacements = 0;
  const updated = contents.replace(pattern, (...args) => {
    replacements += 1;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });

  if (replacements !== 1) {
    throw new Error(`Expected exactly one version field in ${fileName}, found ${replacements}`);
  }

  return updated;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function applyVersion(version, projectRoot = PROJECT_ROOT) {
  if (!parseVersion(version)) throw new Error(`Invalid semantic version: ${version}`);

  const packagePath = resolve(projectRoot, "package.json");
  const packageLockPath = resolve(projectRoot, "package-lock.json");
  const tauriConfigPath = resolve(projectRoot, "src-tauri/tauri.conf.json");
  const cargoManifestPath = resolve(projectRoot, "src-tauri/Cargo.toml");
  const cargoLockPath = resolve(projectRoot, "src-tauri/Cargo.lock");

  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  packageJson.version = version;
  writeJson(packagePath, packageJson);

  const packageLock = JSON.parse(readFileSync(packageLockPath, "utf8"));
  packageLock.version = version;
  packageLock.packages[""].version = version;
  writeJson(packageLockPath, packageLock);

  const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf8"));
  tauriConfig.version = version;
  writeJson(tauriConfigPath, tauriConfig);

  const cargoManifest = readFileSync(cargoManifestPath, "utf8");
  writeFileSync(
    cargoManifestPath,
    replaceExactlyOnce(
      cargoManifest,
      /(\[package\][\s\S]*?^version\s*=\s*")[^"]+("\s*$)/m,
      (_match, before, after) => `${before}${version}${after}`,
      "src-tauri/Cargo.toml",
    ),
  );

  const cargoLock = readFileSync(cargoLockPath, "utf8");
  writeFileSync(
    cargoLockPath,
    replaceExactlyOnce(
      cargoLock,
      /(\[\[package\]\]\s+name\s*=\s*"cash-dial-desktop"\s+version\s*=\s*")[^"]+("\s*)/,
      (_match, before, after) => `${before}${version}${after}`,
      "src-tauri/Cargo.lock",
    ),
  );
}

function listTags(args = []) {
  const output = execFileSync("git", ["tag", ...args, "--list", "v*"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function writeOutputs(result) {
  const outputs = result.shouldRelease
    ? {
        should_release: "true",
        bump: result.bump,
        version: result.version,
        tag: result.tag,
        reused: String(result.reused),
      }
    : { should_release: "false" };

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(outputs)
        .map(([name, value]) => `${name}=${value}`)
        .join("\n") + "\n",
    );
  }

  process.stdout.write(`${JSON.stringify(outputs)}\n`);
}

function run() {
  const command = process.argv[2];

  if (command === "prepare") {
    const title = process.env.PR_TITLE ?? "";
    const mergeSha = process.env.MERGE_SHA ?? "";
    const requestedVersion = process.env.REQUESTED_VERSION ?? "";
    const fallbackVersion = JSON.parse(
      readFileSync(resolve(PROJECT_ROOT, "src-tauri/tauri.conf.json"), "utf8"),
    ).version;
    const result = prepareRelease({
      title,
      mergeSha,
      tags: listTags(),
      tagsAtCommit: mergeSha ? listTags(["--points-at", mergeSha]) : [],
      fallbackVersion,
      requestedVersion,
    });
    writeOutputs(result);
    return;
  }

  if (command === "apply") {
    const version = process.env.RELEASE_VERSION ?? "";
    applyVersion(version);
    process.stdout.write(`Applied release version ${version}\n`);
    return;
  }

  throw new Error("Usage: release-version.mjs <prepare|apply>");
}

if (resolve(process.argv[1] ?? "") === SCRIPT_PATH) run();
