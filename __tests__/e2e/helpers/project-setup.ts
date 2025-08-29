import { randomUUID } from "crypto"
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface ProjectPaths {
	root: string
	modelJson: string
	slicemachineConfig: string
	prismicioTypes: string
}

export class ProjectSetup {
	private tempDir: string | null = null

	async setupProject(): Promise<ProjectPaths> {
		const fixturePath = join(__dirname, "..", "projects", "multi-page-starter")
		this.tempDir = join(tmpdir(), `prismic-mcp-test-${randomUUID()}`)

		mkdirSync(this.tempDir, { recursive: true })

		this.copyDirectory(fixturePath, this.tempDir)

		return {
			root: this.tempDir,
			modelJson: join(this.tempDir, "src", "slices", "hero", "model.json"),
			slicemachineConfig: join(this.tempDir, "slicemachine.config.json"),
			prismicioTypes: join(this.tempDir, "prismicio-types.d.ts"),
		}
	}

	async cleanup(): Promise<void> {
		if (this.tempDir) {
			try {
				rmSync(this.tempDir, { recursive: true, force: true })
			} catch (error) {
				console.warn(
					`Failed to cleanup temporary directory ${this.tempDir}:`,
					error,
				)
			} finally {
				this.tempDir = null
			}
		}
	}

	private copyDirectory(src: string, dest: string): void {
		const entries = readdirSync(src, { withFileTypes: true })

		for (const entry of entries) {
			const srcPath = join(src, entry.name)
			const destPath = join(dest, entry.name)

			if (entry.isDirectory()) {
				mkdirSync(destPath, { recursive: true })
				this.copyDirectory(srcPath, destPath)
			} else {
				copyFileSync(srcPath, destPath)
			}
		}
	}
}
