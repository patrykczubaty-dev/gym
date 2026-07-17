import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // "server-only" ist ein reiner Next.js-Build-Marker (wirft nur beim
      // Bundling fuer den Client) - unter Vitest/Node gibt es dieses Paket
      // nicht, daher hier auf ein leeres Modul umleiten.
      "server-only": path.resolve(__dirname, "./src/lib/test-empty-module.ts"),
    },
  },
  test: {
    environment: "node",
  },
});
