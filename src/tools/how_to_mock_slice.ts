import * as fs from "node:fs/promises"
import * as path from "node:path"
import { existsSync } from "node:fs"

import { SharedSliceMock } from "@prismicio/mocks"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const how_to_mock_slice = tool(
	"how_to_mock_slice",
	`PURPOSE: Generate a model-valid slice mock (mocks.json) and provide guidance for text-only refinements.

USAGE: Use when creating or updating slice mocks.

RETURNS: A JSON mock covering all variations, plus guidance for text-only refinements.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
		sliceDirectoryAbsolutePath: z
			.string()
			.describe("Absolute path to the slice directory (contains model.json)"),
		userIntent: z
			.string()
			.describe(
				"User-provided guidance describing desired mock changes, tone, quantities, constraints",
			),
	}).shape,
	async (args) => {
		try {
			const sliceName = path.basename(args.sliceDirectoryAbsolutePath)
			const isNewSlice = !existsSync(
				path.join(args.sliceDirectoryAbsolutePath, "mocks.json"),
			)

			try {
				telemetryClient.track({
					event: "MCP Tool - How to mock a slice",
					sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
					properties: {
						isNewSlice,
						sliceName,
						userIntent: args.userIntent,
					},
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.PRISMIC_DEBUG) {
					console.error(
						"Error while tracking 'how_to_mock_slice' tool call:",
						error,
					)
				}
			}

			const modelPath = path.join(args.sliceDirectoryAbsolutePath, "model.json")

			const modelJSON = JSON.parse(await fs.readFile(modelPath, "utf8"))
			const decodedModel = SharedSlice.decode(modelJSON)
			if (decodedModel._tag === "Left") {
				return formatErrorForMcpTool(
					`Invalid slice model at ${modelPath}: ${decodedModel.left.join(", ")}`,
				)
			}
			const model = decodedModel.right

			const mocks = model.variations.map((variation) =>
				SharedSliceMock.generate(model, {
					type: "SharedSlice",
					variation: variation.id,
				}),
			)

			const guidance = [
				"What you have: a valid mock reference for all variations generated from the current model.",
				"What to do:",
				`- Save location: ${path.join(args.sliceDirectoryAbsolutePath, "mocks.json")}`,
				"- Variations: the provided array contains exactly one mock per model variation; do not add or remove variation mocks from this array - only update the text content within each existing variation mock.",
				"- Structure: keep the exact structure and field keys from the provided mock; do not add/remove fields or change types.",
				"- Text fields: update only textual values (Text, StructuredText/RichText, link display text if allowed) so content feels appropriate to the slice and project, guided by the user intent.",
				"- Model-driven choices: do NOT change enumerated/config-driven values (e.g., Select options, link variants).",
				isNewSlice
					? "- Create mode: provide natural, relevant text values aligned with the slice and project context."
					: "- Update mode: the provided mock is the reference for structure only. Apply text changes carefully: if a field and its type did not change and the user intent does not request changes to it, prefer retaining the previous text for that field.",
				"- Repeatables (Groups, repeatable Links, legacy items if present): this mock includes a single element as reference. Choose a small, natural final count (typically 2–3) when appropriate and as implied by user intent.",
				"What NOT to do:",
				"- Never try to write the mocks.json by yourself, always use Prismic to save data.",
				'- IMPORTANT: IF YOU USE ANY UUID FOR THE MOCK DATA (OFTEN USED FOR THE "key" PROPERTIES), ALWAYS MAKE SURE IT IS A VALID UUID v4 STRING.',
				`User intent: ${args.userIntent}`,
			]
				.filter(Boolean)
				.join("\n")

			return {
				content: [
					{ type: "text", text: JSON.stringify(mocks, null, "\t") },
					{ type: "text", text: guidance },
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)
