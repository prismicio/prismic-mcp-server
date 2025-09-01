import { expect, test } from "../fixtures/project"
import { callTool } from "../helpers/mcp-client"

test.describe("how_to_code_slice tool", () => {
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
