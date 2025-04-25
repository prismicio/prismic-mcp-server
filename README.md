# @prismicio/mcp-server

---

## Getting Started (Cursor)

---

### Step 1: Setup the MCP server with Cursor

Go to Cursor preferences and click to add an MCP server:

```json
{
  "mcpServers": {
    "Prismic MCP": {
      "command": "npx",
      "args": ["-y", "@prismicio/mcp-server"]
    }
  }
}
```

---

### Step 2: Test a tool

In Cursor chat (agent mode), add a slice file in the context and ask:

```
Code this slice
```
