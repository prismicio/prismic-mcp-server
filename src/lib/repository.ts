import * as fs from "node:fs"

export function getRepositoryName(
	sliceMachineConfigAbsolutePath: string,
): string {
	const sliceMachineConfig = JSON.parse(
		fs.readFileSync(sliceMachineConfigAbsolutePath, "utf8"),
	)

	return sliceMachineConfig.repositoryName
}
