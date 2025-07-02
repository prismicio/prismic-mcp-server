import z from "zod"

export const CreateClientParams = z.object({
	repository: z
		.string()
		.trim()
		.min(3)
		.max(64)
		.describe(
			"The repository name, lowercased, hyphenated, without the .prismic.io part",
		),
	accessToken: z
		.string()
		.trim()
		.optional()
		.describe(
			"The access token to the repository, only needed when the repository is private (`Invalid access token` error)",
		),
})
export type CreateClientParams = z.infer<typeof CreateClientParams>

export const CreateClientParamsWithLang = CreateClientParams.extend({
	lang: z
		.string()
		.optional()
		.describe(
			"The locale (lang) to filter by (if you want to use a specific locale, unless you're sure you know the exact locale to use, you should use the get_repository_info tool first to get the exact locales available)",
		)
		.default("*"),
})
export type CreateClientParamsWithLang = z.infer<
	typeof CreateClientParamsWithLang
>
