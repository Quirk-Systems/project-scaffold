import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ValidateFunction } from "ajv";
import Ajv2020 from "ajv/dist/2020";
import { parse } from "yaml";
import { beforeAll, describe, expect, it } from "vitest";

type Contract = Record<string, unknown>;

const schemaPath = resolve(
  process.cwd(),
  "schemas/agent-containment-contract.schema.json",
);
const contractPath = resolve(
  process.cwd(),
  "templates/agent-containment-contract.yaml",
);

let example: Contract;
let validate: ValidateFunction;

beforeAll(async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  example = parse(await readFile(contractPath, "utf8"));
  validate = new Ajv2020({ allErrors: true }).compile(schema);
});

describe("agent containment contract schema", () => {
  it("accepts the example contract", () => {
    expect(validate(example), JSON.stringify(validate.errors)).toBe(true);
  });

  it("requires named shutdown authority", () => {
    const contract = structuredClone(example);
    delete contract.shutdown_authority;

    expect(validate(contract)).toBe(false);
  });

  it("fails closed when destructive actions are not denied", () => {
    const contract = structuredClone(example) as {
      tool_surface: { destructive_action_policy: string };
    };
    contract.tool_surface.destructive_action_policy = "approval_required";

    expect(validate(contract)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/tool_surface/destructive_action_policy",
          keyword: "const",
        }),
      ]),
    );
  });

  it("fails closed when out-of-scope actions are not denied", () => {
    const contract = structuredClone(example) as {
      tool_surface: { out_of_scope_action_policy: string };
    };
    contract.tool_surface.out_of_scope_action_policy = "approval_required";

    expect(validate(contract)).toBe(false);
    expect(validate.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: "/tool_surface/out_of_scope_action_policy",
          keyword: "const",
        }),
      ]),
    );
  });

  it("rejects production credentials in a sandbox", () => {
    const contract = structuredClone(example) as {
      environment: { production_credentials_allowed: boolean };
    };
    contract.environment.production_credentials_allowed = true;

    expect(validate(contract)).toBe(false);
  });
});
