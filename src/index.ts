#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { version, name } from "../package.json";
import { registerTools } from "./tools/index.js";

async function main() {
  const serverInstance = new McpServer({
    name,
    version,
  });
  const transportInstance = new StdioServerTransport();

  registerTools(serverInstance);

  await serverInstance.connect(transportInstance);

  return serverInstance;
}

main();
