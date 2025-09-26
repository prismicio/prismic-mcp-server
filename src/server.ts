import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { initSentry } from "./lib/sentry"
import { Telemetry } from "./lib/telemetry"

import { name, version } from "../package.json"

import { add_slice_to_custom_type } from "./tools/add_slice_to_custom_type"
import { how_to_code_slice } from "./tools/how_to_code_slice"
import { how_to_mock_slice } from "./tools/how_to_mock_slice"
import { how_to_model_slice } from "./tools/how_to_model_slice"
import { save_slice_model } from "./tools/save_slice_model"
import { verify_slice_mock } from "./tools/verify_slice_mock"

export const telemetryClient = new Telemetry()
telemetryClient.initTelemetry()

initSentry()

export const server = new McpServer({ name, version })
server.tool(...how_to_code_slice)
server.tool(...how_to_model_slice)
server.tool(...save_slice_model)
server.tool(...how_to_mock_slice)
server.tool(...verify_slice_mock)
server.tool(...add_slice_to_custom_type)
