import { execSync } from "child_process"
import { randomUUID } from "crypto"
import { cpSync, mkdirSync, rmSync } from "fs"
import { join } from "path"

import { TEMPLATE_DIR } from "../global-setup"

export class ProjectSetup {
	private tempDir: string | null = null

	async setupProject(testTitle: string): Promise<string> {
		const templateCache = process.env.TEMPLATE_CACHE_DIR
		if (!templateCache) {
			throw new Error("Template cache not found. Global setup may have failed.")
		}

		// Create individual test copy
		this.tempDir = join(
			TEMPLATE_DIR,
			`prismic-mcp-test-${testTitle.replace(/ /g, "-")}-${randomUUID()}`,
		)
		mkdirSync(this.tempDir, { recursive: true })
		cpSync(templateCache, this.tempDir, { recursive: true })
		rmSync(join(this.tempDir, "/src/slices/Hero"), { recursive: true })
		execSync("npm install", { cwd: this.tempDir })

		return this.tempDir
	}

	async cleanup(): Promise<void> {
		if (this.tempDir && !process.env.NO_CLEANUP) {
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
		if (templateCache && !process.env.NO_CLEANUP) {
			try {
				console.info("Cleaning up template cache...")
				rmSync(templateCache, { recursive: true, force: true })
				delete process.env.TEMPLATE_CACHE_DIR
			} catch (error) {
				console.warn("Failed to cleanup template cache:", error)
			}
		}
	}
}
