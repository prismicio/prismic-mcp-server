import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"

test.describe("create slice scenario", () => {
	test("should verify slice creation with correct tools usage", async ({
		aiAgent,
		projectRoot,
	}) => {
		const userPrompt = `
Create a "Testimonials" slice (model, code, mocks)

It should have a section heading and a list of testimonials with the following:
- image
- name
- review
- company
- rating
`
		const messages = await aiAgent.simulateUserQuery(userPrompt)
		expect(messages.length).toBeGreaterThan(0)

		const toolsUsed = getPrismicMcpTools({
			messages,
		})
		expect(toolsUsed).toHaveLength(6)
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

		const sliceDir = join(projectRoot, "/src/slices/Testimonials/index.tsx")
		const referenceDir = join(
			new URL(import.meta.url).pathname,
			"../../reference/slices/Testimonials/index.tsx",
		)

		const grade = await aiAgent.grade({
			generatedPath: sliceDir,
			referencePath: referenceDir,
			instructions: `
Grade the quality of the generated Testimonials slice (model, code, mocks).
You can be flexible about the exact field names, just make sure they make sense.
`,
		})

		console.info("Grade:", grade)
		expect(grade.score).toBeGreaterThan(7)
	})
})
