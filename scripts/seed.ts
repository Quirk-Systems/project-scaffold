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
import { users } from "../src/lib/db/schema";

async function seed() {
  console.log("Seeding database...");

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

seed()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
