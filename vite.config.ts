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
		passWithNoTests: true,
	},
	define: {
		__PACKAGE_VERSION__: JSON.stringify(pkg.version),
	},
})
