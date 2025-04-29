# Contributing

Please read the full contributing guide before submitting any contributions to this repository.

## Setup

```bash
# Clone the repository
git clone https://github.com/prismicio/prismic-mcp-server.git
cd prismic-mcp-server

# Install dependencies
yarn
```

---

## Local development (MCP Inspector)

---

Access the visual MCP Inspector to test tools and view request/response details:

1. Run `yarn dev:server` (watches for changes and rebuilds automatically)
2. Open the MCP Inspector at the given URL
3. Test tools and view logs directly in the UI

_Note: Use `yarn start:server` if you want a production build with the MCP Inspector._

---

## Local development (Cursor)

---

### Step 1: Build Project

Build the project:

```bash
yarn build
```

---

### Step 2: Make `@prismicio/mcp-server` package available locally

From the root folder of this repository run:

```bash
npm link
```

This will globally link `@prismicio/mcp-server` as available package in your computer.

_Note: Don't forget to unlink the package after development with `npm unlink @prismicio/mcp-server`_

---

### Step 3: Setup the MCP server to Cursor

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

### Step 4: Test `how-to-code-slice` tool

In Cursor chat:

1. Select "Agent" mode
2. Select "claude-3.7-sonnet" model
3. Add your empty slice file in the chat context (`CMD+i` from the slice file)
4. Write in the chat `Code this slice`
5. Execute the command
6. When the tool is called by Cursor, accept it by clicking on "Run tool"

🚀 And Cursor will generate the slice for you.

_You can also ask Cursor to help you on specific fields inside the slice._

_Note: Restart Cursor when doing changes to remove Cursor cache of the MCP server._

## Commits

This project uses [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines and automated changelog generation. Please follow the conventional commit format for all commits.

The following commit types are supported as defined in the `.versionrc` file:

- `feat`: New features (appears in "Features" section)
- `fix`: Bug fixes (appears in "Bug Fixes" section)
- `refactor`: Code changes that neither fix bugs nor add features (appears in "Refactor" section)
- `docs`: Documentation changes (appears in "Documentation" section)
- `chore`: Maintenance tasks (appears in "Chore" section)

Example: `feat: improve link documentation for text property`

_Note: commits without using a category from above will not be included in the Changelog. E.g.: `ci: deploy from github actions`._

## Publishing

This project uses GitHub Actions for automated publishing. You can deploy a new version using the "Deploy" workflow:

1. Go to the GitHub repository's "Actions" tab
2. Select the "Deploy" workflow
3. Click "Run workflow"
4. Choose a version type:
   - `alpha`: Creates a prerelease version (e.g., 1.0.0-alpha.0)
   - `patch`: Increments the patch version (e.g., 1.0.0 → 1.0.1)
   - `minor`: Increments the minor version (e.g., 1.0.0 → 1.1.0)
   - `major`: Increments the major version (e.g., 1.0.0 → 2.0.0)

The workflow will:

- Run tests and checks
- Update the version in package.json
- Generate/update the CHANGELOG.md based on conventional commits
- Create a git tag for the version
- Push changes to the repository
- Publish the package to npm

No manual version bumping or changelog editing is required.
