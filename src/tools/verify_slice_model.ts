import { readFileSync } from "fs"
import { basename, dirname, join as joinPath } from "path"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { trackSentryError } from "../lib/sentry"
import { getResolvedLibraries } from "../lib/sliceMachine"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const verify_slice_model = tool(
	"verify_slice_model",
	`PURPOSE: Verifies that a model.json file for a Prismic slice is valid according to the schema.

USAGE: Use immediately after generating or editing a slice model to ensure it is valid slice model.

RETURNS: A message indicating whether model.json is valid or not, with detailed errors if invalid.`,
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
				if (process.env.PRISMIC_DEBUG) {
					console.error(
						"Error while tracking 'verify_slice_model' tool call",
						error,
					)
				}
			}

			// Ensure the slice directory resides under a configured library from slicemachine.config.json
			try {
				const resolvedLibraryPaths = getResolvedLibraries(
					args.sliceMachineConfigAbsolutePath,
				)
				const sliceParentDirectory = dirname(sliceDirectoryAbsolutePath)
				const insideAnyLibrary = resolvedLibraryPaths.some(
					(libAbs) => sliceParentDirectory === libAbs,
				)
				if (!insideAnyLibrary) {
					return {
						content: [
							{
								type: "text",
								text: `The slice directory "${sliceDirectoryAbsolutePath}" is not inside any configured Slice Library from slicemachine.config.json.\n\nConfigured libraries (resolved):\n${resolvedLibraryPaths.join("\n")}\n\nSUGGESTION: Move or create the slice under one of the configured libraries (e.g., "src/slices/MySlice").`,
							},
						],
					}
				}
			} catch {
				return {
					content: [
						{
							type: "text",
							text: `Could not read or parse slicemachine.config.json at "${args.sliceMachineConfigAbsolutePath}". Ensure it exists and includes a non-empty "libraries" array.`,
						},
					],
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

			const sentryExtra = {
				modelPath: modelAbsolutePath,
				modelRaw: fileContent,
			}

			const validationResult = SharedSlice.decode(parsedModel)

			if (validationResult._tag === "Right") {
				const slice = validationResult.right

				// Validate folder name matches slice name and that slice name is PascalCase
				const expectedSliceName = basename(sliceDirectoryAbsolutePath)
				if (slice.name !== expectedSliceName) {
					trackSentryError({
						error: new Error(
							`The slice model is not valid. The slice name "${slice.name}" does not match the folder name "${expectedSliceName}".`,
						),
						toolName: "verify_slice_model",
						extra: sentryExtra,
					})

					return {
						content: [
							{
								type: "text",
								text: `The slice model at ${modelAbsolutePath} is not valid. The slice name "${slice.name}" does not match the folder name "${expectedSliceName}".

Expected: The folder name and the model's "name" must be the same PascalCase string (e.g., "TestimonialCard").`,
							},
						],
					}
				}

				if (!isValidSliceName(slice.name)) {
					trackSentryError({
						error: new Error(
							`The slice model is not valid. The slice name "${slice.name}" is not in the correct format.`,
						),
						toolName: "verify_slice_model",
						extra: sentryExtra,
					})

					return {
						content: [
							{
								type: "text",
								text: `The slice model at ${modelAbsolutePath} is not valid. The slice name "${slice.name}" is not in the correct format.

Expected format: PascalCase (start with an uppercase letter, letters and numbers only, no spaces or special characters)
Examples: "ImageGallery", "TestimonialCard".`,
							},
						],
					}
				}

				// Validate slice ID format
				if (!isValidSliceId(slice.id)) {
					trackSentryError({
						error: new Error(
							`The slice model is not valid. The slice ID "${slice.id}" is not in the correct format.`,
						),
						toolName: "verify_slice_model",
						extra: sentryExtra,
					})

					return {
						content: [
							{
								type: "text",
								text: `The slice model at ${modelAbsolutePath} is not valid. The slice ID "${slice.id}" is not in the correct format.

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
					trackSentryError({
						error: new Error(
							`The slice model is not valid. The following variation IDs are not in the correct format: ${invalidVariationIds.join(", ")}`,
						),
						toolName: "verify_slice_model",
						extra: sentryExtra,
					})

					return {
						content: [
							{
								type: "text",
								text: `The slice model at ${modelAbsolutePath} is not valid. The following variation IDs are not in the correct format: ${invalidVariationIds.join(", ")}

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
					trackSentryError({
						error: new Error(
							`The slice model is not valid. At least one variation uses the "items" property, which is deprecated. Use a group instead.`,
						),
						toolName: "verify_slice_model",
						extra: sentryExtra,
					})

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
							text: `The slice model at ${modelAbsolutePath} is valid.${hasItemsMessage}

IMPORTANT: Since the model has changed, you MUST now call:
1. how_to_mock_slice (to create/update mocks based on the new model)
2. how_to_code_slice (to create/update the component code based on the new model)

The model drives everything - when it changes, mocks and code must be adjusted accordingly.`,
						},
					],
				}
			}

			const errors = validationResult.left.map(formatDecodeError).join("\n")
			trackSentryError({
				error: new Error(`The slice model has validation errors: ${errors}`),
				toolName: "verify_slice_model",
				extra: sentryExtra,
			})

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
