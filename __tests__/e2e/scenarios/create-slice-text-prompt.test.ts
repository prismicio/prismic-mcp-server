import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"

test("should check slice creation (model, code, mocks) based on user text prompt", async ({
	aiAgent,
	projectRoot,
}) => {
	const messages = await aiAgent.simulateUserQuery({
		prompt: `
Create a "Hero" slice

It should have:
- a title
- a description
- a list of CTA buttons with 2 variants (Primary, Secondary)
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
			"how_to_code_slice",
			"how_to_mock_slice",
			"verify_slice_mock",
		]),
	)

	const sliceDir = join(projectRoot, "/src/slices/Hero")
	const referenceDir = join(
		new URL(import.meta.url).pathname,
		"../../reference/slices/SlicifyHero/Hero",
	)

	const grade = await aiAgent.grade({
		generatedPath: sliceDir,
		referencePath: referenceDir,
		instructions: `
Grade the quality of the generated Hero slice.

Focus on:
- model
  -- Same number of fields is important
  -- Field types should be the same (e.g., Text, StructuredText, Image, Link)
  -- Field names should be semantically similar
  -- Field configurations should be functionally similar
  -- Order of fields is not important
- code 
  -- don't grade at all the styling but functionality should be the same
  -- usage of Prismic components should be the same 
- mocks
  -- structure is roughly the same
  -- text should be the same
`,
	})

	console.info("Grade:", grade)
	expect(grade.score).toBeGreaterThan(6)
})
