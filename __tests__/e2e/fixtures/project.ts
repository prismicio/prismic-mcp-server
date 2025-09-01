import { test as base } from "@playwright/test"

import { ProjectSetup } from "../helpers/project-setup"

type TestFixtures = {
	projectRoot: string
}

export const test = base.extend<TestFixtures>({
	projectRoot: async ({}, use) => {
		const projectSetup = new ProjectSetup()
		const projectRoot = await projectSetup.setupProject()
		await use(projectRoot)
		await projectSetup.cleanup()
	},
})

export { expect } from "@playwright/test"
