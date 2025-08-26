import { expect, test } from "../fixtures/mcp"

test.describe("how_to_code_slice tool", () => {
	test("should provide guidance for slice with RichTextField", async ({
		mcp,
	}) => {
		const result = await mcp.callTool("how_to_code_slice", {
			projectFramework: "next",
			stylingSystemToUse: "tailwind",
			modelAbsolutePath: "/tmp/model.json",
			sliceMachineConfigAbsolutePath: "/tmp/slicemachine.config.json",
			fieldsUsed: ["prismic.RichTextField"],
		})

		// Validate the content of the result
		expect(result).toContain("RichTextField")
		expect(result).toContain("PrismicRichText")
		expect(result).toContain("field={slice.primary.my_rich_text_field}")
		expect(typeof result).toBe("string")
		expect(result.length).toBeGreaterThan(100)

		// Validate that the tool provides comprehensive guidance
		expect(result).toContain("MANDATORY")
		expect(result).toContain("Fields documentation")
		expect(result).toContain("Model analysis")
		expect(result).toContain("Styling implementation")
	})

	test("should provide guidance for slice with multiple fields", async ({
		mcp,
	}) => {
		const result = await mcp.callTool("how_to_code_slice", {
			projectFramework: "nuxt",
			stylingSystemToUse: "scss",
			modelAbsolutePath: "/tmp/model.json",
			sliceMachineConfigAbsolutePath: "/tmp/slicemachine.config.json",
			fieldsUsed: [
				"prismic.RichTextField",
				"prismic.ImageField",
				"prismic.LinkField",
			],
		})

		expect(result).toContain("RichTextField")
		expect(result).toContain("PrismicRichText")
		expect(result).toContain(':field=\\"slice.primary.my_rich_text_field\\"')

		expect(result).toContain("ImageField")
		expect(result).toContain("PrismicImage")
		expect(result).toContain(':field=\\"slice.primary.my_image_field\\"')

		expect(result).toContain("LinkField")
		expect(result).toContain("PrismicLink")
		expect(result).toContain(':field=\\"slice.primary.my_link_field\\"')

		expect(typeof result).toBe("string")
		expect(result.length).toBeGreaterThan(100)
	})

	test("should provide comprehensive field documentation", async ({ mcp }) => {
		const result = await mcp.callTool("how_to_code_slice", {
			projectFramework: "next",
			stylingSystemToUse: "tailwind",
			modelAbsolutePath: "/tmp/model.json",
			sliceMachineConfigAbsolutePath: "/tmp/slicemachine.config.json",
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

		const fieldTypes = [
			"TitleField",
			"RichTextField",
			"ImageField",
			"LinkField",
			"SelectField",
			"BooleanField",
			"NumberField",
			"DateField",
			"ColorField",
			"EmbedField",
			"GeoPointField",
			"IntegrationField",
			"LinkToMediaField",
			"TableField",
			"KeyTextField",
			"TimestampField",
			"GroupField",
			"ContentRelationshipField",
		]

		fieldTypes.forEach((fieldType) => {
			expect(result).toContain(fieldType)
		})
		expect(typeof result).toBe("string")
		expect(result.length).toBeGreaterThan(100)
	})

	test("should handle missing parameters gracefully", async ({ mcp }) => {
		try {
			await mcp.callTool("how_to_code_slice", {
				projectFramework: "next",
			})
		} catch (error) {
			expect(error).toBeInstanceOf(Error)
		}
	})
})
