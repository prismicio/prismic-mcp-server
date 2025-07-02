import { createClient } from "@prismicio/client"

import type { CreateClientParams } from "./CreateClientParams"
import type { PrismicDocumentWithReferences } from "./buildReferencesForDocuments"
import { buildReferencesForDocuments } from "./buildReferencesForDocuments"

const cache = new Map<string, PrismicDocumentWithReferences[]>()

export async function getDocumentIndex(
	args: CreateClientParams,
): Promise<PrismicDocumentWithReferences[]> {
	const cacheKey = `${args.repository}-${args.accessToken ?? "PUBLIC"}`

	const maybeCachedDocuments = cache.get(cacheKey)
	if (maybeCachedDocuments) {
		return maybeCachedDocuments
	}

	const client = createClient(args.repository, {
		accessToken: args.accessToken,
	})

	const documents = await client.dangerouslyGetAll({ lang: "*" })
	const documentWithReferences = buildReferencesForDocuments(documents)
	cache.set(cacheKey, documentWithReferences)

	return documentWithReferences
}
