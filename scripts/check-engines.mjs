import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import semver from "semver";
import { parse } from "yaml";

// The suite runs through bun and package managers do not enforce `engines`, so
// a green CI run says nothing about whether the Node floor we declare is one
// the installed dependency graph accepts. This check makes that agreement
// explicit: the declared floor must satisfy every installed package's
// `engines.node`, and CI must provision exactly that floor.

const root = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

const packageJson = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
);
const declared = packageJson.engines?.node;
const floor =
  declared && semver.validRange(declared) ? semver.minVersion(declared) : null;

if (!floor) {
  console.error(
    `Engines check failed: package.json engines.node is missing or invalid ("${declared}")`,
  );
  process.exit(1);
}

const nodeModules = join(root, "node_modules");
if (!existsSync(nodeModules)) {
  console.error(
    "Engines check failed: node_modules not found — run `bun install` first",
  );
  process.exit(1);
}

async function collectPackageDirs(dir, out) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.name.startsWith("@")) {
      await collectPackageDirs(path, out);
      continue;
    }
    out.push(path);
    const nested = join(path, "node_modules");
    if (existsSync(nested)) await collectPackageDirs(nested, out);
  }
}

const packageDirs = [];
await collectPackageDirs(nodeModules, packageDirs);

const seen = new Set();
const violations = [];
for (const dir of packageDirs) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
  } catch {
    continue;
  }
  const range = manifest.engines?.node;
  if (typeof range !== "string" || !semver.validRange(range)) continue;
  const id = `${manifest.name}@${manifest.version}`;
  if (seen.has(id)) continue;
  seen.add(id);
  if (!semver.satisfies(floor, range)) violations.push({ id, range });
}

for (const { id, range } of violations.sort((a, b) =>
  a.id.localeCompare(b.id),
)) {
  failures.push(
    `${id} requires node "${range}", which excludes the declared floor ${floor}`,
  );
}

const ciPath = ".github/workflows/ci.yml";
const ci = parse(await readFile(join(root, ciPath), "utf8"));
const setupNodeSteps = Object.entries(ci?.jobs ?? {}).flatMap(
  ([job, { steps = [] }]) =>
    steps
      .filter(
        (step) =>
          typeof step?.uses === "string" &&
          step.uses.startsWith("actions/setup-node@"),
      )
      .map((step) => ({ job, version: step.with?.["node-version"] })),
);

if (setupNodeSteps.length === 0) {
  failures.push(
    `${ciPath} has no actions/setup-node step; it must provision the declared floor ${floor}`,
  );
}
for (const { job, version } of setupNodeSteps) {
  const value = version === undefined ? "" : String(version);
  if (!semver.valid(value) || !semver.eq(value, floor)) {
    failures.push(
      `${ciPath} job "${job}" node-version "${value}" must equal the declared floor ${floor}`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    `Engines check failed for engines.node "${declared}" (floor ${floor}):`,
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Engines verified: floor ${floor} satisfies ${seen.size} installed engines.node ranges and ${ciPath}`,
  );
}
