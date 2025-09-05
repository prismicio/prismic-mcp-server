import { join } from "path"

import { expect, test } from "../fixtures/test"
import { checkToolUsage, isLLMConfigured } from "../helpers/ai-agent"
import { callTool } from "../helpers/mcp-client"

test.describe("how_to_code_slice tool", () => {
	test("should be used by an AI Agent to create a simple slice", async ({
		aiAgent,
		projectRoot,
	}) => {
		test.skip(!isLLMConfigured(), "Skip this test if the LLM is not configured")
		test.setTimeout(300_000) // 5 minutes

		const userPrompt = `
Can you help me make a "Testimonials" slice?
It should have a section heading and a list of testimonials with the following:
- image
- name
- review
- company
- rating
`
		const messages = await aiAgent.simulateUserQuery(userPrompt)

		expect(messages.length).toBeGreaterThan(0)

		const wasToolUsed = checkToolUsage({
			messages,
			toolName: "mcp__prismic__how_to_code_slice",
		})
		expect(wasToolUsed).toBe(true)

		const sliceDir = join(projectRoot, "/src/slices/Testimonials")
		const referenceDir = join(
			new URL(import.meta.url).pathname,
			"../../reference/slices/Testimonials",
		)
		const grade = await aiAgent.gradeCode({
			generatedDir: sliceDir,
			referenceDir,
			threshold: 7,
		})
		console.info("Grade:", grade)
		expect(grade.pass).toBe(true)
	})

	test("should provide guidance for slice with RichTextField", async ({}) => {
		const result = await callTool("how_to_code_slice", {
			projectFramework: "next",
			stylingSystemToUse: "tailwind",
			modelAbsolutePath: "/src/slices/Hero/model.json",
			sliceMachineConfigAbsolutePath: "/slicemachine.config.json",
			fieldsUsed: ["prismic.RichTextField"],
		})

		await expect(result).toMatchSnapshot("rich-text-field-guidance.txt")
	})

	test("should provide guidance for slice with multiple fields", async ({}) => {
		const result = await callTool("how_to_code_slice", {
			projectFramework: "nuxt",
			stylingSystemToUse: "scss",
			modelAbsolutePath: "/src/slices/Hero/model.json",
			sliceMachineConfigAbsolutePath: "/slicemachine.config.json",
			fieldsUsed: [
				"prismic.RichTextField",
				"prismic.ImageField",
				"prismic.LinkField",
			],
		})

		await expect(result).toMatchSnapshot("multiple-fields-guidance.txt")
	})

	test("should provide comprehensive field documentation", async ({}) => {
		const result = await callTool("how_to_code_slice", {
			projectFramework: "next",
			stylingSystemToUse: "tailwind",
			modelAbsolutePath: "/src/slices/Hero/model.json",
			sliceMachineConfigAbsolutePath: "/slicemachine.config.json",
			fieldsUsed: [
				"prismic.TitleField",
				"prismic.RichTextField",
				"prismic.ImageField",
				"prismic.LinkField",
				"prismic.SelectField",
				"prismic.BooleanField",
				"prismic.NumberField",
				"prismic.DateField",
				"prismic.ColorField",
				"prismic.EmbedField",
				"prismic.GeoPointField",
				"prismic.IntegrationField",
				"prismic.LinkToMediaField",
				"prismic.TableField",
				"prismic.KeyTextField",
				"prismic.TimestampField",
				"prismic.GroupField",
				"prismic.ContentRelationshipField",
			],
		})

		await expect(result).toMatchSnapshot(
			"comprehensive-field-documentation.txt",
		)
	})

	test("should handle missing parameters gracefully", async () => {
		try {
			await callTool("how_to_code_slice", {
				projectFramework: "next",
			})
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
		}
	})
})
