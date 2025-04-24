# Contributing

---

## Local development + MCP Inspector

---

Access the visual MCP Inspector to test tools and view request/response details:

1. Run `yarn dev:server`
2. Open the MCP Inspector at the given URL
3. Test tools and view logs directly in the UI

---

## Getting Started (Local development + Cursor)

---

### Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/prismicio/prismic-mcp-server.git
cd prismic-mcp-server

# Install dependencies
npm i
```

---

### Step 2: Build Project

Build the project:

```bash
yarn build
```

---

### Step 3: Make `@prismicio/mcp-server` package available locally

From the root folder of this repository run:

```bash
npm link
```

This will globally link `@prismicio/mcp-server` as available package in your computer.

_Note: Don't forget to unlink the package after development with `npm unlink @prismicio/mcp-server`_

---

### Step 4: Setup the MCP server to Cursor

Go to Cursor preferences and click to add an MCP server to `mcp.json`:

```json
{
  "mcpServers": {
    "Prismic MCP": {
      "command": "npx",
      "args": ["prismic-mcp-server"]
    }
  }
}
```

---

### Step 5: Test a tool

In Cursor chat (agent mode), add a slice file in the context and ask:

```
Code this slice
```

_Note: Restart Cursor when doing changes to remove Cursor cache of the MCP server._

---

## Development Guide

### Development Scripts

```bash
# Build the project
yarn build

# Start server in development mode (hot-reload & inspector)
yarn dev:server

# Start server in production mode
yarn start:server
```

### Code Quality

```bash
# Lint code
yarn lint

# Format code with Prettier
yarn format

# Check types
yarn typecheck
```

---

## Publishing

1. Build the project: `yarn build`
2. Test the production build: `yarn start:server`
3. Publish to npm: `npm publish`
