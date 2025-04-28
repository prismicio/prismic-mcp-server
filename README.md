# @prismicio/mcp-server

---

## Getting started (Cursor)

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

### Step 2: Test `how-to-code-slice` tool

In Cursor chat:

1. Select "Agent" mode
2. Select "claude-3.7-sonnet" model
3. Add your empty slice file in the chat context (`CMD+i` from the slice file)
4. Write in the chat `Code this slice`
5. Execute the command
6. When the tool is called by Cursor, accept it by clicking on "Run tool"

🚀 And Cursor will generate the slice for you.

_You can also ask Cursor to help you on specific fields inside the slice._

---

### FAQ

---

#### How to solve "Client closed" with "No tools available" when setting up my MCP server in Cursor?

Ensure `npx` is correctly working by running `npx -v` and reload Cursor.

You can also debug the problem by opening the Output view to see the logs:

1. Click on "View" from the main toolbar
2. Select "Output"
3. Select "Cursor MCP" on the dropdown to filter logs
4. Click to reload the MCP server from the Cursor settings to see new logs
