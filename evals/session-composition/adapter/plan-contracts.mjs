/**
 * Candidate/test-only bridge to the exact Task 2/5 plan source.
 *
 * The governed-runs production modules do not exist at the referenced head.
 * This harness transpiles pinned plan blocks plus their actual canonical
 * dependencies into a disposable directory. It does not implement Task 4,
 * install production modules, type-check the unfinished plan, or execute effects.
 */
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const require = createRequire(import.meta.url);
const PLAN_PATH =
  "docs/superpowers/plans/2026-08-28-governed-agent-run-state-only.md";

// Explicit review pins: do not regenerate automatically when input source drifts.
const SOURCE_PINS = Object.freeze(
  [
    {
      path: "src/lib/quirk/governed-runs/contracts/primitives.ts",
      origin: "plan-code-block",
      sha256:
        "8ab49fb5188518018147836e78aecd6d4764f3531612af64527beb831b42a20d",
      module: "contracts-primitives.mjs",
    },
    {
      path: "src/lib/quirk/governed-runs/contracts/action.ts",
      origin: "plan-code-block",
      sha256:
        "c0cfaf7b141b6397ac32962f94617a7996d37195fb5d090c9e5899809143e84c",
      module: "contracts-action.mjs",
    },
    {
      path: "src/lib/quirk/governed-runs/state-only-policy.ts",
      origin: "plan-code-block",
      sha256:
        "16a4660bfa8a57af4098cdd650c4c58776a0804e45fa62abfff4b694cbe1143c",
      module: "state-only-policy.mjs",
    },
    {
      path: "src/lib/quirk/design-tribunal/protocol.ts",
      origin: "canonical-repository-file",
      sha256:
        "a4778b6d16d6555a495b4fc5f4e89574dc211f094b82ecfa10e778fde447c5f1",
      module: "tribunal-protocol.mjs",
    },
    {
      path: "src/lib/quirk/design-tribunal/contracts.ts",
      origin: "canonical-repository-file",
      sha256:
        "c49b92c2c14adb1f165cd2d8004bcbe9d0fe7446223d5cb73697d2f59a438bb2",
      module: "tribunal-contracts.mjs",
    },
    {
      path: "src/lib/quirk/governance/authority.ts",
      origin: "canonical-repository-file",
      sha256:
        "751cd9c1fe864e7867172a0aabd1952e3471553164462c731ceab00e63b665eb",
      module: "governance-authority.mjs",
    },
  ].map(Object.freeze),
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function extractBlock(plan, sourcePath) {
  const marker = `// ${sourcePath}\n`;
  // Capture the raw block, including its trailing newline. Never trim source
  // before hashing: whitespace or line-ending changes are source drift too.
  const blocks = [...plan.matchAll(/^```ts\n([\s\S]*?)^```[\t ]*$/gm)]
    .map((match) => match[1])
    .filter((source) => source.startsWith(marker));
  const markerCount = plan.split(marker).length - 1;
  if (blocks.length !== 1 || markerCount !== 1) {
    throw new Error(
      `PLAN_SOURCE_AMBIGUOUS: ${sourcePath}: ${blocks.length} blocks, ${markerCount} markers`,
    );
  }
  return blocks[0];
}

function transpilePinnedSource(ts, source, pin, zodURL) {
  const modules = new Map(SOURCE_PINS.map((item) => [item.path, item.module]));
  const rewriteRuntimeImports = (context) => (sourceFile) => {
    const visitor = (node) => {
      if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
        const specifier = node.moduleSpecifier.text;
        let replacement;
        if (specifier === "zod") {
          replacement = zodURL;
        } else if (specifier === "node:crypto" || specifier === "node:util") {
          replacement = specifier;
        } else if (specifier.startsWith(".")) {
          const target = posix.normalize(
            posix.join(posix.dirname(pin.path), `${specifier}.ts`),
          );
          const targetModule = modules.get(target);
          if (!targetModule)
            throw new Error(
              `UNPINNED_RUNTIME_IMPORT: ${pin.path}: ${specifier}`,
            );
          replacement = `./${targetModule}`;
        } else {
          throw new Error(`UNPINNED_RUNTIME_IMPORT: ${pin.path}: ${specifier}`);
        }
        return ts.factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          ts.factory.createStringLiteral(replacement),
          node.attributes,
        );
      }
      return ts.visitEachChild(node, visitor, context);
    };
    return ts.visitNode(sourceFile, visitor);
  };

  const output = ts.transpileModule(source, {
    fileName: pin.path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      sourceMap: false,
      inlineSourceMap: false,
      removeComments: false,
    },
    reportDiagnostics: true,
    transformers: { before: [rewriteRuntimeImports] },
  });
  const errors = (output.diagnostics ?? []).filter(
    (item) => item.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length) {
    throw new Error(
      `PLAN_TRANSPILATION_FAILED: ${pin.path}: ${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, " ")).join("; ")}`,
    );
  }
  return output.outputText;
}

/**
 * Load exact planned schemas and Task 5 implementation for the bounded adapter
 * proof. Call cleanup in finally; it removes all generated module files.
 */
export async function loadPlanContracts() {
  let temporaryDirectory;
  const cleanup = async () => {
    if (temporaryDirectory)
      await rm(temporaryDirectory, { recursive: true, force: true });
  };

  try {
    const plan = await readFile(resolve(repositoryRoot, PLAN_PATH), "utf8");
    const protectedBlocks = [
      ...plan.matchAll(/^```[^\n]*\n[\s\S]*?^```[\t ]*$/gm),
    ].map((match) => match[0]);
    const protectedPlanCodeSha256 = sha256(protectedBlocks.join("\n"));
    if (
      protectedBlocks.length !== 60 ||
      protectedPlanCodeSha256 !==
        "2ae7c9a0e4089f68810ac8d7aefeba2733903ce6f4790637869089286ab7832b"
    ) {
      throw new Error(
        "PROTECTED_PLAN_CODE_DRIFT: review any Task 4 or other planned-code change separately",
      );
    }
    const sources = [];
    for (const pin of SOURCE_PINS) {
      const source =
        pin.origin === "plan-code-block"
          ? extractBlock(plan, pin.path)
          : await readFile(resolve(repositoryRoot, pin.path), "utf8");
      const actualHash = sha256(source);
      if (actualHash !== pin.sha256) {
        throw new Error(
          `PINNED_SOURCE_DRIFT: ${pin.path}: expected ${pin.sha256}, found ${actualHash}`,
        );
      }
      sources.push({ pin, source });
    }

    const ts = require("typescript");
    const zodPackage = JSON.parse(
      await readFile(require.resolve("zod/package.json"), "utf8"),
    );
    const zodURL = pathToFileURL(require.resolve("zod")).href;
    temporaryDirectory = await mkdtemp(
      join(tmpdir(), "quirk-task45-plan-proof-"),
    );
    for (const { pin, source } of sources) {
      const javascript = transpilePinnedSource(ts, source, pin, zodURL);
      await writeFile(join(temporaryDirectory, pin.module), javascript, {
        mode: 0o600,
      });
    }

    const [action, policy, protocol] = await Promise.all([
      import(
        pathToFileURL(join(temporaryDirectory, "contracts-action.mjs")).href
      ),
      import(
        pathToFileURL(join(temporaryDirectory, "state-only-policy.mjs")).href
      ),
      import(
        pathToFileURL(join(temporaryDirectory, "tribunal-protocol.mjs")).href
      ),
    ]);
    for (const name of [
      "AgentProposalSchema",
      "ManyTierAuthorityResolutionSchema",
      "AgencyLocusDeclarationSchema",
      "ExecutionPolicyDecisionSchema",
    ]) {
      if (typeof action[name]?.safeParse !== "function")
        throw new Error(`MISSING_PINNED_SCHEMA: ${name}`);
    }
    if (
      typeof policy.decideStateOnlyExecution !== "function" ||
      typeof protocol.digestCanonical !== "function"
    ) {
      throw new Error("MISSING_PINNED_FUNCTION");
    }

    const provenance = Object.freeze({
      status: "CANDIDATE_TEST_ONLY",
      planPath: PLAN_PATH,
      planHead: "47279f5f9cbee8dfcb97b21ca3da024294f1bad9",
      probeHead: "58cefdb21164f1e7968d03051dfb52a93a24f4e8",
      protectedPlanCodeBlocks: 60,
      protectedPlanCodeSha256,
      sources: Object.freeze(
        SOURCE_PINS.map(({ path, origin, sha256: digest }) =>
          Object.freeze({ path, origin, sha256: digest }),
        ),
      ),
      generatedModules: Object.freeze(
        SOURCE_PINS.map(({ path, module }) =>
          Object.freeze({ source: path, module }),
        ),
      ),
      dependencyVersions: Object.freeze({
        node: process.versions.node,
        typescript: ts.version,
        zod: zodPackage.version,
      }),
      plannedTask5Loaded: true,
      productionTask4Executed: false,
      productionIntegrationProved: false,
      semanticTypecheckPerformed: false,
      runtimeSafetyProved: false,
      independentHumanReviewSatisfied: false,
    });

    return {
      AgentProposalSchema: action.AgentProposalSchema,
      ManyTierAuthorityResolutionSchema:
        action.ManyTierAuthorityResolutionSchema,
      AgencyLocusDeclarationSchema: action.AgencyLocusDeclarationSchema,
      ExecutionPolicyDecisionSchema: action.ExecutionPolicyDecisionSchema,
      decideStateOnlyExecution: policy.decideStateOnlyExecution,
      digestCanonical: protocol.digestCanonical,
      provenance,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
