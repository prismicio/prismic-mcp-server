import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { name, version } from "../package.json"

import { get_repository_info } from "./tools/get_repository_info"
import { get_repository_tags } from "./tools/get_repository_tags"
import {
	get_repository_total,
	get_repository_total_by_every_tag,
	get_repository_total_by_some_tags,
	get_repository_total_by_tag,
	get_repository_total_by_type,
} from "./tools/get_repository_total"
import { how_to_code_slice } from "./tools/how_to_code_slice"

export const server = new McpServer({ name, version })

server.tool(...how_to_code_slice)

server.tool(...get_repository_info)
server.tool(...get_repository_tags)

server.tool(...get_repository_total)
server.tool(...get_repository_total_by_type)
server.tool(...get_repository_total_by_tag)
server.tool(...get_repository_total_by_every_tag)
server.tool(...get_repository_total_by_some_tags)
