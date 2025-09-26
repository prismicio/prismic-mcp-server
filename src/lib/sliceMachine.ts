import {
	type SliceMachineManager,
	createSliceMachineManager,
} from "@slicemachine/manager"
import { readFileSync } from "fs"
import { dirname, relative, resolve as resolvePath } from "path"
import { z } from "zod"

const SliceMachineConfigSchema = z.object({
	repositoryName: z.string(),
	libraries: z.array(z.string()),
})

export type SliceMachineConfig = z.infer<typeof SliceMachineConfigSchema>

export function parseSliceMachineConfig(
	sliceMachineConfigAbsolutePath: string,
): SliceMachineConfig {
	const fileContent = JSON.parse(
		readFileSync(sliceMachineConfigAbsolutePath, "utf-8"),
	)

	return SliceMachineConfigSchema.parse(fileContent)
}

export function getResolvedLibraries(
	sliceMachineConfigAbsolutePath: string,
): string[] {
	const config = parseSliceMachineConfig(sliceMachineConfigAbsolutePath)

	if (config.libraries.length === 0) {
		throw new Error(
			`slicemachine.config.json does not define any Slice Libraries in "libraries". Add at least one library (e.g., ["./src/slices"]) and try again.`,
		)
	}

	const projectRoot = dirname(sliceMachineConfigAbsolutePath)

	return config.libraries.map((lib) => resolvePath(projectRoot, lib))
}

export function resolveAbsoluteLibraryID(args: {
	sliceMachineConfigAbsolutePath: string
	libraryAbsolutePath: string
}): { libraryID: string; resolvedLibraries: string[] } {
	const { sliceMachineConfigAbsolutePath, libraryAbsolutePath } = args

	const projectRoot = dirname(sliceMachineConfigAbsolutePath)
	const resolvedLibraries = getResolvedLibraries(sliceMachineConfigAbsolutePath)

	const matchingLibraryPath = resolvedLibraries.find(
		(path) => path === libraryAbsolutePath,
	)

	if (!matchingLibraryPath) {
		throw new Error(
			`Could not find a matching library in slicemachine.config.json for the provided library absolute path: ${libraryAbsolutePath}.`,
		)
	}

	return {
		resolvedLibraries,
		libraryID: relative(projectRoot, matchingLibraryPath),
	}
}

export function getRepositoryName(
	sliceMachineConfigAbsolutePath: string,
): string {
	const config = parseSliceMachineConfig(sliceMachineConfigAbsolutePath)

	return config.repositoryName
}

export async function initializeSliceMachineManager(args: {
	sliceMachineConfigAbsolutePath: string
}): Promise<SliceMachineManager> {
	const { sliceMachineConfigAbsolutePath } = args

	const projectRoot = dirname(sliceMachineConfigAbsolutePath)
	const manager = createSliceMachineManager({ cwd: projectRoot })
	await manager.plugins.initPlugins()

	return manager
}
