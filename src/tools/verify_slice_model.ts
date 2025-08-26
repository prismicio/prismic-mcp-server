import { readFileSync } from "fs"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import {
	SharedSlice,
	type Variation,
} from "@prismicio/types-internal/lib/customtypes"

export const verify_slice_model = tool(
	"verify_slice_model",
	`
	Verifies that a model.json file for a Prismic slice is valid according to the SharedSlice schema.
	
	This tool reads and validates the JSON structure of a slice model file to ensure it conforms
	to Prismic's slice modeling requirements. If the model is invalid, it provides detailed error
	messages to help fix the issues.
	
	If validation fails, it might be because you need to learn more about how to properly model
	a slice - consider calling tools to understand slice modeling best practices.
`.trim(),
	z.object({
		modelAbsolutePath: z
			.string()
			.describe("The absolute path to the `model.json` file of the slice"),
	}).shape,
	(args) => {
		try {
			// Read the model.json file
			const fileContent = readFileSync(args.modelAbsolutePath, "utf-8")

			// Parse JSON
			let parsedModel
			try {
				parsedModel = JSON.parse(fileContent)
			} catch (jsonError) {
				return {
					content: [
						{
							type: "text" as const,
							text: `❌ Invalid JSON format in ${args.modelAbsolutePath}

**Error:** ${jsonError instanceof Error ? jsonError.message : String(jsonError)}

**Suggestion:** Check that the JSON syntax is valid - look for missing commas, quotes, or brackets.`,
						},
					],
				}
			}

			// Validate against SharedSlice schema using io-ts
			const validationResult = SharedSlice.decode(parsedModel)

			if (validationResult._tag === "Right") {
				const slice = validationResult.right
				const variations = slice.variations.map((v: Variation) => ({
					id: v.id,
					name: v.name,
					hasItems: Boolean(v.items && Object.keys(v.items).length > 0),
					hasPrimary: Boolean(v.primary && Object.keys(v.primary).length > 0),
				}))

				return {
					content: [
						{
							type: "text" as const,
							text: `✅ The slice model at ${args.modelAbsolutePath} is valid!

**Slice Details:**
- ID: ${slice.id}
- Name: ${slice.name}
- Type: ${slice.type}
- Variations: ${slice.variations.length}
${slice.description ? `- Description: ${slice.description}` : ""}

**Variations:**
${variations
	.map(
		(variation) =>
			`- ${variation.name} (${variation.id}): ${variation.hasPrimary ? "✓ Primary fields" : "✗ No primary"}, ${variation.hasItems ? "✓ Items fields" : "✗ No items"}`,
	)
	.join("\n")}

The slice model follows the correct SharedSlice schema structure and can be safely used with Slice Machine.`,
						},
					],
				}
			} else {
				// Format io-ts validation errors

				const errors = validationResult.left.map(formatError).join("\n")

				return {
					content: [
						{
							type: "text" as const,
							text: `❌ The slice model at ${args.modelAbsolutePath} has validation errors:

**Validation Errors:**
${errors}

**Suggestion:** Fix the validation errors above. If you're unsure about slice modeling, consider learning about Prismic slice structure and field types.

**Note:** If the model is invalid, it might be because you need to learn more about how to properly model a slice. Consider calling the \`how_to_code_slice\` tool to understand slice modeling best practices.`,
						},
					],
				}
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)

function formatError(error: {
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
