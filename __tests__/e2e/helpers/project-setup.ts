import { randomUUID } from "crypto"
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

export class ProjectSetup {
	private tempDir: string | null = null

	async setupProject(): Promise<string> {
		const templateCache = process.env.TEMPLATE_CACHE_DIR
		if (!templateCache) {
			throw new Error("Template cache not found. Global setup may have failed.")
		}

		// Create individual test copy
		this.tempDir = join(tmpdir(), `prismic-mcp-test-${randomUUID()}`)
		mkdirSync(this.tempDir, { recursive: true })
		this.copyDirectory(templateCache, this.tempDir)

		return this.tempDir
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

	// Call this in global teardown to cleanup the template cache
	static async cleanupTemplate(): Promise<void> {
		const templateCache = process.env.TEMPLATE_CACHE_DIR
		if (templateCache) {
			try {
				console.info("Cleaning up template cache...")
				rmSync(templateCache, { recursive: true, force: true })
				delete process.env.TEMPLATE_CACHE_DIR
			} catch (error) {
				console.warn("Failed to cleanup template cache:", error)
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
