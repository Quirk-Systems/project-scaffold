/**
 * Seed the local database with test data.
 *
 * Usage:
 *   bun run db:seed
 *
 * Designed for local development — never run against production.
 * Extend this file with additional tables as the schema grows.
 */

import { db } from "../src/lib/db";
import {
  users,
  quirkAssets,
  quirkExperiments,
  quirkRuns,
} from "../src/lib/db/schema";
import { quirkCategories, quirkIdeas } from "./data/quirk-ideas";

async function seedUsers() {
  await db.insert(users).values([
    {
      email: "admin@quirk.systems",
      name: "Admin",
    },
    {
      email: "dev@quirk.systems",
      name: "Developer",
    },
  ]);

  console.log("Seeded 2 users.");
}

/**
 * Load the 111 reforged concepts as live Quirk OS rows. Each concept models
 * the platform's core lifecycle: an `origin` asset (captured) is mutated by a
 * run into a `reforged` asset (mutated), grouped under a per-cluster experiment.
 */
async function seedQuirkIdeas() {
  // One experiment per cluster — the reforging lens for that group.
  const experimentRows = await db
    .insert(quirkExperiments)
    .values(
      quirkCategories.map((category) => ({
        name: `Reforge: ${category}`,
        experimentType: "workflow" as const,
        objective: `Mutate stale ${category} ideas into future-forward Quirk concepts.`,
      })),
    )
    .returning({ id: quirkExperiments.id, name: quirkExperiments.name });

  const experimentByCategory = new Map(
    quirkCategories.map((category) => {
      const row = experimentRows.find((r) => r.name === `Reforge: ${category}`);
      if (!row) throw new Error(`Missing experiment for ${category}`);
      return [category, row.id];
    }),
  );

  for (const idea of quirkIdeas) {
    const isNetNew = idea.origin === "net-new";

    const [origin] = await db
      .insert(quirkAssets)
      .values({
        title: isNetNew ? `${idea.name} (net-new seed)` : idea.origin,
        assetType: "text",
        rawText: idea.origin,
        status: "captured",
        metadata: { n: idea.n, category: idea.category, role: "origin" },
      })
      .returning({ id: quirkAssets.id });

    const [reforged] = await db
      .insert(quirkAssets)
      .values({
        title: idea.name,
        assetType: "text",
        rawText: `${idea.reforged}\n\nWhy it's future-forward: ${idea.futureForward}\n\nQuirk twist: ${idea.quirkTwist}`,
        status: "mutated",
        metadata: {
          n: idea.n,
          category: idea.category,
          role: "reforged",
          futureForward: idea.futureForward,
          quirkTwist: idea.quirkTwist,
        },
      })
      .returning({ id: quirkAssets.id });

    await db.insert(quirkRuns).values({
      experimentId: experimentByCategory.get(idea.category)!,
      inputAssetId: origin.id,
      outputAssetId: reforged.id,
      model: "frontier-llm",
      persona: "Quirk Reforge Engine",
      mask: "gonzo / unfiltered",
      prompt: `Reforge this idea into a bold, future-forward Quirk concept: ${idea.origin}`,
      score: 0.9,
      outcome: "winner",
      notes: idea.name,
    });
  }

  console.log(
    `Seeded ${quirkIdeas.length} reforged concepts (${quirkIdeas.length * 2} assets, ${quirkIdeas.length} runs, ${experimentRows.length} experiments).`,
  );
}

async function seed() {
  console.log("Seeding database...");
  await seedUsers();
  await seedQuirkIdeas();
}

seed()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
