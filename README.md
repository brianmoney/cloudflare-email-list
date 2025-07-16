# Cloudflare Email List Forwarding Worker

A Cloudflare Worker that forwards incoming emails to a list of recipients stored in KV storage. This allows you to create email groups (mailing lists) where emails sent to `group@yourdomain.com` are automatically forwarded to all members of that group.

## Features

- **Email Forwarding**: Automatically forwards emails to multiple recipients
- **Multiple Groups**: Support for multiple email groups with different recipient lists
- **KV Storage**: Uses Cloudflare KV for persistent storage of email lists
- **REST API**: Manage email groups via HTTP API
- **Error Handling**: Robust error handling with detailed logging
- **Email Validation**: Validates email addresses before storing

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create KV Namespace

Create the KV namespace for storing email lists:

```bash
npm run setup-kv
```

This will output something like:
```
🌀 Creating namespace with title "email_list"
✅ Success!
Add the following to your wrangler.toml:
{ binding = "EMAIL_LIST", id = "abcd1234567890..." }
```

### 3. Update wrangler.jsonc

Update the `wrangler.jsonc` file with your namespace ID:

```jsonc
"kv_namespaces": [
  {
    "binding": "EMAIL_LIST",
    "id": "YOUR_ACTUAL_NAMESPACE_ID",
    "preview_id": "YOUR_PREVIEW_NAMESPACE_ID"
  }
]
```

Also create a preview namespace for development:

```bash
npm run setup-kv-preview
```

### 4. Configure Email Routing

In your Cloudflare dashboard:

1. Go to **Email** → **Email Routing**
2. Add your domain and verify it
3. Create a **Custom Address** rule:
   - **Match**: `*@yourdomain.com` (catch-all)
   - **Action**: **Send to Worker**
   - **Destination**: Select your deployed worker

### 5. Deploy

```bash
npm run deploy
```

## Usage

### Email Forwarding

Send emails to: `groupname@yourdomain.com`

The email will be forwarded to all recipients in the "groupname" group.

### Managing Email Groups

#### List All Groups
```bash
curl https://your-worker.your-subdomain.workers.dev/api/groups
```

#### Get Group Recipients
```bash
curl https://your-worker.your-subdomain.workers.dev/api/groups/team
```

#### Create/Update Group
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/groups/team \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "alice@example.com",
      "bob@example.com",
      "charlie@example.com"
    ]
  }'
```

#### Delete Group
```bash
curl -X DELETE https://your-worker.your-subdomain.workers.dev/api/groups/team
```

## Development

### Local Development

```bash
npm run dev
```

This starts a local development server at `http://localhost:8787`

### Testing

```bash
npm test
```

### View Logs

```bash
npm run tail
```

## API Reference

### GET /api/groups

List all email groups.

**Response:**
```json
{
  "groups": [
    {
      "name": "team",
      "lastModified": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/groups/{groupName}

Get recipients for a specific group.

**Response:**
```json
{
  "group": "team",
  "recipients": [
    "alice@example.com",
    "bob@example.com"
  ],
  "count": 2
}
```

### POST /api/groups/{groupName}

Create or update a group with new recipients.

**Request Body:**
```json
{
  "recipients": [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com"
  ]
}
```

**Response:**
```json
{
  "message": "Group updated successfully",
  "group": "team",
  "recipients": [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com"
  ],
  "count": 3
}
```

### DELETE /api/groups/{groupName}

Delete a group.

**Response:**
```json
{
  "message": "Group deleted successfully",
  "group": "team"
}
```

## Error Handling

The worker includes comprehensive error handling:

- **Email forwarding errors**: Logged but don't stop other forwards
- **Invalid email addresses**: Validated before storage
- **Missing groups**: Gracefully handled with logging
- **API errors**: Return appropriate HTTP status codes

## Security Considerations

- **No authentication**: This example doesn't include authentication. Consider adding API keys or other auth mechanisms for production use.
- **Rate limiting**: Consider implementing rate limiting to prevent abuse.
- **Input validation**: Email addresses are validated, but consider additional input sanitization.

## Troubleshooting

### Common Issues

1. **Email not forwarding**: Check that your domain is properly configured in Cloudflare Email Routing
2. **KV namespace errors**: Ensure the namespace ID is correctly configured in `wrangler.jsonc`
3. **Worker not receiving emails**: Verify the Custom Address rule is set to send to your worker

### Debugging

Use the tail command to see real-time logs:

```bash
npm run tail
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
