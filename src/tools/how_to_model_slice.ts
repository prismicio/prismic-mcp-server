import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"

export const how_to_model_slice = tool(
	"how_to_model_slice",
	`PURPOSE: Provide detailed, opinionated guidance to create or update Prismic slice model.json files using modern best practices, including naming, file placement, allowed fields, shapes, and configuration.

USAGE: Use FIRST for any Prismic slice modeling request. Do not use for component or mock implementation. Works for request types: text, image, and image reference with text clarification.

RETURNS: Step-by-step modeling instructions, naming conventions, final Prismic model shapes, comprehensive field shape reference, opinionated modeling guidance, validation and testing steps.`,
	z.object({
		sliceLibraryAbsolutePath: z
			.string()
			.describe(
				"Absolute path to the slice library directory where slices live (from slicemachine.config.json)",
			),
		sliceName: z
			.string()
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
			.enum(["text", "image", "image reference with text clarification"])
			.describe(
				"The type of request - text-based description, image reference, or image reference with text clarification",
			),
	}).shape,
	(args) => {
		try {
			const {
				sliceLibraryAbsolutePath,
				sliceName,
				isNewSlice,
				contentRequirements,
				requestType,
			} = args

			const instructions = `
 # How to Model a Prismic Slice
 
 ## Request Analysis
 - **Slice Name**: ${sliceName}
 - **Request Type**: ${requestType === "text" ? "Text-based description" : requestType === "image" ? "Image reference" : "Image reference with text clarification"}
 - **Operation**: ${isNewSlice ? "Creating new slice" : "Updating existing slice"}
 - **Content Requirements**: ${contentRequirements}
 
 ## Naming Conventions
 
 ### Slice ID
 - MUST be kebab-case of the slice name, e.g., "slice-name"
 - Used as the model's "id" field
 
 ## Opinionated Modeling Guidance (Prismic best practices)

- Prefer simple, predictable models that align with Prismic’s latest DX.
- When modeling, review other existing slices for inspiration and consistency, but always tailor the model to the specific requirements of this slice.
- Avoid legacy constructs; follow guidance in the relevant sections below.
 
 ## File Paths
 
 - Slice directory: ${sliceLibraryAbsolutePath}/${sliceName}
 - Model file: ${sliceLibraryAbsolutePath}/${sliceName}/model.json
 
 ## Basic Structure
 
 ### Slice Model

 \`\`\`typescript
 {
   "id": string,           // kebab-case slice ID (e.g., "slice-name")
   "type": "SharedSlice",
   "name": string,         // PascalCase slice name (e.g., "SliceName")
   "description": string,  // Human-readable description
   "variations": Variation[]
 }
 \`\`\`
 
 ### Slice Variation
 \`\`\`typescript
 {
   "id": string,           // Variation identifier (e.g., "default")
   "name": string,         // Human-readable variation name (e.g., "Default")
   "docURL": "...",       
   "version": "initial",
   "description": string,  // Variation description (e.g., "Default variation")
   "imageUrl": "",     // Screenshot URL
   "primary": Record<string, Field>  // Non-repeatable fields
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
    single?: string; // e.g. "heading1,heading2,heading3,heading4,heading5,heading6,paragraph,preformatted"
    multi?: string; // e.g. "heading1,heading2,heading3,heading4,heading5,heading6,paragraph,preformatted,hyperlink,embed,rtl,strong,em,list-item,o-list-item"
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
- For ContentRelationship, use complex customtypes structure with field whitelisting.

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
- Never use for left/right or numbered pairs - use Group instead.
 
 ## Implementation Steps
 
 1) Create the slice directory (if it doesn't exist)
 2) Create or update the model.json with the structure above inside the slice directory
 
 ## Content Analysis Guidelines
 
 ${
		requestType === "text"
			? `- Focus: Parse the description for explicit content elements and hierarchy
  - Extract: titles, paragraphs, lists, buttons/links, media references
  - Don’t infer layout beyond what’s stated; if ambiguous, prefer simpler fields`
			: requestType === "image"
				? `- Focus: Identify visual elements and their repeatability
  - Detect: headings, body text blocks, CTAs, icons/images, repeated cards/tiles`
				: `- Focus: Use the image as the initial layout and reference for the fields involved; then refine based on the text clarification`
 }

 ### Template usage policy
 - Do not auto-pick templates. Prioritize the user's prompt/image.
 - Use examples as reference only; customize to the request.
 
 ## Final Instructions
 
 - Focus only on model.json
 - After implementation, call the verify_model tool to ensure correctness
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
