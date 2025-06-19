import { defineConfig } from "vite"
import sdk from "vite-plugin-sdk"

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
})
