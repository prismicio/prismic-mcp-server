import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { initSentry } from "./lib/sentry"
import { Telemetry } from "./lib/telemetry"

import { name, version } from "../package.json"

import { add_slice_to_custom_type } from "./tools/add_slice_to_custom_type"
import { how_to_code_slice } from "./tools/how_to_code_slice"
import { how_to_mock_slice } from "./tools/how_to_mock_slice"
import { how_to_model_slice } from "./tools/how_to_model_slice"
import { save_slice_data } from "./tools/save_slice_data"

export const telemetryClient = new Telemetry()
telemetryClient.initTelemetry()

initSentry()

export const server = new McpServer({ name, version })

export const how_to_model_slice_tool = server.tool(...how_to_model_slice)
export const how_to_mock_slice_tool = server.tool(...how_to_mock_slice)
export const how_to_code_slice_tool = server.tool(...how_to_code_slice)
export const save_slice_data_tool = server.tool(...save_slice_data)
export const add_slice_to_custom_type_tool = server.tool(
	...add_slice_to_custom_type,
)
