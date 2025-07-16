# Example Email Groups Configuration

This file shows examples of how to set up email groups using the API.

## Setting up a "team" group

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

## Setting up a "support" group

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/groups/support \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "support-lead@example.com",
      "support-backup@example.com"
    ]
  }'
```

## Setting up an "all-hands" group

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/api/groups/all-hands \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      "alice@example.com",
      "bob@example.com",
      "charlie@example.com",
      "david@example.com",
      "eve@example.com"
    ]
  }'
```

## Usage

After setting up these groups, you can send emails to:

- `team@yourdomain.com` - forwards to Alice, Bob, and Charlie
- `support@yourdomain.com` - forwards to support lead and backup
- `all-hands@yourdomain.com` - forwards to all team members

## Management

### List all groups
```bash
curl https://your-worker.your-subdomain.workers.dev/api/groups
```

### Get specific group
```bash
curl https://your-worker.your-subdomain.workers.dev/api/groups/team
```

### Delete a group
```bash
curl -X DELETE https://your-worker.your-subdomain.workers.dev/api/groups/team
```
