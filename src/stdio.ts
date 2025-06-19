import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { server } from "./server.js"

server.connect(new StdioServerTransport())
