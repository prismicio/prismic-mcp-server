import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"

import { telemetryClient } from "../server"

export const how_to_model_slice = tool(
	"how_to_model_slice",
	`PURPOSE: Provide detailed, opinionated guidance to create or update Prismic slice model.json files using modern best practices, including naming, file placement, allowed fields, shapes, and configuration.

USAGE: Use FIRST for any Prismic slice modeling request. Do not use for component or mock implementation.

RETURNS: Step-by-step modeling instructions, naming conventions, final Prismic model shapes, comprehensive field shape reference, opinionated modeling guidance, validation and testing steps.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe(
				"Absolute path to the slice library directory where slices live (from slicemachine.config.json)",
			),
		sliceName: z
			.string()
			.regex(
				/^[A-Z][a-zA-Z0-9]*$/,
				"Slice name must be PascalCase: start with an uppercase letter, contain only letters and numbers, and no special characters.",
			)
			.describe(
				"The name of the slice, it MUST be PascalCase, e.g., 'SliceName', cannot start with a number, and with no special characters allowed",
			),
		isNewSlice: z
			.boolean()
			.describe(
				"Whether this is a new slice creation (true) or updating existing slice (false)",
			),
		contentRequirements: z
			.string()
			.describe(
				"Description of what content the slice should contain (e.g., 'hero with title, description, and CTA button')",
			),
		requestType: z
			.enum(["text", "image", "image-and-text"])
			.describe(
				"The type of request - text-based description, image reference, or image reference with text clarification",
			),
	}).shape,
	(args) => {
		try {
			const {
				sliceMachineConfigAbsolutePath,
				sliceName,
				isNewSlice,
				contentRequirements,
				requestType,
			} = args

			try {
				telemetryClient.track({
					event: "MCP Tool - How to model a slice",
					sliceMachineConfigAbsolutePath,
					properties: {
						sliceName,
						isNewSlice,
						contentRequirements,
						requestType,
					},
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.DEBUG) {
					console.error(
						"Error while tracking 'how_to_model_slice' tool call:",
						error,
					)
				}
			}

			const sliceId = toSnakeCase(sliceName)

			const instructions = `
# How to Model a Prismic Slice

## Request Analysis
- **Slice Name**: ${sliceName}
- **Request Type**: ${requestType === "text" ? "Text-based description" : requestType === "image" ? "Image reference" : "Image reference with text clarification"}
- **Operation**: ${isNewSlice ? "Creating new slice" : "Updating existing slice"}
- **Content Requirements**: ${contentRequirements}

## Naming Conventions

### Slice ID
- MUST be snake_case of the slice name, e.g., "slice_name"
- Used as the model's "id" field
- For this slice: "${sliceName}" → "${sliceId}"

### Variation ID
- MUST be camelCase, alphanumeric only (no spaces, hyphens, or underscores)
- Examples: "default", "imageRight", "alignLeft"

### Variation Name
- Human‑readable label shown in Slice Machine and the Prismic editor
- Required; recommended Title Case and concise (≤ 30 characters)
- Examples: "Default", "Image Right", "Align Left"

## Opinionated Modeling Guidance (Prismic best practices)

- Prefer simple, predictable models that align with Prismic's latest DX.
- When modeling, review other existing slices for inspiration and consistency, but always tailor the model to the specific requirements of this slice.
- Avoid legacy constructs; follow guidance in the relevant sections below.

## File Paths

- Slice directory: ${sliceMachineConfigAbsolutePath}/${sliceName}
- Model file: ${sliceMachineConfigAbsolutePath}/${sliceName}/model.json

## Basic Structure

### Slice Model

\`\`\`typescript
{
  "id": string,           // snake_case slice ID (e.g., "${sliceId}")
  "type": "SharedSlice",
  "name": string,         // PascalCase slice name (e.g., "${sliceName}")
  "description": string,  // Human-readable description
  "variations": Variation[]
}
\`\`\`

### Slice Variation
\`\`\`typescript
{
  "id": string,           // camelCase variation ID (e.g., "default", "imageRight")
  "name": string,         // Human-readable variation name (e.g., "Default")
  "docURL": "...",       
  "version": "initial",
  "description": string,  // Variation description (e.g., "Default variation")
  "imageUrl": "",     // Screenshot URL
  "primary": Record<string, Field> // All variations fields
}
\`\`\`

Notes:
- The variation-level "items" object is deprecated and MUST NOT be used.

## Field Types

### Basic Fields

**StructuredText**
\`\`\`typescript
{
  type: "StructuredText";
  config: {
    label: string;
    single?: string; // A comma-separated list of formatting options that does not allow line breaks. Options: paragraph | preformatted | heading1 | heading2 | heading3 | heading4 | heading5 | heading6 | strong | em | hyperlink | image | embed | list-item | o-list-item | rtl.
    multi?: string; // A comma-separated list of formatting options, with paragraph breaks allowed. Options: paragraph | preformatted | heading1 | heading2 | heading3 | heading4 | heading5 | heading6 | strong | em | hyperlink | image | embed | list-item | o-list-item | rtl.
    placeholder?: string;
    allowTargetBlank?: boolean;
  };
}
\`\`\`
Notes:
- Use "single" for a single block type OR "multi" for multiple.
- Do not set both "single" and "multi" at the same time.
- Titles: prefer a single heading level without inline marks.
- Descriptions: allow paragraphs with inline marks (strong, em, hyperlink) and line breaks when necessary.

**Text**
\`\`\`typescript
{
  type: "Text";
  config: {
    label: string;
    placeholder?: string;
  };
}
\`\`\`
Notes:
- Use for simple text without formatting.
- Avoid for content that needs rich text capabilities.

**Image**
\`\`\`typescript
{
  type: "Image";
  config: {
    label: string;
    constraint?: {
      width?: number;
      height?: number;
    };
    thumbnails?: Array<{
      name: string;
      width?: number;
      height?: number;
    }>;
  };
}
\`\`\`
Notes:
- Use constraint for aspect ratio control.
- thumbnails for predefined image sizes.
- Avoid using "background" in field names unless specifically meant as full background.

**Link**
\`\`\`typescript
{
  type: "Link";
  config: {
    label: string;
    allowText?: boolean;
    repeat?: boolean;
    variants?: string[];
    select?: "document" | "media" | "web";
    customtypes?: string[] | Array<{
      id: string;
      fields?: string[] | Array<{
        id: string;
        fields?: string[] | Array<{
          id: string;
          fields?: string[];
        }>;
      }>;
    }>;
  };
}
\`\`\`
Notes:
- Use repeat: true for lists of buttons/links (better than Group for this use case).
- Use variants for different button styles (e.g., ["Primary", "Secondary"]).
- Use allowText to enable custom display text.
- **Content Relationships**: Set \`select: "document"\` and use \`customtypes\` for field selection. Only selected fields are included in API responses. Up to 2 levels of nesting supported. For nesting to work, target fields must also be content relationship Link fields. Groups don't count toward nesting levels, i.e. a group field can contain a content relationship field that points to another custom type, and that custom type can have a group field with a content relationship field as the second nesting level.

**Boolean**
\`\`\`typescript
{
  type: "Boolean";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for true/false toggles.

**Number**
\`\`\`typescript
{
  type: "Number";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for integers or floats.

**Select**
\`\`\`typescript
{
  type: "Select";
  config: {
    label: string;
    options: string[];
  };
}
\`\`\`
Notes:
- Use for predefined choice lists.

**Date**
\`\`\`typescript
{
  type: "Date";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for date selection.

**Timestamp**
\`\`\`typescript
{
  type: "Timestamp";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for date and time selection.

**Color**
\`\`\`typescript
{
  type: "Color";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for color picker.

**Embed**
\`\`\`typescript
{
  type: "Embed";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for external content embeds (videos, social media posts).

**GeoPoint**
\`\`\`typescript
{
  type: "GeoPoint";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for geographical coordinates.

**Table**
\`\`\`typescript
{
  type: "Table";
  config: {
    label: string;
  };
}
\`\`\`
Notes:
- Use for tabular data.

### Composite Fields

**Group**
\`\`\`typescript
{
  type: "Group";
  config: {
    label: string;
    fields: Record<string, NestableField>;
  };
}
\`\`\`
Notes:
- Use for repeating groups of fields.
- Use for lists of items that can be navigated (sliders, carousels).
- For left/right or numbered pairs, prefer using Group for clarity and consistency.

## Implementation Steps

1) Create the slice directory (if it doesn't exist)
2) Create or update the model.json with the structure above inside the slice directory

## Content Analysis Guidelines

${
	requestType === "text"
		? `- Focus: Parse the description for explicit content elements and hierarchy
- Extract: titles, paragraphs, lists, buttons/links, media references
- Don't infer layout beyond what's stated; if ambiguous, prefer simpler fields`
		: ""
}
${
	requestType === "image"
		? `- Focus: Identify visual elements and their repeatability
- Detect: headings, body text blocks, CTAs, icons/images, repeated cards/tiles`
		: ""
}
${
	requestType === "image-and-text"
		? `- Focus: Use the image as the initial layout and reference for the fields involved; then refine based on the text clarification`
		: ""
}

## Final Instructions

- Focus only on model.json
- After implementation, you MUST call the verify_slice_model tool to ensure correctness
`

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

function toSnakeCase(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/[\s-]+/g, "_")
		.toLowerCase()
}
