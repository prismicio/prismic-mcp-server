import * as fs from "node:fs/promises"
import * as path from "node:path"

import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { trackSentryError } from "../lib/sentry"
import { SharedSliceContent } from "@prismicio/types-internal/lib/content"

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
			mocksSchema.parse(mocksJSON)

			return {
				content: [
					{
						type: "text",
						text: `The slice mock at ${mocksPath} is valid.`,
					},
				],
			}
		} catch (error) {
			trackSentryError({
				error: error,
				toolName: "verify_slice_mock",
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
