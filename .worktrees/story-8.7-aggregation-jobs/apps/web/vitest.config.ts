import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
      // Mock server-only imports — not available in test env
      {
        find: "server-only",
        replacement: path.resolve(__dirname, "./src/__mocks__/server-only.ts"),
      },
      // Resolve workspace package subpaths BEFORE barrel (order matters)
      {
        find: "@reinder/shared/db/schema",
        replacement: path.resolve(
          __dirname,
          "../../packages/shared/src/db/schema.ts"
        ),
      },
      {
        find: "@reinder/shared/constants",
        replacement: path.resolve(
          __dirname,
          "../../packages/shared/src/constants/index.ts"
        ),
      },
      // Barrel export (must come AFTER subpaths)
      {
        find: "@reinder/shared",
        replacement: path.resolve(
          __dirname,
          "../../packages/shared/src/index.ts"
        ),
      },
    ],
  },
});
