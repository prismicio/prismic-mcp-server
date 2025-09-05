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

	async simulateUserQuery(prompt: string): Promise<SDKMessage[]> {
		console.info("AI Agent simulating user query...")
		const messages = await this.query({ prompt })
		console.info("AI Agent simulated user query completed.")

		return messages
	}

	async query({
		prompt,
		allowedTools,
		disallowedTools,
		additionalDirectories,
	}: {
		prompt: string
		allowedTools?: string[]
		disallowedTools?: string[]
		additionalDirectories?: string[]
	}): Promise<SDKMessage[]> {
		const messages: SDKMessage[] = []

		try {
			const response = claudeQuery({
				prompt,
				options: {
					cwd: this.projectRoot,
					abortController: new AbortController(),
					allowedTools: allowedTools || [
						"Bash",
						"Read",
						"Write",
						"FileSearch",
						"Grep",
						"Glob",
						"MultiEdit",
						"mcp__prismic__how_to_code_slice",
					],
					disallowedTools: disallowedTools || [],
					additionalDirectories: additionalDirectories || [],
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

	async gradeCode({
		generatedDir,
		referenceDir,
		threshold = 7,
		additionalInfo,
	}: {
		generatedDir: string
		referenceDir: string
		threshold?: 5 | 6 | 7 | 8 | 9
		additionalInfo?: string
	}): Promise<AIGrade> {
		const prompt = `
You are an expert reviewer for code using Prismic with Next.js/React.
ONLY inspect these two directories:
- GENERATED: ${generatedDir}
- REFERENCE: ${referenceDir}

Compare the GENERATED code to the REFERENCE code. Score on a 10-point scale.

Output STRICT JSON (no backticks, no prose) with this shape:
{
  "grade": <number>,
  "threshold": ${threshold},
  "pass": <boolean>,
  "summary": "<two-liner>"
}

${additionalInfo}
`

		console.info("AI Agent grading output...")
		const messages = await this.query({
			prompt,
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
			additionalDirectories: [referenceDir],
		})
		console.info("AI Agent graded output completed.")

		const resultText =
			messages.find(
				(message) => message.type === "result" && message.subtype === "success",
			)?.result || ""

		const match = resultText.match(/\{[\s\S]*\}$/)
		const json = match ? match[0] : resultText

		return JSON.parse(json)
	}
}

type AIGrade = {
	grade: number
	threshold: number
	pass: boolean
	summary: string
}

export function checkToolUsage({
	messages,
	toolName,
}: {
	messages: SDKMessage[]
	toolName: string
}): boolean {
	const toolCallMessage = messages.find(
		(message) =>
			message.type === "assistant" &&
			message.message.content[0].type === "tool_use" &&
			message.message.content[0].name === toolName,
	)

	return toolCallMessage !== undefined
}

export function isLLMConfigured(): boolean {
	return !!process.env.ANTHROPIC_API_KEY
}
