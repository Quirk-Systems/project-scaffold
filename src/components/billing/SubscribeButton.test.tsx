import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SubscribeButton } from "@/components/billing/SubscribeButton";

describe("SubscribeButton", () => {
  it("disables itself and says so while the checkout action runs", async () => {
    let finish: () => void = () => {};
    const action = () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      });
    render(
      <form action={action}>
        <SubscribeButton />
      </form>,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Subscribe" }));

    const pending = await screen.findByRole("button", {
      name: "Opening checkout…",
    });
    expect(pending).toBeDisabled();

    finish();
    expect(
      await screen.findByRole("button", { name: "Subscribe" }),
    ).toBeEnabled();
  });
});
