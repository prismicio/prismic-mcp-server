import { copyFileSync, cpSync, rmSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { callTool } from "../helpers/mcp-client"

test.describe("save_slice_model tool - Calling Tool", () => {
	test("should check a valid model.json file", async ({ projectRoot }) => {
		cpSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/Hero",
			),
			join(projectRoot, "/src/slices/Hero"),
			{ recursive: true },
		)

		const sliceDirectoryAbsolutePath = join(projectRoot, "src/slices/Hero")
		const result = await callTool("save_slice_model", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			isNewSlice: false,
		})

		await expect(
			result.replace(sliceDirectoryAbsolutePath, "{base_path}"),
		).toMatchSnapshot("valid-model.txt")
	})

	test("should check an invalid model.json file", async ({ projectRoot }) => {
		cpSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/Hero",
			),
			join(projectRoot, "/src/slices/Hero"),
			{ recursive: true },
		)
		rmSync(join(projectRoot, "/src/slices/Hero/model.json"))
		copyFileSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/model-invalid.json",
			),
			join(projectRoot, "/src/slices/Hero/model.json"),
		)

		const sliceDirectoryAbsolutePath = join(projectRoot, "src/slices/Hero")
		const result = await callTool("save_slice_model", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			isNewSlice: false,
		})

		await expect(
			result.replace(sliceDirectoryAbsolutePath, "{base_path}"),
		).toMatchSnapshot("invalid-model.txt")
	})
})
