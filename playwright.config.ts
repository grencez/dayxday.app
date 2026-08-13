import { defineConfig } from "@playwright/test";

// Browser smoke test for dayxday.
//
// The host may be musl (postmarketOS), where Playwright's bundled glibc
// browsers cannot run — so we drive the system chromium at /usr/bin/chromium.
// TMPDIR is forced to /tmp for the browser process: deep session TMPDIRs blow
// chromium's ~108-char unix-socket limit (process-singleton socket).
export default defineConfig({
  testDir: "./test/browse",
  use: {
    baseURL: "http://localhost:5174",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      env: { TMPDIR: "/tmp" },
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
