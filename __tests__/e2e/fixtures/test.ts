import { test as base } from "@playwright/test"

import { AIAgent } from "../helpers/ai-agent"
import { ProjectSetup } from "../helpers/project-setup"

type TestFixtures = {
	projectRoot: string
	aiAgent: AIAgent
}

export const test = base.extend<TestFixtures>({
	projectRoot: async ({}, use) => {
		const projectSetup = new ProjectSetup()
		const projectRoot = await projectSetup.setupProject()
		await use(projectRoot)
		await projectSetup.cleanup()
	},
	aiAgent: async ({ projectRoot }, use) => {
		const aiAgent = new AIAgent(projectRoot)
		await use(aiAgent)
	},
})

export { expect } from "@playwright/test"
