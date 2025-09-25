import * as fs from "node:fs/promises"
import * as path from "node:path"

import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { trackSentryError } from "../lib/sentry"
import {
	ContentPath,
	SharedSliceContent,
	traverseSharedSliceContent,
} from "@prismicio/types-internal/lib/content"
import {
	type FieldType,
	SharedSlice,
} from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const verify_slice_mock = tool(
	"verify_slice_mock",
	`PURPOSE: Verifies that a mocks.json file for a Prismic slice is valid according to the model.

USAGE: Use immediately after generating or editing a slice mock to ensure it is valid slice content.

RETURNS: A message indicating whether mocks.json is valid or not, with detailed errors if invalid.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
		sliceDirectoryAbsolutePath: z
			.string()
			.describe("Absolute path to the slice directory (contains 'mocks.json')"),
	}).shape,
	async (args) => {
		const { sliceDirectoryAbsolutePath } = args

		try {
			telemetryClient.track({
				event: "MCP Tool - Verify slice mock",
				sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
				properties: {
					sliceName: path.basename(sliceDirectoryAbsolutePath),
				},
			})
		} catch (error) {
			// noop, we don't wanna block the tool call if the tracking fails
			if (process.env.PRISMIC_DEBUG) {
				console.error(
					"Error while tracking 'verify_slice_mock' tool call:",
					error,
				)
			}
		}

		try {
			const mocksPath = path.join(sliceDirectoryAbsolutePath, "mocks.json")
			const mocksJSON = JSON.parse(await fs.readFile(mocksPath, "utf8"))
			const parsedMocks = mocksSchema.safeParse(mocksJSON)

			if (!parsedMocks.success) {
				throw new Error(`Invalid mocks.json: ${parsedMocks.error.message}`)
			}

			const modelPath = path.join(sliceDirectoryAbsolutePath, "model.json")
			const modelJSON = JSON.parse(await fs.readFile(modelPath, "utf8"))
			const parsedModel = SharedSlice.decode(modelJSON)
			if (parsedModel._tag === "Left") {
				throw new Error(
					`Invalid model.json: ${parsedModel.left.map(formatDecodeError).join("\n")}`,
				)
			}

			validateMocksAgainstModel({
				mocks: parsedMocks.data,
				model: parsedModel.right,
			})

			return {
				content: [
					{
						type: "text",
						text: `The slice mock at ${mocksPath} is valid.`,
					},
				],
			}
		} catch (error) {
			let mocksPath: string | undefined
			let mocksRaw: string | undefined
			try {
				mocksPath = path.join(sliceDirectoryAbsolutePath, "mocks.json")
				mocksRaw = await fs.readFile(mocksPath, "utf8")
			} catch {
				// noop, we don't wanna block the tracking if this fails
			}
			trackSentryError({
				error: error,
				toolName: "verify_slice_mock",
				extra: {
					mocksPath: mocksPath ?? "",
					mocksRaw: mocksRaw ?? "",
				},
			})

			return formatErrorForMcpTool(error)
		}
	},
)

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
