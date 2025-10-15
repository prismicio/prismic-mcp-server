/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join as joinPath } from "node:path"

import { SharedSliceMock } from "@prismicio/mocks"
import { z } from "zod"

import { formatDecodeError, formatErrorForMcpTool } from "../lib/error"
import { tool } from "../lib/mcp"
import { trackSentryError } from "../lib/sentry"
import {
	getResolvedLibraries,
	initializeSliceMachineManager,
	resolveAbsoluteLibraryID,
} from "../lib/sliceMachine"
import {
	ContentPath,
	SharedSliceContent,
	traverseSharedSliceContent,
} from "@prismicio/types-internal/lib/content"
import {
	CustomType,
	type FieldType,
	SharedSlice,
} from "@prismicio/types-internal/lib/customtypes"

import { server, telemetryClient } from "../server"

export const create_slice = tool(
	"create_slice",
	`PURPOSE: Autonomously creates a complete Prismic slice including model, component code, and mocks in a single operation using AI sampling.

USAGE: Use when you want to create a new slice from scratch without manual intervention. This tool orchestrates the entire workflow.

RETURNS: Success confirmation with details of created slice, or detailed error messages if any stage fails.`,
	z.object({
		sliceMachineConfigAbsolutePath: z
			.string()
			.describe(
				"Absolute path to slicemachine.config.json file in the project",
			),
		sliceName: z
			.string()
			.regex(
				/^[A-Z][a-zA-Z0-9]*$/,
				"Slice name must be PascalCase: start with an uppercase letter, contain only letters and numbers, and no special characters.",
			)
			.describe(
				"The name of the slice in PascalCase, e.g., 'HeroSection', 'TestimonialCard'",
			),
		contentRequirements: z
			.string()
			.describe(
				"Detailed description of what content the slice should contain (e.g., 'hero section with title, description, CTA button, and background image')",
			),
		projectFramework: z
			.enum(["next", "nuxt", "sveltekit"])
			.describe("Project framework: Next.js, Nuxt, or SvelteKit"),
		stylingSystem: z
			.string()
			.describe(
				"Detected styling system in the project (e.g., 'vanilla-css', 'tailwind', 'css-modules', 'styled-components', 'emotion', 'sass')",
			),
		inputTypes: z
			.array(z.enum(["text", "image", "code"]))
			.nonempty()
			.describe("The kinds of input present in the prompt"),
		customTypeDirectoryAbsolutePath: z
			.string()
			.optional()
			.describe(
				"Optional: Absolute path to custom type directory to automatically register this slice",
			),
	}).shape,
	async (args) => {
		try {
			const {
				sliceMachineConfigAbsolutePath,
				sliceName,
				contentRequirements,
				projectFramework,
				stylingSystem,
				inputTypes,
				customTypeDirectoryAbsolutePath,
			} = args

			try {
				telemetryClient.track({
					event: "MCP Tool - Create slice",
					sliceMachineConfigAbsolutePath,
					properties: {
						sliceName,
						contentRequirements,
						projectFramework,
						stylingSystem,
						inputTypes,
						hasCustomType: !!customTypeDirectoryAbsolutePath,
					},
				})
			} catch (error) {
				if (process.env.PRISMIC_DEBUG) {
					console.error("Error while tracking 'create_slice' tool call:", error)
				}
			}

			// Resolve library paths
			let resolvedLibraryAbsolutePaths: string[]
			try {
				resolvedLibraryAbsolutePaths = getResolvedLibraries(
					sliceMachineConfigAbsolutePath,
				)
			} catch {
				return {
					content: [
						{
							type: "text" as const,
							text: `Could not read or parse slicemachine.config.json at "${sliceMachineConfigAbsolutePath}". Ensure it exists and includes a non-empty "libraries" array.`,
						},
					],
				}
			}

			const sliceDirectoryPath = joinPath(
				resolvedLibraryAbsolutePaths[0],
				sliceName,
			)
			const sliceId = toSnakeCase(sliceName)

			// Check if slice already exists
			if (existsSync(sliceDirectoryPath)) {
				return {
					content: [
						{
							type: "text" as const,
							text: `A slice named "${sliceName}" already exists at ${sliceDirectoryPath}. Please choose a different name or delete the existing slice.`,
						},
					],
				}
			}

			const report: string[] = []
			report.push(`# Creating Slice: ${sliceName}`)
			report.push(`Location: ${sliceDirectoryPath}`)
			report.push("")

			// ==========================================
			// STAGE 1: Generate Model with AI Sampling
			// ==========================================
			report.push("## Stage 1: Generating Model")

			const modelingGuidance = generateModelingGuidance(
				sliceName,
				sliceId,
				contentRequirements,
				inputTypes,
			)

			let modelJSON: any = null
			let modelAttempts = 0
			const maxModelAttempts = 3

			while (modelAttempts < maxModelAttempts && !modelJSON) {
				modelAttempts++
				report.push(
					`Attempt ${modelAttempts}/${maxModelAttempts}: Requesting AI to generate model...`,
				)

				try {
					const modelPrompt =
						modelAttempts === 1
							? `${modelingGuidance}

Please generate a complete, valid Prismic slice model in JSON format. Return ONLY the JSON object, no markdown formatting, no explanations.`
							: `${modelingGuidance}

Previous attempt failed with error. Please generate a complete, valid Prismic slice model in JSON format.
Previous errors to fix:
${modelJSON?.error || "Invalid JSON structure"}

Return ONLY the JSON object, no markdown formatting, no explanations.`

					const response = await server.server.createMessage({
						messages: [
							{
								role: "user",
								content: {
									type: "text",
									text: modelPrompt,
								},
							},
						],
						maxTokens: 4000,
					})

					const aiResponse =
						response.content.type === "text" ? response.content.text : ""

					// Try to extract JSON from response
					let jsonStr = aiResponse.trim()

					// Remove markdown code blocks if present
					if (jsonStr.startsWith("```")) {
						jsonStr = jsonStr
							.replace(/^```(?:json)?\s*\n/, "")
							.replace(/\n```$/, "")
					}

					try {
						modelJSON = JSON.parse(jsonStr)
						report.push("✓ Model JSON generated successfully")
					} catch (parseError) {
						modelJSON = {
							error: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
						}
						report.push(
							`✗ Failed to parse JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
						)
					}
				} catch (samplingError) {
					report.push(
						`✗ Sampling error: ${samplingError instanceof Error ? samplingError.message : String(samplingError)}`,
					)
					modelJSON = {
						error: `Sampling failed: ${samplingError instanceof Error ? samplingError.message : String(samplingError)}`,
					}
				}
			}

			if (!modelJSON || modelJSON.error) {
				return {
					content: [
						{
							type: "text" as const,
							text:
								report.join("\n") +
								"\n\n✗ Failed to generate valid model after maximum attempts.",
						},
					],
				}
			}

			// ==========================================
			// STAGE 2: Validate and Save Model
			// ==========================================
			report.push("")
			report.push("## Stage 2: Validating and Saving Model")

			let saveAttempts = 0
			const maxSaveAttempts = 3
			let modelSaved = false

			while (saveAttempts < maxSaveAttempts && !modelSaved) {
				saveAttempts++
				report.push(
					`Attempt ${saveAttempts}/${maxSaveAttempts}: Validating model...`,
				)

				const validationResult = SharedSlice.decode(modelJSON)

				if (validationResult._tag === "Left") {
					const errors = validationResult.left.map(formatDecodeError).join("\n")
					report.push(`✗ Validation errors:\n${errors}`)

					if (saveAttempts < maxSaveAttempts) {
						// Use AI to fix validation errors
						try {
							const fixPrompt = `The following Prismic slice model has validation errors:

${JSON.stringify(modelJSON, null, 2)}

Validation errors:
${errors}

Please fix these validation errors and return a corrected, complete, valid Prismic slice model in JSON format. Return ONLY the JSON object, no markdown formatting, no explanations.`

							const response = await server.server.createMessage({
								messages: [
									{
										role: "user",
										content: {
											type: "text",
											text: fixPrompt,
										},
									},
								],
								maxTokens: 4000,
							})

							const aiResponse =
								response.content.type === "text" ? response.content.text : ""
							let jsonStr = aiResponse.trim()

							if (jsonStr.startsWith("```")) {
								jsonStr = jsonStr
									.replace(/^```(?:json)?\s*\n/, "")
									.replace(/\n```$/, "")
							}

							modelJSON = JSON.parse(jsonStr)
							report.push("AI generated corrected model")
						} catch (error) {
							report.push(
								`✗ Failed to fix model: ${error instanceof Error ? error.message : String(error)}`,
							)
						}
					}

					continue
				}

				const slice = validationResult.right

				// Additional validations
				if (!isValidSliceName(slice.name)) {
					report.push(
						`✗ Invalid slice name "${slice.name}". Must be PascalCase.`,
					)
					if (saveAttempts < maxSaveAttempts) {
						modelJSON.name = sliceName
						report.push(`Corrected slice name to "${sliceName}"`)
						continue
					}
					break
				}

				if (!isValidSliceId(slice.id)) {
					report.push(`✗ Invalid slice ID "${slice.id}". Must be snake_case.`)
					if (saveAttempts < maxSaveAttempts) {
						modelJSON.id = sliceId
						report.push(`Corrected slice ID to "${sliceId}"`)
						continue
					}
					break
				}

				// Check variation IDs
				const invalidVariationIds = slice.variations
					.map((variation) => variation.id)
					.filter((variationId) => !isValidVariationId(variationId))

				if (invalidVariationIds.length > 0) {
					report.push(
						`✗ Invalid variation IDs: ${invalidVariationIds.join(", ")}. Must be camelCase.`,
					)
					if (saveAttempts < maxSaveAttempts) {
						// Try to fix variation IDs
						for (const variation of slice.variations) {
							if (!isValidVariationId(variation.id)) {
								const fixedId = variation.id
									.replace(/[^a-zA-Z0-9]/g, "")
									.replace(/^[A-Z]/, (c) => c.toLowerCase())
								modelJSON.variations.find(
									(v: any) => v.id === variation.id,
								).id = fixedId
								report.push(
									`Corrected variation ID from "${variation.id}" to "${fixedId}"`,
								)
							}
						}
						continue
					}
					break
				}

				// Check for deprecated items field
				const hasItems = slice.variations.some((variation) => {
					const items = variation.items

					return Array.isArray(items) && items.length > 0
				})
				if (hasItems) {
					report.push(
						'✗ Model uses deprecated "items" field. Please use Group field instead.',
					)
					if (saveAttempts < maxSaveAttempts) {
						report.push(
							"This would require restructuring. Continuing with items for now...",
						)
					}
				}

				// Save the model
				try {
					const libraryID = resolveAbsoluteLibraryID({
						sliceMachineConfigAbsolutePath,
						libraryAbsolutePath: dirname(sliceDirectoryPath),
					}).libraryID

					if (!libraryID) {
						throw new Error("Could not resolve library ID")
					}

					const manager = await initializeSliceMachineManager({
						sliceMachineConfigAbsolutePath,
					})

					await manager.slices.createSlice({ model: slice, libraryID })

					modelSaved = true
					report.push("✓ Model validated and saved successfully")
				} catch (saveError) {
					report.push(
						`✗ Failed to save model: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
					)
					if (saveAttempts >= maxSaveAttempts) {
						break
					}
				}
			}

			if (!modelSaved) {
				return {
					content: [
						{
							type: "text" as const,
							text:
								report.join("\n") +
								"\n\n✗ Failed to save model after maximum attempts.",
						},
					],
				}
			}

			// ==========================================
			// STAGE 3: Generate Component Code
			// ==========================================
			report.push("")
			report.push("## Stage 3: Generating Component Code")

			try {
				// Read the saved model
				const modelPath = joinPath(sliceDirectoryPath, "model.json")
				const savedModel = JSON.parse(await fs.readFile(modelPath, "utf8"))

				// Detect field types used in the model
				const fieldTypesUsed = new Set<string>()
				const detectFieldTypes = (fields: Record<string, any>) => {
					for (const field of Object.values(fields)) {
						if (field?.type) {
							switch (field.type) {
								case "Boolean":
									fieldTypesUsed.add("prismic.BooleanField")
									break
								case "Color":
									fieldTypesUsed.add("prismic.ColorField")
									break
								case "Date":
									fieldTypesUsed.add("prismic.DateField")
									break
								case "Embed":
									fieldTypesUsed.add("prismic.EmbedField")
									break
								case "GeoPoint":
									fieldTypesUsed.add("prismic.GeoPointField")
									break
								case "Image":
									fieldTypesUsed.add("prismic.ImageField")
									break
								case "Link":
									fieldTypesUsed.add("prismic.LinkField")
									break
								case "Number":
									fieldTypesUsed.add("prismic.NumberField")
									break
								case "Group":
									fieldTypesUsed.add("prismic.GroupField")
									if (field.config?.fields) {
										detectFieldTypes(field.config.fields)
									}
									break
								case "StructuredText":
									fieldTypesUsed.add("prismic.RichTextField")
									break
								case "Select":
									fieldTypesUsed.add("prismic.SelectField")
									break
								case "Table":
									fieldTypesUsed.add("prismic.TableField")
									break
								case "Text":
									fieldTypesUsed.add("prismic.KeyTextField")
									break
								case "Timestamp":
									fieldTypesUsed.add("prismic.TimestampField")
									break
							}
						}
					}
				}

				for (const variation of savedModel.variations) {
					detectFieldTypes(variation.primary || {})
					if (variation.items) {
						detectFieldTypes(variation.items || {})
					}
				}

				// Fetch field documentation
				const fieldDocs: Record<string, string> = {}
				for (const fieldType of fieldTypesUsed) {
					fieldDocs[fieldType] = await fetchFieldDocumentation(fieldType)
				}

				const fieldDocumentation = Array.from(fieldTypesUsed)
					.map((fieldType) => `### ${fieldType}\n${fieldDocs[fieldType]}`)
					.join("\n\n")

				const codePrompt = `Generate a complete, production-ready component for a Prismic slice with the following specifications:

**Framework**: ${projectFramework}
**Styling System**: ${stylingSystem}
**Slice Name**: ${sliceName}

**Model**:
${JSON.stringify(savedModel, null, 2)}

**Field Documentation**:
${fieldDocumentation}

**Requirements**:
1. All content MUST come from Prismic fields defined in the model
2. Never hardcode visible content
3. Use appropriate Prismic field rendering components
4. Follow ${projectFramework} best practices
5. Use ${stylingSystem} for styling
6. Handle all variations defined in the model
7. Properly type the component using Prismic types
8. Include proper imports
9. Export the component as default

Return ONLY the complete component code, no markdown formatting, no explanations.`

				const response = await server.server.createMessage({
					messages: [
						{
							role: "user",
							content: {
								type: "text",
								text: codePrompt,
							},
						},
					],
					maxTokens: 6000,
				})

				let componentCode =
					response.content.type === "text" ? response.content.text : ""

				// Remove markdown code blocks if present
				if (componentCode.includes("```")) {
					componentCode = componentCode
						.replace(/^```(?:typescript|tsx|jsx|javascript)?\s*\n/, "")
						.replace(/\n```$/, "")
						.trim()
				}

				// Determine file extension based on framework
				const fileExtension =
					projectFramework === "next"
						? "tsx"
						: projectFramework === "nuxt"
							? "vue"
							: "svelte"
				const componentPath = joinPath(
					sliceDirectoryPath,
					`index.${fileExtension}`,
				)

				await fs.writeFile(componentPath, componentCode, "utf8")
				report.push(
					`✓ Component code generated and saved to index.${fileExtension}`,
				)
			} catch (codeError) {
				report.push(
					`✗ Failed to generate component code: ${codeError instanceof Error ? codeError.message : String(codeError)}`,
				)
				// Continue anyway - we have the model
			}

			// ==========================================
			// STAGE 4: Generate Mocks
			// ==========================================
			report.push("")
			report.push("## Stage 4: Generating Mocks")

			try {
				const modelPath = joinPath(sliceDirectoryPath, "model.json")
				const savedModel = JSON.parse(await fs.readFile(modelPath, "utf8"))
				const decodedModel = SharedSlice.decode(savedModel)

				if (decodedModel._tag === "Left") {
					throw new Error("Invalid saved model for mock generation")
				}

				const model = decodedModel.right

				// Generate base mocks
				const baseMocks = model.variations.map((variation) =>
					SharedSliceMock.generate(model, {
						type: "SharedSlice",
						variation: variation.id,
					}),
				)

				const mockPrompt = `Enhance the following Prismic slice mocks with realistic, contextual content:

**Slice**: ${sliceName}
**Purpose**: ${contentRequirements}

**Base Mocks**:
${JSON.stringify(baseMocks, null, 2)}

**Requirements**:
1. Keep the exact structure and field keys
2. Update only textual values (Text, StructuredText/RichText fields)
3. Use natural, relevant text appropriate to the slice purpose
4. For repeatable fields (Groups, repeatable Links), use 2-3 items with varied content
5. Do NOT change Select options, link variants, or other config-driven values
6. Ensure all text feels professional and realistic

Return ONLY the enhanced mocks JSON array, no markdown formatting, no explanations.`

				const response = await server.server.createMessage({
					messages: [
						{
							role: "user",
							content: {
								type: "text",
								text: mockPrompt,
							},
						},
					],
					maxTokens: 4000,
				})

				let mocksJSON =
					response.content.type === "text" ? response.content.text : ""

				// Remove markdown code blocks if present
				if (mocksJSON.startsWith("```")) {
					mocksJSON = mocksJSON
						.replace(/^```(?:json)?\s*\n/, "")
						.replace(/\n```$/, "")
						.trim()
				}

				const enhancedMocks = JSON.parse(mocksJSON)
				const mocksPath = joinPath(sliceDirectoryPath, "mocks.json")
				await fs.writeFile(
					mocksPath,
					JSON.stringify(enhancedMocks, null, "\t"),
					"utf8",
				)
				report.push("✓ Mocks generated and saved")
			} catch (mockError) {
				report.push(
					`✗ Failed to generate mocks: ${mockError instanceof Error ? mockError.message : String(mockError)}`,
				)
			}

			// ==========================================
			// STAGE 5: Verify Mocks
			// ==========================================
			report.push("")
			report.push("## Stage 5: Verifying Mocks")

			let verifyAttempts = 0
			const maxVerifyAttempts = 2
			let mocksValid = false

			while (verifyAttempts < maxVerifyAttempts && !mocksValid) {
				verifyAttempts++
				report.push(
					`Attempt ${verifyAttempts}/${maxVerifyAttempts}: Validating mocks...`,
				)

				try {
					const mocksPath = joinPath(sliceDirectoryPath, "mocks.json")
					const mocksJSON = JSON.parse(await fs.readFile(mocksPath, "utf8"))

					// Validate mocks structure
					const mocksSchema = z.array(
						z.unknown().transform((content, ctx) => {
							const result = SharedSliceContent.decode(content)
							if (result._tag === "Left") {
								for (const error of result.left) {
									ctx.addIssue({
										code: z.ZodIssueCode.custom,
										message: formatDecodeError(error),
									})
								}

								return z.NEVER
							}

							return result.right
						}),
					)

					const parsedMocks = mocksSchema.safeParse(mocksJSON)
					if (!parsedMocks.success) {
						throw new Error(`Invalid mocks.json: ${parsedMocks.error.message}`)
					}

					const modelPath = joinPath(sliceDirectoryPath, "model.json")
					const modelJSON = JSON.parse(await fs.readFile(modelPath, "utf8"))
					const parsedModel = SharedSlice.decode(modelJSON)

					if (parsedModel._tag === "Left") {
						throw new Error("Invalid model for mock validation")
					}

					// Validate mocks against model
					const errors: string[] = []
					const mocks = parsedMocks.data

					for (const [index, mock] of mocks.entries()) {
						const variationId = mock.variation
						const variation = parsedModel.right.variations.find(
							(v) => v.id === variationId,
						)

						if (!variation) {
							errors.push(
								`Unknown variation "${variationId}" for mock at index ${index}`,
							)
							continue
						}

						traverseSharedSliceContent({
							path: [],
							sliceKey: parsedModel.right.id + index,
							sliceName: parsedModel.right.name,
							model: {
								type: "SharedSlice",
								sliceName: parsedModel.right.name,
								variationId: variation.id,
								fields: {
									primary: variation.primary,
									items: variation.items,
								},
							},
							content: {
								key: variation.id + index,
								name: variation.name,
								maybeLabel: undefined,
								widget: mock,
							},
						})(
							({ path, model, content }) => {
								const addError = (expectedType: FieldType) => {
									if (model?.type === expectedType) {
										return
									}
									errors.push(
										`${content.__TYPE__} at path ${ContentPath.serialize(path)} is not a ${expectedType} field for mock at index ${index}`,
									)
								}

								switch (content.__TYPE__) {
									case "BooleanContent":
										addError("Boolean")
										break
									case "EmbedContent":
										addError("Embed")
										break
									case "EmptyContent":
										break
									case "FieldContent":
										addError(content.type)
										break
									case "GeoPointContent":
										addError("GeoPoint")
										break
									case "GroupContentType":
										addError("Group")
										break
									case "ImageContent":
										addError("Image")
										break
									case "IntegrationFieldsContent":
										addError("IntegrationFields")
										break
									case "LinkContent":
									case "RepeatableContent":
										addError("Link")
										break
									case "SeparatorContent":
										addError("Separator")
										break
									case "SliceContentType":
										addError("Slices")
										break
									case "StructuredTextContent":
										addError("StructuredText")
										break
									case "TableContent":
										addError("Table")
										break
									case "UIDContent":
										addError("UID")
										break
								}

								return content
							},
							({ content }) => content,
						)
					}

					if (errors.length > 0) {
						throw new Error(
							`Mock validation errors:\n${errors.map((e) => `- ${e}`).join("\n")}`,
						)
					}

					mocksValid = true
					report.push("✓ Mocks validated successfully")
				} catch (verifyError) {
					report.push(
						`✗ Validation failed: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`,
					)

					if (verifyAttempts < maxVerifyAttempts) {
						// Try to fix mocks with AI
						try {
							const mocksPath = joinPath(sliceDirectoryPath, "mocks.json")
							const currentMocks = await fs.readFile(mocksPath, "utf8")
							const modelPath = joinPath(sliceDirectoryPath, "model.json")
							const modelContent = await fs.readFile(modelPath, "utf8")

							const fixPrompt = `The following Prismic slice mocks have validation errors:

**Model**:
${modelContent}

**Current Mocks**:
${currentMocks}

**Validation Errors**:
${verifyError instanceof Error ? verifyError.message : String(verifyError)}

Please fix these validation errors and return corrected mocks that match the model structure. Return ONLY the JSON array, no markdown formatting, no explanations.`

							const response = await server.server.createMessage({
								messages: [
									{
										role: "user",
										content: {
											type: "text",
											text: fixPrompt,
										},
									},
								],
								maxTokens: 4000,
							})

							let fixedMocksJSON =
								response.content.type === "text" ? response.content.text : ""

							if (fixedMocksJSON.startsWith("```")) {
								fixedMocksJSON = fixedMocksJSON
									.replace(/^```(?:json)?\s*\n/, "")
									.replace(/\n```$/, "")
									.trim()
							}

							await fs.writeFile(mocksPath, fixedMocksJSON, "utf8")
							report.push("AI generated corrected mocks")
						} catch (fixError) {
							report.push(
								`✗ Failed to fix mocks: ${fixError instanceof Error ? fixError.message : String(fixError)}`,
							)
						}
					}
				}
			}

			if (!mocksValid) {
				report.push(
					"⚠ Mocks may have validation issues but proceeding with slice creation",
				)
			}

			// ==========================================
			// STAGE 6: Register to Custom Type (Optional)
			// ==========================================
			if (customTypeDirectoryAbsolutePath) {
				report.push("")
				report.push("## Stage 6: Registering to Custom Type")

				try {
					const sliceModelPath = joinPath(sliceDirectoryPath, "model.json")
					const sliceModelContent = JSON.parse(
						await fs.readFile(sliceModelPath, "utf8"),
					)
					const validatedSliceModel = SharedSlice.decode(sliceModelContent)

					if (validatedSliceModel._tag === "Left") {
						throw new Error("Invalid slice model for registration")
					}

					const slice = validatedSliceModel.right

					const customTypeModelPath = joinPath(
						customTypeDirectoryAbsolutePath,
						"index.json",
					)
					const customTypeModelContent = JSON.parse(
						await fs.readFile(customTypeModelPath, "utf8"),
					)
					const validatedCustomTypeModel = CustomType.decode(
						customTypeModelContent,
					)

					if (validatedCustomTypeModel._tag === "Left") {
						throw new Error("Invalid custom type model")
					}

					const customTypeModel = validatedCustomTypeModel.right

					let sliceAlreadyAdded = false
					const hasSliceZone = Object.values(customTypeModel.json).some(
						(fields) => {
							return Object.values(fields).some((field) => {
								if (field?.type === "Slices") {
									if (
										Object.keys(field.config?.choices || {}).includes(slice.id)
									) {
										sliceAlreadyAdded = true
									} else {
										if (!field.config) {
											field.config = {}
										}
										if (!field.config.choices) {
											field.config.choices = {}
										}
										field.config.choices[slice.id] = {
											type: slice.type,
										}
									}

									return true
								}

								return false
							})
						},
					)

					if (sliceAlreadyAdded) {
						report.push(
							`✓ Slice already registered in custom type "${customTypeModel.id}"`,
						)
					} else {
						if (!hasSliceZone) {
							const firstSection = Object.keys(customTypeModel.json)[0]
							customTypeModel.json[firstSection].slices = {
								type: "Slices",
								fieldset: "Slice Zone",
								config: {
									choices: {
										[slice.id]: {
											type: slice.type,
										},
									},
								},
							}
						}

						const manager = await initializeSliceMachineManager({
							sliceMachineConfigAbsolutePath,
						})
						await manager.customTypes.updateCustomType({
							model: customTypeModel,
						})

						report.push(
							`✓ Slice registered to custom type "${customTypeModel.id}"`,
						)
					}
				} catch (registerError) {
					report.push(
						`⚠ Failed to register to custom type: ${registerError instanceof Error ? registerError.message : String(registerError)}`,
					)
				}
			}

			// ==========================================
			// Final Report
			// ==========================================
			report.push("")
			report.push("## ✓ Slice Creation Complete!")
			report.push(
				`Slice "${sliceName}" has been created at: ${sliceDirectoryPath}`,
			)

			return {
				content: [
					{
						type: "text" as const,
						text: report.join("\n"),
					},
				],
			}
		} catch (error) {
			return formatErrorForMcpTool(error)
		}
	},
)

// Field mapping for documentation (from how_to_code_slice.ts)
const PRISMIC_DOCS_BASE = "https://prismic.io/docs/fields"
const FIELD_MAPPING: Record<string, { path: string; additionalInfo?: string }> =
	{
		"prismic.BooleanField": { path: "boolean" },
		"prismic.ColorField": { path: "color" },
		"prismic.ContentRelationshipField": { path: "content-relationship" },
		ContentRelationshipFieldWithData: { path: "content-relationship" },
		"prismic.DateField": { path: "date" },
		"prismic.EmbedField": { path: "embed" },
		"prismic.GeoPointField": { path: "geopoint" },
		"prismic.ImageField": {
			path: "image",
			additionalInfo:
				"Only apply imgix transformation when explicitly requested by the user.",
		},
		"prismic.IntegrationField": { path: "integration" },
		"prismic.LinkField": { path: "link" },
		"prismic.LinkToMediaField": { path: "link-to-media" },
		"prismic.NumberField": { path: "number" },
		"prismic.GroupField": { path: "repeatable-group" },
		"prismic.RichTextField": { path: "rich-text" },
		"prismic.SelectField": { path: "select" },
		"prismic.TableField": { path: "table" },
		"prismic.TitleField": { path: "rich-text" },
		"prismic.KeyTextField": { path: "text" },
		"prismic.TimestampField": { path: "timestamp" },
	} as const

async function fetchFieldDocumentation(fieldType: string): Promise<string> {
	const field = FIELD_MAPPING[fieldType as keyof typeof FIELD_MAPPING]
	if (!field) {
		return `No documentation available for field type: ${fieldType}`
	}

	const url = `${PRISMIC_DOCS_BASE}/${field.path}.md`

	try {
		const response = await fetch(url)
		if (!response.ok) {
			return `Failed to fetch documentation for ${fieldType}: ${response.status} ${response.statusText}`
		}
		let markdown = await response.text()

		if (field.additionalInfo) {
			markdown += `\n**Additional Information:** \n${field.additionalInfo}`
		}

		return markdown
	} catch (error) {
		const errorMessage = `Error fetching documentation for ${fieldType}: ${error instanceof Error ? error.message : String(error)}`
		trackSentryError({
			error: new Error(errorMessage),
			toolName: "create_slice",
		})

		return errorMessage
	}
}

function toSnakeCase(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/[\s-]+/g, "_")
		.toLowerCase()
}

function isValidSliceId(sliceId: string): boolean {
	return /^[a-z0-9][a-z0-9_]*$/.test(sliceId)
}

function isValidVariationId(variationId: string): boolean {
	return /^[a-z][a-zA-Z0-9]*$/.test(variationId)
}

function isValidSliceName(sliceName: string): boolean {
	return /^[A-Z][a-zA-Z0-9]*$/.test(sliceName)
}

function generateModelingGuidance(
	sliceName: string,
	sliceId: string,
	contentRequirements: string,
	inputTypes: string[],
): string {
	return `# How to Model a Prismic Slice

## Request Analysis
- **Slice Name**: ${sliceName}
- **Slice ID**: ${sliceId}
- **Input Types**: ${inputTypes.join(" + ")}
- **Content Requirements**: ${contentRequirements}

## Naming Conventions

### Slice ID
- MUST be snake_case: "${sliceId}"
- Used as the model's "id" field

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

## Important Rules

1. DO NOT use "items" field - it's deprecated
2. Use Group for repeating content
3. Use Link with repeat: true for multiple buttons
4. Only model editor-controlled content
5. Keep it simple and predictable`
}
