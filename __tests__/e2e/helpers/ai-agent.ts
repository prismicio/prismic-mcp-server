import {
	type SDKMessage,
	query as claudeQuery,
} from "@anthropic-ai/claude-code"
import path from "path"

export class AIAgent {
	private projectRoot: string

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot
	}

	async simulateUserQuery({
		prompt,
	}: {
		prompt: string
	}): Promise<SDKMessage[]> {
		const messages: SDKMessage[] = []

		console.info("AI Agent simulating user query...")
		try {
			const response = claudeQuery({
				prompt,
				options: {
					cwd: this.projectRoot,
					abortController: new AbortController(),
					allowedTools: [
						"Bash",
						"Read",
						"Write",
						"FileSearch",
						"Grep",
						"Glob",
						"MultiEdit",
						"mcp__prismic__how_to_code_slice",
					],
					permissionMode: "bypassPermissions",
					model: "sonnet",
					mcpServers: {
						prismic: {
							command: "node",
							args: [
								path.join(process.env.MCP_SERVER_ROOT || "", "bin/stdio.js"),
							],
						},
					},
				},
			})

			for await (const message of response) {
				debugConsoleLog(message)
				messages.push(message)
			}

			console.info("AI Agent simulated user query completed.")

			return messages
		} catch (error) {
			console.error("Error during Claude Code query:", error)
			throw error
		}
	}

	async grade({
		generatedPath,
		referencePath,
		instructions,
	}: {
		generatedPath: string
		referencePath: string
		instructions?: string
	}): Promise<Grade> {
		const prompt = `
You are an expert reviewer assigned to a task.
ONLY inspect these two paths:
- GENERATED: ${generatedPath}
- REFERENCE: ${referencePath}

Compare the GENERATED with the REFERENCE. Score on a 10-point scale.

Instructions: ${instructions}

Output STRICT JSON (no backticks, no prose) with this shape:
{
  "score": <number>,
  "summary": "<two-liner>"
}
`
		const messages: SDKMessage[] = []

		console.info("AI Agent grading output...")
		try {
			const response = claudeQuery({
				prompt,
				options: {
					cwd: this.projectRoot,
					abortController: new AbortController(),
					allowedTools: ["Read", "Glob", "Grep"],
					disallowedTools: [
						"Bash",
						"Edit",
						"MultiEdit",
						"Write",
						"WebFetch",
						"WebSearch",
						"Task",
						"TodoWrite",
						"NotebookRead",
						"NotebookEdit",
						"LS",
					],
					additionalDirectories: [referencePath],
					permissionMode: "bypassPermissions",
					model: "sonnet",
				},
			})

			for await (const message of response) {
				debugConsoleLog(message)
				messages.push(message)
			}

			console.info("AI Agent graded output completed.")

			const resultText =
				messages.find(
					(message) =>
						message.type === "result" && message.subtype === "success",
				)?.result || ""

			const match = resultText.match(/\{[\s\S]*\}$/)
			const json = match ? match[0] : resultText

			return JSON.parse(json)
		} catch (error) {
			console.error("Error during Claude Code query:", error)
			throw error
		}
	}
}

type Grade = {
	score: number
	summary: string
}

export function getPrismicMcpTools({
	messages,
}: {
	messages: SDKMessage[]
}): string[] {
	const prismicMcpToolSet = new Set<string>()

	for (const message of messages) {
		if (
			message.type === "assistant" &&
			message.message.content[0]?.type === "tool_use"
		) {
			const toolName = message.message.content[0].name
			if (toolName.startsWith("mcp__prismic__")) {
				const cleanToolName = toolName.replace("mcp__prismic__", "")
				prismicMcpToolSet.add(cleanToolName)
			}
		}
	}

	return Array.from(prismicMcpToolSet)
}

export function isLLMConfigured(): boolean {
	return !!process.env.AWS_BEARER_TOKEN_BEDROCK
}

const debugConsoleLog = (message: SDKMessage) => {
	if (process.env.DEBUG_MODE === "true") {
		console.info("Claude message received:", {
			type: message.type || "unknown",
			fullMessage: JSON.stringify(message, null, 2),
		})
	}
}
