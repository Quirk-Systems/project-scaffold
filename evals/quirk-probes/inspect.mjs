/** Read-only consumer path: frozen requirement, supplied evidence, fixed local replay. */
import { pathToFileURL } from "node:url";
import { digest, ProbeValidationError } from "./core.mjs";
import { inspectConsumer, validateConsumerProfile } from "./consumer.mjs";
import { ProbeInputError, readJsonFile } from "./input.mjs";
import { replay } from "./replay.mjs";

const DEFAULT_PROFILE = new URL(
  "./consumers/scaffold-review.json",
  import.meta.url,
);
const DEFAULT_EVIDENCE = new URL("./evidence.json", import.meta.url);
const REPLAY_COMMAND = "node evals/quirk-probes/replay.mjs --check";
const REPORT_KEYS = [
  "schemaVersion",
  "source",
  "implementation",
  "originalMetrics",
  "result",
  "linkedEvidence",
];
const GUIDANCE = {
  CURRENT: "The bounded result matches the required definition.",
  STALE:
    "Restore or review the independently required version, then rerun. Keep the consumer pin unchanged until that review.",
  MISSING: "Supply the required evidence or run its fixed local probe.",
  INVALID:
    "Preserve the rejected evidence. Resolve duplicate, malformed, or altered results before replacing it.",
  NOT_SUPPORTED:
    "Inspect the failing cases. Repair the subject or explicitly review a changed claim.",
  INCONCLUSIVE: "Restore a discriminating baseline before rerunning.",
};

function unpack(value) {
  if (Array.isArray(value)) return { results: value, envelope: null };
  if (
    value &&
    typeof value === "object" &&
    value.schemaVersion === "0.1.0" &&
    Object.keys(value).length === REPORT_KEYS.length &&
    REPORT_KEYS.every((key) => Object.hasOwn(value, key))
  ) {
    return { results: [value.result], envelope: value };
  }
  throw new ProbeInputError(
    "EVIDENCE_SHAPE",
    "Supply a complete replay report or an array of probe results.",
  );
}

export async function inspectFiles({
  profilePath = DEFAULT_PROFILE,
  evidencePath = DEFAULT_EVIDENCE,
} = {}) {
  const profile = validateConsumerProfile(readJsonFile(profilePath));
  let supplied = { results: [], envelope: null };
  let evidenceFile = "READ";
  try {
    supplied = unpack(readJsonFile(evidencePath));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    evidenceFile = "MISSING";
  }
  let fresh = null;
  let localReplay = { status: "VERIFIED", code: null };
  try {
    fresh = await replay();
  } catch (error) {
    localReplay = {
      status: "BLOCKED",
      code:
        typeof error.message === "string" &&
        error.message.startsWith("Pinned source drift:")
          ? "SOURCE_DRIFT"
          : "REPLAY_FAILED",
    };
  }
  const assessment = inspectConsumer(
    profile,
    supplied.results,
    fresh ? [fresh.result] : [],
  );
  let envelopeStatus = "NOT_APPLICABLE";
  if (supplied.envelope) {
    envelopeStatus = fresh
      ? digest(supplied.envelope) === digest(fresh)
        ? "MATCH"
        : "MISMATCH"
      : "NOT_CHECKED";
  }
  return {
    ...assessment,
    evidenceReady:
      assessment.evidenceReady &&
      localReplay.status === "VERIFIED" &&
      !["MISMATCH", "NOT_CHECKED"].includes(envelopeStatus),
    evidenceFile,
    envelopeStatus,
    localReplay,
  };
}

export function renderReport(report) {
  const lines = [
    "Quirk Probes · Evidence check",
    report.evidenceReady
      ? "Ready for candidate evidence review."
      : "Needs attention before candidate evidence review.",
    "",
  ];
  if (report.evidenceFile === "MISSING") lines.push("Evidence file: missing.");
  if (report.localReplay.status === "BLOCKED") {
    lines.push(
      report.localReplay.code === "SOURCE_DRIFT"
        ? "Local replay: BLOCKED — a pinned source changed."
        : "Local replay: BLOCKED — the fixed local replay could not be verified.",
    );
  }
  if (report.envelopeStatus === "MISMATCH") {
    lines.push(
      "Replay report: MISMATCH — the complete supplied report differs from fresh local replay.",
    );
  }
  for (const row of report.rows) {
    lines.push(row.label);
    lines.push(`  Recorded evidence: ${row.recordedStatus}`);
    lines.push(
      `  Fresh replay: ${report.localReplay.status === "BLOCKED" ? "BLOCKED" : row.replayStatus}`,
    );
    lines.push(`  Observation agreement: ${row.agreement}`);
    if (row.agreement === "DIFFERENT") {
      lines.push(
        "  Next: Preserve both observations and investigate the disagreement. A matching definition alone cannot resolve it.",
      );
    } else if (row.recordedStatus !== "CURRENT") {
      lines.push(`  Next: ${GUIDANCE[row.recordedStatus]}`);
    } else if (
      row.replayStatus !== "CURRENT" &&
      report.localReplay.status !== "BLOCKED"
    ) {
      lines.push(`  Next: ${GUIDANCE[row.replayStatus]}`);
    }
  }
  if (!report.evidenceReady) {
    lines.push(
      "",
      `Fixed diagnostic: ${REPLAY_COMMAND}`,
      "Inspect the failure and preserve existing evidence. This command does not rewrite pins or receipts.",
    );
  }
  lines.push(
    "",
    "Candidate simulation evidence only. Human review remains open. No execution permission is granted.",
  );
  return lines.join("\n") + "\n";
}

function argumentsFor(args) {
  const options = { json: false };
  const seen = new Set();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (seen.has(arg))
      throw new ProbeInputError("USAGE", "Options must not repeat.");
    seen.add(arg);
    if (arg === "--json") options.json = true;
    else if (arg === "--profile" || arg === "--evidence") {
      const value = args[++index];
      if (!value || value.startsWith("--"))
        throw new ProbeInputError(
          "USAGE",
          "A file path is required after each file option.",
        );
      options[arg === "--profile" ? "profilePath" : "evidencePath"] = value;
    } else
      throw new ProbeInputError(
        "USAGE",
        "Use --profile FILE, --evidence FILE, --json, or --help.",
      );
  }
  return options;
}

export async function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(
      "Usage: node evals/quirk-probes/inspect.mjs [--profile FILE] [--evidence FILE] [--json]\n" +
        "Defaults: checked-in scaffold review profile and replay evidence. Reads files and runs only the fixed local probe.\n" +
        "Exit 0: evidence ready for candidate review; 1: evidence or replay needs attention; 2: invalid input or usage.\n",
    );
    return;
  }
  try {
    const options = argumentsFor(args);
    const report = await inspectFiles(options);
    process.stdout.write(
      options.json
        ? JSON.stringify(report, null, 2) + "\n"
        : renderReport(report),
    );
    process.exitCode = report.evidenceReady ? 0 : 1;
  } catch (error) {
    const known =
      error instanceof ProbeInputError || error instanceof ProbeValidationError;
    const failure = {
      schemaVersion: "0.1.0",
      status: "INPUT_ERROR",
      evidenceReady: false,
      grantsPermissions: false,
      effectExecutionAllowed: false,
      independentHumanReviewSatisfied: false,
      error: {
        code: known ? error.code : "FILE_UNREADABLE",
        message: known
          ? error.message
          : "A required input file could not be read.",
      },
    };
    process.stdout.write(
      args.includes("--json")
        ? JSON.stringify(failure, null, 2) + "\n"
        : `Quirk Probes · Input needs attention\n${failure.error.code}: ${failure.error.message}\n` +
            "Preserve the original input, correct its format or path, and retry. No evidence was changed.\n",
    );
    process.exitCode = 2;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main(process.argv.slice(2));
}
