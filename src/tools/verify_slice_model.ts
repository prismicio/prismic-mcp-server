import { readFileSync } from "fs"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

export const verify_slice_model = tool(
	"verify_slice_model",
	`
PURPOSE: Verifies that a model.json file for a Prismic slice is valid according to the schema.\n
USAGE: Use to verify the validity of a slice model before implementing a slice. \n
RETURNS: A message indicating whether the slice model is valid or not, and detailed error messages if it is not.
`.trim(),
	z.object({
		modelAbsolutePath: z
			.string()
			.describe("Absolute path to the slice's 'model.json' file"),
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

**Suggestion:** Fix the validation errors above. If you're unsure about slice modeling, you need to learn how to model a slice at Prismic first.`,
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
