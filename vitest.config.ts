import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // vitest 4 removed coverage.all, so without an explicit include only
      // files a test actually loads are reported — untested modules vanish
      // rather than showing as 0%. This repo was already reporting 36 of 125
      // source files before the upgrade; the include makes the figure honest.
      include: ["src/**/*.{ts,tsx}"],
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
