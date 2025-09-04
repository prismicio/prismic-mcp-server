import { existsSync } from "fs"
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

		const userPrompt = `Can you help me make a simple "ImageWithText" slice?`
		const messages = await aiAgent.query(userPrompt)

		expect(messages.length).toBeGreaterThan(0)

		const wasToolUsed = checkToolUsage({
			messages,
			toolName: "mcp__prismic__how_to_code_slice",
		})
		expect(wasToolUsed).toBe(true)

		const sliceIndexPath = join(
			projectRoot,
			"/src/slices/ImageWithText/index.tsx",
		)
		const hasSliceIndex = existsSync(sliceIndexPath)
		expect(hasSliceIndex).toBe(true)
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
