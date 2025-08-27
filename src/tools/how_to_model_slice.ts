import { z } from "zod"

import { formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"

export const how_to_model_slice = tool(
	"how_to_model_slice",
	`PURPOSE: Provide detailed, opinionated guidance to create or update Prismic slice model.json files using modern best practices (no legacy items), including naming, file placement, allowed fields, shapes, and configuration.

USAGE: Use FIRST for any Prismic slice modeling request. Do not use for component or mock implementation. Always avoid variation-level items; for repeatables, use Link with repeat: true (for link/button lists) or Group (for composite repeatables) inside primary. Works for request types: text, image, and image reference with text clarification.

RETURNS: Step-by-step modeling instructions, naming conventions, final Prismic model shapes, comprehensive field shape reference, opinionated modeling guidance, validation and testing steps.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe(
				"The absolute path to the `slicemachine.config.json` file of the project",
			),
		sliceName: z
			.string()
			.describe(
				"The name of the slice (e.g., 'Hero', 'Testimonial', 'Feature')",
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
			const sliceName = args.sliceName
			const isNewSlice = args.isNewSlice
			const requestType = args.requestType

			const instructions = `
 # How to Model a Prismic Slice
 
 This tool contains MANDATORY STEPS that MUST be followed for creating or updating Prismic slice models.
 FAILING to read and implement ANY section marked MANDATORY will result in INCORRECT models.
 YOU MUST read this ENTIRE output from beginning to end BEFORE writing a SINGLE line of code.
 NO EXCEPTIONS - ALL steps are required.
 
 ## Request Analysis [MANDATORY]
 - **Slice Name**: ${sliceName}
 - **Request Type**: ${requestType === "text" ? "Text-based description" : requestType === "image" ? "Image reference" : "Image reference with text clarification"}
 - **Operation**: ${isNewSlice ? "Creating new slice" : "Updating existing slice"}
 - **Content Requirements**: ${args.contentRequirements}
 
 ## Naming Conventions [MANDATORY]
 
 ### Slice Name
 - MUST be PascalCase (TitleCase), e.g., "SliceName"
 - Cannot start with a number
 - No special characters allowed
 
 ### Slice ID
 - MUST be kebab-case of the slice name, e.g., "slice-name"
 - Used as the model's "id" field
 
 
 ## Opinionated Modeling Guidance (Prismic best practices) [MANDATORY]

- Never use variation-level "items"; use Link with repeat or Group within primary.
- Use Group only for repeatable sets of multiple related fields (e.g., an item with image + title + description). Do not use Group to model lists of adjacent links/buttons; use a single Link field with repeat: true instead.
- For StructuredText:
  - Headings: use label "title" and a single element specifying the heading level (start from heading1). Avoid inline elements in titles.
  - Descriptions: use elements "paragraph", "strong", "em", "hyperlink" and allow line breaks where needed.
- For Link:
  - allowText enables button text; repeat creates lists of links/buttons; variants provides style options (e.g., Primary, Secondary).
- For Image:
  - Avoid naming fields "background" unless the image is truly a full background.
- For Group:
  - Use for carousels/sliders or any repeating composite content; avoid left/right or numbered pairs by design—make a repeatable item instead.
 
 ### Directory Structure
 
 src/slices/
 └── ${sliceName}/
     └── model.json          # Slice model definition
 
 ### File Path
 - **Model File**: \`src/slices/${sliceName}/model.json\`
 
 ## Model.json Structure [MANDATORY]
 
 ### Basic Structure (no items)
 
 {
   "id": "${sliceName
			.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
			.replace(/_/g, "-")
			.toLowerCase()}",
   "type": "SharedSlice",
   "name": "${sliceName}",
   "description": "A ${args.contentRequirements.toLowerCase()}",
   "variations": [
     {
       "id": "default",
       "name": "Default",
       "docURL": "...",
       "version": "initial",
       "description": "Default variation",
       "imageUrl": "",
       "primary": {
         // Define fields here
       }
     }
   ]
 }
 
 ### IMPORTANT: Do not use "items" (deprecated)
 - The variation-level "items" object is deprecated and MUST NOT be used.
 - For repeatable content:
   - If it is a list of links/buttons: use a Link field with "repeat: true" in its config.
   - If it is a grouped set of fields that repeats: use a Group field inside "primary" and define its "fields".
   - Avoid using "items". All repeatable modeling should be handled via "repeat" on fields or Group.
 
 ## Field Types Reference [MANDATORY]
 
 ### Available Field Types
 - StructuredText, Text, Image, Link, Boolean, Number, Date, Timestamp, Color, Embed, GeoPoint, UID, ContentRelationship, LinkToMedia, Group
 
 ### Link Field: Repeatable and Variants [MANDATORY]
 - Repeatable link lists (buttons, menus): set "repeat: true" in the Link field config. The API returns an array of links.
 - Variants (style options like Primary/Secondary): set "variants": ["Primary", "Secondary"] in the Link field config.
 - Other common options: "allowText", "select", "allowTargetBlank".
 
 ### Group Field
 - Use for repeatable sets of multiple fields (e.g., an item with image + title + description).
 - Define the Group inside "primary" and specify its "fields".
 
 ## Field Shapes (Source of Truth) [MANDATORY]
 
 The following are the valid field types for slice "primary" and their JSON shapes with supported configuration options. Only use these shapes.
 
 ### StructuredText
 
 {
   "type": "StructuredText",
   "config": {
     "label": "Text label",
     "placeholder": "Optional placeholder",
     "single": "heading1|heading2|heading3|heading4|heading5|heading6|paragraph|preformatted",
     "multi": "paragraph,preformatted,hyperlink,embed,rtl,strong,em,list-item,o-list-item",
     "allowTargetBlank": true
   }
 }
 
 Notes:
 - Use "single" for a single block type OR "multi" for multiple.
 - Do not set both "single" and "multi" at the same time.
 - Titles: prefer a single heading level without inline marks.
 - Descriptions: allow paragraphs with inline marks (strong, em, hyperlink) and line breaks when necessary.
 
 ### Text
 
 {
   "type": "Text",
   "config": {
     "label": "Text label",
     "placeholder": "Optional placeholder"
   }
 }
 
 ### Image
 
 {
   "type": "Image",
   "config": {
     "label": "Image label",
     "constraint": {
       "width": 1200,
       "height": 800
     },
     "thumbnails": [
       { "name": "mobile", "width": 600, "height": 400 }
     ]
   }
 }
 
 Notes:
 - Omit "constraint" and "thumbnails" if not needed.
 - Do not name generic content images "background" unless it is a full background image field.
 
 ### Link
 
 {
   "type": "Link",
   "config": {
     "label": "Link label",
     "placeholder": "Optional placeholder",
     "select": null, // one of: null | "web" | "media" | "document"
     "customtypes": ["page", "article"],
     "masks": ["*"],
     "tags": ["blog"],
     "allowTargetBlank": true,
     "allowText": true,
     "repeat": true,
     "variants": ["Primary", "Secondary"]
   }
 }
 
 Notes:
 - Use "repeat: true" to model lists of links/buttons (returned as an array).
 - Use "variants" to provide style options for buttons (e.g., Primary/Secondary).
 - If "select" is "document", use "customtypes"/"tags" to scope allowed documents.
 - Do not model multiple adjacent buttons as separate fields; use one Link field with repeat: true.
 
 ### ContentRelationship
 
 {
   "type": "ContentRelationship",
   "config": {
     "label": "Relationship label",
     "customtypes": [
       {
         "id": "page",
         "fields": [
           "title",
           { "id": "author", "fields": ["name"] }
         ]
       },
       {
         "id": "article",
         "fields": ["title", "category"]
       }
     ],
     "tags": ["featured"]
   }
 }
 
 Notes:
 - Use when you need a typed relationship to other Prismic documents.
 - The customtypes array supports per-type field whitelisting via a nested "fields" array (strings or grouped field objects).
 
 ### LinkToMedia
 
 {
   "type": "LinkToMedia",
   "config": {
     "label": "Media link label"
   }
 }
 
 ### Boolean
 
 {
   "type": "Boolean",
   "config": {
     "label": "Boolean label"
   }
 }
 
 ### Number
 
 {
   "type": "Number",
   "config": {
     "label": "Number label",
     "placeholder": "Optional placeholder",
     "min": 0,
     "max": 100,
     "step": 1
   }
 }
 
 Notes:
 - \`min\`, \`max\`, and \`step\` are optional.
 
 ### Select
 
 {
   "type": "Select",
   "config": {
     "label": "Select label",
     "placeholder": "Optional placeholder",
     "options": ["Option A", "Option B", "Option C"],
     "default_value": "Option A"
   }
 }
 
 ### Date
 
 {
   "type": "Date",
   "config": {
     "label": "Date label",
     "placeholder": "Optional placeholder"
   }
 }
 
 ### Timestamp
 
 {
   "type": "Timestamp",
   "config": {
     "label": "Timestamp label",
     "placeholder": "Optional placeholder"
   }
 }
 
 ### Color
 
 {
   "type": "Color",
   "config": {
     "label": "Color label"
   }
 }
 
 ### Embed
 
 {
   "type": "Embed",
   "config": {
     "label": "Embed label",
     "placeholder": "Paste URL or embed code"
   }
 }
 
 ### GeoPoint
 
 {
   "type": "GeoPoint",
   "config": {
     "label": "Location label"
   }
 }
 
 ### Table
 
 {
   "type": "Table",
   "config": {
     "label": "Table label"
   }
 }
 
 ### Group (repeatable set of fields)
 
 {
   "type": "Group",
   "config": {
     "label": "Group label",
     "fields": {
       "field_key": { /* any valid field shape from this section */ }
     }
   }
 }
 
 Notes:
 - Use Group when you need a set of multiple fields to repeat together.
 - Do not use variation-level "items".
 - Do not use Group to model lists of links/buttons—prefer a single repeatable Link field.
 
 ## Implementation Steps [MANDATORY]
 
 1) Create the directory \`src/slices/${sliceName}/\` if it doesn't exist
 2) Create \`model.json\` with the structure above
 3) Ensure:
    - Name is PascalCase (e.g., ${sliceName})
    - ID is kebab-case (e.g., slice-name)
    - No "items" is present on any variation
 
 ## Content Analysis Guidelines [MANDATORY]
 
 - Text-based: derive fields from the description
 - Image-based: derive fields from visual elements
 - Image reference with text clarification: combine image analysis with the provided text
 - Map content to fields:
   - Text content → StructuredText or Text
   - Images → Image (use Group if images must repeat with additional data)
   - Buttons/links → Link with "repeat: true" for lists and "variants" when styles are needed
   - Layout differences → additional variations (if necessary)
 
 ## Example Patterns (do NOT auto-apply) [MANDATORY]
 
 ### Hero
 
 {
   "primary": {
     "title": {
       "type": "StructuredText",
       "config": { "label": "Title", "single": "heading1" }
     },
     "description": {
       "type": "StructuredText",
       "config": { "label": "Description", "single": "paragraph" }
     },
     "cta": {
       "type": "Link",
       "config": {
         "label": "CTA Button",
         "allowText": true,
         "allowTargetBlank": true,
         "repeat": false,
         "variants": ["Primary", "Secondary"]
       }
     },
     "cta_list": {
       "type": "Link",
       "config": {
         "label": "CTA Buttons",
         "allowText": true,
         "allowTargetBlank": true,
         "repeat": true,
         "variants": ["Primary", "Secondary"]
       }
     }
   }
 }
 
 ### Feature grid (repeatable grouped items)
 
 {
   "primary": {
     "features": {
       "type": "Group",
       "config": {
         "label": "Features",
         "fields": {
           "icon": { "type": "Image", "config": { "label": "Icon" } },
           "title": { "type": "Text", "config": { "label": "Title" } },
           "description": { "type": "StructuredText", "config": { "label": "Description", "single": "paragraph" } }
         }
       }
     }
   }
 }
 
 ### Template usage policy
 - Do not auto-pick templates. Prioritize the user's prompt/image.
 - Use examples as reference only; customize to the request.
 
 ## Validation and Testing [MANDATORY]
 
 - JSON is valid
 - Name is PascalCase, ID is kebab-case
 - No "items" present; repeatables modeled via Link repeat or Group
 - Link lists use "repeat: true"; button styles via "variants"
 
 ## Final Instructions [MANDATORY]
 
 - Focus only on model.json
 - Do NOT add "items" to variations
 - Prefer Link "repeat" for lists of links; use Group for repeatable multi-field items
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
