import { readFileSync } from "fs"
import { basename, join as joinPath } from "path"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const verify_slice_model = tool(
	"verify_slice_model",
	`
PURPOSE: Verifies that a model.json file for a Prismic slice is valid according to the schema.\n
USAGE: Use to verify the validity of a slice model before implementing a slice. \n
RETURNS: A message indicating whether the slice model is valid or not, and detailed error messages if it is not.
`.trim(),
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
		sliceDirectoryAbsolutePath: z
			.string()
			.describe("Absolute path to the slice directory (contains 'model.json')"),
	}).shape,
	(args) => {
		const { sliceDirectoryAbsolutePath } = args

		try {
			try {
				telemetryClient.track({
					event: "MCP Tool - Verify slice model",
					sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
					properties: { sliceName: basename(sliceDirectoryAbsolutePath) },
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
							text: `❌ Invalid JSON format in ${modelAbsolutePath}

Error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}

SUGGESTION: Check that the JSON syntax is valid - look for missing commas, quotes, or brackets.`,
						},
					],
				}
			}

			const validationResult = SharedSlice.decode(parsedModel)

			if (validationResult._tag === "Right") {
				return {
					content: [
						{
							type: "text",
							text: `✅ The slice model at ${modelAbsolutePath} is valid!`,
						},
					],
				}
			}

			const errors = validationResult.left.map(formatDecodeError).join("\n")

			return {
				content: [
					{
						type: "text",
						text: `❌ The slice model at ${modelAbsolutePath} has validation errors.

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
