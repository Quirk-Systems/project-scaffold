import { defineConfig, type UserConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// vitest/config bundles its own vite typings while the plugins type against
// the installed vite — the identities diverge on toolchain bumps even with a
// single vite copy resolved. Cast at this one boundary; runtime is unaffected.
const plugins = [tsconfigPaths(), react()] as UserConfig["plugins"];

export default defineConfig({
  plugins,
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules",
        ".next",
        "e2e",
        "src/__tests__/setup.ts",
        "*.config.*",
      ],
    },
  },
});
