// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getOffer, claimOffer } = vi.hoisted(() => ({
  auth: vi.fn(),
  getOffer: vi.fn(),
  claimOffer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/quirk/offers", () => ({ getOffer, claimOffer }));

import { POST } from "./route";

const params = Promise.resolve({ id: "offer-1" });
const call = () =>
  POST(new Request("http://localhost/api/offers/offer-1/claim"), { params });

describe("POST /api/offers/[id]/claim", () => {
  beforeEach(() => {
    auth.mockReset().mockResolvedValue({ user: { id: "user-a" } });
    getOffer.mockReset();
    claimOffer.mockReset();
  });

  it("returns the offer to the user who wins the claim", async () => {
    getOffer.mockResolvedValue({ id: "offer-1", status: "open" });
    claimOffer.mockResolvedValue({
      id: "offer-1",
      status: "claimed",
      claimedBy: "user-a",
    });

    const res = await call();

    expect(res.status).toBe(200);
  });

  it("answers 409 when someone else already holds it", async () => {
    getOffer
      .mockResolvedValueOnce({ id: "offer-1", status: "open" })
      .mockResolvedValueOnce({
        id: "offer-1",
        status: "claimed",
        claimedBy: "user-b",
      });
    claimOffer.mockResolvedValue(null);

    const res = await call();

    expect(res.status).toBe(409);
  });

  it("answers 409 when the offer was retired", async () => {
    getOffer
      .mockResolvedValueOnce({ id: "offer-1", status: "open" })
      .mockResolvedValueOnce({
        id: "offer-1",
        status: "retired",
        claimedBy: null,
      });
    claimOffer.mockResolvedValue(null);

    const res = await call();

    expect(res.status).toBe(409);
  });

  it("is idempotent for the owner: a retry or second tab gets 200, not 409", async () => {
    const owned = { id: "offer-1", status: "claimed", claimedBy: "user-a" };
    getOffer
      .mockResolvedValueOnce({ id: "offer-1", status: "open" })
      .mockResolvedValueOnce(owned);
    claimOffer.mockResolvedValue(null);

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ offer: owned });
  });

  it("requires sign-in", async () => {
    auth.mockResolvedValue(null);

    const res = await call();

    expect(res.status).toBe(401);
  });
});
