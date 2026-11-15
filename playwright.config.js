// Browser tests (REDESIGN-PLAN.md section 8.3). Run: npx playwright test
// Chromium runs everything; Firefox and WebKit run the shell, console and map specs.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/browser',
  timeout: 60000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  // No retries: a test that only passes on a second try is a bug to fix, not to hide (FIXES-PLAN.md phase 2).
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  outputDir: 'test-results',
  // Screenshot baselines are made and compared on Linux in CI only (section 8.4). A missing baseline fails;
  // the "Update screenshot baselines" workflow makes them (it passes --update-snapshots).
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}{ext}',
  // A changed digit in a count alters 3 to 9 pixels at the default colour threshold, so allow at most 2.
  // Parts that change on purpose (the exam clock) are masked in visual.spec.js.
  expect: { toHaveScreenshot: { maxDiffPixels: 2, animations: 'disabled' } },
  use: {
    baseURL: 'http://127.0.0.1:8138',
    viewport: { width: 1366, height: 768 },
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tools/serve.cjs 8138',
    url: 'http://127.0.0.1:8138/',
    reuseExistingServer: !process.env.CI
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' }, testMatch: /(shell|console|map)\.spec\.js/ },
    { name: 'webkit', use: { browserName: 'webkit' }, testMatch: /(shell|console|map)\.spec\.js/ }
  ]
});
