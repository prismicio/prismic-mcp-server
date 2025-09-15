import { cpSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"

test.describe("generate_types tool - Used by AI agent", () => {
	test("should check slice types generation", async ({
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

		const messages = await aiAgent.simulateUserQuery({
			prompt: `Generate prismic types`,
		})
		expect(messages.length).toBeGreaterThan(0)

		const toolsUsed = getPrismicMcpTools({
			messages,
		})
		expect(toolsUsed).toEqual(expect.arrayContaining(["generate_types"]))

		const sliceFile = join(projectRoot, "prismicio-types.d.ts")
		const referenceFile = join(
			new URL(import.meta.url).pathname,
			"../../reference/slices/SlicifyHero/prismicio-types.d.ts",
		)

		const grade = await aiAgent.grade({
			generatedPath: sliceFile,
			referencePath: referenceFile,
			instructions: `
Grade the quality of the generated prismic types.

The two files should have the same exports, types, etc.
Don't base the grade on formatting, comments, spaces and ordering.
`,
		})

		console.info("Grade:", grade)
		expect(grade.score).toBeGreaterThan(7)
	})
})
