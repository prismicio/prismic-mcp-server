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

	async query(prompt: string): Promise<SDKMessage[]> {
		const messages: SDKMessage[] = []

		console.info("AI Agent working...")
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
					model: "haiku",
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
				if (process.env.DEBUG_MODE === "true") {
					console.info("Claude message received:", {
						type: message.type || "unknown",
						fullMessage: JSON.stringify(message, null, 2),
					})
				}
				messages.push(message)
			}

			console.info("AI Agent completed.")

			return messages
		} catch (error) {
			console.error("Error during Claude Code query:", error)
			throw error
		}
	}
}

export function isLLMConfigured(): boolean {
	return !!process.env.ANTHROPIC_API_KEY
}
