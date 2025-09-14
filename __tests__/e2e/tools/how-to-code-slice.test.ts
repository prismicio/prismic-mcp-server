import { copyFileSync, rmSync } from "fs"
import { join } from "path"

import { expect, test } from "../fixtures/test"
import { getPrismicMcpTools } from "../helpers/ai-agent"
import { callTool } from "../helpers/mcp-client"

test.describe("how_to_code_slice tool", () => {
	test("should be used by an AI Agent to create a simple slice", async ({
		aiAgent,
		projectRoot,
	}) => {
		// Replace the Hero slice code file with the placeholder code
		rmSync(join(projectRoot, "/src/slices/Hero/index.tsx"))
		copyFileSync(
			join(
				new URL(import.meta.url).pathname,
				"../../reference/slices/Hero/index-placeholder.tsx",
			),
			join(projectRoot, "/src/slices/Hero/index.tsx"),
		)

		const userPrompt = `Code the "Hero" slice`
		const messages = await aiAgent.simulateUserQuery(userPrompt)
		expect(messages.length).toBeGreaterThan(0)

		const toolsUsed = getPrismicMcpTools({
			messages,
		})
		expect(toolsUsed).toEqual(["how_to_code_slice"])

		const sliceDir = join(projectRoot, "/src/slices/Hero/index.tsx")
		const referenceDir = join(
			new URL(import.meta.url).pathname,
			"../../reference/slices/Hero/index.tsx",
		)

		const grade = await aiAgent.grade({
			generatedPath: sliceDir,
			referencePath: referenceDir,
			instructions: `
Grade the quality of the generated Testimonials slice code.
You can be flexible about the exact field names, just make sure they make sense.
`,
		})

		console.info("Grade:", grade)
		expect(grade.score).toBeGreaterThan(7)
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
