import { execSync } from "child_process"
import { randomUUID } from "crypto"
import dotenv from "dotenv"
import { downloadTemplate } from "giget"
import { tmpdir } from "os"
import path, { join } from "path"
import { fileURLToPath } from "url"

import { isLLMConfigured } from "./helpers/ai-agent"

dotenv.config({ path: "__tests__/e2e/.env", override: true })

async function globalSetup(): Promise<void> {
	const templateDir = join(tmpdir(), `prismic-starter-${randomUUID()}`)

	console.info("Downloading Prismic starter template...")
	await downloadTemplate(
		"github:prismicio-community/nextjs-starter-prismic-multi-page#master",
		{
			dir: templateDir,
			offline: false,
			force: true,
		},
	)

	// Store path in environment for tests to access
	process.env.TEMPLATE_CACHE_DIR = templateDir
	console.info("Template downloaded and cached")

	if (!isLLMConfigured()) {
		// Fail fast in CI if LLM is not configured - prevents silent test skipping
		if (process.env.GITHUB_ACTIONS) {
			throw new Error(
				"LLM provider key is required in CI environments. Please configure the API key in your CI environment variables.",
			)
			// Give warnings locally if LLM is not configured, so that non-LLM tests will still run
		} else {
			console.warn(
				"LLM provider key not set. AI agent simulation tests will be skipped. To run AI tests locally, set the LLM provider API key environment variable.",
			)
		}
	} else {
		console.info("LLM provider key found. AI agent simulation tests will run.")
	}

	// Build local MCP server
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	process.env.MCP_SERVER_ROOT = path.join(__dirname, "../../")

	try {
		console.info("Building local MCP server...")
		execSync("npm run build", {
			cwd: process.env.MCP_SERVER_ROOT,
			stdio: "pipe", // Use pipe to avoid cluttering test output
		})
		console.info("Local MCP server built successfully")
	} catch (error) {
		throw new Error(`Local MCP server built failed: ${error}`)
	}
}

export default globalSetup
