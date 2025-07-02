import { z } from "zod"

import * as mcp from "../lib/mcp"
import { CreateClientParamsWithLang } from "../lib/CreateClientParams"
import {
	multiDocumentResponse,
	multiDocumentResponseDocumentation,
} from "../lib/documentResponse"
import { getDocumentIndex } from "../lib/getDocumentIndex"

export const get_all_documents = mcp.tool(
	"get_all_documents",
	`Get all documents, optionally filtered by locale (lang). ${multiDocumentResponseDocumentation}`,
	CreateClientParamsWithLang.shape,
	async (args) => {
		const documents = await getDocumentIndex(args)
		const documentsByLang = documents.filter(
			(document) => args.lang === "*" || document.lang === args.lang,
		)

		if (!documentsByLang.length) {
			return mcp.error(
				`No documents found${args.lang === "*" ? "" : ` for lang: ${args.lang}`}`,
			)
		}

		return multiDocumentResponse(documentsByLang, args)
	},
)

export const get_all_documents_by_type = mcp.tool(
	"get_all_documents_by_type",
	`Get all documents of a given type (unless you're sure you know the exact type of a document, you should use the get_repository_info tool first to get the exact type), optionally filtered by locale (lang). ${multiDocumentResponseDocumentation}`,
	CreateClientParamsWithLang.extend({
		type: z
			.string()
			.trim()
			.min(1)
			.describe("The document type (API ID) to fetch all documents for"),
	}).shape,
	async (args) => {
		const documents = await getDocumentIndex(args)
		const documentsByLangAndType = documents.filter(
			(document) =>
				(args.lang === "*" || document.lang === args.lang) &&
				document.type === args.type,
		)

		if (!documentsByLangAndType.length) {
			return mcp.error(
				`No documents found for type: ${args.type}${args.lang === "*" ? "" : ` and lang: ${args.lang}`}`,
			)
		}

		return multiDocumentResponse(documentsByLangAndType, args)
	},
)
