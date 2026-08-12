import { readFile } from "node:fs/promises";

const expected = {
  repository: "Quirk-Systems/project-scaffold",
  domain: "application-scaffold",
  packageName: "project-scaffold",
  readmeTitle: "# Project Scaffold",
};

const [manifestText, packageText, readme] = await Promise.all([
  readFile(new URL("../.quirk/manifest.json", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../README.md", import.meta.url), "utf8"),
]);

const manifest = JSON.parse(manifestText);
const packageJson = JSON.parse(packageText);
const failures = [];

if (manifest.repository !== expected.repository) {
  failures.push(
    `.quirk/manifest.json repository must be "${expected.repository}", received "${manifest.repository}"`,
  );
}

if (manifest.domain !== expected.domain) {
  failures.push(
    `.quirk/manifest.json domain must be "${expected.domain}", received "${manifest.domain}"`,
  );
}

if (packageJson.name !== expected.packageName) {
  failures.push(
    `package.json name must be "${expected.packageName}", received "${packageJson.name}"`,
  );
}

if (readme.split(/\r?\n/, 1)[0] !== expected.readmeTitle) {
  failures.push(`README.md must begin with "${expected.readmeTitle}"`);
}

if (failures.length > 0) {
  console.error("Repository identity verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Repository identity verified: Project Scaffold");
}
