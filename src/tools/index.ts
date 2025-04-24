import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerHowToCodeSliceTools } from "./howToCodeSlice.js";

export function registerTools(server: McpServer) {
  registerHowToCodeSliceTools(server);
}
