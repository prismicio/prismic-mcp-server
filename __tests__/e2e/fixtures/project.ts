import { test as base } from "@playwright/test"

import { type ProjectPaths, ProjectSetup } from "../helpers/project-setup"

type TestFixtures = {
	projectPaths: ProjectPaths
}

export const test = base.extend<TestFixtures>({
	projectPaths: async ({}, use) => {
		const projectSetup = new ProjectSetup()
		const paths = await projectSetup.setupProject()
		await use(paths)
		await projectSetup.cleanup()
	},
})

export { expect } from "@playwright/test"
