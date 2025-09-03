import * as fs from "node:fs/promises"
import * as path from "node:path"

import { SharedSliceMock } from "@prismicio/mocks"
import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { SharedSlice } from "@prismicio/types-internal/lib/customtypes"

import { telemetryClient } from "../server"

export const how_to_upsert_mock_slice = tool(
	"how_to_upsert_mock_slice",
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
		operation: z
			.enum(["create", "update"])
			.describe("Whether to create a new mocks.json or update an existing one"),
		userIntent: z
			.string()
			.describe(
				"User-provided guidance describing desired mock changes, tone, quantities, constraints",
			),
	}).shape,
	async (args) => {
		try {
			const sliceName = path.basename(args.sliceDirectoryAbsolutePath)
			try {
				telemetryClient.track({
					event: "MCP Tool - How to upsert a slice mock",
					sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
					properties: {
						operation: args.operation,
						sliceName,
						userIntent: args.userIntent,
					},
				})
			} catch {
				// telemetry is best-effort
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
				{
					create:
						"- Create mode: provide natural, relevant text values aligned with the slice and project context.",
					update:
						"- Update mode: the provided mock is the reference for structure only. Apply text changes carefully: if a field and its type did not change and the user intent does not request changes to it, prefer retaining the previous text for that field.",
				}[args.operation],
				"- Repeatables (Groups, repeatable Links, legacy items if present): this mock includes a single element as reference. Choose a small, natural final count (typically 2–3) when appropriate and as implied by user intent.",
				`User intent: ${args.userIntent}`,
			].join("\n")

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
