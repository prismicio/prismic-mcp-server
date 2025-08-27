import { test as base } from "@playwright/test"

import { McpClient } from "../helpers/mcp-client"

type TestFixtures = {
	mcp: McpClient
}

export const test = base.extend<TestFixtures>({
	mcp: async ({}, use) => {
		const client = new McpClient()
		await client.start()
		await use(client)
		await client.stop()
	},
})

export { expect } from "@playwright/test"
