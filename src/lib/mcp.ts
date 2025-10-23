import type {
	McpServer,
	PromptCallback,
	ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js"
import type { ZodRawShape } from "zod"

import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types"

export const resource = <T extends Parameters<McpServer["resource"]>>(
	...args: T
): T => args

type ToolArgs<Args extends ZodRawShape> = [
	name: string,
	description: string,
	paramsSchemaOrAnnotations: Args | ToolAnnotations,
	cb: ToolCallback<Args>,
]
export const tool = <Args extends ZodRawShape>(
	...args: ToolArgs<Args>
): ToolArgs<Args> => args

type PromptArgs<Args extends ZodRawShape> = [
	name: string,
	description: string,
	argsSchema: Args,
	cb: PromptCallback<Args>,
]
export const prompt = <Args extends ZodRawShape>(
	...args: PromptArgs<Args>
): PromptArgs<Args> => args
