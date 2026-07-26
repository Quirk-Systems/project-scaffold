import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020";
import { parse } from "yaml";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(
  repositoryRoot,
  "schemas/agent-containment-contract.schema.json",
);
const contractPath = resolve(
  repositoryRoot,
  "templates/agent-containment-contract.yaml",
);

const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const contract = parse(await readFile(contractPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile(schema);

if (!validate(contract)) {
  console.error(`Invalid containment contract: ${contractPath}`);
  console.error(ajv.errorsText(validate.errors, { separator: "\n" }));
  process.exit(1);
}

console.log(`Valid containment contract: ${contractPath}`);
