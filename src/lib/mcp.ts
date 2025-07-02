import type {
	McpServer,
	ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ZodRawShape } from "zod"

import type {
	CallToolResult,
	ToolAnnotations,
} from "@modelcontextprotocol/sdk/types"

export const resource = <T extends Parameters<McpServer["resource"]>>(
	...args: T
): T => args

export const tool = <Args extends ZodRawShape>(
	...args: [
		name: string,
		description: string,
		paramsSchemaOrAnnotations: Args | ToolAnnotations,
		cb: ToolCallback<Args>,
	]
): [
	name: string,
	description: string,
	paramsSchemaOrAnnotations: Args | ToolAnnotations,
	cb: ToolCallback<Args>,
] => {
	const [name, description, paramsSchemaOrAnnotations, cb] = args

	const wrappedCb = (async (...args) => {
		try {
			return await cb(...args)
		} catch (err) {
			return error(err, true)
		}
	}) as ToolCallback<Args>

	return [name, description, paramsSchemaOrAnnotations, wrappedCb]
}

export const prompt = <T extends Parameters<McpServer["prompt"]>>(
	...args: T
): T => args

export function error(error: unknown, unexpected?: boolean): CallToolResult {
	const prefix = unexpected
		? "An unexpected error occurred"
		: "An error occurred"

	if (error instanceof Error) {
		return {
			content: [
				{
					type: "text",
					text: `${prefix}: ${error.message}`,
				},
			],
			structuredContent: unexpected
				? {
						name: error.name,
						message: error.message,
						stack: error.stack,
						cause: error.cause,
					}
				: undefined,
		}
	}

	return {
		content: [
			{
				type: "text",
				text: `${prefix}: ${error}`,
			},
		],
		structuredContent: unexpected ? { error } : undefined,
	}
}
