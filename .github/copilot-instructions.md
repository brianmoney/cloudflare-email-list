<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Cloudflare Email List Worker Instructions

This is a Cloudflare Worker project that forwards incoming emails to multiple recipients stored in KV storage.

## Key Components

- **ES Module Format**: Uses modern ES module syntax with `export default`
- **Email Handler**: The `email()` function handles incoming emails
- **KV Storage**: Uses Cloudflare KV to store email group recipients
- **REST API**: Provides HTTP endpoints for managing email groups
- **Error Handling**: Comprehensive error handling for email forwarding and API operations

## Architecture

- `src/index.js`: Main worker file with email and HTTP handlers
- `wrangler.jsonc`: Configuration file with KV namespace bindings
- `test/index.spec.js`: Test suite for API endpoints and functionality

## Development Guidelines

1. **Email Forwarding**: Always handle forwarding errors gracefully - don't let one failed forward stop others
2. **KV Storage**: Use proper JSON serialization for storing email lists
3. **API Validation**: Validate email addresses before storing in groups
4. **Error Logging**: Use `console.log` and `console.error` for debugging
5. **Group Names**: Extract group names from email addresses (e.g., `team@domain.com` → `team`)

## Testing

- Use Vitest for testing with Cloudflare Workers test environment
- Mock KV storage in tests
- Test both email handling and HTTP API endpoints

## Deployment

- Use `wrangler deploy` to deploy to Cloudflare
- Ensure KV namespace is created and configured in `wrangler.jsonc`
- Configure email routing in Cloudflare dashboard to route emails to worker
