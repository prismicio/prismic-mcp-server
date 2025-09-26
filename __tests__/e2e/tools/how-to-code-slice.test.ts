import { copyFileSync, cpSync, rmSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"
import { callTool } from "../helpers/mcp-client"

test.describe("how_to_code_slice tool - Used by AI agent", () => {
	test("should check slice code generation based on user text prompt", async ({
		aiAgent,
		projectRoot,
	}) => {
		cpSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/Hero",
			),
			join(projectRoot, "/src/slices/Hero"),
			{ recursive: true },
		)
		copyFileSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/prismicio-types.d.ts",
			),
			join(projectRoot, "prismicio-types.d.ts"),
		)
		rmSync(join(projectRoot, "/src/slices/Hero/index.tsx"))
		copyFileSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/SlicifyHero/index-placeholder.tsx",
			),
			join(projectRoot, "/src/slices/Hero/index.tsx"),
		)

		const messages = await aiAgent.simulateUserQuery({
			prompt: `Code the "Hero" slice`,
		})
		expect(messages.length).toBeGreaterThan(0)

		const toolsUsed = getPrismicMcpTools({
			messages,
		})
		expect(toolsUsed).toEqual(expect.arrayContaining(["how_to_code_slice"]))

		const sliceFile = join(projectRoot, "/src/slices/Hero/index.tsx")
		const referenceFile = join(
			new URL(import.meta.url).pathname,
			"../../reference/slices/SlicifyHero/Hero/index.tsx",
		)

		const grade = await aiAgent.grade({
			generatedPath: sliceFile,
			referencePath: referenceFile,
			instructions: `
Grade the quality of the generated Hero slice code.

Focus on:
- code 
  -- don't grade at all the styling
  -- don't grade at all the code structure
  -- ONLY grade the usage of Prismic components that should be the same
`,
		})

		console.info("Grade:", grade)
		expect(grade.score).toBeGreaterThan(6)
	})
})

test.describe("how_to_code_slice tool - Calling Tool", () => {
	test("should handle missing parameters gracefully", async () => {
		try {
			await callTool("how_to_code_slice", {
				projectFramework: "next",
			})
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
		}
	})

	test("should handle image field", async () => {
		const result = await callTool("how_to_code_slice", {
			projectFramework: "next",
			stylingSystem: "tailwind",
			modelAbsolutePath: "/src/slices/Hero/model.json",
			sliceMachineConfigAbsolutePath: "/slicemachine.config.json",
			fieldsUsed: ["prismic.ImageField"],
		})
		expect(result).toContain(
			"Only apply imgix transformation when explicitly requested by the user.",
		)
	})
})
