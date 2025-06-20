import type { ClientConfig, PrismicDocument } from "@prismicio/client"
import { Client } from "@prismicio/client"
import z from "zod"

type Promisable<T = void> = T | Promise<T>

export interface Cache {
	get<T>(key: string): Promisable<T | undefined>
	set<T>(key: string, value: T): Promisable<Cache | undefined>
	delete(key: string): Promisable<boolean>
}

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
		.min(1)
		.optional()
		.describe(
			"The access token to the repository, only needed when the repository is private (`Invalid access token` error)",
		),
})

const cachedClientCache = new Map<string, CachedClient>()

export const createCachedClient = <TDocuments extends PrismicDocument>(
	args: z.infer<typeof CreateClientParams>,
	clientOptions?: ClientConfig & { cache?: Cache },
): CachedClient<TDocuments> => {
	const options = {
		...clientOptions,
		accessToken: args.accessToken,
	}

	const cacheKey = `${args.repository}-${JSON.stringify(options)}`

	if (cachedClientCache.has(cacheKey)) {
		return cachedClientCache.get(cacheKey) as CachedClient<TDocuments>
	}

	const client = new CachedClient<TDocuments>(args.repository, options)

	cachedClientCache.set(cacheKey, client)

	return client
}

export class CachedClient<
	TDocuments extends PrismicDocument = PrismicDocument,
> extends Client<TDocuments> {
	#cache: Cache

	constructor(
		repositoryNameOrEndpoint: string,
		options?: ClientConfig & { cache?: Cache },
	) {
		super(repositoryNameOrEndpoint, options)

		this.#cache = options?.cache ?? new Map()
	}

	protected async fetch<T = unknown>(
		url: string,
		params: Parameters<Client["fetch"]>[1] = {},
	): Promise<T> {
		const cacheKey = `${url}-${JSON.stringify(params)}`
		const maybeCached = await this.#cache.get<T>(cacheKey)

		if (maybeCached) {
			return maybeCached
		}

		const result = await super.fetch<T>(url, params)

		if (result) {
			await this.#cache.set(cacheKey, result)
		}

		return result
	}
}
