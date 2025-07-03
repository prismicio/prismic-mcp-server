import type { CallToolResult } from "@modelcontextprotocol/sdk/types"

import type { CreateClientParams } from "./CreateClientParams"
import type { PrismicDocumentWithReferences } from "./buildReferencesForDocuments"

const documentResponseStructureDocumentation = `
## Metadata
Document ID, UID, type, lang, and tags.

## Translations (alternate languages)

## Publication
First and last publication date.

## URLs (links)
A link to the document in Prismic's editor (page builder) to edit the document.

## References to...
References contained in the returned document about images, link to web, link to document, and link to media.

## Referenced by...
References from other documents to the returned document.

## Data
The document data (content).
`

export const singleDocumentResponseDocumentation = `
# Returned content

The returned document contains the following information:

${documentResponseStructureDocumentation}
`

export function singleDocumentResponse(
	document: PrismicDocumentWithReferences,
	args: CreateClientParams,
): CallToolResult {
	return {
		content: [
			{
				type: "text",
				text: documentToMarkdown(document, { ...args, full: true }),
			},
		],
		structuredContent: { ...document },
	}
}

export const multiDocumentResponseDocumentation = `
# Returned content

Each of the returned documents contains the following information:

${documentResponseStructureDocumentation}

## Sorting
The documents are not sorted by any particular order. Do not assume any order.
`

export function multiDocumentResponse(
	documents: PrismicDocumentWithReferences[],
	args: CreateClientParams,
): CallToolResult {
	return {
		content: [
			{
				type: "text",
				text: documents
					.map((document) => documentToMarkdown(document, args))
					.join("\n---\n"),
			},
		],
		structuredContent: {
			documents: documents.map((document) => {
				return {
					...document,
					data: useGetDocumentByID(document.id),
				}
			}),
		},
	}
}

function documentToMarkdown(
	document: PrismicDocumentWithReferences,
	args: CreateClientParams & { full?: boolean },
): string {
	return [
		`# Document ID: \`${document.id}\``,
		"",
		"## Metadata",
		`- UID: \`${document.uid || "N/A"}\``,
		`- Type: \`${document.type}\``,
		`- Locale (lang): ${document.lang}`,
		`- Tags: ${document.tags.length ? document.tags.join(", ") : "N/A"}`,
		"",
		"## Translations (alternate languages)",
		document.alternate_languages.length
			? document.alternate_languages
					.map(
						(doc) => `- \`${doc.lang}\`, translated document ID: \`${doc.id}\``,
					)
					.join("\n")
			: "No alternate languages found, if the repository is not multilingual, this is expected.",
		"",
		"## Publication",
		`- First: ${document.first_publication_date}`,
		`- Last: ${document.last_publication_date}`,
		"",
		"## URLs (links)",
		`- Editor URL: ${getEditorURL(document.id, args)}`,
		"",
		"## References to...",
		"",
		`### Images (${document.referencesTo.images.length})`,
		document.referencesTo.images.length
			? document.referencesTo.images
					.map(
						(image) =>
							`- Path on document: \`${image.path.join(".")}\`, ID: \`${image.id}\`, URL: ${image.url}`,
					)
					.join("\n")
			: "No images found.",
		"",
		`### Link to web (${document.referencesTo.web.length})`,
		document.referencesTo.web.length
			? document.referencesTo.web
					.map(
						(linkToWeb) =>
							`- Path on document: \`${linkToWeb.path.join(".")}\`, URL: ${linkToWeb.url}`,
					)
					.join("\n")
			: "No link to web found.",
		"",
		`### Link to document (${document.referencesTo.documents.length})`,
		document.referencesTo.documents.length
			? document.referencesTo.documents
					.map(
						(linkToDocument) =>
							`- Path on document: \`${linkToDocument.path.join(".")}\`, ID: \`${linkToDocument.id}\`, type: \`${linkToDocument.type}\`, UID: \`${linkToDocument.uid || "N/A"}\`, data: ${useGetDocumentByID(linkToDocument.id)}`,
					)
					.join("\n")
			: "No link to document found.",
		"",
		`### Link to media (${document.referencesTo.medias.length})`,
		document.referencesTo.medias.length
			? document.referencesTo.medias
					.map(
						(linkToMedia) =>
							`- Path on document: \`${linkToMedia.path.join(".")}\`, ID: \`${linkToMedia.id}\`, kind: \`${linkToMedia.kind}\`, URL: \`${linkToMedia.url}\``,
					)
					.join("\n")
			: "No link to media found.",
		"",
		`## Referenced by...`,
		"",
		`### Other documents (${document.referencedBy.documents.length})`,
		document.referencedBy.documents.length
			? document.referencedBy.documents
					.map(
						(referencedBy) =>
							`- Path on document: \`${referencedBy.path.join(".")}\`, ID: \`${referencedBy.id}\`, type: \`${referencedBy.type}\`, UID: \`${referencedBy.uid || "N/A"}\`, data: ${useGetDocumentByID(referencedBy.id)}`,
					)
					.join("\n")
			: "No other documents reference this document.",
		"",
		"## Data",
		args.full
			? JSON.stringify(document.data, null, 2)
			: useGetDocumentByID(document.id),
	].join("\n")
}

function getEditorURL(id: string, args: CreateClientParams): string {
	return `https://${args.repository}.prismic.io/builder/pages/${id}`
}

function useGetDocumentByID(id: string): string {
	return `Use the get_document_by_id tool with ID \`${id}\` to get the full document, including its data (content).`
}
