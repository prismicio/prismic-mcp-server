import { cpSync, readFileSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"
import { callTool } from "../helpers/mcp-client"

test.describe("add_slice_to_custom_type tool - Used by AI agent", () => {
	test("should add a slice to a custom type and regenerate types", async ({
		aiAgent,
		projectRoot,
	}) => {
		cpSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyJobList/JobList",
			),
			join(projectRoot, "/src/slices/JobList"),
			{ recursive: true },
		)

		const messages = await aiAgent.simulateUserQuery({
			prompt: `Can you help me add the JobList slice to the Page custom type?`,
		})
		expect(messages.length).toBeGreaterThan(0)

		const toolsUsed = getPrismicMcpTools({
			messages,
		})
		expect(toolsUsed).toEqual(
			expect.arrayContaining(["add_slice_to_custom_type", "generate_types"]),
		)

		const pageCustomTypePath = join(projectRoot, "/customtypes/page/index.json")
		const pageCustomTypeContent = readFileSync(pageCustomTypePath, "utf-8")
		expect(pageCustomTypeContent).toContain("job_list")

		const typesPath = join(projectRoot, "/prismicio-types.d.ts")
		const typesContent = readFileSync(typesPath, "utf-8")
		const slicesTypeMatch = typesContent.match(
			/type PageDocumentDataSlicesSlice[^;]*\/\*/s,
		)
		expect(slicesTypeMatch).toBeTruthy()
		expect(slicesTypeMatch![0]).toContain("JobListSlice")
	})
})

test.describe("add_slice_to_custom_type tool - Calling Tool", () => {
	test("should add a slice to a custom type and regenerate types", async ({
		projectRoot,
	}) => {
		cpSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyJobList/JobList",
			),
			join(projectRoot, "/src/slices/JobList"),
			{ recursive: true },
		)

		const sliceDirectoryAbsolutePath = join(projectRoot, "/src/slices/JobList")
		const customTypeDirectoryAbsolutePath = join(
			projectRoot,
			"/customtypes/page",
		)
		const result = await callTool("add_slice_to_custom_type", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"/slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			customTypeDirectoryAbsolutePath,
		})

		await expect(
			result
				.replace(sliceDirectoryAbsolutePath, "{base_path}")
				.replace(customTypeDirectoryAbsolutePath, "{base_path}"),
		).toMatchSnapshot("happy-path.txt")
	})

	test("should handle slice already exists scenario", async ({
		projectRoot,
	}) => {
		const sliceDirectoryAbsolutePath = join(
			projectRoot,
			"/src/slices/ImageCards",
		)
		const customTypeDirectoryAbsolutePath = join(
			projectRoot,
			"/customtypes/page",
		)
		const result = await callTool("add_slice_to_custom_type", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"/slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			customTypeDirectoryAbsolutePath,
		})

		await expect(result).toMatchSnapshot("slice-already-exists.txt")
	})

	test("should add a slice field if the custom type does not have one", async ({
		projectRoot,
	}) => {
		const sliceDirectoryAbsolutePath = join(
			projectRoot,
			"/src/slices/ImageCards",
		)
		const customTypeDirectoryAbsolutePath = join(
			projectRoot,
			"/customtypes/settings",
		)

		const settingsCustomTypePath = join(
			customTypeDirectoryAbsolutePath,
			"/index.json",
		)
		const settingsCustomTypeContent = readFileSync(
			settingsCustomTypePath,
			"utf-8",
		)
		expect(settingsCustomTypeContent).not.toContain("slices")

		const result = await callTool("add_slice_to_custom_type", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"/slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			customTypeDirectoryAbsolutePath,
		})

		const updatedSettingsCustomTypeContent = readFileSync(
			settingsCustomTypePath,
			"utf-8",
		)
		expect(updatedSettingsCustomTypeContent).toContain("slices")

		await expect(
			result
				.replaceAll(sliceDirectoryAbsolutePath, "{base_path}")
				.replaceAll(customTypeDirectoryAbsolutePath, "{base_path}"),
		).toMatchSnapshot("slice-zone-added.txt")
	})

	test("should handle missing slice model file", async ({ projectRoot }) => {
		const sliceDirectoryAbsolutePath = join(
			projectRoot,
			"/src/slices/Testimonials", // Doesn't exist
		)
		const customTypeDirectoryAbsolutePath = join(
			projectRoot,
			"/customtypes/settings",
		)
		const result = await callTool("add_slice_to_custom_type", {
			sliceMachineConfigAbsolutePath: join(
				projectRoot,
				"/slicemachine.config.json",
			),
			sliceDirectoryAbsolutePath,
			customTypeDirectoryAbsolutePath,
		})

		await expect(
			result.replaceAll(sliceDirectoryAbsolutePath, "{base_path}"),
		).toMatchSnapshot("missing-slice-model.txt")
	})
})
