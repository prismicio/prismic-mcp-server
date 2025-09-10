import { readFileSync, writeFileSync } from "fs"
import { basename, join as joinPath } from "path"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import {
	type DynamicSlices,
	type SharedSlice,
	type StaticCustomType,
} from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const add_slice_to_custom_type = tool(
	"add_slice_to_custom_type",
	`PURPOSE: Adds a slice to a page or custom type.

USAGE: Use to add a given slice to a certain custom type.

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

			// Find the slice fields
			const sliceFields: [string, string][] = []
			let sliceAlreadyAdded = false

			Object.entries(customTypeParsedModel.json).forEach(
				([sectionName, fields]) => {
					Object.entries(fields).forEach(([fieldId, field]) => {
						if (field?.type === "Slices") {
							sliceFields.push([sectionName, fieldId])

							if (
								!sliceAlreadyAdded &&
								Object.keys(field.config?.choices || {}).includes(
									parsedSliceModel.id,
								)
							) {
								sliceAlreadyAdded = true
							}
						}
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

			if (sliceFields.length === 0) {
				return {
					content: [
						{
							type: "text",
							text: `The "${parsedSliceModel.id}" slice was not added to the "${customTypeParsedModel.id}" custom type because there are no slice fields in the model.`,
						},
					],
				}
			}

			// Add the slice to the first slice field in the model
			const [sectionName, fieldId] = sliceFields[0]

			const sliceField: DynamicSlices = customTypeParsedModel.json[sectionName][
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

The next step is to update the Prismic types.
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
