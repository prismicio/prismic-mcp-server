import { join as joinPath } from "path"
import { detectTypesProvider, generateTypes } from "prismic-ts-codegen"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import {
	CustomType,
	SharedSlice,
} from "@prismicio/types-internal/lib/customtypes"

import { readFile, readdir } from "fs/promises"

export const generate_types = tool(
	"generate_types",
	`
PURPOSE: Generates TypeScript types for a given library of Prismic models.\n
USAGE: Use to generate TypeScript types for a given library of Prismic models. \n
RETURNS: TBD
`.trim(),
	z.object({
		projectRoot: z.string().describe("Absolute path to the project root"),
	}).shape,
	async (args) => {
		const { projectRoot } = args

		try {
			const customTypeModels = await readAllCustomTypeModels({ projectRoot })
			const sharedSliceModels = await readAllSliceModels({ projectRoot })

			const typeDefinitions = generateTypes({
				customTypeModels,
				sharedSliceModels,
				clientIntegration: {
					includeCreateClientInterface: true,
					includeContentNamespace: true,
				},
				typesProvider: await detectTypesProvider({ cwd: projectRoot }),
			})

			return {
				content: [
					{
						type: "text",
						text: typeDefinitions,
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)

async function readAllCustomTypeModels(args: { projectRoot: string }) {
	const { projectRoot } = args

	const libraryDir = joinPath(projectRoot, "customtypes")
	const childDirs = await readdir(libraryDir, { withFileTypes: true })

	return Promise.all(
		childDirs.map(async (childDir) => {
			const modelPath = joinPath(libraryDir, childDir.name, "index.json")
			const modelContents = JSON.parse(await readFile(modelPath, "utf8"))

			const parsedModel = CustomType.decode(modelContents)
			if (parsedModel._tag === "Left") {
				throw new Error(
					`Invalid custom type model. ${parsedModel.left.join(", ")}`,
				)
			}

			return parsedModel.right
		}),
	)
}

async function readAllSliceModels(args: { projectRoot: string }) {
	const { projectRoot } = args

	const slices: SharedSlice[] = []
	const libraryPaths = await getSliceLibraryPaths(projectRoot)

	await Promise.all(
		libraryPaths.map(async (libraryPath) => {
			const libraryDir = joinPath(projectRoot, libraryPath)
			const childDirs = await readdir(libraryDir, { withFileTypes: true })

			await Promise.all(
				childDirs.map(async (childDir) => {
					if (!childDir.isDirectory()) {
						return
					}

					const modelPath = joinPath(libraryDir, childDir.name, "model.json")
					const modelContents = JSON.parse(await readFile(modelPath, "utf8"))

					const parsedModel = SharedSlice.decode(modelContents)
					if (parsedModel._tag === "Left") {
						throw new Error(
							`Invalid slice model. ${parsedModel.left.join(", ")}`,
						)
					}

					slices.push(parsedModel.right)
				}),
			)
		}),
	)

	return slices
}

const SliceMachineConfig = z.object({ libraries: z.array(z.string()) })

async function getSliceLibraryPaths(projectRoot: string) {
	const configFilePath = joinPath(projectRoot, "slicemachine.config.json")
	const config = await readFile(configFilePath, "utf8")

	return SliceMachineConfig.parse(JSON.parse(config)).libraries
}
