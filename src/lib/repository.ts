import * as fs from "node:fs"

import { z } from "zod"

const SliceMachineConfig = z.object({
	repositoryName: z.string(),
})
type SliceMachineConfig = z.infer<typeof SliceMachineConfig>

export function getRepositoryName(
	sliceMachineConfigAbsolutePath: string,
): string {
	try {
		const fileContent = JSON.parse(
			fs.readFileSync(sliceMachineConfigAbsolutePath, "utf8"),
		)
		const sliceMachineConfig = SliceMachineConfig.parse(fileContent)

		return sliceMachineConfig.repositoryName
	} catch (error) {
		throw new Error("Failed to get repository name.", {
			cause: error,
		})
	}
}
