import { copyFileSync, cpSync, rmSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { callTool } from "../helpers/mcp-client"

test.describe("verify_slice_mock tool - Calling Tool", () => {
	test("should check a valid mocks.json file", async ({ projectRoot }) => {
		cpSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/Hero",
			),
			join(projectRoot, "/src/slices/Hero"),
			{ recursive: true },
		)

		const result = await callTool("verify_slice_mock", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath: join(projectRoot, "src/slices/Hero"),
		})

		await expect(result).toMatchSnapshot("valid-mocks.txt")
	})

	test("should check an invalid mocks.json file", async ({ projectRoot }) => {
		cpSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/Hero",
			),
			join(projectRoot, "/src/slices/Hero"),
			{ recursive: true },
		)
		rmSync(join(projectRoot, "/src/slices/Hero/mocks.json"))
		copyFileSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/mocks-invalid.json",
			),
			join(projectRoot, "/src/slices/Hero/mocks.json"),
		)

		const result = await callTool("verify_slice_mock", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath: join(projectRoot, "src/slices/Hero"),
		})

		await expect(result).toMatchSnapshot("invalid-mocks.txt")
	})
})
