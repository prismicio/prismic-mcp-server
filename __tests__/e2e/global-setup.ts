import { randomUUID } from "crypto"
import { downloadTemplate } from "giget"
import { tmpdir } from "os"
import { join } from "path"

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
}

export default globalSetup
