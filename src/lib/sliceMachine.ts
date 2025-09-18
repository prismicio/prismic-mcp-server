import * as fs from "node:fs"
import type { Dirent } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { join as joinPath, normalize as normalizePath } from "node:path"

import { z } from "zod"

import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

const SliceMachineConfig = z.object({
	repositoryName: z.string(),
	libraries: z.array(z.string()),
	adapter: z.union([
		z.string(),
		z.object({
			options: z
				.object({
					lazyLoadSlices: z.boolean().optional(),
				})
				.optional(),
		}),
	]),
})
type SliceMachineConfig = z.infer<typeof SliceMachineConfig>

export function parseSliceMachineConfig(
	sliceMachineConfigAbsolutePath: string,
): SliceMachineConfig {
	const fileContent = JSON.parse(
		fs.readFileSync(sliceMachineConfigAbsolutePath, "utf8"),
	)

	return SliceMachineConfig.parse(fileContent)
}

/**
 * Looks into `slicemachine.config.json` to see if the `lazyLoadSlices` option
 * is set.
 *
 * Default to `true` if not set.
 */
export function getHasLazyLoadSlicesOption(
	sliceMachineConfigAbsolutePath: string,
): boolean {
	const sliceMachineConfig = parseSliceMachineConfig(
		sliceMachineConfigAbsolutePath,
	)

	const adapterOptions = sliceMachineConfig.adapter
	if (typeof adapterOptions === "object") {
		return adapterOptions.options?.lazyLoadSlices ?? true
	}

	return true
}

export function getRepositoryName(
	sliceMachineConfigAbsolutePath: string,
): string {
	try {
		const sliceMachineConfig = parseSliceMachineConfig(
			sliceMachineConfigAbsolutePath,
		)

		return sliceMachineConfig.repositoryName
	} catch (error) {
		throw new Error("Failed to get repository name.", {
			cause: error,
		})
	}
}

export async function readAllSliceModelsForLibrary(args: {
	sliceMachineConfigAbsolutePath: string
	libraryPath: string
	projectRoot: string
}): Promise<SharedSlice[]> {
	const { sliceMachineConfigAbsolutePath, projectRoot, libraryPath } = args

	const smConfig = parseSliceMachineConfig(sliceMachineConfigAbsolutePath)

	if (
		smConfig.libraries.findIndex(
			(path) => joinPath(projectRoot, path) === normalizePath(libraryPath),
		) === -1
	) {
		throw new Error(
			`Library path ${libraryPath} not found in slicemachine.config.json`,
		)
	}

	let slicePaths: Dirent[] = []
	try {
		slicePaths = await readdir(libraryPath, { withFileTypes: true })
	} catch (error) {
		throw new Error(
			`Failed to read slice library at ${libraryPath}: ${getErrorMessage(error)}`,
		)
	}

	const sharedSliceModels: SharedSlice[] = []
	await Promise.all(
		slicePaths.map(async (slicePath) => {
			if (!slicePath.isDirectory()) {
				return
			}

			const modelPath = joinPath(libraryPath, slicePath.name, "model.json")

			let modelContents: unknown
			try {
				modelContents = JSON.parse(await readFile(modelPath, "utf8"))
			} catch (error) {
				throw new Error(
					`Invalid JSON format for slice model at ${modelPath}: ${getErrorMessage(error)}`,
				)
			}

			const parsedModel = SharedSlice.decode(modelContents)
			if (parsedModel._tag === "Left") {
				throw new Error(
					`Invalid slice model at ${modelPath}. Please use the 'verify_slice_model' tool to validate the model before generating the types.`,
				)
			}

			sharedSliceModels.push(parsedModel.right)
		}),
	)

	return sharedSliceModels
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
