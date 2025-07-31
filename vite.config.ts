import { defineConfig } from "vite"
import sdk from "vite-plugin-sdk"

import pkg from "./package.json"

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
		__PACKAGE_VERSION__: JSON.stringify(pkg.version),
	},
})
