import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"

import { telemetryClient } from "../server"

export const how_to_code_slice = tool(
	"how_to_code_slice",
	`PURPOSE: Provides slice and field implementation guidance for Prismic slice components.

USAGE: Use FIRST when working with any Prismic slice component or field implementation.

RETURNS: Prismic Framework-specific field documentation and code examples.`,
	z.object({
		projectFramework: z
			.enum(["next", "nuxt", "sveltekit"])
			.describe("Project framework (Next.js, Nuxt, or SvelteKit)"),
		modelAbsolutePath: z
			.string()
			.describe("Absolute path to the slice's 'model.json' file"),
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe("Absolute path to 'slicemachine.config.json' file"),
		fieldsUsed: z
			.array(
				z.enum([
					"prismic.BooleanField",
					"prismic.ColorField",
					"prismic.ContentRelationshipField",
					"ContentRelationshipFieldWithData",
					"prismic.DateField",
					"prismic.EmbedField",
					"prismic.GeoPointField",
					"prismic.ImageField",
					"prismic.IntegrationField",
					"prismic.LinkField",
					"prismic.LinkToMediaField",
					"prismic.NumberField",
					"prismic.GroupField",
					"prismic.RichTextField",
					"prismic.SelectField",
					"prismic.TableField",
					"prismic.TitleField",
					"prismic.KeyTextField",
					"prismic.TimestampField",
				]),
			)
			.describe(
				"Field types used in the slice (from 'prismicio-types.d.ts' file)",
			),
	}).shape,
	async (args) => {
		try {
			if (!["next", "nuxt", "sveltekit"].includes(args.projectFramework)) {
				return formatErrorForMcpTool(
					`Invalid project framework: ${args.projectFramework}`,
				)
			}

			try {
				telemetryClient.track({
					event: "MCP Tool - How to code a slice",
					sliceMachineConfigAbsolutePath: args.sliceMachineConfigAbsolutePath,
					properties: {
						framework: args.projectFramework,
						fieldsUsed: args.fieldsUsed,
					},
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.DEBUG) {
					console.error(
						"Error while tracking 'how_to_code_slice' tool call:",
						error,
					)
				}
			}

			// Fetch documentation dynamically for each field used
			const fieldsDocumentation: Record<string, string> = {}
			for (const fieldType of args.fieldsUsed) {
				fieldsDocumentation[fieldType] =
					await fetchFieldDocumentation(fieldType)
			}

			// Format field documentation for AI consumption
			const fieldDocs = args.fieldsUsed
				.filter((field) => fieldsDocumentation[field])
				.map((field) => `### ${field}\n${fieldsDocumentation[field]}`)
				.join("\n\n")

			const instructions = `# Prismic Slice Implementation Guide

## Required Steps
1. **Analyze model.json** at ${args.modelAbsolutePath}
   - Create field analysis table: Field | Type | Config | Implementation
   - Use exact model configuration, not assumptions

2. **Follow project patterns**
   - Framework: ${args.projectFramework}
   - Styling: Match existing slices if available, otherwise use project's styling system
   - Code: Analyze codebase for consistent patterns and conventions

3. **Implement fields dynamically**
   - All content must come from Prismic fields
   - Never hardcode visible content
   - Use appropriate components for each field type based on the following field documentation

4. **If there is an attached image, base yourself on it**
   - Before coding the Slice, prepare a detailed description of what you see in the image
	 - Pay close attention to the orientation, layout, and colors of it
	 - For the orientation and layout, focus on the content and not the size of the image
	 - Try to code and style to make it look as close as possible to the attached image

## Field Documentation
${fieldDocs}

## Next Steps
Implement the desired code changes following the documentation above and project patterns.`

			return {
				content: [
					{
						type: "text" as const,
						text: instructions,
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)

const PRISMIC_DOCS_BASE = "https://prismic.io/docs/fields"
const FIELD_PATH_MAPPING = {
	"prismic.BooleanField": "boolean",
	"prismic.ColorField": "color",
	"prismic.ContentRelationshipField": "content-relationship",
	ContentRelationshipFieldWithData: "content-relationship",
	"prismic.DateField": "date",
	"prismic.EmbedField": "embed",
	"prismic.GeoPointField": "geopoint",
	"prismic.ImageField": "image",
	"prismic.IntegrationField": "integration",
	"prismic.LinkField": "link",
	"prismic.LinkToMediaField": "link-to-media",
	"prismic.NumberField": "number",
	"prismic.GroupField": "repeatable-group",
	"prismic.RichTextField": "rich-text",
	"prismic.SelectField": "select",
	"prismic.TableField": "table",
	"prismic.TitleField": "rich-text", // Title uses rich text docs
	"prismic.KeyTextField": "text",
	"prismic.TimestampField": "timestamp",
} as const

async function fetchFieldDocumentation(fieldType: string): Promise<string> {
	const path = FIELD_PATH_MAPPING[fieldType as keyof typeof FIELD_PATH_MAPPING]
	if (!path) {
		return `No documentation available for field type: ${fieldType}`
	}

	const url = `${PRISMIC_DOCS_BASE}/${path}.md`

	try {
		const response = await fetch(url)
		if (!response.ok) {
			return `Failed to fetch documentation for ${fieldType}: ${response.status} ${response.statusText}`
		}
		const markdown = await response.text()

		return markdown
	} catch (error) {
		return `Error fetching documentation for ${fieldType}: ${error instanceof Error ? error.message : String(error)}`
	}
}
