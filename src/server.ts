import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { Telemetry } from "./lib/telemetry"

import { name, version } from "../package.json"

import { how_to_code_slice } from "./tools/how_to_code_slice"

export const telemetryClient = new Telemetry()
telemetryClient.initTelemetry()

export const server = new McpServer({ name, version })
server.tool(...how_to_code_slice)
