import { expect, test } from "@playwright/test"

test.describe("Basic Integration Tests", () => {
	test("should have a working test environment", async () => {
		expect(true).toBe(true)
	})
})
