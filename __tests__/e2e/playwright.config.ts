import { defineConfig } from "@playwright/test"

const CI = !!process.env["CI"]

export default defineConfig({
	// Opt out of parallel tests on CI to prioritize stability and reproducibility.
	// See: https://playwright.dev/docs/ci#workers
	workers: CI ? 1 : undefined,

	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: CI,
	/* Retry on CI only */
	retries: CI ? 2 : 0,

	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: CI ? [["github"], ["blob"]] : [["html", { open: "never" }]],

	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		// Collect trace when retrying the failed test.
		trace: "on-first-retry",
	},

	// Whether to report slow test files (> 5min).
	reportSlowTests: {
		max: 0,
		threshold: 300_000,
	},

	// Configuration for the expect assertion library
	expect: {
		// Maximum time expect() should wait for the condition to be met. For
		// example in `await expect(locator).toHaveText();`
		timeout: 30_000,
	},

	// Directory that will be recursively scanned for test files.
	testDir: ".",

	// Test files to run.
	testMatch: "**/*.test.ts",

	// Maximum time one test can run for.
	timeout: 120_000,
})
