import { readFile } from "node:fs/promises"
import path from "node:path"

import { existsSync } from "fs"
import { basename, dirname } from "path"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { trackSentryError } from "../lib/sentry"
import {
	initializeSliceMachineManager,
	resolveAbsoluteLibraryID,
} from "../lib/sliceMachine"
import {
	ContentPath,
	SharedSliceContent,
	traverseSharedSliceContent,
} from "@prismicio/types-internal/lib/content"
import type { FieldType } from "@prismicio/types-internal/lib/customtypes"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const save_slice_data = tool(
	"save_slice_data",
	`PURPOSE: Creates or updates a Prismic slice model and/or mocks in your project with given valid data, performing local changes to the slice library.

USAGE: Use to validate and create/update slice data (model and/or mocks).

RETURNS: Success confirmation or detailed validation errors if the data is invalid.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
		sliceAbsolutePath: z
			.string()
			.describe(
				`Absolute path to the directory of the slice to be created/updated`,
			),
		data: z
			.object({
				model: z
					.record(z.string(), z.unknown())
					.optional()
					.describe(
						"The JSON model structure of the slice to be created/updated. Omit to keep the existing model. Fails if the model does not exist.",
					),
				mocks: z
					.array(z.record(z.string(), z.unknown()))
					.optional()
					.describe(
						"The JSON mocks structure of the slice to be created/updated. Omit to keep the existing mocks or generate placeholder ones (if they don't exist yet).",
					),
			})
			.refine((data) => data.model !== undefined || data.mocks !== undefined, {
				message: "At least one of 'model' or 'mocks' must be provided",
			})
			.describe(
				"The data to be saved for the slice. At least one of 'model' or 'mocks' must be specified.",
			),
	}).shape,
	async (args) => {
		try {
			const { sliceMachineConfigAbsolutePath, sliceAbsolutePath, data } = args

			const sliceName = basename(sliceAbsolutePath)
			const isNewSlice = !existsSync(path.join(sliceAbsolutePath, "model.json"))

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
						"Error while tracking 'save_slice_data' tool call:",
						error,
					)
				}
			}

			let libraryID: string | undefined

			try {
				const resolutionResult = resolveAbsoluteLibraryID({
					sliceMachineConfigAbsolutePath,
					libraryAbsolutePath: dirname(sliceAbsolutePath),
				})

				if (!resolutionResult.libraryID) {
					return {
						content: [
							{
								type: "text",
								text: `The slice directory "${sliceAbsolutePath}" is not inside any configured Slice Library from slicemachine.config.json.
								
	Configured libraries (resolved):
	${resolutionResult.resolvedLibraries.map((lib) => `  - ${lib}`).join("\n")}
	
	SUGGESTION: Move or create the slice under one of the configured libraries (e.g., "src/slices/MySlice").`,
							},
						],
					}
				}

				libraryID = resolutionResult.libraryID
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

			let modelRaw = data.model

			const modelPath = path.join(sliceAbsolutePath, "model.json")
			if (existsSync(modelPath)) {
				if (isNewSlice) {
					throw new Error(
						`Trying to create a new slice that already exists at ${sliceAbsolutePath}.`,
					)
				}
				modelRaw = JSON.parse(await readFile(modelPath, "utf8"))
			} else if (!isNewSlice) {
				throw new Error(
					`Trying to update a slice model that does not exist at ${sliceAbsolutePath}.`,
				)
			}

			const sentryExtra = {
				sliceName,
				isNewSlice,
				sliceAbsolutePath,
				modelRaw,
			}

			const validationResult = SharedSlice.decode(modelRaw)

			if (validationResult._tag === "Left") {
				const errors = validationResult.left.map(formatDecodeError).join("\n")

				trackSentryError({
					error: new Error(`The slice model has validation errors: ${errors}`),
					toolName: "save_slice_data",
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

			const model = validationResult.right

			if (!isValidSliceName(model.name)) {
				trackSentryError({
					error: new Error(
						`The slice model is not valid. The slice name "${model.name}" is not in the correct format.`,
					),
					toolName: "save_slice_data",
					extra: sentryExtra,
				})

				return {
					content: [
						{
							type: "text",
							text: `The slice model for ${sliceName} is not valid. The slice name "${model.name}" is not in the correct format.

Expected format: PascalCase (start with an uppercase letter, letters and numbers only, no spaces or special characters)
Examples: "ImageGallery", "TestimonialCard".`,
						},
					],
				}
			}

			// Validate slice ID format
			if (!isValidSliceId(model.id)) {
				trackSentryError({
					error: new Error(
						`The slice model is not valid. The slice ID "${model.id}" is not in the correct format.`,
					),
					toolName: "save_slice_data",
					extra: sentryExtra,
				})

				return {
					content: [
						{
							type: "text",
							text: `The slice model for ${sliceName} is not valid. The slice ID "${model.id}" is not in the correct format.

Expected format: snake_case (lowercase letters, numbers, and underscores only, starting with a letter or number)
Examples: "hero_section", "testimonial_card", "image_gallery".`,
						},
					],
				}
			}

			// Validate variation ID formats
			const invalidVariationIds = model.variations
				.map((variation) => variation.id)
				.filter((variationId) => !isValidVariationId(variationId))
			if (invalidVariationIds.length > 0) {
				trackSentryError({
					error: new Error(
						`The slice model is not valid. The following variation IDs are not in the correct format: ${invalidVariationIds.join(", ")}`,
					),
					toolName: "save_slice_data",
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
			const hasItems = model.variations.some(
				(variation) => variation.items?.length ?? 0 > 0,
			)
			if (isNewSlice && hasItems) {
				trackSentryError({
					error: new Error(
						`The slice model is not valid. At least one variation uses the "items" property, which is deprecated. Use a group instead.`,
					),
					toolName: "save_slice_data",
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

				let mocks: SharedSliceContent[] = []
				if (data.mocks) {
					const parsedMocks = mocksSchema.safeParse(data.mocks)
					if (!parsedMocks.success) {
						throw new Error(`Invalid mocks.json: ${parsedMocks.error.message}`)
					}

					validateMocksAgainstModel({ mocks: parsedMocks.data, model })
					mocks = parsedMocks.data
				}

				if (isNewSlice) {
					await manager.slices.createSlice({ model, libraryID })
				} else {
					await manager.slices.updateSlice({ model, libraryID })
				}

				if (data.mocks) {
					await manager.slices.updateSliceMocks({
						sliceID: model.id,
						libraryID,
						mocks,
					})
				}

				let successMessage = `Slice "${sliceName}" has been successfully ${isNewSlice ? "created" : "updated"}!`

				if (hasItems) {
					successMessage += ` At least one variation uses the "items" property, which is a deprecated property. Ask the user if it'd be ok to replace them with a group, as it is recommended.`
				}

				if (!isNewSlice && data.model) {
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

const mocksSchema = z.array(
	z.unknown().transform((content, ctx) => {
		const result = SharedSliceContent.decode(content)
		if (result._tag === "Left") {
			for (const error of result.left) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: formatDecodeError(error),
				})
			}

			return z.NEVER
		}

		return result.right
	}),
)

function validateMocksAgainstModel({
	model,
	mocks,
}: {
	model: SharedSlice
	mocks: ReadonlyArray<SharedSliceContent>
}): void {
	const errors: string[] = []

	for (const [index, mock] of mocks.entries()) {
		const variationId = mock.variation
		const variation = model.variations.find((v) => v.id === variationId)
		if (!variation) {
			errors.push(
				`- Unknown variation "${variationId}" for mock at index ${index}`,
			)
			continue
		}

		traverseSharedSliceContent({
			path: [],
			sliceKey: model.id + index,
			sliceName: model.name,
			model: {
				type: "SharedSlice",
				sliceName: model.name,
				variationId: variation.id,
				fields: {
					primary: variation.primary,
					items: variation.items,
				},
			},
			content: {
				key: variation.id + index,
				name: variation.name,
				maybeLabel: undefined,
				widget: mock,
			},
		})(
			({ path, model, content }) => {
				const addError = (expectedType: FieldType) => {
					if (model?.type === expectedType) {
						return
					}
					errors.push(
						`- ${content.__TYPE__} at path ${ContentPath.serialize(path)} is not a ${expectedType} field for mock at index ${index}`,
					)
				}
				switch (content.__TYPE__) {
					case "BooleanContent":
						addError("Boolean")
						break
					case "EmbedContent":
						addError("Embed")
						break
					case "EmptyContent":
						// noop
						break
					case "FieldContent":
						addError(content.type)
						break
					case "GeoPointContent":
						addError("GeoPoint")
						break
					case "GroupContentType":
						addError("Group")
						break
					case "ImageContent":
						addError("Image")
						break
					case "IntegrationFieldsContent":
						addError("IntegrationFields")
						break
					case "LinkContent":
					case "RepeatableContent":
						addError("Link")
						break
					case "SeparatorContent":
						addError("Separator")
						break
					case "SliceContentType":
						addError("Slices")
						break
					case "StructuredTextContent":
						addError("StructuredText")
						break
					case "TableContent":
						addError("Table")
						break
					case "UIDContent":
						addError("UID")
						break
				}

				return content
			},
			({ content }) => content,
		)
	}

	if (errors.length > 0) {
		throw new Error(
			`Invalid mocks.json with respect to model.json:\n${errors.join("\n")}`,
		)
	}
}
