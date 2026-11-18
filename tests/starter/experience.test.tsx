import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../../starters/web/src/app/page";

describe("starter first move", () => {
  it("previews a candidate only after a human supplies an idea and chooses a move, then clears it", () => {
    render(<Home />);
    const idea = screen.getByLabelText("Start wherever you are");
    fireEvent.change(idea, {
      target: { value: "A game about returning favors" },
    });
    expect(
      screen.getByText("Your idea can take shape here."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /try it/i }));
    expect(
      screen.getByText("“A game about returning favors”"),
    ).toBeInTheDocument();
    expect(screen.getByText("Next move: Try it")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /clear and start again/i }),
    );
    expect(idea).toHaveValue("");
    expect(
      screen.getByText("Your idea can take shape here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /try it/i })).not.toBeChecked();
  });
});
