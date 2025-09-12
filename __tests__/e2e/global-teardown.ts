import { ProjectSetup } from "./helpers/project-setup"

async function globalTeardown(): Promise<void> {
	await ProjectSetup.cleanupTemplate()
}

export default globalTeardown
