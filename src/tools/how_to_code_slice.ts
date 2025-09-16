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
				if (process.env.PRISMIC_DEBUG) {
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

You are tasked with implementing a **Prismic Slice**. Follow the steps carefully and do not skip validations. Always align with the project's framework and conventions.

WALK THROUGH EACH STEP AND STATE YOUR INTENT FOR EACH ONE, MENTIONING THE STEP NUMBER IN YOUR RESPONSE.

---

Step 1: Analyze \`model.json\`
- Path: \`${args.modelAbsolutePath}\`
- Parse fields exactly as defined. Do not infer or assume missing information.
- Create a **field analysis table** with columns: \`Field | Type | Config | Implementation\`

Step 2: Analyze Included Images (if any)
- If you don't have any image, skip this step.
- Before coding, generate a **detailed description** of the image:
  - Layout
  - Orientation
  - Color palette
  - Content structure
- Implement the slice to visually match the image:
  - Prioritize layout and content structure over pixel dimensions.
  - Use the project's styling system to replicate the look and feel.

Step 3: Implement the Slice Code
- Framework: \`${args.projectFramework}\`
- **Implement Fields Dynamically**
  - All visible content must come from Prismic fields.
  - Never hardcode copy, labels, or text.
  - For each field, use the correct component and rendering logic according to the **Field Documentation** (below).
- Styling:
  - If other slices exist, match their styling system and conventions.
  - If no patterns exist, follow the project's global styling system (CSS, Tailwind, SCSS, etc.).
- Code Practices:
  - Mirror existing slice structure, naming, imports, and export patterns.
  - Validate all functions, libraries, and components against the project setup.  
  - *Do not introduce unsupported tools (e.g. Tailwind classes in a CSS Modules project).*

Step 4: Export the Slice in the Slices Library
- Ensure the new slice is added to the exported \`components\` object inside the \`index.ts\` file present under the slices library directory. This files is located one level above the directory of the slice (e.g. for a slice in \`src/slices/MySlice\`, the \`index.ts\` file is located in \`src/slices/index.ts\`)

---

## Field Documentation
${fieldDocs}

---

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
