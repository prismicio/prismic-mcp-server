import { rmSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"

test.describe("how_to_mock_slice tool - Used by AI agent", () => {
	test("should check slice mock generation based on user text prompt", async ({
		aiAgent,
		projectRoot,
	}) => {
		// Remove the Hero slice mock file
		rmSync(join(projectRoot, "/src/slices/Hero/mocks.json"))

		const messages = await aiAgent.simulateUserQuery({
			prompt: `Create the mocks for the "Hero" slice`,
		})
		expect(messages.length).toBeGreaterThan(0)

		const toolsUsed = getPrismicMcpTools({
			messages,
		})
		expect(toolsUsed).toEqual(["how_to_mock_slice", "verify_slice_mock"])
		expect(toolsUsed).toHaveLength(2)

		const sliceFile = join(projectRoot, "/src/slices/Hero/mocks.json")
		const referenceFile = join(
			new URL(import.meta.url).pathname,
			"../../reference/slices/SlicifyHero/Hero/mocks.json",
		)

		const grade = await aiAgent.grade({
			generatedPath: sliceFile,
			referencePath: referenceFile,
			instructions: `
Grade the quality of the generated Hero slice mocks.

Focus on:
- mocks
  -- structure is roughly the same
  -- it's ok is any mock value is totally different
`,
		})

		console.info("Grade:", grade)
		expect(grade.score).toBeGreaterThan(7)
	})
})
