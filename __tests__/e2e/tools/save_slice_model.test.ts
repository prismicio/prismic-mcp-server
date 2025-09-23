import { readFileSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { callTool } from "../helpers/mcp-client"

test.describe("save_slice_model tool - Calling Tool", () => {
	test("should check a valid model input", async ({ projectRoot }) => {
		const model = JSON.parse(
			readFileSync(
				join(
					new URL(import.meta.url).pathname,
					"../../reference/slices/SlicifyHero/Hero/model.json",
				),
				{ encoding: "utf8" },
			),
		)

		const sliceDirectoryAbsolutePath = join(projectRoot, "src/slices/Hero")
		const result = await callTool("save_slice_model", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			isNewSlice: true,
			model,
		})

		expect(
			result.replace(sliceDirectoryAbsolutePath, "{base_path}"),
		).toMatchSnapshot("valid-model.txt")
	})

	test("should check an invalid model input", async ({ projectRoot }) => {
		const model = JSON.parse(
			readFileSync(
				join(
					new URL(import.meta.url).pathname,
					"../../reference/slices/SlicifyHero/Hero/model-invalid.json",
				),
				{ encoding: "utf8" },
			),
		)

		const sliceDirectoryAbsolutePath = join(projectRoot, "src/slices/Hero")
		const result = await callTool("save_slice_model", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			isNewSlice: true,
			model,
		})

		expect(
			result.replace(sliceDirectoryAbsolutePath, "{base_path}"),
		).toMatchSnapshot("invalid-model.txt")
	})
})
