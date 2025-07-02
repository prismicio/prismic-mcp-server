import { z } from "zod"

import * as mcp from "../lib/mcp"
import { CreateClientParams } from "../lib/CreateClientParams"
import {
	singleDocumentResponse,
	singleDocumentResponseDocumentation,
} from "../lib/documentResponse"
import { getDocumentIndex } from "../lib/getDocumentIndex"

export const get_document_by_id = mcp.tool(
	"get_document_by_id",
	`Get a document by its ID. ${singleDocumentResponseDocumentation}`,
	CreateClientParams.extend({
		id: z.string().trim().min(1).describe("The document ID to retrieve"),
	}).shape,
	async (args) => {
		const documents = await getDocumentIndex(args)

		const document = documents.find((document) => document.id === args.id)
		if (!document) {
			return mcp.error(`Document with ID "${args.id}" not found`)
		}

		return singleDocumentResponse(document, args)
	},
)

export const get_document_by_uid = mcp.tool(
	"get_document_by_uid",
	`Get a document by its UID and type (unless you're sure you know the exact type of a document, you should use the get_repository_info tool first to get the exact type). ${singleDocumentResponseDocumentation}`,
	CreateClientParams.extend({
		uid: z.string().trim().min(1).describe("The document UID to retrieve"),
		type: z.string().trim().min(1).describe("The document type"),
	}).shape,
	async (args) => {
		const documents = await getDocumentIndex(args)

		const document = documents.find(
			(document) => document.uid === args.uid && document.type === args.type,
		)
		if (!document) {
			return mcp.error(
				`Document with UID "${args.uid}" and type "${args.type}" not found`,
			)
		}

		return singleDocumentResponse(document, args)
	},
)
