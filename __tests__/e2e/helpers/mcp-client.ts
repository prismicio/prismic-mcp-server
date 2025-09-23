import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

export async function callTool(
	toolName:
		| "how_to_code_slice"
		| "how_to_model_slice"
		| "save_slice_model"
		| "how_to_mock_slice"
		| "verify_slice_mock",
	args: Record<string, unknown>,
): Promise<string> {
	const transport = new StdioClientTransport({
		command: "node",
		args: ["bin/stdio.js"],
		cwd: process.cwd(),
		stderr: "pipe",
	})

	const client = new Client({ name: "e2e-client", version: "0.0.0" })
	await client.connect(transport)

	try {
		const result = await client.callTool({ name: toolName, arguments: args })

		return JSON.stringify(result, null, 2)
	} finally {
		await client.close()
		await transport.close?.()
	}
}
