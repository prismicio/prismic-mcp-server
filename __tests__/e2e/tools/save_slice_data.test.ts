import { readFileSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { callTool } from "../helpers/mcp-client"

test.describe("save_slice_data tool - Calling Tool", () => {
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

		const libraryAbsolutePath = join(projectRoot, "src/slices")
		const sliceAbsolutePath = join(libraryAbsolutePath, "Hero")

		const toolProps = {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceAbsolutePath,
			data: { model },
		}

		const createResult = await callTool("save_slice_data", {
			...toolProps,
			isNewSlice: true,
		})

		expect(
			createResult.replace(sliceAbsolutePath, "{base_path}"),
		).toMatchSnapshot("valid-model-create.txt")

		const updateResult = await callTool("save_slice_data", {
			...toolProps,
			isNewSlice: false,
		})

		expect(
			updateResult.replace(sliceAbsolutePath, "{base_path}"),
		).toMatchSnapshot("valid-model-update.txt")
	})

	test("should check an invalid model input", async ({ projectRoot }) => {
		const model = JSON.parse(
			readFileSync(
				join(
					new URL(import.meta.url).pathname,
					"../../reference/slices/SlicifyHero/model-invalid.json",
				),
				{ encoding: "utf8" },
			),
		)

		const libraryAbsolutePath = join(projectRoot, "src/slices")
		const sliceAbsolutePath = join(libraryAbsolutePath, "Hero")
		const result = await callTool("save_slice_data", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceAbsolutePath,
			isNewSlice: true,
			data: { model },
		})

		expect(result.replace(sliceAbsolutePath, "{base_path}")).toMatchSnapshot(
			"invalid-model.txt",
		)
	})
})
