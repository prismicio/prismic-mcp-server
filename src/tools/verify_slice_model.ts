import { readFileSync } from "fs"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

export const verify_slice_model = tool(
	"verify_slice_model",
	`
	Verifies that a model.json file for a Prismic slice is valid according to the SharedSlice schema.
	
	This tool reads and validates the JSON structure of a slice model file to ensure it conforms
	to Prismic's slice modelling requirements. If the model is invalid, it provides detailed error
	messages to help fix the issues.
	
	If validation fails, it might be because you need to learn more about how to properly model
	a slice - consider calling tools to understand slice modelling best practices.
`.trim(),
	z.object({
		modelAbsolutePath: z
			.string()
			.describe("The absolute path to the `model.json` file of the slice"),
	}).shape,
	(args) => {
		const { modelAbsolutePath } = args

		try {
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

**Error:** ${jsonError instanceof Error ? jsonError.message : String(jsonError)}

**Suggestion:** Check that the JSON syntax is valid - look for missing commas, quotes, or brackets.`,
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
						text: `❌ The slice model at ${modelAbsolutePath} has validation errors:

**Validation Errors:**
${errors}

**Suggestion:** Fix the validation errors above. If you're unsure about slice modelling, consider learning about the slice model schema from other existing slices.`,
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)

function formatDecodeError(error: {
	message?: string
	context?: ReadonlyArray<{ key?: string; type?: { name: string } }>
	value?: unknown
}): string {
	if (error.message) {
		return `- ${error.context?.[0]?.key || "root"}: ${error.message}`
	}

	const path =
		error.context
			?.map((c) => c.key)
			.filter(Boolean)
			.join(".") || "root"

	const expectedType =
		error.context?.[error.context.length - 1]?.type?.name || "unknown"

	return `- ${path}: Expected ${expectedType}, got ${typeof error.value} (${JSON.stringify(error.value)})`
}
