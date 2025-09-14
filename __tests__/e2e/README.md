# E2E Tests with AI Agents

This directory contains end-to-end tests that include AI agent simulation tests.

## Setup

### Environment Variables

The AI agent tests require an API key to function. These tests are designed to:

- **Skip gracefully in local development** if no API key is provided
- **Fail with clear error messages in CI** if API keys are not configured

### Local Development Setup

1. **Copy the example environment file:**

   ```bash
   cp __tests__/e2e/.env.example __tests__/e2e/.env
   ```

2. **Add your API keys to the `.env` file:**

   ```bash
   # Edit the .env file and add your actual API key
   AWS_BEARER_TOKEN_BEDROCK=your_actual_aws_bearer_token_here
   ```

### Running Tests

```bash
npm run test:e2e
```

To update the snapshots:

```bash
npm run test:e2e:update
```

## Debugging

Enable debug output to see AI agent conversations:

```bash
# In your .env file
DEBUG_MODE=true
```

This will log the full conversation between the simulated user and AI agent, including all tool calls and responses.
