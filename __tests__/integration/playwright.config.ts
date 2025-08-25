import { defineConfig } from "@playwright/test"

export default defineConfig({
	testDir: ".",
	testMatch: "**/*.test.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "list",
	use: {
		trace: "off",
	},
	projects: [
		{
			name: "chromium",
			use: { browserName: "chromium" },
		},
	],
})
