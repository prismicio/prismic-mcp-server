import { stripIndent } from "common-tags"
import { join as joinPath } from "path"
import {
	format as prettierFormat,
	resolveConfig as resolvePrettierConfig,
} from "prettier"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import {
	CustomType,
	SharedSlice,
} from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"
import { readFile, readdir, writeFile } from "fs/promises"

const SliceMachineConfig = z.object({ libraries: z.array(z.string()) })

export const generate_types = tool(
	"generate_types",
	`PURPOSE: Generate TypeScript types from a library of Prismic models.\n
USAGE: Use when you need TypeScript types to match your Prismic model definitions, typically after creating or modifying a slice model to keep types in sync.\n
RETURNS: A success message indicating the path to the generated types file or an error message if the generation fails.`,
	z.object({
		projectRoot: z.string().describe("Absolute path to the project root"),
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
	}).shape,

	async (args) => {
		const { projectRoot } = args

		try {
			try {
				telemetryClient.track({
					event: "MCP Tool - Generate types",
					sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.DEBUG) {
					console.error(
						"Error while tracking 'generate_types' tool call",
						error,
					)
				}
			}

			// Dynamic import to handle Node.js 18 CommonJS/ESM interop issues with prismic-ts-codegen
			// TODO: Fix this issue in prismic-ts-codegen: https://linear.app/prismic/issue/DT-2886
			const { detectTypesProvider, generateTypes, NON_EDITABLE_FILE_HEADER } =
				await import("prismic-ts-codegen")

			// Read custom type models

			const ctLibraryPath = joinPath(projectRoot, "customtypes")
			const ctPaths = await readdir(ctLibraryPath, { withFileTypes: true })

			const customTypeModels = await Promise.all(
				ctPaths.map(async (ctPath) => {
					const modelPath = joinPath(ctLibraryPath, ctPath.name, "index.json")
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

			// Read shared slice models

			const smConfigPath = joinPath(projectRoot, "slicemachine.config.json")
			const sliceLibraryPaths = SliceMachineConfig.parse(
				JSON.parse(await readFile(smConfigPath, "utf8")),
			).libraries

			const sharedSliceModels: SharedSlice[] = []

			await Promise.all(
				sliceLibraryPaths.map(async (relativeLibraryPath) => {
					const libraryPath = joinPath(projectRoot, relativeLibraryPath)
					const slicePaths = await readdir(libraryPath, { withFileTypes: true })

					await Promise.all(
						slicePaths.map(async (slicePath) => {
							if (!slicePath.isDirectory()) {
								return
							}

							const modelPath = joinPath(
								libraryPath,
								slicePath.name,
								"model.json",
							)
							const modelContents = JSON.parse(
								await readFile(modelPath, "utf8"),
							)

							const parsedModel = SharedSlice.decode(modelContents)
							if (parsedModel._tag === "Left") {
								throw new Error(
									`Invalid slice model. ${parsedModel.left.join(", ")}`,
								)
							}

							sharedSliceModels.push(parsedModel.right)
						}),
					)
				}),
			)

			// Generate types definitions

			let typeDefinitions = generateTypes({
				customTypeModels,
				sharedSliceModels,
				clientIntegration: {
					includeCreateClientInterface: true,
					includeContentNamespace: true,
				},
				typesProvider: await detectTypesProvider({ cwd: projectRoot }),
			})
			typeDefinitions = `${NON_EDITABLE_FILE_HEADER}\n\n${typeDefinitions}`

			// Format file content

			const typesFilePath = joinPath(projectRoot, "prismicio-types.d.ts")

			let formattedTypes = stripIndent(typeDefinitions)
			const prettierOptions = await resolvePrettierConfig(projectRoot)
			formattedTypes = await prettierFormat(formattedTypes, {
				...prettierOptions,
				filepath: typesFilePath,
			})
			formattedTypes = formattedTypes.replace(/[\r\n]+$/, "")

			// Write types definitions file

			await writeFile(typesFilePath, formattedTypes)

			return {
				content: [
					{
						type: "text",
						text: `✅ Type definitions generated successfully at ${typesFilePath}`,
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)
