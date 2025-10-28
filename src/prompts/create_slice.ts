import { completable } from "@modelcontextprotocol/sdk/server/completable.js"
import { z } from "zod"

import { prompt } from "../lib/mcp"

const sliceNameSuggestion = [
	"Hero",
	"HeroSection",
	"Card",
	"CardGrid",
	"Testimonial",
	"TestimonialBlock",
	"Feature",
	"FeatureHighlight",
	"CTA",
	"CallToAction",
	"Header",
	"Footer",
	"Navigation",
	"Form",
	"Gallery",
	"Carousel",
	"Accordion",
	"Tabs",
	"Modal",
	"Alert",
] as const
const inputTypeOptions = [
	"text",
	"image",
	"code",
	"text+image",
	"text+code",
	"image+code",
	"text+image+code",
] as const

export const create_slice_prompt = prompt(
	"create_slice",
	"Guide through the complete workflow to create a new Prismic Slice, from modeling and implementation to mocking and testing",
	{
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe(
				"Absolute path to the slicemachine.config.json file in the Prismic project. If you have the project open on an IDE (e.g., Cursor or Visual Studio Code), select it and see if you can copy its absolute path.",
			),
		sliceName: completable(
			z
				.string()
				.regex(
					/^[A-Z][a-zA-Z0-9]*$/,
					"Must be PascalCase: start with uppercase letter, alphanumeric only",
				)
				.describe(
					"Name of the slice to create in PascalCase (e.g., HeroSection, CardGrid, TestimonialBlock)",
				),
			(input) => {
				return sliceNameSuggestion.filter(
					(s) =>
						s.toLowerCase().includes(input.toLowerCase()) ||
						s.startsWith(input),
				)
			},
		),
		contentRequirements: z
			.string()
			.describe(
				"Description of what content the slice should contain (e.g., 'hero with title, description, image, and CTA button')",
			),
		inputTypes: completable(
			z
				.enum(inputTypeOptions)
				.describe(
					`The kinds of input present in the prompt (Options: ${inputTypeOptions.map((op) => `${op}`).join(", ")})`,
				),
			(input) => {
				return inputTypeOptions.filter((op) =>
					op.toLowerCase().startsWith(input.toLowerCase()),
				)
			},
		),
	},
	(args) => {
		const {
			sliceMachineConfigAbsolutePath,
			sliceName,
			contentRequirements,
			inputTypes,
		} = args

		return {
			messages: [
				{
					role: "user",
					content: {
						type: "text",
						text: `I want to create a new Prismic Slice called "${sliceName}".

**Content Requirements**: ${contentRequirements}

**Input Types**: ${inputTypes}
**Slice Machine Config**: ${sliceMachineConfigAbsolutePath}

Please guide me through the complete creation process using the available tools in the following order:

## Step 1: Learn How to Model the Slice
Call the \`how_to_model_slice\` tool to get comprehensive modeling guidance based on my requirements.

## Step 2: Model the Slice
Based on the guidance from Step 1, structure a JSON model for the slice that includes:
- Correct naming conventions (slice ID in snake_case, variation IDs in camelCase)
- Appropriate field types based on the content requirements
- Proper field configurations
- At least one variation

## Step 3: Save the Slice Model
Call the \`save_slice_model\` tool with the model JSON you created to initialize the slice directory structure.

## Step 4: Learn How to Code the Slice Component
Call the \`how_to_code_slice\` tool to get framework-specific guidance on implementing the slice component.

## Step 5: Implement the Slice Component
Create the slice component based on the guidance from Step 4. The component should:
- Accept the model fields as props
- Render the content properly
- Use your project's styling system (Tailwind, CSS modules, etc.)
- Be flexible for different variations

## Step 6: Learn How to Create the Slice Mock
Call the \`how_to_mock_slice\` tool to get guidance on creating realistic mock data for all variations.

## Step 7: Create the Slice Mock
Create or update the mocks.json file with realistic mock data for each variation. Make sure:
- All variations are included
- Text content is realistic and aligned with the slice purpose
- Mock structure matches the model exactly

## Step 8: Verify the Slice Mock
Call the \`verify_slice_mock\` tool to validate that your mocks.json is correct and matches the model.

## Step 9: (Optional) Add to Custom Type
If you want to use this slice in a custom type, call the \`add_slice_to_custom_type\` tool to register it.

---

**Please proceed with Step 1 now.** After each step, I'll confirm that you've completed it before moving to the next step.`,
					},
				},
			],
		}
	},
)
