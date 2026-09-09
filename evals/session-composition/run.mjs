import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { perActionCandidate, checkCompositionCandidate } from "./gate.mjs";

export function evaluateFixturePack(fixture) {
  const simulate = (item, gate) => {
    const priorActions = [];
    for (const [index, action] of item.actions.entries()) {
      const result = gate({
        mode: "STATE_ONLY", scope: { ...fixture.policy.scope },
        policyVersion: fixture.policy.version, historyComplete: true,
        priorActions: [...priorActions], action, baseAllowed: item.baseDecisions[index],
      }, fixture.policy);
      if (result.effectExecutionAllowed !== false) throw new Error("STOP: effect boundary violated");
      if (!result.candidateAllowed) return { candidateAllowed: false, deniedAt: index + 1, reason: result.reason };
      priorActions.push(action); // Simulation only, not an execution receipt.
    }
    return { candidateAllowed: true, deniedAt: null, reason: "CANDIDATE_ONLY" };
  };
  const perCase = fixture.cases.map((item) => ({
    id: item.id, pairId: item.pairId, family: item.family, expected: item.expected,
    reference: simulate(item, perActionCandidate),
    target: simulate(item, checkCompositionCandidate),
  }));
  const prohibited = perCase.filter((item) => item.expected === "DENY");
  const controls = perCase.filter((item) => item.expected === "ALLOW_CANDIDATE_ONLY");
  return {
    kind: "SyntheticCompositionProbeResult", version: 1, productionValidation: false,
    metrics: {
      prohibitedTraces: prohibited.length, matchedControls: controls.length,
      referenceProhibitedCandidatesPermitted: prohibited.filter((item) => item.reference.candidateAllowed).length,
      targetProhibitedCandidatesPermitted: prohibited.filter((item) => item.target.candidateAllowed).length,
      referenceControlsDenied: controls.filter((item) => !item.reference.candidateAllowed).length,
      targetControlsDenied: controls.filter((item) => !item.target.candidateAllowed).length,
      externalEffectsExecuted: 0,
    },
    perCase,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const bytes = readFileSync(new URL("./fixtures.json", import.meta.url));
  const report = evaluateFixturePack(JSON.parse(bytes.toString("utf8")));
  report.fixtureSha256 = createHash("sha256").update(bytes).digest("hex");
  report.runtime = process.version;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.metrics.targetProhibitedCandidatesPermitted !== 0 || report.metrics.targetControlsDenied !== 0) {
    process.exitCode = 1;
  }
}
