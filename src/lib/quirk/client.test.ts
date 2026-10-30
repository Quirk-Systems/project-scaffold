import { afterEach, describe, expect, it, vi } from "vitest";
import { QuirkApiError, isConflict, quirkApi } from "@/lib/quirk/client";

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("quirkApi errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the HTTP status and server message on a failed request", async () => {
    vi.stubGlobal(
      "fetch",
      respond(409, { error: "Already claimed — this one is gone" }),
    );

    const error = await quirkApi.claimOffer("offer-1").catch((e) => e);

    expect(error).toBeInstanceOf(QuirkApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(409);
    expect(error.message).toBe("Already claimed — this one is gone");
  });

  it("falls back to the status in the message when the body has no error", async () => {
    vi.stubGlobal("fetch", respond(500, {}));

    const error = await quirkApi.claimOffer("offer-1").catch((e) => e);

    expect(error).toBeInstanceOf(QuirkApiError);
    expect(error.status).toBe(500);
    expect(error.message).toBe("Request failed (500)");
  });

  it("returns the parsed body on success", async () => {
    vi.stubGlobal("fetch", respond(200, { offer: { id: "offer-1" } }));

    await expect(quirkApi.claimOffer("offer-1")).resolves.toEqual({
      offer: { id: "offer-1" },
    });
  });
});

describe("isConflict", () => {
  it("is true only for a 409 from the Quirk API", () => {
    expect(isConflict(new QuirkApiError("gone", 409))).toBe(true);
    expect(isConflict(new QuirkApiError("nope", 401))).toBe(false);
    expect(isConflict(new QuirkApiError("boom", 500))).toBe(false);
    expect(isConflict(new Error("409"))).toBe(false);
    expect(isConflict(undefined)).toBe(false);
  });
});
