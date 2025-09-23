import { existsSync } from "node:fs"
import { join as joinPath } from "node:path"

import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"

import { telemetryClient } from "../server"

export const how_to_model_slice = tool(
	"how_to_model_slice",
	`PURPOSE: Provide detailed, opinionated guidance to create Prismic slice model files using modern best practices, including naming, file placement, allowed fields, shapes, and configuration.

USAGE: Use FIRST for any Prismic slice creation or modeling request. Do not use for component or mock implementation.
Input Type Selection Rules:
- If the user attaches an image, include "image".
- If the user attaches code, include "code".
- Include "text" ONLY if the prompt contains model-related information (e.g., explicitly describes desired fields/structure, adds nuance, or overrides what is seen in the code/image).
- It is acceptable to include multiple input types when each adds model-relevant signal per the rules above.

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
		inputTypes: z
			.array(z.enum(["text", "image", "code"]))
			.nonempty()
			.describe("The kinds of input present in the prompt."),
	}).shape,
	(args) => {
		try {
			const {
				sliceMachineConfigAbsolutePath,
				sliceName,
				isNewSlice,
				contentRequirements,
				inputTypes,
			} = args

			try {
				telemetryClient.track({
					event: "MCP Tool - How to model a slice",
					sliceMachineConfigAbsolutePath,
					properties: {
						sliceName,
						isNewSlice,
						contentRequirements,
						inputTypes,
					},
				})
			} catch (error) {
				// noop, we don't wanna block the tool call if the tracking fails
				if (process.env.PRISMIC_DEBUG) {
					console.error(
						"Error while tracking 'how_to_model_slice' tool call:",
						error,
					)
				}
			}

			const sliceId = toSnakeCase(sliceName)

			const sliceDirectory = joinPath(sliceMachineConfigAbsolutePath, sliceName)
			const modelExists = existsSync(joinPath(sliceDirectory, "model.json"))

			const instructions = `
# How to Create a Prismic Slice

## Request Analysis
- **Slice Name**: ${sliceName}
- **Input Types**: ${inputTypes.join(" + ")}
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
- Human-readable label shown in Slice Machine and the Prismic editor
- Required; recommended Title Case and concise (≤ 30 characters)
- Examples: "Default", "Image Right", "Align Left"

## Opinionated Modeling Guidance (Prismic best practices)

- Prefer simple, predictable models that align with Prismic's latest DX.
- Keep the model streamlined by using the minimum number of fields necessary, Prismic fields are highly flexible and can be configured to handle a wide range of content needs.
- When modeling, review other existing slices for inspiration and consistency, but always tailor the model to the specific requirements of this slice.
- Avoid legacy constructs; follow guidance in the relevant sections below.
- Add fields to model only editor-controlled content. Treat decorative/stylistic or implementation-only elements as non-content unless explicitly requested.

${
	!isNewSlice && modelExists
		? `## File Paths
- Slice directory: ${sliceDirectory}
- Model file: ${sliceDirectory}/model.json\n`
		: ""
}
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
- MUST NOT split highlighted phrases into separate fields. Keep one StructuredText field and style with marks/custom renderers/CSS.
  - Wrong: \`heading\` + \`highlighted_text\` fields
  - Right: Single \`heading\` field with styled spans

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
- MUST NOT create Image fields for decorative elements (accent SVGs, underline images, background shapes, button icons). These are implementation details, not content.

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
- Use \`repeat: true\` for lists of adjacent buttons/links (better than Group for this use case). This removes the need for multiple separate Link fields.
- Use variants for different button styles (e.g., ["Primary", "Secondary"]).
- Use allowText to enable custom display text. Always use when the button or link has a label.
- MUST NOT add per-instance icon fields for decorative button icons. Use variants instead.
  - Wrong: \`buttons\` + \`button_icon\` fields
  - Right: \`buttons\` with \`variants: ["With icon", "Plain"]\`
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
- Never use this field for groups of adjacent links and buttons. Use the Link field instead.

## Implementation Steps

${
	!isNewSlice && modelExists
		? `1) Analyze the existing model.json and update it according to the user's requirements:`
		: "1) Generate a slice JSON model with the structure above"
}
2) Call the save_slice_model tool to create the slice with the generated model

## Content Analysis Guidelines

${
	inputTypes.includes("image")
		? `- From image: Identify visual elements and their repeatability
			- Detect: headings, body text blocks, CTAs, icons/images, repeated cards/tiles
			- Apply the "editor-controlled content" principle: do not model decorative/stylistic visuals (flourishes, underline/accent images, background shapes) unless explicitly requested.
			- Infer grouping and repeatability ONLY when visually obvious (e.g., several buttons, grid of cards)`
		: ""
}

${
	inputTypes.includes("code")
		? `- From code: Treat provided code as the source of truth for data needs
			- Read existing components and props to infer fields, naming, and shapes
			- Map component props/state to model fields
			- Apply the principle: only model editor-controlled content. Use this heuristic: if a visual is hard-coded and not controlled by props/state/data, treat it as implementation detail (no field). If it is content-driven via props/state/data, consider modeling it.
			- If code shows lists/arrays, prefer repeatable links or group fields over ad-hoc numbered fields`
		: ""
}

${
	inputTypes.includes("text")
		? `- From text: Parse explicit content elements and hierarchy
			- Extract: titles, paragraphs, lists, buttons/links, media references
			- Avoid inferring layout beyond what's stated; if ambiguous, prefer simpler fields
			- If text clarifies or contradicts image/code, TEXT TAKES PRECEDENCE as the user's explicit intent (e.g., image shows two buttons but text specifies only one → model a single button)`
		: ""
}

## Final Instructions

- Focus only on the slice model JSON
- After implementation, you MUST call the save_slice_model tool to create the slice, NEVER create a model.json file file by yourself.
- After having a valid model structure, you MUST also call all the necessary tools to ensure everything related to the slice is updated to reflect the changes. Here is the recommended order of tools to call, please AVOID calling the tools in any other order than this one:
  1. save_slice_model
  2. how_to_code_slice
  3. how_to_mock_slice
  4. verify_slice_mock

  If you understood this, please SAY what tools you are calling next and the order in which you are calling them.`

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
