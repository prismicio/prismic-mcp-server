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
 
 ## Request Analysis [MANDATORY]
 - **Slice Name**: ${sliceName}
 - **Request Type**: ${requestType === "text" ? "Text-based description" : requestType === "image" ? "Image reference" : "Image reference with text clarification"}
 - **Operation**: ${isNewSlice ? "Creating new slice" : "Updating existing slice"}
 - **Content Requirements**: ${contentRequirements}
 
 ## Naming Conventions [MANDATORY]
 
 ### Slice ID
 - MUST be kebab-case of the slice name, e.g., "slice-name"
 - Used as the model's "id" field
 
 
 ## Opinionated Modeling Guidance (Prismic best practices) [MANDATORY]

- Prefer simple, predictable models that align with Prismic’s latest DX.
- When modeling, review other existing slices for inspiration and consistency, but always tailor the model to the specific requirements of this slice.
- Avoid legacy constructs; follow guidance in the relevant sections below.
 
 ## File Paths [MANDATORY]
 
 - Slice directory: ${sliceLibraryAbsolutePath}/${sliceName}
 - Model file: ${sliceLibraryAbsolutePath}/${sliceName}/model.json
 
 ## Model.json Structure [MANDATORY]
 
 ### Basic Structure
 
 {
   "id": "${sliceName
			.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
			.replace(/_/g, "-")
			.toLowerCase()}",
   "type": "SharedSlice",
   "name": "${sliceName}",
   "description": "A ${contentRequirements.toLowerCase()}",
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
 
 ## Field Types [MANDATORY]
 
 The following are the valid field types for slice "primary" and their JSON shapes with supported configuration options. Only use these types.
 
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
 - If "select" is "document", use "customtypes" to scope allowed documents.
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
 - Do not use Group to model lists of links/buttons—prefer a single repeatable Link field.
 
 ## Implementation Steps [MANDATORY]
 
 1) Create the slice directory (if it doesn't exist)
 2) Create or update the model.json with the structure above inside the slice directory
 
 ## Content Analysis Guidelines [MANDATORY]
 
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
 
 ## Final Instructions [MANDATORY]
 
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
