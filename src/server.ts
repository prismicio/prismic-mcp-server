import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { Telemetry } from "./lib/telemetry"

import { name, version } from "../package.json"

import { generate_types } from "./tools/generate_types"
import { how_to_code_slice } from "./tools/how_to_code_slice"
import { how_to_mock_slice } from "./tools/how_to_mock_slice"
import { how_to_model_slice } from "./tools/how_to_model_slice"
import { verify_slice_mock } from "./tools/verify_slice_mock"
import { verify_slice_model } from "./tools/verify_slice_model"

export const telemetryClient = new Telemetry()
telemetryClient.initTelemetry()

export const server = new McpServer({ name, version })
server.tool(...how_to_code_slice)
server.tool(...how_to_model_slice)
server.tool(...verify_slice_model)
server.tool(...how_to_mock_slice)
server.tool(...verify_slice_mock)
server.tool(...generate_types)
