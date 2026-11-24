// @vitest-environment node
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  update: vi.fn(),
  embedTexts: vi.fn(),
}));

vi.mock("./index", () => ({ db: mocks }));
vi.mock("./search", () => ({ searchAssets: vi.fn() }));
vi.mock("@/lib/ai/embeddings", () => ({
  buildAssetEmbeddingInput: (row: {
    title: string | null;
    rawText: string | null;
  }) =>
    [row.title?.trim(), row.rawText?.trim()].filter(Boolean).join("\n\n") ||
    null,
  embedText: vi.fn(),
  embedTexts: mocks.embedTexts,
  getConfiguredEmbeddingModel: () => "text-embedding-3-small",
}));

import { embedPendingAssets } from "./embed";

const MODEL = "text-embedding-3-small";
const HASH = "hash-fnv1a-v1";
const vector = (position: number) =>
  Array.from({ length: 1536 }, (_, index) => Number(index === position));
const oldVector = vector(0);
const newVector = vector(1);
const hashVector = vector(2);

type Asset = {
  id: string;
  title: string | null;
  rawText: string | null;
  embedding: number[] | null;
  embeddingModel: string | null;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function pending(row: Asset | null) {
  return Boolean(
    row &&
      (row.title?.trim() || row.rawText?.trim()) &&
      (row.embedding === null || row.embeddingModel !== MODEL),
  );
}

type Scenario = {
  name: string;
  change: (row: Asset) => Asset | null;
  embedded: number;
  remaining: number;
  initial?: Partial<Asset>;
};

const scenarios: Scenario[] = [
  {
    name: "does not overwrite a successful concurrent mutation",
    change: (row) => ({
      ...row,
      rawText: "new",
      embedding: newVector,
      embeddingModel: MODEL,
    }),
    embedded: 0,
    remaining: 0,
  },
  {
    name: "does not overwrite a concurrent hash-fallback mutation",
    change: (row) => ({ ...row, rawText: "new" }),
    embedded: 0,
    remaining: 1,
  },
  {
    name: "rejects a title change to null",
    change: (row) => ({ ...row, title: null }),
    embedded: 0,
    remaining: 1,
  },
  {
    name: "rejects an intervening model-tag change",
    change: (row) => ({
      ...row,
      embedding: newVector,
      embeddingModel: "other-model",
    }),
    embedded: 0,
    remaining: 1,
  },
  {
    name: "does not count a concurrently repaired asset",
    change: (row) => ({ ...row, embedding: newVector, embeddingModel: MODEL }),
    embedded: 0,
    remaining: 0,
  },
  {
    name: "does not count a concurrently deleted asset",
    change: () => null,
    embedded: 0,
    remaining: 0,
  },
  {
    name: "embeds unchanged pending content",
    change: (row) => row,
    embedded: 1,
    remaining: 0,
  },
  {
    name: "permits unchanged nullable input and model fields",
    initial: { title: null, embedding: null, embeddingModel: null },
    change: (row) => row,
    embedded: 1,
    remaining: 0,
  },
];

describe("embedPendingAssets conditional write", () => {
  it.each(scenarios)("$name", async (scenario) => {
    const before: Asset = {
      id: "00000000-0000-4000-8000-000000000001",
      title: "Title",
      rawText: "old",
      embedding: hashVector,
      embeddingModel: HASH,
      ...scenario.initial,
    };
    let current: Asset | null = { ...before };
    const entered = deferred<string[]>();
    const release = deferred<number[][]>();
    mocks.embedTexts.mockImplementationOnce(async (inputs: string[]) => {
      entered.resolve(inputs);
      return { ok: true, value: await release.promise };
    });
    mocks.select
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            orderBy: () => ({ limit: async () => [{ ...before }] }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ value: Number(pending(current)) }],
        }),
      });

    // Compile the real Drizzle predicate, then model its affected-row result.
    // This is a query-contract unit test, not PostgreSQL integration.
    const returning = vi.fn(async () => {
      if (
        current &&
        pending(current) &&
        current.id === before.id &&
        current.title === before.title &&
        current.rawText === before.rawText &&
        current.embeddingModel === before.embeddingModel
      ) {
        current = { ...current, embedding: oldVector, embeddingModel: MODEL };
        return [{ id: current.id }];
      }
      return [];
    });
    const where = vi.fn((condition: SQL) => {
      const query = new PgDialect().sqlToQuery(condition);
      expect(query.sql).toContain('"quirk_assets"."id" = $1');
      expect(query.sql).toMatch(/"quirk_assets"\."embedding" is null/i);
      expect(query.sql).toContain(
        '"quirk_assets"."embedding_model" is distinct from $2',
      );
      expect(query.sql).toContain(
        '"quirk_assets"."title" is not distinct from $3',
      );
      expect(query.sql).toContain(
        '"quirk_assets"."raw_text" is not distinct from $4',
      );
      expect(query.sql).toContain(
        '"quirk_assets"."embedding_model" is not distinct from $5',
      );
      expect(query.params).toEqual([
        before.id,
        MODEL,
        before.title,
        before.rawText,
        before.embeddingModel,
      ]);
      return { returning };
    });
    const set = vi.fn(() => ({ where }));
    mocks.update.mockReturnValueOnce({ set });

    const running = embedPendingAssets();
    const inputs = await Promise.race([
      entered.promise,
      running.then(() => {
        throw new Error("Backfill exited before embedding");
      }),
    ]);
    expect(inputs).toEqual([
      [before.title, before.rawText].filter(Boolean).join("\n\n"),
    ]);
    const changed = scenario.change({ ...before });
    current = changed;
    release.resolve([oldVector]);

    expect(await running).toEqual({
      ok: true,
      value: { embedded: scenario.embedded, remaining: scenario.remaining },
    });
    expect(mocks.select.mock.calls[0]?.[0]).toHaveProperty("embeddingModel");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ embedding: oldVector, embeddingModel: MODEL }),
    );
    expect(returning).toHaveBeenCalledTimes(1);
    expect(current).toEqual(
      scenario.embedded
        ? { ...changed, embedding: oldVector, embeddingModel: MODEL }
        : changed,
    );
  });
});
