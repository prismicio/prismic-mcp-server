import { test as base } from "@playwright/test"

import { AIAgent, isLLMConfigured } from "../helpers/ai-agent"
import { ProjectSetup } from "../helpers/project-setup"

type TestFixtures = {
	projectRoot: string
	aiAgent: AIAgent
}

export const test = base.extend<TestFixtures>({
	projectRoot: async ({}, use, { title }) => {
		const projectSetup = new ProjectSetup()
		const projectRoot = await projectSetup.setupProject(title)
		await use(projectRoot)
		await projectSetup.cleanup()
	},
	aiAgent: async ({ projectRoot }, use) => {
		test.skip(
			!isLLMConfigured(),
			"Skip this test if the LLM is not configured locally",
		)
		test.setTimeout(300_000) // 5 minutes

		const aiAgent = new AIAgent(projectRoot)
		await use(aiAgent)
	},
})

export { expect } from "@playwright/test"
