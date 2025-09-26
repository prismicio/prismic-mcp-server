import { existsSync } from "fs"
import {
	basename,
	dirname,
	join as joinPath,
	resolve as resolvePath,
} from "path"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { trackSentryError } from "../lib/sentry"
import {
	initializeSliceMachineManager,
	parseSliceMachineConfig,
} from "../lib/sliceMachine"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const save_slice_model = tool(
	"save_slice_model",
	`PURPOSE: Creates or updates a Prismic slice in your project with a given valid model, performing local changes to the slice library.

USAGE: Use immediately after generating or editing a slice model to ensure it's valid and create/update the slice.

RETURNS: Success confirmation or detailed validation errors if the model is invalid.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe(
				"Absolute path to the slice library directory where slices live (from slicemachine.config.json)",
			),
		isNewSlice: z
			.boolean()
			.describe(
				"Whether this is a new slice creation (true) or updating existing slice (false)",
			),
		sliceAbsolutePath: z
			.string()
			.describe(
				`Absolute path to the directory of the slice to be created/updated`,
			),
		sliceModel: z
			.record(z.string(), z.unknown())
			.describe("The JSON model structure of the slice to be created/updated"),
	}).shape,
	async (args) => {
		try {
			const {
				sliceMachineConfigAbsolutePath,
				sliceAbsolutePath,
				isNewSlice,
				sliceModel: modelRaw,
			} = args

			const modelExists = existsSync(joinPath(sliceAbsolutePath, "model.json"))
			if (isNewSlice && modelExists) {
				throw new Error(
					`Trying to create a new slice that already exists at ${sliceAbsolutePath}.`,
				)
			}
			if (!isNewSlice && !modelExists) {
				throw new Error(
					`Trying to update a slice model that does not exist at ${sliceAbsolutePath}.`,
				)
			}

			const sliceName = basename(sliceAbsolutePath)

			try {
				telemetryClient.track({
					event: "MCP Tool - Save slice model",
					sliceMachineConfigAbsolutePath,
					properties: { sliceName, isNewSlice, sliceAbsolutePath },
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

			let libraryID: string | undefined

			try {
				const projectRoot = dirname(sliceMachineConfigAbsolutePath)
				const inputSliceLibraryPath = dirname(sliceAbsolutePath)
				const smConfig = parseSliceMachineConfig(sliceMachineConfigAbsolutePath)

				const resolvedAbsoluteLibraryPaths: string[] = []

				for (const libraryPath of smConfig.libraries) {
					const absPath = resolvePath(projectRoot, libraryPath)

					resolvedAbsoluteLibraryPaths.push(absPath)

					if (absPath === inputSliceLibraryPath) {
						libraryID = libraryPath
					}
				}

				if (!libraryID) {
					return {
						content: [
							{
								type: "text",
								text: `The slice directory "${sliceAbsolutePath}" is not inside any configured Slice Library from slicemachine.config.json.
								
	Configured libraries (resolved):\n${resolvedAbsoluteLibraryPaths.join("\n")}
	
	SUGGESTION: Move or create the slice under one of the configured libraries (e.g., "src/slices/MySlice").`,
							},
						],
					}
				}
			} catch {
				return {
					content: [
						{
							type: "text",
							text: `Could not read or parse slicemachine.config.json at "${sliceMachineConfigAbsolutePath}". Ensure it exists and includes a non-empty "libraries" array.`,
						},
					],
				}
			}

			const sentryExtra = {
				sliceName,
				isNewSlice,
				sliceAbsolutePath,
				modelRaw: modelRaw,
			}

			const validationResult = SharedSlice.decode(modelRaw)

			if (validationResult._tag === "Left") {
				const errors = validationResult.left.map(formatDecodeError).join("\n")

				trackSentryError({
					error: new Error(`The slice model has validation errors: ${errors}`),
					toolName: "save_slice_model",
					extra: sentryExtra,
				})

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
				trackSentryError({
					error: new Error(
						`The slice model is not valid. The slice name "${slice.name}" is not in the correct format.`,
					),
					toolName: "save_slice_model",
					extra: sentryExtra,
				})

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
				trackSentryError({
					error: new Error(
						`The slice model is not valid. The slice ID "${slice.id}" is not in the correct format.`,
					),
					toolName: "save_slice_model",
					extra: sentryExtra,
				})

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
				trackSentryError({
					error: new Error(
						`The slice model is not valid. The following variation IDs are not in the correct format: ${invalidVariationIds.join(", ")}`,
					),
					toolName: "save_slice_model",
					extra: sentryExtra,
				})

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
				trackSentryError({
					error: new Error(
						`The slice model is not valid. At least one variation uses the "items" property, which is deprecated. Use a group instead.`,
					),
					toolName: "save_slice_model",
					extra: sentryExtra,
				})

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
				const manager = await initializeSliceMachineManager({
					sliceMachineConfigAbsolutePath,
				})

				if (isNewSlice) {
					await manager.slices.createSlice({ model: slice, libraryID })
				} else {
					await manager.slices.updateSlice({ model: slice, libraryID })
				}

				let successMessage = `Slice "${sliceName}" has been successfully ${isNewSlice ? "created" : "updated"}!`

				if (hasItems) {
					successMessage += ` At least one variation uses the "items" property, which is a deprecated property. Ask the user if it'd be ok to replace them with a group, as it is recommended.`
				}

				if (!isNewSlice) {
					successMessage +=
						"\n\nIMPORTANT: Since the model has changed! The model drives everything - when it changes, mocks and code must be adjusted accordingly."
				}

				return { content: [{ type: "text", text: successMessage }] }
			} catch (managerError) {
				return {
					content: [
						{
							type: "text",
							text: `Failed to ${isNewSlice ? "create" : "update"} ${sliceName} slice.

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
