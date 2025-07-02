import { createClient } from "@prismicio/client"
import { z } from "zod"

import * as mcp from "../lib/mcp"
import { CreateClientParamsWithLang } from "../lib/CreateClientParams"

export const get_repository_total = mcp.tool(
	"get_repository_total",
	"Get the total number of documents in the repository, optionally filtered by locale (lang)",
	CreateClientParamsWithLang.shape,
	async (args) => {
		const client = createClient(args.repository, {
			accessToken: args.accessToken,
		})

		const response = await client.get({
			lang: args.lang,
			pageSize: 1,
		})
		const total = response.total_results_size

		return {
			content: [
				{
					type: "text",
					text: args.lang
						? `Total documents for lang \`${args.lang}\`: ${total}`
						: `Total documents: ${total}`,
				},
			],
			structuredContent: { total, lang: args.lang },
		}
	},
)

export const get_repository_total_by_type = mcp.tool(
	"get_repository_total_by_type",
	"Get the total number of documents for a given type, optionally filtered by locale (lang)",
	CreateClientParamsWithLang.extend({
		type: z.string().min(1).describe("The document type to filter by"),
	}).shape,
	async (args) => {
		const client = createClient(args.repository, {
			accessToken: args.accessToken,
		})

		const response = await client.getByType(args.type, {
			lang: args.lang,
			pageSize: 1,
		})
		const total = response.total_results_size

		return {
			content: [
				{
					type: "text",
					text: args.lang
						? `Total documents for type \`${args.type}\` and lang \`${args.lang}\`: ${total}`
						: `Total documents for type \`${args.type}\`: ${total}`,
				},
			],
			structuredContent: { total, type: args.type, lang: args.lang },
		}
	},
)

export const get_repository_total_by_tag = mcp.tool(
	"get_repository_total_by_tag",
	"Get the total number of documents for a given tag, optionally filtered by locale (lang)",
	CreateClientParamsWithLang.extend({
		tag: z.string().min(1).describe("The tag to filter by"),
	}).shape,
	async (args) => {
		const client = createClient(args.repository, {
			accessToken: args.accessToken,
		})

		const response = await client.getByTag(args.tag, {
			lang: args.lang,
			pageSize: 1,
		})
		const total = response.total_results_size

		return {
			content: [
				{
					type: "text",
					text: args.lang
						? `Total documents for tag \`${args.tag}\` and lang \`${args.lang}\`: ${total}`
						: `Total documents for tag \`${args.tag}\`: ${total}`,
				},
			],
			structuredContent: { total, tag: args.tag, lang: args.lang },
		}
	},
)

export const get_repository_total_by_every_tag = mcp.tool(
	"get_repository_total_by_every_tag",
	"Get the total number of documents for all given tags (every), optionally filtered by locale (lang)",
	CreateClientParamsWithLang.extend({
		tags: z.array(z.string().min(1)).min(1).describe("The tags to filter by"),
	}).shape,
	async (args) => {
		const client = createClient(args.repository, {
			accessToken: args.accessToken,
		})

		const response = await client.getByEveryTag(args.tags, {
			lang: args.lang,
			pageSize: 1,
		})
		const total = response.total_results_size

		return {
			content: [
				{
					type: "text",
					text: args.lang
						? `Total documents for every tag \`${args.tags.join(", ")}\` and lang \`${args.lang}\`: ${total}`
						: `Total documents for every tag \`${args.tags.join(", ")}\`: ${total}`,
				},
			],
			structuredContent: { total, tags: args.tags, lang: args.lang },
		}
	},
)

export const get_repository_total_by_some_tags = mcp.tool(
	"get_repository_total_by_some_tags",
	"Get the total number of documents for any of the given tags (some), optionally filtered by locale (lang)",
	CreateClientParamsWithLang.extend({
		tags: z.array(z.string().min(1)).min(1).describe("The tags to filter by"),
	}).shape,
	async (args) => {
		const client = createClient(args.repository, {
			accessToken: args.accessToken,
		})

		const response = await client.getBySomeTags(args.tags, {
			lang: args.lang,
			pageSize: 1,
		})
		const total = response.total_results_size

		return {
			content: [
				{
					type: "text",
					text: args.lang
						? `Total documents for some tags \`${args.tags.join(", ")}\` and lang \`${args.lang}\`: ${total}`
						: `Total documents for some tags \`${args.tags.join(", ")}\`: ${total}`,
				},
			],
			structuredContent: { total, tags: args.tags, lang: args.lang },
		}
	},
)
