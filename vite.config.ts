import { readFileSync } from "fs"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"
import { defineConfig } from "vite"
import sdk from "vite-plugin-sdk"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJson = JSON.parse(
	readFileSync(resolve(__dirname, "package.json"), "utf-8"),
)

export default defineConfig({
	build: {
		lib: {
			entry: {
				index: "./src/index.ts",
				stdio: "./src/stdio.ts",
			},
		},
	},
	plugins: [sdk()],
	test: {
		coverage: {
			provider: "v8",
			reporter: ["lcovonly", "text"],
		},
		setupFiles: ["./test/__setup__.ts"],
	},
	define: {
		__PACKAGE_VERSION__: JSON.stringify(packageJson.version),
	},
})
