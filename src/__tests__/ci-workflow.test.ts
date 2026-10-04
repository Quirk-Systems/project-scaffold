import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

type Step = {
  name: string;
  id?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, string | number | boolean>;
  env?: Record<string, string>;
  "continue-on-error"?: boolean;
};
type Job = {
  "runs-on": string;
  "timeout-minutes": number;
  permissions: Record<string, string>;
  needs?: string;
  services?: Record<string, unknown>;
  steps: Step[];
};

const source = readFileSync(".github/workflows/ci.yml", "utf8");
const document = parseDocument(source, { uniqueKeys: true });
const workflow = document.toJS() as {
  name: string;
  on: Record<string, unknown>;
  concurrency: Record<string, unknown>;
  permissions: Record<string, string>;
  jobs: Record<"validate" | "e2e" | "security", Job>;
};
const { validate, e2e, security } = workflow.jobs;
const find = (job: Job, predicate: (step: Step) => boolean): Step => {
  const step = job.steps.find(predicate);
  expect(step).toBeDefined();
  return step!;
};
const action = (job: Job, uses: string) =>
  find(job, (step) => step.uses === uses);
const cache = (job: Job, path: string) =>
  find(
    job,
    (step) => step.uses === "actions/cache@v4" && step.with?.path === path,
  );
const toolchain =
  "${{ runner.os }}-${{ runner.arch }}-bun-${{ steps.bun.outputs.bun-version }}-";
const nextToolchain =
  "${{ runner.os }}-${{ runner.arch }}-next-node20-bun-${{ steps.bun.outputs.bun-version }}-${{ hashFiles('bun.lock') }}-";

describe("CI workflow contract", () => {
  it("parses YAML and preserves events, job IDs and cancellation", () => {
    expect(document.errors).toEqual([]);
    expect(workflow.name).toBe("CI");
    expect(workflow.on).toEqual({
      push: { branches: ["main"] },
      pull_request: { branches: ["main"] },
    });
    expect(workflow.concurrency).toEqual({
      group: "${{ github.workflow }}-${{ github.ref }}",
      "cancel-in-progress": true,
    });
    expect(Object.keys(workflow.jobs)).toEqual(["validate", "e2e", "security"]);
    expect(e2e.needs).toBe("validate");
    expect(source).not.toMatch(/secrets\./);
    expect(workflow.permissions).toEqual({});
  });

  it.each(["validate", "e2e", "security"] as const)(
    "%s has bounded execution, read-only checkout and unconditional frozen install",
    (id) => {
      const job = workflow.jobs[id];
      expect(job["runs-on"]).toBe("ubuntu-latest");
      expect(job["timeout-minutes"]).toBeGreaterThan(0);
      expect(job["timeout-minutes"]).toBeLessThanOrEqual(30);
      expect(job.permissions).toEqual({ contents: "read" });
      expect(action(job, "actions/checkout@v7").with).toEqual(
        id === "security"
          ? { "persist-credentials": false, "fetch-depth": 0 }
          : { "persist-credentials": false },
      );
      const bun = action(job, "oven-sh/setup-bun@v2");
      expect(bun.id).toBe("bun");
      expect(bun.with).toEqual({ "bun-version": "latest" });
      const install = find(
        job,
        (step) => step.run?.startsWith("bun install") === true,
      );
      expect(install.run).toBe(
        "bun install --frozen-lockfile --prefer-offline",
      );
      expect(install.if).toBeUndefined();
      expect(job.steps.indexOf(bun)).toBeLessThan(job.steps.indexOf(install));
      for (const step of job.steps) {
        expect(step.name).toBeTruthy();
        expect(step["continue-on-error"]).toBeUndefined();
        if (step.run) expect(step.run).not.toMatch(/\|\| true/);
      }
    },
  );

  it.each(["validate", "e2e"] as const)(
    "%s caches downloads and compilation with compatible toolchain invalidation",
    (id) => {
      const job = workflow.jobs[id];
      expect(action(job, "actions/setup-node@v7").with).toEqual({
        "node-version": 20,
      });
      const downloads = cache(job, "~/.bun/install/cache");
      expect(downloads.with?.key).toBe(
        toolchain + "${{ hashFiles('bun.lock') }}",
      );
      expect(downloads.with?.["restore-keys"]).toBe(toolchain + "\n");
      const next = cache(job, ".next/cache");
      expect(next.with?.key).toBe(
        nextToolchain +
          "${{ hashFiles('src/**', 'public/**', 'next.config.*', 'tsconfig.json', 'postcss.config.*', 'components.json', 'package.json') }}",
      );
      expect(next.with?.["restore-keys"]).toBe(nextToolchain + "\n");
      expect(
        job.steps
          .filter((step) => step.uses === "actions/cache@v4")
          .map((step) => step.with?.path),
      ).toEqual(
        id === "validate"
          ? ["~/.bun/install/cache", ".next/cache"]
          : ["~/.bun/install/cache", ".next/cache", "~/.cache/ms-playwright"],
      );
      const installIndex = job.steps.findIndex((step) =>
        step.run?.startsWith("bun install"),
      );
      expect(job.steps.indexOf(downloads)).toBeLessThan(installIndex);
      expect(job.steps.indexOf(next)).toBeGreaterThan(installIndex);
    },
  );

  it("preserves the validation gates without cached build output", () => {
    const gates = validate.steps.filter((step) =>
      step.run?.startsWith("bun run"),
    );
    expect(gates.map((step) => step.run)).toEqual([
      "bun run lint",
      "bun run type-check",
      "bun run test:run",
      "bun run build",
    ]);
    for (const step of gates) expect(step.if).toBeUndefined();
    expect(gates[3].env).toEqual({ SKIP_ENV_VALIDATION: "1" });
  });

  it("caches the installed Playwright version only and installs OS libraries on hits", () => {
    const resolve = find(e2e, (step) => step.id === "playwright");
    expect(resolve.run).toBe(
      `node -p "'version=' + require('@playwright/test/package.json').version" >> "$GITHUB_OUTPUT"`,
    );
    const browsers = cache(e2e, "~/.cache/ms-playwright");
    expect(browsers.id).toBe("playwright-cache");
    expect(browsers.with).toEqual({
      path: "~/.cache/ms-playwright",
      key: "${{ runner.os }}-${{ runner.arch }}-playwright-${{ steps.playwright.outputs.version }}",
    });
    const installIndex = e2e.steps.findIndex((step) =>
      step.run?.startsWith("bun install"),
    );
    expect(e2e.steps.indexOf(resolve)).toBeGreaterThan(installIndex);
    expect(e2e.steps.indexOf(browsers)).toBeGreaterThan(
      e2e.steps.indexOf(resolve),
    );
    const hit = find(
      e2e,
      (step) => step.run === "bunx playwright install-deps",
    );
    const miss = find(
      e2e,
      (step) => step.run === "bunx playwright install --with-deps",
    );
    expect(hit.if).toBe("steps.playwright-cache.outputs.cache-hit == 'true'");
    expect(miss.if).toBe("steps.playwright-cache.outputs.cache-hit != 'true'");
    expect(e2e.steps.indexOf(hit)).toBeGreaterThan(e2e.steps.indexOf(browsers));
    expect(e2e.steps.indexOf(miss)).toBeGreaterThan(
      e2e.steps.indexOf(browsers),
    );
    const test = find(
      e2e,
      (step) => step.run === "bun run test:e2e --workers=2",
    );
    expect(test.if).toBeUndefined();
    expect(e2e.steps.indexOf(test)).toBeGreaterThan(e2e.steps.indexOf(miss));
    expect(test.env?.SKIP_ENV_VALIDATION).toBe("1");
    const database = new URL(test.env!.DATABASE_URL);
    expect(database.protocol).toBe("postgres:");
    expect(database.hostname).toBe("localhost");
    expect(database.port).toBe("5432");
    expect(database.pathname).toBe("/postgres");
  });

  it("retains the healthchecked PostgreSQL service and failure reports", () => {
    expect(e2e.services).toEqual({
      postgres: {
        image: "postgres:16-alpine",
        env: {
          POSTGRES_USER: "postgres",
          POSTGRES_PASSWORD: "postgres",
          POSTGRES_DB: "postgres",
        },
        ports: ["5432:5432"],
        options:
          '--health-cmd "pg_isready -U postgres" --health-interval 10s --health-timeout 5s --health-retries 5',
      },
    });
    const report = action(e2e, "actions/upload-artifact@v7");
    expect(report.if).toBe("${{ !cancelled() }}");
    expect(report.with).toEqual({
      name: "playwright-report",
      path: "playwright-report/\ntest-results/\n",
      "retention-days": 7,
      "if-no-files-found": "ignore",
      "compression-level": 1,
    });
  });

  it("audits after installation and scans full history with a versioned scanner image", () => {
    const install = security.steps.findIndex((step) =>
      step.run?.startsWith("bun install"),
    );
    const audit = find(security, (step) => step.run === "bun audit --prod");
    const scan = action(security, "trufflesecurity/trufflehog@v3.97.9");
    expect(security.steps.indexOf(audit)).toBeGreaterThan(install);
    expect(security.steps.indexOf(scan)).toBeGreaterThan(
      security.steps.indexOf(audit),
    );
    expect(audit.if).toBeUndefined();
    expect(scan.if).toBeUndefined();
    expect(scan.with).toEqual({
      version: "3.97.9",
      extra_args: "--results=verified,unknown",
    });
  });
});
