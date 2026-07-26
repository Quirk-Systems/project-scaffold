import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostHogProvider } from "@/components/posthog-provider";
import { RuntimeConfigProvider } from "@/components/runtime-config-provider";
import type { RuntimeConfig } from "@/lib/runtime-config";

const { init } = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock("posthog-js", () => ({
  default: { __loaded: false, init },
}));

vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
}));

function renderProvider(config: RuntimeConfig) {
  return render(
    <RuntimeConfigProvider config={config}>
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    </RuntimeConfigProvider>,
  );
}

describe("PostHogProvider", () => {
  afterEach(() => {
    init.mockReset();
  });

  it("renders without initializing PostHog when the runtime key is unset", () => {
    renderProvider({});

    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.queryByTestId("posthog-provider")).not.toBeInTheDocument();
    expect(init).not.toHaveBeenCalled();
  });

  it("initializes PostHog from runtime config", () => {
    renderProvider({
      posthogKey: "runtime-key",
      posthogHost: "https://posthog.example.com",
    });

    expect(screen.getByTestId("posthog-provider")).toBeInTheDocument();
    expect(init).toHaveBeenCalledWith("runtime-key", {
      api_host: "https://posthog.example.com",
      capture_pageview: "history_change",
      capture_pageleave: true,
    });
  });
});
