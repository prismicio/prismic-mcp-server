# Contributing

This package is primarily maintained by [Prismic](https://prismic.io)[^1]. External contributions are welcome. Ask for help by [opening an issue](https://github.com/prismicio/prismic-mcp-server/issues/new/choose), or request a review by opening a pull request.

## :gear: Setup

<!-- When applicable, list system requriements to work on the project. -->

The following setup is required to work on this project:

- Node.js
- npm CLI

## :memo: Project-specific notes

### Developing with MCP Inspector

```sh
# Start the development watcher.
npm run dev

# Or build the project for production.
npm run build

# In another terminal, start the inspector.
npm run preview

# Make sure to restart the server in the UI between each build you test.
```

### Developing in your code editor

```sh
# Configure a new local MCP server.
# This example is for cursor, adapt it as needed.
{
	"mcpServers": {
		"Prismic (Local)": {
			"command": "node",
			"args": ["~/projects/prismic/mcp/bin/stdio"],

			# Only necessary for other envs than production
			"env": {
				# Available envs: "staging" | "dev-tools" | "marketing-tools" | "platform"
				"PRISMIC_ENV": "staging",

				# Activate debug mode to see more logs (Output tab of your IDE console)
				"PRISMIC_DEBUG": true

				# Disable telemetry for development
				"TELEMETRY_DISABLED": true
			}
		}
	}
}

# Start the development watcher.
npm run dev

# Or build the project for production.
npm run build

# Make sure your editor restarted the MCP server between each build you test.
```

<!-- Share information about the repository. -->
<!-- What specific knowledge do contributors need? -->

> [!TIP]
> Please update this section with helpful notes for contributors.

## :construction_worker: Develop

> [!NOTE]
> It's highly recommended to discuss your changes with the Prismic team before starting by [opening an issue](https://github.com/prismicio/prismic-mcp-server/issues/new/choose).[^2]
>
> A short discussion can accellerate your work and ship it faster.

```sh
# Clone and prepare the project.
git clone git@github.com:prismicio/prismic-mcp-server.git
cd prismic-mcp-server
npm install

# Create a new branch for your changes (e.g. lh/fix-win32-paths).
git checkout -b <your-initials>/<feature-or-fix-description>

# Start the development watcher.
# Run this command while you are working on your changes.
npm run dev

# Build the project for production.
# Run this command when you want to see the production version.
npm run build

# Preview the current build.
# Run this command while running the development watcher or after a production build.
npm run preview

# Lint your changes before requesting a review. No errors are allowed.
npm run lint
# Some errors can be fixed automatically:
npm run lint -- --fix

# Format your changes before requesting a review. No errors are allowed.
npm run format

# Test your changes before requesting a review.
# All changes should be tested. No failing tests are allowed.
npm run test
# Run only type tests
npm run types
```

## :building_construction: Submit a pull request

> [!NOTE]
> Code will be reviewed by the Prismic team before merging.[^3]
>
> Request a review by opening a pull request.

```sh
# Open a pull request. This example uses the GitHub CLI.
gh pr create

# Someone from the Prismic team will review your work. This review will at
# least consider the PR's general direction, code style, and test coverage.

# When ready, PRs should be merged using the "Squash and merge" option.
```

## :rocket: Publish

> [!CAUTION]
> Publishing is restricted to the Prismic team.[^4]

Use the [**Publish**](https://github.com/prismicio/prismic-mcp-server/actions/workflows/publish.yml) GitHub Action to publish a new stable or prelease version.

[^1]: This package is maintained by the DevX team. Prismic employees can ask for help or a review in the [#team-devx](https://prismic-team.slack.com/archives/C014VAACCQL) Slack channel.

[^2]: Prismic employees are highly encouraged to discuss changes with the DevX team in the [#team-devx](https://prismic-team.slack.com/archives/C014VAACCQL) Slack channel before starting.

[^3]: Code should be reviewed by the DevX team before merging. Prismic employees can request a review in the [#team-devx](https://prismic-team.slack.com/archives/CPG31MDL1) Slack channel.

[^4]: Prismic employees can ask the DevX team for [npm](https://www.npmjs.com) publish access.
