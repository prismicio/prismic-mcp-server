import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"

test.describe("how_to_model_slice tool - Used by AI agent", () => {
	test("should check slice model generation based on user text prompt", async ({
		aiAgent,
		projectRoot,
	}) => {
		const messages = await aiAgent.simulateUserQuery({
			prompt: `
Create the model for the "Hero" slice

It should have:
- a title
- a description
- a CTA link
- an anchor
`,
		})
		expect(messages.length).toBeGreaterThan(0)

		const toolsUsed = getPrismicMcpTools({
			messages,
		})
		expect(toolsUsed).toEqual(
			expect.arrayContaining([
				"how_to_model_slice",
				"verify_slice_model",
				"generate_types",
			]),
		)

		const sliceFile = join(projectRoot, "/src/slices/Hero/model.json")
		const referenceFile = join(
			new URL(import.meta.url).pathname,
			"../../reference/slices/SlicifyHero/Hero/model.json",
		)

		const grade = await aiAgent.grade({
			generatedPath: sliceFile,
			referencePath: referenceFile,
			instructions: `
Grade the quality of the generated Hero slice model.

Focus on:
- model 
  -- Same number of fields is important
  -- Field types should be the same (e.g., Text, StructuredText, Image, Link)
  -- Field names should be similar
  -- Field configurations should be functionally similar
  -- Order of fields is not important
`,
		})

		console.info("Grade:", grade)
		expect(grade.score).toBeGreaterThan(7)
	})
})
