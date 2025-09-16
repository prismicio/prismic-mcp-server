import { cpSync, readFileSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"

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
