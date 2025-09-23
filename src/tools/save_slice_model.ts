import { dirname } from "node:path"

import { createSliceMachineManager } from "@slicemachine/manager"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const save_slice_model = tool(
	"save_slice_model",
	`PURPOSE: Creates or updates a Prismic slice using the Slice Machine manager with validation. This tool combines the verification and creation steps into a single operation.

USAGE: Use after modeling a slice to create the actual slice with both model.

RETURNS: Success confirmation or detailed validation errors if the model is invalid.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe(
				"Absolute path to the slice library directory where slices live (from slicemachine.config.json)",
			),
		sliceName: z
			.string()
			.regex(
				/^[A-Z][a-zA-Z0-9]*$/,
				"Slice name must be PascalCase: start with an uppercase letter, contain only letters and numbers, and no special characters.",
			)
			.describe(
				"The name of the slice, it MUST be PascalCase, e.g., 'SliceName', cannot start with a number, and with no special characters allowed",
			),
		libraryID: z
			.string()
			.describe("The library ID where the slice should be created"),
		model: z
			.unknown()
			.describe("The JSON model of the slice to be created/updated"),
		isNewSlice: z
			.boolean()
			.describe(
				"Whether this is a new slice creation (true) or updating existing slice (false)",
			),
	}).shape,
	async (args) => {
		try {
			const {
				sliceMachineConfigAbsolutePath,
				sliceName,
				libraryID,
				model,
				isNewSlice,
			} = args

			try {
				telemetryClient.track({
					event: "MCP Tool - Save slice model",
					sliceMachineConfigAbsolutePath,
					properties: {
						sliceName,
						libraryID,
					},
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.PRISMIC_DEBUG) {
					console.error(
						"Error while tracking 'save_slice_model' tool call:",
						error,
					)
				}
			}

			const validationResult = SharedSlice.decode(model)

			if (validationResult._tag === "Left") {
				const errors = validationResult.left.map(formatDecodeError).join("\n")

				return {
					content: [
						{
							type: "text",
							text: `The slice model for ${sliceName} has validation errors.

Validation Errors:
${errors}

SUGGESTION: Fix the validation errors above. If you're unsure about slice modeling, you need to learn how to model a Prismic slice first.`,
						},
					],
				}
			}

			const slice = validationResult.right

			if (!isValidSliceName(slice.name)) {
				return {
					content: [
						{
							type: "text",
							text: `The slice model for ${sliceName} is not valid. The slice name "${slice.name}" is not in the correct format.

Expected format: PascalCase (start with an uppercase letter, letters and numbers only, no spaces or special characters)
Examples: "ImageGallery", "TestimonialCard".`,
						},
					],
				}
			}

			// Validate slice ID format
			if (!isValidSliceId(slice.id)) {
				return {
					content: [
						{
							type: "text",
							text: `The slice model for ${sliceName} is not valid. The slice ID "${slice.id}" is not in the correct format.

Expected format: snake_case (lowercase letters, numbers, and underscores only, starting with a letter or number)
Examples: "hero_section", "testimonial_card", "image_gallery".`,
						},
					],
				}
			}

			// Validate variation ID formats
			const invalidVariationIds = slice.variations
				.map((variation) => variation.id)
				.filter((variationId) => !isValidVariationId(variationId))
			if (invalidVariationIds.length > 0) {
				return {
					content: [
						{
							type: "text",
							text: `The slice model for ${sliceName} is not valid. The following variation IDs are not in the correct format: ${invalidVariationIds.join(", ")}

Expected format: camelCase (alphanumeric only, starting with a letter, no spaces, hyphens, or underscores)
Examples: "default", "imageRight", "alignLeft", "withBackground".`,
						},
					],
				}
			}

			// If the slice is new, and has "items", return an error. Otherwise, return a success message with a suggestion to use a group instead.
			const hasItems = slice.variations.some(
				(variation) => variation.items?.length ?? 0 > 0,
			)
			if (isNewSlice && hasItems) {
				return {
					content: [
						{
							type: "text",
							text: `The slice model for ${sliceName} is not valid. At least one variation uses the "items" property, which is deprecated. Use a group instead.`,
						},
					],
				}
			}

			try {
				// Initialize Slice Machine manager
				const projectRoot = dirname(sliceMachineConfigAbsolutePath)
				const manager = createSliceMachineManager({ cwd: projectRoot })
				await manager.plugins.initPlugins()

				// Create or update the slice
				await manager.slices.createSlice({ model: slice, libraryID })

				if (hasItems) {
					return {
						content: [
							{
								type: "text",
								text: `The slice model for ${sliceName} is valid. At least one variation uses the "items" property, which is a deprecated property. Ask the user if it'd be ok to replace them with a group, as it is recommended.`,
							},
						],
					}
				}

				return {
					content: [
						{
							type: "text",
							text: `Slice "${sliceName}" has been successfully created/updated!

IMPORTANT: Since the model has changed, you MUST now call:
1. how_to_mock_slice (to create/update mocks based on the new model)
2. how_to_code_slice (to create/update the component code based on the new model)

The model drives everything - when it changes, mocks and code must be adjusted accordingly.`,
						},
					],
				}
			} catch (managerError) {
				return {
					content: [
						{
							type: "text",
							text: `Failed to create slice using Slice Machine manager:

Error: ${managerError instanceof Error ? managerError.message : String(managerError)}

SUGGESTION: Check that the slicemachine.config.json path is correct and that the library ID exists in the configuration.`,
						},
					],
				}
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)

function isValidSliceId(sliceId: string): boolean {
	// Must be snake_case: lowercase letters, numbers, and underscores only
	// Must start with a letter or number, not underscore
	return /^[a-z0-9][a-z0-9_]*$/.test(sliceId)
}

function isValidVariationId(variationId: string): boolean {
	// Must be camelCase, alphanumeric only (no spaces, hyphens, or underscores)
	// Must start with a letter
	return /^[a-z][a-zA-Z0-9]*$/.test(variationId)
}

function isValidSliceName(sliceName: string): boolean {
	// Must be PascalCase: start with uppercase letter, letters and numbers only
	return /^[A-Z][a-zA-Z0-9]*$/.test(sliceName)
}
