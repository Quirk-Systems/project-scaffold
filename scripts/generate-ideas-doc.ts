/**
 * Generate docs/recommendations/wild/IDEAS.md from the canonical dataset.
 *
 * Usage:
 *   bun run docs:ideas
 *
 * The doc is a generated artifact — edit scripts/data/quirk-ideas.ts and
 * re-run this script instead of hand-editing the markdown.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  quirkCategories,
  quirkIdeas,
  type QuirkCategory,
} from "./data/quirk-ideas";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "..", "docs", "recommendations", "wild", "IDEAS.md");

function slug(category: QuirkCategory): string {
  return category
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderIdea(idea: (typeof quirkIdeas)[number]): string {
  return [
    `### ${idea.n}. ${idea.name}`,
    "",
    `**Reforged:** ${idea.reforged}`,
    "",
    `**Future-forward:** ${idea.futureForward}`,
    "",
    `**Quirk twist:** ${idea.quirkTwist}`,
    "",
    `_Mutated from: ${idea.origin}_`,
  ].join("\n");
}

function render(): string {
  const lines: string[] = [];

  lines.push("# 111 Reforged Quirk Concepts");
  lines.push("");
  lines.push(
    "> A stale list of 'AI-powered money-making ideas' walked in. It walked out reforged — 111 future-forward concepts run through the Quirk OS lifecycle: capture, mutate, evaluate. Raw, unfiltered, and built to be spawned, not admired.",
  );
  lines.push("");
  lines.push(
    "**This doc is generated.** Edit `scripts/data/quirk-ideas.ts` and run `bun run docs:ideas`. The same dataset seeds the Quirk OS registry via `bun run db:seed`.",
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## The Map");
  lines.push("");
  lines.push("| Cluster | Count | Jump |");
  lines.push("| ------- | ----- | ---- |");
  for (const category of quirkCategories) {
    const count = quirkIdeas.filter((i) => i.category === category).length;
    lines.push(`| ${category} | ${count} | [↓](#${slug(category)}) |`);
  }
  lines.push(`| **Total** | **${quirkIdeas.length}** | |`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const category of quirkCategories) {
    const ideas = quirkIdeas.filter((i) => i.category === category);
    lines.push(`## ${category}`);
    lines.push("");
    lines.push(`<a id="${slug(category)}"></a>`);
    lines.push("");
    for (const idea of ideas) {
      lines.push(renderIdea(idea));
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push(
    "_Generated from `scripts/data/quirk-ideas.ts`. Don't hand-edit — reforge the source._",
  );
  lines.push("");

  return lines.join("\n");
}

writeFileSync(outPath, render(), "utf8");
console.log(`Wrote ${quirkIdeas.length} concepts to ${outPath}`);
