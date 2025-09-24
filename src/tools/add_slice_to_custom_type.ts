import { createSliceMachineManager } from "@slicemachine/manager"
import { readFileSync } from "fs"
import { basename, dirname, join as joinPath } from "path"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { trackSentryError } from "../lib/sentry"
import {
	CustomType,
	SharedSlice,
} from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const add_slice_to_custom_type = tool(
	"add_slice_to_custom_type",
	`PURPOSE: Adds a slice to a custom type.

USAGE: Required path for modifying Prismic slice registrations.
Adds/registers/attaches a slice to a custom type and regenerates types.
Do not edit custom type JSON files manually; this tool performs validation and follow-up steps.

RETURNS: A message indicating whether the slice was added to the type or not, and detailed error messages if it is not.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
		sliceDirectoryAbsolutePath: z
			.string()
			.describe("Absolute path to the slice directory (contains 'model.json')"),
		customTypeDirectoryAbsolutePath: z
			.string()
			.describe(
				"Absolute path to the custom type directory (contains 'index.json')",
			),
	}).shape,
	async (args) => {
		const { sliceDirectoryAbsolutePath, customTypeDirectoryAbsolutePath } = args

		try {
			try {
				telemetryClient.track({
					event: "MCP Tool - Add slice to custom type",
					sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
					properties: {
						sliceName: basename(sliceDirectoryAbsolutePath),
						customTypeId: basename(customTypeDirectoryAbsolutePath),
					},
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.PRISMIC_DEBUG) {
					console.error(
						"Error while tracking 'add_slice_to_custom_type' tool call",
						error,
					)
				}
			}

			// Read the slice model
			const sliceModelAbsolutePath = joinPath(
				sliceDirectoryAbsolutePath,
				"model.json",
			)

			let sliceModelContent: unknown
			try {
				sliceModelContent = JSON.parse(
					readFileSync(sliceModelAbsolutePath, "utf8"),
				)
			} catch (error) {
				throw new Error(
					`Invalid JSON format for slice model at ${sliceModelAbsolutePath}: ${getErrorMessage(error)}`,
				)
			}

			const validatedSliceModel = SharedSlice.decode(sliceModelContent)
			if (validatedSliceModel._tag === "Left") {
				throw new Error(
					`Invalid slice model at ${sliceModelAbsolutePath}. Please use the 'save_slice_model' tool to validate the slice model before adding it to the custom type.`,
				)
			}
			const parsedSliceModel = validatedSliceModel.right

			// Read the custom type model
			const customTypeModelAbsolutePath = joinPath(
				customTypeDirectoryAbsolutePath,
				"index.json",
			)

			let customTypeModelContent: unknown
			try {
				customTypeModelContent = JSON.parse(
					readFileSync(customTypeModelAbsolutePath, "utf8"),
				)
			} catch (error) {
				throw new Error(
					`Invalid JSON format for custom type model at ${customTypeModelAbsolutePath}: ${getErrorMessage(error)}`,
				)
			}

			const validatedCustomTypeModel = CustomType.decode(customTypeModelContent)
			if (validatedCustomTypeModel._tag === "Left") {
				const errors = validatedCustomTypeModel.left
					.map(formatDecodeError)
					.join("\n")
				throw new Error(
					`Invalid custom type model at ${customTypeModelAbsolutePath}:\n${errors}`,
				)
			}
			const parsedCustomTypeModel = validatedCustomTypeModel.right

			// Add the slice to the first slice field in the model
			let sliceAlreadyAdded = false

			const hasSliceZone = Object.values(parsedCustomTypeModel.json).some(
				(fields) => {
					return Object.values(fields).some((field) => {
						if (field?.type === "Slices") {
							if (
								Object.keys(field.config?.choices || {}).includes(
									parsedSliceModel.id,
								)
							) {
								sliceAlreadyAdded = true
							} else {
								if (!field.config) {
									field.config = {}
								}
								if (!field.config.choices) {
									field.config.choices = {}
								}

								field.config.choices[parsedSliceModel.id] = {
									type: parsedSliceModel.type,
								}
							}

							return true
						}

						return false
					})
				},
			)

			if (sliceAlreadyAdded) {
				return {
					content: [
						{
							type: "text",
							text: `The "${parsedSliceModel.id}" slice already exists in the "${parsedCustomTypeModel.id}" custom type`,
						},
					],
				}
			}

			// If the custom type does not have a slice zone, add it to the first section
			if (!hasSliceZone) {
				const firstSection = Object.keys(parsedCustomTypeModel.json)[0]
				parsedCustomTypeModel.json[firstSection].slices = {
					type: "Slices",
					fieldset: "Slice Zone",
					config: {
						choices: {
							[parsedSliceModel.id]: {
								type: parsedSliceModel.type,
							},
						},
					},
				}
			}

			const validationResult = CustomType.decode(parsedCustomTypeModel)

			if (validationResult._tag === "Left") {
				if (process.env.PRISMIC_DEBUG) {
					console.error(
						"Error with generated custom type model",
						validationResult.left,
					)
				}
				trackSentryError({
					error: validationResult.left,
					toolName: "add_slice_to_custom_type",
				})
				throw new Error(
					`Error updating custom type model at ${customTypeModelAbsolutePath}`,
				)
			}

			try {
				const projectRoot = dirname(args.sliceMachineConfigAbsolutePath)
				const manager = createSliceMachineManager({ cwd: projectRoot })
				await manager.plugins.initPlugins()

				await manager.customTypes.updateCustomType({
					model: parsedCustomTypeModel,
				})
			} catch (error) {
				throw new Error(
					`Failed to write to file ${customTypeModelAbsolutePath}: ${getErrorMessage(error)}`,
				)
			}

			return {
				content: [
					{
						type: "text",
						text: `
The slice model at ${sliceModelAbsolutePath} is now added to the custom type at ${customTypeModelAbsolutePath}.`,
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}
