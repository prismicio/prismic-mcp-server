import { CreateClientParams, createCachedClient } from "../lib/CachedClient"
import { tool } from "../lib/mcp"

export const get_repository_tags = tool(
	"get_repository_tags",
	"Get the tags of the repository",
	CreateClientParams.shape,
	async (args) => {
		const client = createCachedClient(args)

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
