import { type ChildProcess, spawn } from "child_process"

interface ToolCallRequest {
	jsonrpc: "2.0"
	id: string
	method: "tools/call"
	params: { name: string; arguments: Record<string, unknown> }
}

interface ToolCallResponse {
	jsonrpc: "2.0"
	id: string
	result?: {
		content: Array<{
			type: string
			text: string
		}>
	}
	error?: {
		message: string
	}
}

export class McpClient {
	private process: ChildProcess | null = null

	async start(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.process = spawn("node", ["bin/stdio.js"], {
				stdio: ["pipe", "pipe", "pipe"],
				cwd: process.cwd(),
			})

			this.process.on("error", reject)

			// Give the server time to start
			setTimeout(resolve, 1000)
		})
	}

	async stop(): Promise<void> {
		this.process?.kill()
		this.process = null
	}

	async callTool(
		toolName: "how_to_code_slice",
		args: Record<string, unknown>,
	): Promise<string> {
		if (!this.process?.stdin) {
			throw new Error("Server not running")
		}

		const request: ToolCallRequest = {
			jsonrpc: "2.0",
			id: "test-1",
			method: "tools/call",
			params: { name: toolName, arguments: args },
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Timeout")), 15000)
			let responseData = ""

			const dataHandler = (data: Buffer) => {
				responseData += data.toString()

				const lines = responseData.split("\n")
				// Remove and store the last line, which is potentially incomplete
				responseData = lines.pop() || ""

				for (const line of lines) {
					if (line.trim()) {
						try {
							const response: ToolCallResponse = JSON.parse(line)
							if (response.id === "test-1") {
								clearTimeout(timeout)
								this.process!.stdout!.off("data", dataHandler)

								if (response.error) {
									reject(new Error(response.error.message))
								} else {
									// Combine all content text
									const content = response.result?.content || []
									const text = content
										.filter((item) => item.type === "text")
										.map((item) => item.text)
										.join("\n")
									resolve(text)
								}
							}
						} catch {
							// Ignore parsing errors for incomplete messages
						}
					}
				}
			}

			this.process!.stdout!.on("data", dataHandler)
			this.process!.stdin!.write(JSON.stringify(request) + "\n")
		})
	}
}
