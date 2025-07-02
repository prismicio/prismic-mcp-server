import type {
	AnyRegularField,
	FilledContentRelationshipField,
	FilledImageFieldImage,
	FilledLinkToMediaField,
	FilledLinkToWebField,
	GroupField,
	PrismicDocument,
	SliceZone,
} from "@prismicio/client"
import { documentToLinkField } from "@prismicio/client"

/**
 * A list of keys to navigate through the document data.
 */
type DataPath = (string | number)[]

type ImageReference = FilledImageFieldImage & { path: DataPath }
type WebReference = FilledLinkToWebField & { path: DataPath }
type DocumentReference = FilledContentRelationshipField & {
	path: DataPath
}
type MediaReference = FilledLinkToMediaField & { path: DataPath }

type ReferencesTo = {
	images: ImageReference[]
	web: WebReference[]
	documents: DocumentReference[]
	medias: MediaReference[]
}

type ReferencedBy = {
	documents: DocumentReference[]
}

export type PrismicDocumentWithReferences = PrismicDocument & {
	referencesTo: ReferencesTo
	referencedBy: ReferencedBy
}

export function buildReferencesForDocuments(
	documents: PrismicDocument[],
): PrismicDocumentWithReferences[] {
	const documentsWithReferencesMap: Record<
		string,
		PrismicDocumentWithReferences
	> = {}

	for (const document of documents) {
		const referencesTo = extractReferencesTo(document)

		// Add to referenced documents the reference from this document
		for (const linkToDocument of referencesTo.documents) {
			if (linkToDocument.isBroken) {
				continue
			}

			if (!documentsWithReferencesMap[linkToDocument.id]) {
				documentsWithReferencesMap[linkToDocument.id] = {
					referencedBy: {
						documents: [],
					},
				} as unknown as PrismicDocumentWithReferences
			}

			documentsWithReferencesMap[linkToDocument.id].referencedBy.documents.push(
				{
					...documentToLinkField(document),
					path: linkToDocument.path,
				},
			)
		}

		documentsWithReferencesMap[document.id] = {
			...document,
			referencesTo,
			referencedBy: documentsWithReferencesMap[document.id]?.referencedBy || {
				documents: [],
			},
		}
	}

	return Object.values(documentsWithReferencesMap)
}

export function extractReferencesTo(doc: PrismicDocument): ReferencesTo {
	const references: ReferencesTo = {
		images: [],
		web: [],
		documents: [],
		medias: [],
	}

	crawlData(doc.data, [], references)

	return references
}

function crawlData(value: unknown, path: DataPath, references: ReferencesTo) {
	if (isPrismicImageField(value)) {
		references.images.push({ ...value, path })
	} else if (isLinkToWebField(value)) {
		references.web.push({ ...value, path })
	} else if (isLinkToDocument(value)) {
		references.documents.push({ ...value, path })
	} else if (isMediaField(value)) {
		references.medias.push({ ...value, path })
	} else if (Array.isArray(value)) {
		value.forEach((item, index) =>
			crawlData(item, [...path, index], references),
		)
	} else if (typeof value === "object" && value !== null) {
		for (const key of Object.keys(value)) {
			const subValue: unknown = (value as Record<string, unknown>)[key]
			crawlData(subValue, [...path, key], references)
		}
	}
}

// Explicit types are added to help ensure narrowing is done effectively.
type UnknownValue = AnyRegularField | GroupField | SliceZone | unknown

function isPrismicImageField(
	value: UnknownValue,
): value is FilledImageFieldImage {
	if (
		value &&
		typeof value === "object" &&
		(!("version" in value) || typeof value.version === "object")
	) {
		if (
			"id" in value &&
			"url" in value &&
			typeof value.url === "string" &&
			"dimensions" in value &&
			"edit" in value &&
			"alt" in value &&
			"copyright" in value
		) {
			return true
		}
	}

	return false
}

function isLinkField(
	value: UnknownValue,
): value is
	| FilledLinkToWebField
	| FilledLinkToMediaField
	| FilledContentRelationshipField {
	if (
		value &&
		typeof value === "object" &&
		"link_type" in value &&
		typeof value.link_type === "string"
	) {
		switch (value.link_type) {
			case "Web":
				return "url" in value && typeof value.url === "string" && !!value.url
			case "Document":
			case "Media":
				return "id" in value && typeof value.id === "string" && !!value.id
		}
	}

	return false
}

function isLinkToWebField(value: UnknownValue): value is FilledLinkToWebField {
	return isLinkField(value) && value.link_type === "Web"
}

function isLinkToDocument(
	value: UnknownValue,
): value is FilledContentRelationshipField {
	return isLinkField(value) && value.link_type === "Document"
}

function isMediaField(value: UnknownValue): value is FilledLinkToMediaField {
	return isLinkField(value) && value.link_type === "Media"
}
