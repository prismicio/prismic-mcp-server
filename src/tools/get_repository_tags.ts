import { createClient } from "@prismicio/client"

import * as mcp from "../lib/mcp"
import { CreateClientParams } from "../lib/CreateClientParams"

export const get_repository_tags = mcp.tool(
	"get_repository_tags",
	"Get the tags of the repository",
	CreateClientParams.shape,
	async (args) => {
		const client = createClient(args.repository, {
			accessToken: args.accessToken,
		})

		const tags = await client.getTags()

		return {
			content: [
				{
					type: "text",
					text: tags.length
						? tags.map((tag) => `- ${tag}`).join("\n")
						: "No tags found.",
				},
			],
			structuredContent: { tags },
		}
	},
)
