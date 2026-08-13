import { defineConfig } from "@playwright/test";

// Deploy-gate variant of the browse smoke test: build the app, serve the
// built artifact with `vite preview`, and run the same spec against it —
// verifying what actually ships rather than the dev server.
//
// See playwright.config.ts for the system-chromium / TMPDIR notes.
export default defineConfig({
  testDir: "./test/browse",
  use: {
    baseURL: "http://localhost:4173",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      env: { TMPDIR: "/tmp" },
    },
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
