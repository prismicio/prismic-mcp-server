import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"

export const generate_types = tool(
	"generate_types",
	`
PURPOSE: Generates TypeScript types for a given library of Prismic models.\n
USAGE: Use to generate TypeScript types for a given library of Prismic models. \n
RETURNS: TBD
`.trim(),
	z.object({
		projectRootPath: z.string().describe("Absolute path to the project root"),
	}).shape,
	(args) => {
		const { projectRootPath: _ } = args

		try {
			// TODO: Implement

			return {
				content: [
					{
						type: "text",
						text: "To be implemented",
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)
