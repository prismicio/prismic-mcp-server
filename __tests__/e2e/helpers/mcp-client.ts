import { spawn } from "child_process"

export async function callTool(
	toolName: string,
	args: Record<string, unknown>,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const inspectorArgs = [
			"@modelcontextprotocol/inspector",
			"--cli",
			"node",
			"bin/stdio.js",
			"--method",
			"tools/call",
			"--tool-name",
			toolName,
		]

		Object.entries(args).forEach(([key, value]) => {
			const serializedValue =
				typeof value === "object" ? JSON.stringify(value) : String(value)
			inspectorArgs.push("--tool-arg", `${key}=${serializedValue}`)
		})

		const inspectorProcess = spawn("npx", inspectorArgs, {
			stdio: ["pipe", "pipe", "pipe"],
			cwd: process.cwd(),
		})

		let stdout = ""
		let stderr = ""

		inspectorProcess.stdout?.on("data", (data: Buffer) => {
			stdout += data.toString()
		})

		inspectorProcess.stderr?.on("data", (data: Buffer) => {
			stderr += data.toString()
		})

		inspectorProcess.on("close", (code: number) => {
			if (code === 0) {
				try {
					const response = JSON.parse(stdout.trim())

					const text =
						response.content
							?.filter(
								(item: { type: string; text: string }) => item.type === "text",
							)
							?.map((item: { type: string; text: string }) =>
								unescapeString(item.text),
							)
							?.join("\n") || stdout.trim()
					resolve(text)
				} catch {
					// If JSON parsing fails, try to handle the raw stdout as if it's already escaped content
					const unescapedStdout = unescapeString(stdout.trim())
					resolve(unescapedStdout)
				}
			} else {
				reject(new Error(`Inspector failed with code ${code}: ${stderr}`))
			}
		})

		inspectorProcess.on("error", (error) => {
			reject(error)
		})
	})
}

const unescapeString = (str: string): string => {
	let result = str

	// Handle double-escaped sequences first
	result = result.replace(/\\\\"/g, '"') // \\\" -> "
	result = result.replace(/\\\\n/g, "\n") // \\\\n -> \n
	result = result.replace(/\\\\t/g, "\t") // \\\\t -> \t
	result = result.replace(/\\\\r/g, "\r") // \\\\r -> \r
	result = result.replace(/\\\\\\\\/g, "\\") // \\\\\\ -> \\

	// Then handle single-escaped sequences
	result = result.replace(/\\"/g, '"') // \" -> "
	result = result.replace(/\\n/g, "\n") // \n -> \n
	result = result.replace(/\\t/g, "\t") // \t -> \t
	result = result.replace(/\\r/g, "\r") // \r -> \r
	result = result.replace(/\\\\/g, "\\") // \\ -> \

	return result
}
