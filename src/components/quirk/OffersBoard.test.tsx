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

  it("keeps empty live regions mounted before any claim", async () => {
    renderBoard();

    await screen.findByRole("button", { name: /claim it — only one exists/i });
    const regions = screen.getAllByRole("status");
    expect(regions.length).toBeGreaterThan(0);
    regions.forEach((region) => expect(region).toBeEmptyDOMElement());
  });

  it("shows a lost race as a plain outcome while the list catches up", async () => {
    claimOffer.mockRejectedValue(
      new QuirkApiError("Already claimed — this one is gone", 409),
    );
    renderBoard();

    await claim();

    const line = await screen.findByText(
      "Missed it. This one is no longer open.",
    );
    expect(line).toHaveAttribute("role", "status");
    expect(line).not.toHaveClass("sr-only");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells the loser plainly once the refetch shows it was claimed", async () => {
    listOffers
      .mockResolvedValueOnce({ offers: [openOffer] })
      .mockResolvedValue({ offers: [{ ...openOffer, status: "claimed" }] });
    claimOffer.mockRejectedValue(
      new QuirkApiError("Already claimed — this one is gone", 409),
    );
    renderBoard();

    await claim();

    const line = await screen.findByText(
      "Missed it. This one was claimed first.",
    );
    expect(line).toHaveAttribute("role", "status");
    expect(line).not.toHaveClass("sr-only");
    expect(
      screen.queryByText("Claimed. This one belongs to someone now."),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not say an offer was claimed when it was retired", async () => {
    listOffers
      .mockResolvedValueOnce({ offers: [openOffer] })
      .mockResolvedValue({ offers: [{ ...openOffer, status: "retired" }] });
    claimOffer.mockRejectedValue(
      new QuirkApiError("Already claimed — this one is gone", 409),
    );
    renderBoard();

    await claim();

    const line = await screen.findByText("Missed it. This one was retired.");
    expect(line).toHaveAttribute("role", "status");
    expect(line).not.toHaveTextContent(/claimed/i);
  });

  it("confirms the win to the winner", async () => {
    listOffers
      .mockResolvedValueOnce({ offers: [openOffer] })
      .mockResolvedValue({ offers: [{ ...openOffer, status: "claimed" }] });
    claimOffer.mockResolvedValue({
      offer: { ...openOffer, status: "claimed" },
    });
    renderBoard();

    await claim();

    expect(
      await screen.findByText("You claimed it. This one is yours."),
    ).toHaveAttribute("role", "status");
  });

  it("confirms the win even when the refetch fails, and hides the claim button", async () => {
    listOffers
      .mockResolvedValueOnce({ offers: [openOffer] })
      .mockRejectedValue(new QuirkApiError("Database is down", 500));
    claimOffer.mockResolvedValue({
      offer: { ...openOffer, status: "claimed" },
    });
    renderBoard();

    await claim();

    expect(
      await screen.findByText("You claimed it. This one is yours."),
    ).toHaveAttribute("role", "status");
    expect(
      screen.queryByRole("button", { name: /claim it — only one exists/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("claimed", { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("open", { selector: "span" }),
    ).not.toBeInTheDocument();
  });

  it("marks a lost race closed even when the refetch fails", async () => {
    listOffers
      .mockResolvedValueOnce({ offers: [openOffer] })
      .mockRejectedValue(new QuirkApiError("Database is down", 500));
    claimOffer.mockRejectedValue(
      new QuirkApiError("Already claimed — this one is gone", 409),
    );
    renderBoard();

    await claim();

    expect(
      await screen.findByText("Missed it. This one is no longer open."),
    ).toHaveAttribute("role", "status");
    expect(
      screen.getByText("closed", { selector: "span" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("open", { selector: "span" }),
    ).not.toBeInTheDocument();
  });

  describe("under the open filter, where a refetch removes the card", () => {
    let serverStatus: "open" | "claimed";

    beforeEach(() => {
      serverStatus = "open";
      listOffers.mockReset().mockImplementation(async (status?: string) => {
        const offer = { ...openOffer, status: serverStatus };
        return { offers: !status || status === serverStatus ? [offer] : [] };
      });
    });

    async function claimUnderOpenFilter() {
      const user = userEvent.setup();
      renderBoard();
      await user.click(await screen.findByRole("button", { name: "open" }));
      await user.click(
        await screen.findByRole("button", {
          name: /claim it — only one exists/i,
        }),
      );
    }

    it("still confirms the win after the card leaves the list", async () => {
      claimOffer.mockImplementation(async () => {
        serverStatus = "claimed";
        return { offer: { ...openOffer, status: "claimed" } };
      });

      await claimUnderOpenFilter();

      const notice = await screen.findByText(
        "You claimed \u201cThe only one\u201d. It\u2019s yours.",
      );
      expect(notice).toHaveAttribute("role", "status");
      expect(notice).not.toHaveClass("sr-only");
      expect(screen.queryByText("The only one")).not.toBeInTheDocument();
    });

    it("reports the result when the user switches to a filter that fails to load", async () => {
      let finishClaim: (value: unknown) => void = () => {};
      claimOffer.mockImplementation(
        () =>
          new Promise((resolve) => {
            finishClaim = resolve;
          }),
      );
      listOffers.mockImplementation(async (status?: string) => {
        if (status === "retired") {
          throw new QuirkApiError("Database is down", 500);
        }
        return { offers: [{ ...openOffer, status: serverStatus }] };
      });
      const user = userEvent.setup();
      renderBoard();

      await user.click(
        await screen.findByRole("button", {
          name: /claim it — only one exists/i,
        }),
      );
      await user.click(screen.getByRole("button", { name: "retired" }));
      await screen.findByText("Database is down");
      serverStatus = "claimed";
      finishClaim({ offer: { ...openOffer, status: "claimed" } });

      expect(
        await screen.findByText(
          "You claimed \u201cThe only one\u201d. It\u2019s yours.",
        ),
      ).toHaveAttribute("role", "status");
    });

    it("still tells the loser after the card leaves the list", async () => {
      claimOffer.mockImplementation(async () => {
        serverStatus = "claimed";
        throw new QuirkApiError("Already claimed — this one is gone", 409);
      });

      await claimUnderOpenFilter();

      const notice = await screen.findByText(
        "Missed \u201cThe only one\u201d. It is no longer open.",
      );
      expect(notice).toHaveAttribute("role", "status");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
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
