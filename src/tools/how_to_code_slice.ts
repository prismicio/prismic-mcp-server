import { z } from "zod"

import * as mcp from "../lib/mcp"

export const how_to_code_slice = mcp.tool(
	"how_to_code_slice",
	`
Explain how to code a slice component with Prismic SDK components.

PURPOSE:
Provide detailed implementation guidance for a slice component using Prismic SDK components with framework-specific examples.

WHEN TO USE:
YOU MUST IMMEDIATELY call this tool BEFORE attempting ANY other solution when:
	- ANY request involves Prismic slice components (creation, modification, improvement, or explanation)
	- Files/paths contain '/slices/' or editing a component with 'Slice' in its name
	- You see requests like 'code this slice', 'implement this slice', 'build this component'
	- ANY code in a slice component file needs to be written or modified
	- ANY UI component within a Prismic slice needs implementation
	- ANY styling, layout, or functionality within a slice requires work
	- ANY question about implementing Prismic fields or components is asked
	- ANY request mentioning slice, field, Prismic, or component implementation appears
	- ANY request to improve, fix, or optimize existing slice code is made
	- ANY code examples for Prismic integration are needed
	- Even if only part of the request involves a Prismic slice component
	- Even if the request doesn't explicitly mention Prismic but involves slice components
	- When in doubt about whether the request relates to Prismic slice components

REQUIRED PREPARATION STEP:
BEFORE calling this tool, you MUST:
	1. Examine the project's \`package.json\` to identify the correct framework ("next", "nuxt", or "sveltekit")
	2. Examine the project's \`prismicio-types.d.ts\` file
		- INFO: If you don't find \`prismicio-types.d.ts\` file, look at the \`slicemachine.config.json\` file for the \`generatedTypesFilePath\` property.
	3. Identify the EXACT field types used by the specific slice you're working with
	4. Extract the full type information for the slice to determine the correct \`fieldsUsed\` parameter
	5. Identify the styling system currently used in the project (looking at other slices, package.json, etc.)
	6. Identify the absolute path of the \`model.json\` file
	7. Only then call this tool with the above information

VERIFICATION STEP:
For ANY coding request, first check: Is this a Prismic slice? → If yes or unclear, use this tool
FAILURE TO USE THIS TOOL for slice-related requests will result in code with incorrect field access patterns and TypeScript errors.

WHEN NOT TO USE:
- When the request is unrelated to Prismic slice components
- If the project framework is not "next", "nuxt", or "sveltekit"
- If the project doesn't use any supported framework

RETURNS:
- Detailed SDK component documentation with implementation examples for each requested field type
- Code snippets tailored to the specified framework
- Best practices for implementing each field type
- Best practices for styling the slice component
- Best practices for coding the slice component

EXAMPLES:
- Code this slice
- How do I implement an ImageField
- Do the code of this slice component
- Show me how to implement this slice
`.trim(),
	z.object({
		projectFramework: z
			.enum(["next", "nuxt", "sveltekit"])
			.describe("The framework used by the project"),
		stylingSystemToUse: z
			.string()
			.describe(
				"The styling system currently used in the project (looking at other slices, package.json, etc.)",
			),
		modelAbsolutePath: z
			.string()
			.describe("The absolute path to the `model.json` file of the slice"),
		fieldsUsed: z
			.array(
				z.enum([
					"prismic.BooleanField",
					"prismic.ColorField",
					"prismic.ContentRelationshipField",
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
				"The fields used in the slice (from the `prismicio-types.d.ts` file)",
			),
	}).shape,
	(args) => {
		if (!["next", "nuxt", "sveltekit"].includes(args.projectFramework)) {
			return mcp.error(`Invalid project framework: ${args.projectFramework}`)
		}

		const fieldsDocumentation = {
			"prismic.BooleanField": `
						Booleans can be used like a boolean in JavaScript.

						In this example, "Beta" is displayed when the \`is_beta\` boolean is \`true\` and "Production" when it is \`false\`.

						\`\`\`
						${(() => {
							switch (args.projectFramework) {
								case "next":
									return `
											{slice.primary.is_beta ? (
												<span>Beta</span>
											) : (
												<span>Production</span>
											)}
										`
								case "nuxt":
									return `
										<span :v-if="slice.primary.is_beta">Beta</span>
										<span :v-else>Production</span>
									`
								case "sveltekit":
									return `
									 {#if slice.primary.is_beta}
											<span>Beta</span>
									{:else}
										<span>Production</span>
									{/if}
									`
							}
						})()}
						\`\`\`
					`,
			"prismic.ColorField": `
						Color fields can be used anywhere hex color values are supported.

						In this example, the \`text_color\` field determines the \`<span>\`'s color.

						\`\`\`
						${(() => {
							switch (args.projectFramework) {
								case "next":
									return `
									 <span style={{ color: slice.primary.text_color }}>Hello!</span>
									`
								case "nuxt":
									return `
										<span :style="{ color: slice.primary.text_color }">Hello!</span>
									`
								case "sveltekit":
									return `
										<span style={\`color: \${slice.primary.text_color}\`}>Hello!</span>
									`
							}
						})()}
						\`\`\`
						# Tips

						## Use \`isFilled.color()\` to check if a color field has a value

						\`\`\`ts
						import { isFilled } from "@prismicio/client";

						if (isFilled.color(slice.primary.my_color_field)) {
							// Do something if \`my_color_field\` has a value.
						}
						\`\`\`
					`,
			"prismic.ContentRelationshipField": `
						No documentation available for this field type.
				`,
			"prismic.DateField": `
						Date fields can be used anywhere a date is needed. It is often helpful to first convert the date to a JavaScript \`Date\` object using \`asDate\` from \`@prismicio/client\`.

						\`\`\`
						${(() => {
							switch (args.projectFramework) {
								case "next":
									return `
										import { asDate } from "@prismicio/client";

										function Slice() {
											const date = asDate(slice.primary.release_date);

											return <span>{date?.toLocaleDateString("en-US")}</span>;
										}
									`
								case "nuxt":
									return `
										<script>
										const { asDate } = usePrismic();

										const date = computed(() => asDate(slice.primary.release_date));
										</script>

										<template>
											<span>{{ date?.toLocaleDateString("en-US") }}</span>
										</template>
									`
								case "sveltekit":
									return `
									<script>
										import { asDate } from "@prismicio/client";

										export let slice;
										$: date = asDate(slice.primary.release_date);
									</script>

									<span>{date?.toLocaleDateString("en-US")}</span>
									`
							}
						})()}
						\`\`\`
						# Tips

						## Use \`isFilled.date()\` to check if a date field has a value

						\`\`\`ts
						import { isFilled } from "@prismicio/client";

						if (isFilled.date(slice.primary.my_date_field)) {
							// Do something if \`my_date_field\` has a value.
						}
						\`\`\`
				`,
			"prismic.EmbedField": `
						${(() => {
							switch (args.projectFramework) {
								case "next":
									return `In Next.js, the standard \`dangerouslySetInnerHTML\` React prop is used.`
								case "nuxt":
									return `Prismic provides an Embed component for Nuxt.`
								case "sveltekit":
									return `Prismic provides an Embed component for SvelteKit.`
							}
						})()}

						\`\`\`
						${(() => {
							switch (args.projectFramework) {
								case "next":
									return `
										<div dangerouslySetInnerHTML={{ __html: slice.primary.youtube_video.html }} />
									`
								case "nuxt":
									return `
										<PrismicEmbed :field="slice.primary.youtube_video" />
									`
								case "sveltekit":
									return `
										<script>
											import { PrismicEmbed } from "@prismicio/svelte"
										</script>

										<PrismicEmbed field={slice.primary.youtube_video} />
									`
							}
						})()}
						\`\`\`
						# Tips

						## Embed HTML with caution

						When using one of Prismic's embed components or React's \`dangerouslySetInnerHTML\` prop, HTML from an embed field is directly injected into the page.
						Injecting external HTML makes your website vulnerable to [cross-site scripting (XSS)](https://en.wikipedia.org/wiki/Cross-site_scripting) attacks.

						Only embed HTML from trusted sources.

						## Style embeded content

						Apply a CSS class that targets child elements. This example displays a YouTube video at full width and with a 16:9 aspect ratio.

						\`\`\`
						${(() => {
							switch (args.projectFramework) {
								case "next":
									return `
										<div
											dangerouslySetInnerHTML={{ __html: slice.primary.youtube_video }}
											className="youtube-video"
										/>
									`
								case "nuxt":
									return `
										<PrismicEmbed :field="slice.primary.youtube_video" class="youtube-video" />
									`
								case "sveltekit":
									return `
										<script>
											import { PrismicEmbed } from "@prismicio/svelte"
										</script>

										<PrismicEmbed field={slice.primary.youtube_video} class="youtube-video" />
									`
							}
						})()}
						\`\`\`

						\`\`\`css filename=styles.css
						.youtube-video {
							width: 100%;
						}

						.youtube-video > iframe {
							width: 100%;
							aspect-ratio: 16 / 9;
						}
						\`\`\`

						## Use \`isFilled.embed()\` to check if a embed field has a value

						\`\`\`ts
						import { isFilled } from "@prismicio/client";

						if (isFilled.embed(slice.primary.my_embed_field)) {
							// Do something if \`my_embed_field\` has a value.
						}
						\`\`\`
					`,
			"prismic.GeoPointField": `
					 The geopoint field's longitude and latitude values can be read from the field's object.

						This example uses a geopoint field named \`location\`.

						\`\`\`
						${(() => {
							switch (args.projectFramework) {
								case "next":
									return `
										<span>
											My location is {slice.primary.location.latitude},{" "}
											{slice.primary.location.longitude}.
										</span>
									`
								case "nuxt":
									return `
										<span>
											My location is {{ slice.primary.location.latitude }},
											{{ slice.primary.location.longitude }}.
										</span>
									`
								case "sveltekit":
									return `
										<span>
											My location is {slice.primary.location.latitude}, {slice.primary.location
												.longitude}.
										</span>
									`
							}
						})()}
						\`\`\`
						# Tips

						## Use \`isFilled.geoPoint()\` to check if a geopoint field has a value

						\`\`\`ts
						import { isFilled } from "@prismicio/client";

						if (isFilled.geoPoint(slice.primary.my_geopoint_field)) {
							// Do something if \`my_geopoint_field\` has a value.
						}
						\`\`\`
				`,
			"prismic.ImageField": `
					Prismic provides an Image component.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextImage } from "@prismicio/next"

									<PrismicNextImage field={slice.primary.my_image_field} />
								`
							case "nuxt":
								return `
									<PrismicImage :field="slice.primary.my_image_field" />
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicImage } from "@prismicio/svelte"
									</script>

									<PrismicImage field={slice.primary.my_image_field} />
								`
						}
					})()}
					\`\`\`

					# Tips

					## \`alt\` and \`fallbackAlt\` attributes

					The \`alt\` and \`fallbackAlt\` attributes are manage automatically by the Image component.
					DO NOT provide an \`alt\` or \`fallbackAlt\` attribute to the component.

					## Styling

					IMPORTANT: Apply classes directly via the class prop, don't wrap the component in a \`<div>\`.

					## Use \`isFilled.image()\` to check if an image field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.image(slice.primary.my_image_field)) {
						// Do something if \`my_image_field\` has a value.
					}
					\`\`\`
				`,
			"prismic.IntegrationField": `
					The integration field's data can be read from the field's object.

					This example uses an integration field named \`featured_product\`.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									<h1>Featured product: {slice.primary.featured_product.title}</h1>
								`
							case "nuxt":
								return `
									<h1>Featured product: {{ slice.primary.featured_product.title }}</h1>
								`
							case "sveltekit":
								return `
									<h1>Featured product: {slice.primary.featured_product.title}</h1>
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use \`isFilled.integrationField()\` to check if an integration field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.integrationField(slice.primary.my_integration_field)) {
						// Do something if \`my_integration_field\` has a value.
					}
					\`\`\`
				`,
			"prismic.LinkField": `
					Prismic provides a Link component.
					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextLink } from "@prismicio/next"

									<PrismicNextLink field={slice.primary.my_link_field} />
								`
							case "nuxt":
								return `
									<PrismicLink :field="slice.primary.my_link_field" />
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicLink } from "@prismicio/svelte"
									</script>

									<PrismicLink field={slice.primary.my_link_field} />
								`
						}
					})()}
					\`\`\`

					A repeatable link field can be displayed using a loop.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextLink } from "@prismicio/next"

									<ul>
										{slice.primary.my_link_field.map((link) => (
											<li key={link?.text}>
												<PrismicNextLink field={link} />
											</li>
										))}
									</ul>
								`
							case "nuxt":
								return `
									<ul>
										<li v-for="link in slice.primary.my_link_field">
											<PrismicLink :field="link" />
										</li>
									</ul>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicLink } from "@prismicio/svelte"
									</script>

									<ul>
										{#each slice.primary.my_link_field as link}
											<li>
												<PrismicLink field={link} />
											</li>
										{/each}
									</ul>
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use display text as labels

					The link's text label can be managed in Prismic when display text is enabled. Prismic's link components automatically display the text.
					you MUST verify \`model.json\` file to check if display text is enabled for the link field with the property \`allowText\`.

					When \`allowText\` is enabled, you must never provide children to the component:
					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextLink } from "@prismicio/next"

									// CORRECT: No children
									<PrismicNextLink
										field={slice.primary.my_link_field}
									/>

									// INCORRECT: Adding children
									<PrismicNextLink field={slice.primary.my_link_field}>
										Learn more
									</PrismicNextLink>
								`
							case "nuxt":
								return `
									// CORRECT: No children
									<PrismicLink :field="slice.primary.my_link_field" />

									// INCORRECT: Adding children
									<PrismicLink :field="slice.primary.my_link_field">
										Learn more
									</PrismicLink>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicLink } from "@prismicio/svelte"
									</script>

									// CORRECT: No children
									<PrismicLink field={slice.primary.my_link_field} />

									// INCORRECT: Adding children
									<PrismicLink field={slice.primary.my_link_field}>
										Learn more
									</PrismicLink>
								`
						}
					})()}
					\`\`\`

					## Use variants to style links

					Link variants can determine how links are styled. This example adds a CSS class based on the selected variant.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextLink } from "@prismicio/next"

									// This example uses \`clsx\` to conditionally apply class names.
									<PrismicNextLink
										field={slice.primary.button}
										className={clsx("button", {
											primary: slice.primary.button.variant === "Primary",
											secondary: slice.primary.button.variant === "Secondary",
										})}
									/>
								`
							case "nuxt":
								return `
									// This example uses Vue's \`:class\` directive to conditionally apply class names.
									<PrismicLink
										:field="slice.primary.button"
										class="button"
										:class="{
											primary: slice.primary.button.variant === 'Primary',
											secondary: slice.primary.button.variant === 'Secondary',
										}"
									/>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicLink } from "@prismicio/svelte"
									</script>

									// This example uses Svelte's \`class\` attribute to conditionally apply class names.
									<PrismicLink
										field={slice.primary.button}
										class={[
											"button",
											{
												primary: slice.primary.button.variant === "Primary",
												secondary: slice.primary.button.variant === "Secondary",
											},
										]}
									/>
								`
						}
					})()}
					\`\`\`

					## Styling

					IMPORTANT: Apply classes directly via the class prop, don't wrap the component in a \`<div>\`.

					## Use \`isFilled.link()\` to check if a link field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.link(slice.primary.button)) {
						// Do something if \`button\` has a value.
					}
					\`\`\`
				`,
			"prismic.LinkToMediaField": `
					Prismic provides a Link component.
					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextLink } from "@prismicio/next"

									<PrismicNextLink field={slice.primary.my_link_to_media_field} />
								`
							case "nuxt":
								return `
									<PrismicLink :field="slice.primary.my_link_to_media_field" />
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicLink } from "@prismicio/svelte"
									</script>

									<PrismicLink field={slice.primary.my_link_to_media_field} />
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use display text as labels

					The link's text label can be managed in Prismic when display text is enabled. Prismic's link components automatically display the text.
					you MUST verify \`model.json\` file to check if display text is enabled for the link field with the property \`allowText\`.

					When \`allowText\` is enabled, you must never provide children to the component:
					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextLink } from "@prismicio/next"

									// CORRECT: No children
									<PrismicNextLink
										field={slice.primary.my_link_field}
									/>

									// INCORRECT: Adding children
									<PrismicNextLink field={slice.primary.my_link_field}>
										Learn more
									</PrismicNextLink>
								`
							case "nuxt":
								return `
									// CORRECT: No children
									<PrismicLink :field="slice.primary.my_link_field" />

									// INCORRECT: Adding children
									<PrismicLink :field="slice.primary.my_link_field">
										Learn more
									</PrismicLink>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicLink } from "@prismicio/svelte"
									</script>

									// CORRECT: No children
									<PrismicLink field={slice.primary.my_link_field} />

									// INCORRECT: Adding children
									<PrismicLink field={slice.primary.my_link_field}>
										Learn more
									</PrismicLink>
								`
						}
					})()}
					\`\`\`

					## Use variants to style links

					Link variants can determine how links are styled. This example adds a CSS class based on the selected variant.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicNextLink } from "@prismicio/next"

									// This example uses \`clsx\` to conditionally apply class names.
									<PrismicNextLink
										field={slice.primary.related_media}
										className={clsx("button", {
											primary: slice.primary.related_media.variant === "Primary",
											secondary: slice.primary.related_media.variant === "Secondary",
										})}
									/>
								`
							case "nuxt":
								return `
									// This example uses Vue's \`:class\` directive to conditionally apply class names.
									<PrismicLink
										:field="slice.primary.related_media"
										class="button"
										:class="{
											primary: slice.primary.related_media.variant === 'Primary',
											secondary: slice.primary.related_media.variant === 'Secondary',
										}"
									/>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicLink } from "@prismicio/svelte"
									</script>

									// This example uses Svelte's \`class\` attribute to conditionally apply class names.
									<PrismicLink
										field={slice.primary.related_media}
										class={[
											"button",
											{
												primary: slice.primary.related_media.variant === "Primary",
												secondary: slice.primary.related_media.variant === "Secondary",
											},
										]}
									/>
								`
						}
					})()}
					\`\`\`

					## Styling

					IMPORTANT: Apply classes directly via the class prop, don't wrap the component in a \`<div>\`.

					## Use \`isFilled.linkToMedia()\` to check if a link to media field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.linkToMedia(slice.primary.related_media)) {
						// Do something if \`related_media\` has a value.
					}
					\`\`\`
				`,
			"prismic.NumberField": `
					Number fields can be used like a number in JavaScript.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									<span>My age: {slice.primary.age}</span>
								`
							case "nuxt":
								return `
									<span>My age: {{ slice.primary.age }}</span>
								`
							case "sveltekit":
								return `
									<span>My age: {slice.primary.age}</span>
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use \`isFilled.number()\` to check if a number field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.number(slice.primary.my_number_field)) {
						// Do something if \`my_number_field\` has a value.
					}
					\`\`\`
				`,
			"prismic.GroupField": `
					A repeatable group can be displayed using a loop.

					This example uses a repeatable group named \`my_repeatable_group\` containing a text field named \`feature\`.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									<ul>
										{slice.primary.my_repeatable_group.map((item) => (
											<li>{item.feature}</li>
										))}
									</ul>
								`
							case "nuxt":
								return `
									<ul>
										<li v-for="item in slice.primary.my_repeatable_group">
											{{ item.feature }}
										</li>
									</ul>
								`
							case "sveltekit":
								return `
									<ul>
										{#each slice.primary.my_repeatable_group as item}
											<li>{item.feature}</li>
										{/each}
									</ul>
								`
						}
					})()}
					\`\`\`

					Repeatable groups that are non-repeatable should access their fields using \`[0]\`:

					\`\`\`ts
					const group = slice.primary.my_repeatable_group[0];
					\`\`\`

					# Tips

					## Use \`isFilled.group()\` to check if a repeatable group has items

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.group(slice.primary.my_group)) {
						// Do something if \`my_group\` has items.
					}
					\`\`\`
				`,
			"prismic.RichTextField": `
					Prismic provides a RichText component.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicRichText } from "@prismicio/react"

									<PrismicRichText field={slice.primary.my_rich_text_field} />
								`
							case "nuxt":
								return `
									<PrismicRichText :field="slice.primary.my_rich_text_field" />
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicRichText } from "@prismicio/svelte"
									</script>

									<PrismicRichText field={slice.primary.my_rich_text_field} />
								`
						}
					})()}
					\`\`\`


					# Tips

					## Styling

					You can style the component using a wrapper \`<div>\` element with CSS classes. The wrapper element can target child elements to apply styles.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									<div className="rich-text">
										<PrismicRichText field={slice.primary.my_rich_text_field} />
									</div>
								`
							case "nuxt":
								return `
									<div class="rich-text">
										<PrismicRichText :field="slice.primary.my_rich_text_field" />
									</div>
								`
							case "sveltekit":
								return `
									<div class="rich-text">
										<PrismicRichText field={slice.primary.my_rich_text_field} />
									</div>
								`
						}
					})()}
					\`\`\`

					\`\`\`css
					.rich-text h1 {
						font-size: 2rem;
						margin-bottom: 1rem;
					}

					.rich-text p {
						margin-bottom: 0.75rem;
						line-height: 1.6;
					}

					.rich-text strong {
						font-weight: bold;
					}
					\`\`\`

					## Advanced Styling with Components

					The \`components\` prop is primarily used for advanced use cases where you need to use another UI component or if you prefer not using cascading CSS.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicRichText } from "@prismicio/react"
									import { Heading } from "@/components/Heading";

									<PrismicRichText
										field={slice.primary.my_rich_text_field}
										components={{
											// Use a component from another file.
											heading1: ({ children }) => <Heading as="h1">{children}</Heading>,
											// Use an HTML element with class names.
											paragraph: ({ children }) => <p className="my-8">{children}</p>,
										}}
									/>;
								`
							case "nuxt":
								return `
									<PrismicRichText
										:field="slice.primary.my_rich_text_field"
										:components="{
											heading1: Heading,
											paragraph: Paragraph,
										}"
									/>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicRichText } from "@prismicio/svelte"
										import { Heading } from "$lib/components/Heading";
										import { Paragraph } from "$lib/components/Paragraph";
									</script>

									<PrismicRichText
										field={slice.primary.my_rich_text_field}
										components={{
											heading1: Heading,
											paragraph: Paragraph,
										}}
									/>
								`
						}
					})()}
					\`\`\`

					## Use \`isFilled.richText()\` to check if a rich text field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.richText(slice.primary.my_rich_text_field)) {
						// Do something if \`my_rich_text_field\` has a value.
					}
					\`\`\`
				`,
			"prismic.SelectField": `
					Select fields can be used like a string in JavaScript.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									<p>My favorite fruit: {slice.primary.favorite_fruit}</p>
								`
							case "nuxt":
								return `
									<p>My favorite fruit: {{ slice.primary.favorite_fruit }}</p>
								`
							case "sveltekit":
								return `
									<p>My favorite fruit: {slice.primary.favorite_fruit}</p>
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use \`isFilled.select()\` to check if a select field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.select(slice.primary.my_select_field)) {
						// Do something if \`my_select_field\` has a value.
					}
					\`\`\`
				`,
			"prismic.TableField": `
					Prismic provides a Table component.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicTable } from "@prismicio/react"

									<PrismicTable field={slice.primary.my_table_field} />
								`
							case "nuxt":
								return `
									<PrismicTable :field="slice.primary.my_table_field" />
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicTable } from "@prismicio/svelte"
									</script>

									<PrismicTable field={slice.primary.my_table_field} />
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use custom UI components

					Prismic's table components can render custom components for each block type.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { Table } from "@/components/Table";

									<PrismicTable
										field={slice.primary.my_table_field}
										components={{
											// Use a component from another file.
											table: ({ children }) => <Table>{children}</Table>,
											// Use an HTML element with class names.
											tbody: ({ children }) => <tbody className="my-tbody">{children}</tbody>,
										}}
									/>;
								`
							case "nuxt":
								return `
									<PrismicTable
										:field="slice.primary.my_table_field"
										:components="{
											table: Table,
											tbody: TBody,
										}"
									/>
								`
							case "sveltekit":
								return `
									<script>
										import { Table } from "$lib/components/Table";
										import { TBody } from "$lib/components/TBody";
									</script>

									<PrismicTable
										field={slice.primary.my_table_field}
										components={{
											table: Table,
											tbody: TBody,
										}}
									/>
								`
						}
					})()}

					IMPORTANT:
						- Do not wrap the \`PrismicTable\` component in a HTML element like \`<table>\`, but use the \`components\` prop to customize the rendering of each block type.
						-  When customizing styles, it's mandatory to use the \`components\` prop to customize the rendering of each block type needed for the slice.
						- For overall positioning of the PrismicTable component, wrap it in a parent \`<div>\`.
				`,
			"prismic.TitleField": `
					Use the PrismicText component to render title field content as plain text, typically wrapped in an appropriate heading element. This is the preferred approach for title fields.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicText } from "@prismicio/react"

									<h1>
										<PrismicText field={slice.primary.my_title_field} />
									</h1>
								`
							case "nuxt":
								return `
									<h1>
										<PrismicText :field="slice.primary.my_title_field" />
									</h1>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicText } from "@prismicio/svelte"
									</script>

									<h1>
										<PrismicText field={slice.primary.my_title_field} />
									</h1>
								`
						}
					})()}
					\`\`\`

					## Alternative: Using PrismicRichText

					You can also use the PrismicRichText component if you need more complex rendering or formatting.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicRichText } from "@prismicio/react"

									<PrismicRichText field={slice.primary.my_title_field} />
								`
							case "nuxt":
								return `
									<PrismicRichText :field="slice.primary.my_title_field" />
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicRichText } from "@prismicio/svelte"
									</script>

									<PrismicRichText field={slice.primary.my_title_field} />
								`
						}
					})()}
					\`\`\`

					# Tips

					## Styling

					You can style the component using a wrapper \`<div>\` element with CSS classes. The wrapper element can target child elements to apply styles.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									<div className="title">
										<PrismicRichText field={slice.primary.my_title_field} />
									</div>
								`
							case "nuxt":
								return `
									<div class="title">
										<PrismicRichText :field="slice.primary.my_title_field" />
									</div>
								`
							case "sveltekit":
								return `
									<div class="title">
										<PrismicRichText field={slice.primary.my_title_field} />
									</div>
								`
						}
					})()}
					\`\`\`

					\`\`\`css
					.title h1 {
						font-size: 3rem;
						font-weight: bold;
						margin-bottom: 1rem;
					}

					.title h2 {
						font-size: 2rem;
						font-weight: semibold;
						margin-bottom: 0.75rem;
					}
					\`\`\`

					## Advanced Styling with Components

					The \`components\` prop is primarily used for advanced use cases where you need to use another UI component or if you prefer not using cascading CSS.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { PrismicRichText } from "@prismicio/react"
									import { Heading } from "@/components/Heading";

									<PrismicRichText
										field={slice.primary.my_title_field}
										components={{
											// Use a component from another file.
											heading1: ({ children }) => <Heading as="h1">{children}</Heading>,
											// Use an HTML element with class names.
											heading2: ({ children }) => <h2 className="my-8">{children}</h2>,
										}}
									/>;
								`
							case "nuxt":
								return `
									<PrismicRichText
										:field="slice.primary.my_title_field"
										:components="{
											heading1: Heading,
											heading2: Heading,
										}"
									/>
								`
							case "sveltekit":
								return `
									<script>
										import { PrismicRichText } from "@prismicio/svelte"
										import { Heading } from "$lib/components/Heading";
									</script>

									<PrismicRichText
										field={slice.primary.my_title_field}
										components={{
											heading1: Heading,
											heading2: Heading,
										}}
									/>
								`
						}
					})()}
					\`\`\`

					## Use \`isFilled.richText()\` to check if a rich text field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.richText(slice.primary.my_title_field)) {
						// Do something if \`my_title_field\` has a value.
					}
					\`\`\`
				`,
			"prismic.KeyTextField": `
					Text fields can be used like a string in JavaScript.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									<p>My name: {slice.primary.name}</p>
								`
							case "nuxt":
								return `
									<p>My name: {{ slice.primary.name }}</p>
								`
							case "sveltekit":
								return `
									<p>My name: {slice.primary.name}</p>
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use \`isFilled.keyText()\` to check if a text field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.keyText(slice.primary.my_text_field)) {
						// Do something if \`my_text_field\` has a value.
					}
					\`\`\`
				`,
			"prismic.TimestampField": `
					Timestamp fields can be used anywhere a timestamp is needed.
					It is often helpful to first convert the timestamp to a JavaScript \`Date\` object using \`asDate\` from \`@prismicio/client\`.

					\`\`\`
					${(() => {
						switch (args.projectFramework) {
							case "next":
								return `
									import { asDate } from "@prismicio/client";

									function Slice() {
										const timestamp = asDate(slice.primary.release_timestamp);

										return <span>{timestamp?.toLocaleDateString("en-US")}</span>;
									}
								`
							case "nuxt":
								return `
									<script>
									const { asDate } = usePrismic();

									const timestamp = computed(() => asDate(slice.primary.release_timestamp));
									</script>

									<template>
										<span>{{ timestamp?.toLocaleDateString("en-US") }}</span>
									</template>
								`
							case "sveltekit":
								return `
									<script>
										import { asDate } from "@prismicio/client";

										export let slice;

										$: timestamp = asDate(slice.primary.release_timestamp);
									</script>

									<span>{timestamp?.toLocaleDateString("en-US")}</span>
								`
						}
					})()}
					\`\`\`

					# Tips

					## Use \`isFilled.timestamp()\` to check if a timestamp field has a value

					\`\`\`ts
					import { isFilled } from "@prismicio/client";

					if (isFilled.timestamp(slice.primary.my_timestamp_field)) {
						// Do something if \`my_timestamp_field\` has a value.
					}
					\`\`\`
				`,
		}

		const fieldsUsed = args.fieldsUsed
			.filter((field) => fieldsDocumentation[field])
			.map((field) => {
				return { [field]: fieldsDocumentation[field] }
			})

		const globalInstruction = `
				# How to code a slice
				This tool contains MANDATORY STEPS that MUST be followed.
				FAILING to read and implement ANY section marked MANDATORY will result in INCORRECT code.
				YOU MUST read this ENTIRE output from beginning to end BEFORE writing a SINGLE line of code.
				NO EXCEPTIONS - ALL steps are required.

				## Fields documentation [MANDATORY]
				Fields documentation to follow: ${JSON.stringify(fieldsUsed)}
				IMPORTANT:
					- Look at similar components to see how fields are coded
					- Use the SAME approach as existing components
				CRITICAL: ANY content visible to users MUST come from Prismic fields. Never hardcode ANY values directly - everything must be dynamic.

				## Model analysis [MANDATORY]
				BEFORE writing ANY code, you MUST:
					1. Read the ${args.modelAbsolutePath} file completely
					2. Create a formal table of fields with the following format:
						| Field         | Type       | Config                    | Implementation Plan      |
						|---------------|------------|---------------------------|--------------------------|
						| cta_link      | Link       | allowText: true           | No children needed       |
						| description   | RichText   | multi: paragraph,em,link  | Handle these block types |
				CRITICAL: You MUST complete this model analysis BEFORE writing ANY implementation code.
				The analysis should reflect EXACTLY what is in the \`model.json\` file, not assumptions.
				The system will verify you have performed this analysis before accepting any code.
				NEVER update the \`model.json\` file, you can ONLY read it.

				## Styling implementation [MANDATORY]
				Use the \`stylingSystemToUse\` parameter to identify the styling system to use for the slice.
				Look at similar components to see exactly how styles are applied.
			`

		const finalInstruction = `
				## IMMEDIATE ACTION REQUIRED AFTER CALLING THIS TOOL
				You have received all necessary information.
				DO NOT wait for additional instructions.
				NO further confirmation needed.
				PROCEED now to implementation FOLLOWING THE GUIDELINES above.
				REPLY IMMEDIATELY with the message "I have read and understood the instructions from Prismic MCP tool" and continue with the implementation.
			`

		return {
			content: [
				{
					type: "text" as const,
					text: globalInstruction,
				},
				{
					type: "text" as const,
					text: finalInstruction,
				},
			],
		}
	},
)
