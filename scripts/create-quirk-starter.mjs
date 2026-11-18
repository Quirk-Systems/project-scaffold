import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const templateRoot = fileURLToPath(
  new URL("../starters/web/", import.meta.url),
);
const templateFiles = [
  ".gitignore",
  "README.md",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "src/app/globals.css",
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/lib/candidate.mjs",
  "tests/candidate.test.mjs",
];
const usage =
  "Usage: node scripts/create-quirk-starter.mjs --name <package-name> --output <new-directory>";

async function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(usage);
    return;
  }
  if (args.length !== 4 || new Set([args[0], args[2]]).size !== 2)
    throw new Error(usage);
  const options = Object.fromEntries([
    [args[0], args[1]],
    [args[2], args[3]],
  ]);
  if (!Object.hasOwn(options, "--name") || !Object.hasOwn(options, "--output"))
    throw new Error(usage);
  const name = options["--name"];
  if (!/^[a-z0-9][a-z0-9._-]{0,213}$/.test(name) || name === "node_modules") {
    throw new Error(
      "Package name must be lowercase and contain only letters, numbers, dots, underscores, and hyphens.",
    );
  }
  const destination = resolve(options["--output"]);

  // Read the complete, fixed template before creating anything at the destination.
  const contents = new Map();
  for (const path of templateFiles) {
    const source = join(templateRoot, path);
    if (!(await lstat(source)).isFile())
      throw new Error(`Template entry is not a regular file: ${path}`);
    contents.set(path, await readFile(source));
  }
  const pkg = JSON.parse(contents.get("package.json").toString("utf8"));
  const lock = JSON.parse(contents.get("package-lock.json").toString("utf8"));
  pkg.name = name;
  lock.name = name;
  lock.packages[""].name = name;
  contents.set(
    "package.json",
    Buffer.from(`${JSON.stringify(pkg, null, 2)}\n`),
  );
  contents.set(
    "package-lock.json",
    Buffer.from(`${JSON.stringify(lock, null, 2)}\n`),
  );

  // A single non-recursive mkdir refuses existing files, directories, and symlinks.
  await mkdir(destination);
  const records = [];
  for (const [path, bytes] of contents) {
    const output = join(destination, path);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, bytes, { flag: "wx" });
    records.push({
      path,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  const receipt = {
    kind: "quirk-starter-generation/v1",
    created_at: new Date().toISOString(),
    project_name: name,
    template: "Quirk-Systems/project-scaffold:starters/web",
    authority: "none",
    note: "File creation record only; not approval, admission, testing, or deployment evidence.",
    files: records,
  };
  await writeFile(
    join(destination, "QUIRK-STARTER-RECEIPT.json"),
    `${JSON.stringify(receipt, null, 2)}\n`,
    { flag: "wx" },
  );
  console.log(
    `Created ${name} at ${destination}. No dependencies were installed and no code was run.`,
  );
  console.log(
    "Next: cd into the new directory, then run npm ci, npm test, and npm run dev.",
  );
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(`Starter creation failed: ${error.message}`);
  console.error(
    "An incomplete new directory may remain if writing failed; inspect it before removing it.",
  );
  process.exitCode = 1;
}
