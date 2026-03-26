import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "@/app/page";

describe("Home", () => {
  it("renders the heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /quirk systems/i }),
    ).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<Home />);
    expect(screen.getByText(/start building/i)).toBeInTheDocument();
  });
});
