import { expect, test } from "../fixtures/project"
import { callTool } from "../helpers/mcp-client"

const normalizeResult = ({
	result,
	modelAbsolutePath,
}: {
	result: string
	modelAbsolutePath: string
}) => {
	return result.replace(modelAbsolutePath, "model.json")
}

test.describe("how_to_code_slice tool", () => {
	test("should provide guidance for slice with RichTextField", async ({
		projectPaths,
	}) => {
		const result = await callTool("how_to_code_slice", {
			projectFramework: "next",
			stylingSystemToUse: "tailwind",
			modelAbsolutePath: projectPaths.modelJson,
			sliceMachineConfigAbsolutePath: projectPaths.slicemachineConfig,
			fieldsUsed: ["prismic.RichTextField"],
		})

		const normalizedResult = normalizeResult({
			result,
			modelAbsolutePath: projectPaths.modelJson,
		})

		await expect(normalizedResult).toMatchSnapshot(
			"rich-text-field-guidance.txt",
		)
	})

	test("should provide guidance for slice with multiple fields", async ({
		projectPaths,
	}) => {
		const result = await callTool("how_to_code_slice", {
			projectFramework: "nuxt",
			stylingSystemToUse: "scss",
			modelAbsolutePath: projectPaths.modelJson,
			sliceMachineConfigAbsolutePath: projectPaths.slicemachineConfig,
			fieldsUsed: [
				"prismic.RichTextField",
				"prismic.ImageField",
				"prismic.LinkField",
			],
		})

		const normalizedResult = normalizeResult({
			result,
			modelAbsolutePath: projectPaths.modelJson,
		})

		await expect(normalizedResult).toMatchSnapshot(
			"multiple-fields-guidance.txt",
		)
	})

	test("should provide comprehensive field documentation", async ({
		projectPaths,
	}) => {
		const result = await callTool("how_to_code_slice", {
			projectFramework: "next",
			stylingSystemToUse: "tailwind",
			modelAbsolutePath: projectPaths.modelJson,
			sliceMachineConfigAbsolutePath: projectPaths.slicemachineConfig,
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

		const normalizedResult = normalizeResult({
			result,
			modelAbsolutePath: projectPaths.modelJson,
		})

		await expect(normalizedResult).toMatchSnapshot(
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
