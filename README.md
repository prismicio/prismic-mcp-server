# @prismicio/mcp-server

[![npm version][npm-version-src]][npm-version-href]
[![Github Actions CI][github-actions-ci-src]][github-actions-ci-href]
[![License][license-src]][license-href]

---

## Getting started

---

### Prerequisites

You need a code editor powered by AI that supports MCP servers (Cursor, Windsurf, VS Code, etc.).

_You can check the list of supported code editors here: https://modelcontextprotocol.io/clients_

### Step 1: Configure the MCP Server

Add Prismic MCP server to your code editor's configuration:

```json
{
  "mcpServers": {
    "Prismic MCP": {
      "command": "npx",
      "args": ["-y", "@prismicio/mcp-server@latest"]
    }
  }
}
```

### Step 2: Use the recommended model

For optimal results, select `claude-3.7-sonnet` model in your AI chat interface.

### Step 3: Start using Prismic MCP

🚀 Try it now:

1. Open any slice file in your project
2. Ask your AI assistant: `Code this Slice`

You can also request help with specific field implementations, such as:

- `How do I implement an ImageField?`
- `Show me how to use RichTextField in this slice`

---

### FAQ

---

#### How to solve "Client closed" with "No tools available" when setting up Prismic MCP server in Cursor?

Ensure `npx` is correctly working by running `npx -v` and reload Cursor.

You can also debug the problem by opening the Output view to see the logs:

1. Click on "View" from the main toolbar
2. Select "Output"
3. Select "Cursor MCP" on the dropdown to filter logs
4. Click to reload the MCP server from the Cursor settings to see new logs

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@prismicio/mcp-server/latest.svg
[npm-version-href]: https://npmjs.com/package/@prismicio/mcp-server
[github-actions-ci-src]: https://github.com/prismicio/prismic-mcp-server/workflows/ci/badge.svg
[github-actions-ci-href]: https://github.com/prismicio/prismic-mcp-server/actions?query=workflow%3Aci
[license-src]: https://img.shields.io/npm/l/@prismicio/mcp-server.svg
[license-href]: https://npmjs.com/package/@prismicio/mcp-server
