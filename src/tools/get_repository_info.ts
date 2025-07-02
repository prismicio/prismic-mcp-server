import { createClient } from "@prismicio/client"

import * as mcp from "../lib/mcp"
import { CreateClientParams } from "../lib/CreateClientParams"

export const get_repository_info = mcp.tool(
	"get_repository_info",
	`Get comprehensive information about the repository including types (you often need to know the exact type of a document to use other tools, so you can use this tool first to get from a "human readable" type like "Blog post" to the exact API type like "blog_post"), locales (languages, lang, when using other tools with a specific locale, you can use this tool first to get the exact locale available), releases (refs), and URLs (links).`,
	CreateClientParams.shape,
	async (args) => {
		const client = createClient(args.repository, {
			accessToken: args.accessToken,
		})

		const { types, languages, refs } = await client.getRepository()

		const locales: Record<string, string> = {}
		for (const locale of languages) {
			locales[locale.id] =
				`${locale.name}${locale.is_master ? " (default)" : ""}`
		}

		const releases = refs
			.filter(
				(ref) => !ref.isMasterRef && ref.label !== "migration-api-release",
			)
			.map((release) => ({
				...release,
				url: `https://${args.repository}.prismic.io/builder/upcoming/${release.id}`,
			}))

		const urls = {
			Editor: `https://${args.repository}.prismic.io/builder/working`,
			"Media Library": `https://${args.repository}.prismic.io/builder/medias`,
			"Migration Release": `https://${args.repository}.prismic.io/builder/upcoming/migration`,
			"API Explorer": `https://${args.repository}.prismic.io/builder/explorer`,
			Settings: `https://${args.repository}.prismic.io/settings`,
		}

		return {
			content: [
				{
					type: "text",
					text: [
						`# Repository info for \`${args.repository}\``,
						"",
						"## Types",
						...Object.entries(types).map(
							([id, label]) => `  ${label} - \`${id}\``,
						),
						"",
						"## Locales",
						...Object.entries(locales).map(
							([id, locale]) => `  ${locale} - \`${id}\``,
						),
						"",
						"## Releases",
						...(releases.length
							? releases.map(
									(release) =>
										`  [${release.label}](${release.url}), ref: \`${release.ref}\`)${release.isMasterRef ? " (master)" : ""}, id: \`${release.id}\``,
								)
							: [
									`  No releases found.${
										!args.accessToken
											? " Since no access token were provided, it can be because the repository is private or because there are no releases. In that case, asking for an access token will desambiguate the situation."
											: ""
									}`,
								]),
						"",
						"## URLs (links)",
						...Object.entries(urls).map(
							([label, url]) => `  [${label}](${url})`,
						),
					].join("\n"),
				},
			],
			structuredContent: {
				types,
				locales,
				releases,
				urls,
			},
		}
	},
)
