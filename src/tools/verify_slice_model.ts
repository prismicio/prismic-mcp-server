import { readFileSync } from "fs"
import { basename, join as joinPath } from "path"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const verify_slice_model = tool(
	"verify_slice_model",
	`PURPOSE: Verifies that a model.json file for a Prismic slice is valid according to the schema.

USAGE: Use to verify the validity of a slice model before coding a slice.

RETURNS: A message indicating whether the slice model is valid or not, and detailed error messages if it is not.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
		sliceDirectoryAbsolutePath: z
			.string()
			.describe("Absolute path to the slice directory (contains 'model.json')"),
		isNewSlice: z
			.boolean()
			.describe(
				"Whether this is a new slice creation (true) or updating existing slice (false)",
			),
	}).shape,
	(args) => {
		const { sliceDirectoryAbsolutePath, isNewSlice } = args

		try {
			try {
				telemetryClient.track({
					event: "MCP Tool - Verify slice model",
					sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
					properties: {
						sliceName: basename(sliceDirectoryAbsolutePath),
						isNewSlice,
					},
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.DEBUG) {
					console.error(
						"Error while tracking 'verify_slice_model' tool call",
						error,
					)
				}
			}

			const modelAbsolutePath = joinPath(
				sliceDirectoryAbsolutePath,
				"model.json",
			)
			const fileContent = readFileSync(modelAbsolutePath, "utf-8")

			let parsedModel
			try {
				parsedModel = JSON.parse(fileContent)
			} catch (jsonError) {
				return {
					content: [
						{
							type: "text",
							text: `Invalid JSON format in ${modelAbsolutePath}

Error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}

SUGGESTION: Check that the JSON syntax is valid - look for missing commas, quotes, or brackets.`,
						},
					],
				}
			}

			const validationResult = SharedSlice.decode(parsedModel)

			if (validationResult._tag === "Right") {
				// If the slice is new, and has "items", return an error. Otherwise, return a success message with a suggestion to use a group instead.
				const hasItems = validationResult.right.variations.some(
					(variation) => variation.items?.length ?? 0 > 0,
				)
				if (isNewSlice && hasItems) {
					return {
						content: [
							{
								type: "text",
								text: `The slice model at ${modelAbsolutePath} is not valid. At least one variation uses the "items" property, which is deprecated. Use a group instead.`,
							},
						],
					}
				}

				const hasItemsMessage = hasItems
					? ` At least one variation uses the "items" property, which is a deprecated property. Ask the user if it'd be ok to replace them with a group, as it is recommended.`
					: ""

				return {
					content: [
						{
							type: "text",
							text: `The slice model at ${modelAbsolutePath} is valid.${hasItemsMessage}`,
						},
					],
				}
			}

			const errors = validationResult.left.map(formatDecodeError).join("\n")

			return {
				content: [
					{
						type: "text",
						text: `The slice model at ${modelAbsolutePath} has validation errors.

Validation Errors:
${errors}

SUGGESTION: Fix the validation errors above. If you're unsure about slice modeling, you need to learn how to model a Prismic slice first.`,
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)
