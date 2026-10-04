import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OffersBoard } from "@/components/quirk/OffersBoard";
import { QuirkApiError, type OfferWithAsset } from "@/lib/quirk/client";

const { listOffers, claimOffer } = vi.hoisted(() => ({
  listOffers: vi.fn(),
  claimOffer: vi.fn(),
}));

vi.mock("@/lib/quirk/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/quirk/client")>();
  return { ...actual, quirkApi: { listOffers, claimOffer } };
});

const openOffer = {
  id: "offer-1",
  assetId: "asset-1",
  title: "The only one",
  pitch: "Only one exists.",
  status: "open",
  register: null,
  scores: null,
  asset: { assetType: "verse" },
} as unknown as OfferWithAsset;

function renderBoard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <OffersBoard />
    </QueryClientProvider>,
  );
}

async function claim() {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /claim it — only one exists/i }),
  );
}

describe("OffersBoard claim outcomes", () => {
  beforeEach(() => {
    listOffers.mockReset().mockResolvedValue({ offers: [openOffer] });
    claimOffer.mockReset();
  });

  it("shows a lost race as a plain outcome, not an error", async () => {
    claimOffer.mockRejectedValue(
      new QuirkApiError("Already claimed — this one is gone", 409),
    );
    renderBoard();

    await claim();

    expect(
      await screen.findByText("Someone claimed it first. This one is gone."),
    ).toHaveClass("text-muted-foreground");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("still shows a real failure as an error", async () => {
    claimOffer.mockRejectedValue(new QuirkApiError("Database is down", 500));
    renderBoard();

    await claim();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Database is down",
    );
  });

  it("refetches offers after a claim settles", async () => {
    claimOffer.mockResolvedValue({
      offer: { ...openOffer, status: "claimed" },
    });
    renderBoard();

    await claim();

    await vi.waitFor(() => expect(listOffers).toHaveBeenCalledTimes(2));
  });
});
