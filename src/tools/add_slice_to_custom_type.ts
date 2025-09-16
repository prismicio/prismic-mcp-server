import { readFileSync, writeFileSync } from "fs"
import { basename, join as joinPath } from "path"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import {
	CustomType,
	type DynamicSlices,
	type SharedSlice,
	type StaticCustomType,
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
	(args) => {
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
				if (process.env.DEBUG) {
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

			let parsedSliceModel: SharedSlice
			try {
				parsedSliceModel = JSON.parse(
					readFileSync(sliceModelAbsolutePath, "utf-8"),
				)
			} catch (error) {
				throw new Error(
					`Invalid JSON format for slice model at ${sliceModelAbsolutePath}: ${getErrorMessage(error)}`,
				)
			}

			// Read the custom type model
			const customTypeModelAbsolutePath = joinPath(
				customTypeDirectoryAbsolutePath,
				"index.json",
			)

			let customTypeParsedModel: StaticCustomType
			try {
				customTypeParsedModel = JSON.parse(
					readFileSync(customTypeModelAbsolutePath, "utf-8"),
				)
			} catch (error) {
				throw new Error(
					`Invalid JSON format for page/custom type model at ${customTypeModelAbsolutePath}: ${getErrorMessage(error)}`,
				)
			}

			// Add the slice to the first slice field in the model
			let sliceAlreadyAdded = false

			const hasSliceZone = Object.entries(customTypeParsedModel.json).some(
				([sectionName, fields]) => {
					return Object.entries(fields).some(([fieldId, field]) => {
						if (field?.type === "Slices") {
							if (
								Object.keys(field.config?.choices || {}).includes(
									parsedSliceModel.id,
								)
							) {
								sliceAlreadyAdded = true
							} else {
								const sliceField = customTypeParsedModel.json[sectionName][
									fieldId
								] as DynamicSlices

								if (!sliceField.config) {
									sliceField.config = {}
								}
								if (!sliceField.config.choices) {
									sliceField.config.choices = {}
								}

								sliceField.config.choices[parsedSliceModel.id] = {
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
							text: `The "${parsedSliceModel.id}" slice already exists in the "${customTypeParsedModel.id}" custom type`,
						},
					],
				}
			}

			// If the custom type does not have a slice zone, add it to the first section
			if (!hasSliceZone) {
				const firstSection = Object.keys(customTypeParsedModel.json)[0]
				;(customTypeParsedModel.json[firstSection].slices as DynamicSlices) = {
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

			const validationResult = CustomType.decode(customTypeParsedModel)

			if (validationResult._tag === "Left") {
				if (process.env.PRISMIC_DEBUG) {
					console.error(
						"Error with generated custom type model",
						validationResult.left,
					)
				}
				throw new Error(
					`Error updating custom type model at ${customTypeModelAbsolutePath}`,
				)
			}

			try {
				writeFileSync(
					customTypeModelAbsolutePath,
					`${JSON.stringify(customTypeParsedModel, null, 2)}\n`,
					"utf-8",
				)
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
The slice model at ${sliceModelAbsolutePath} is now added to the custom type at ${customTypeModelAbsolutePath}.
${
	!hasSliceZone
		? `\nNote: The custom type did not have a slice zone, so one was added to the type.\n`
		: ""
}
You MUST now call the generate_types tool to update the Prismic types.
`,
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
