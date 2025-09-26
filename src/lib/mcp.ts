import type {
	McpServer,
	ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ZodRawShape } from "zod"

import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types"

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
] => args

export const prompt = <T extends Parameters<McpServer["prompt"]>>(
	...args: T
): T => args
