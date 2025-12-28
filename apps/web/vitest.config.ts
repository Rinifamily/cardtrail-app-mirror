import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}", "__tests__/**/*.spec.{ts,tsx}", "lib/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "lcov"],
    },
    exclude: ["e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
