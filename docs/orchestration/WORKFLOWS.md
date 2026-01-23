# Workflow Best Practices

Recommendations and patterns for creating effective n8n workflows in Vaettir.

## Workflow Design Principles

### 1. Keep Workflows Focused

**Good**: Single-purpose workflows
```
Workflow: "Process GitHub Webhook"
- Receives webhook
- Validates signature
- Updates database
- Sends notification
```

**Avoid**: Kitchen-sink workflows
```
Workflow: "Handle Everything"
- GitHub webhooks
- Facebook posts
- Email processing
- Data cleanup
- ...50 different things
```

**Why**: Easier to debug, test, and maintain.

### 2. Error Handling

Always add error handling paths:

```
[Trigger] → [Main Logic] → [Success Handler]
                ↓ (on error)
           [Error Handler] → [Alert Admin]
```

**In n8n**:
1. Click on node
2. Settings → "Continue On Fail"
3. Add error handling nodes
4. Use "Error Trigger" node to catch errors

### 3. Use Descriptive Names

**Good names**:
- `GitHub: Validate Webhook Signature`
- `DB: Insert New Contribution`
- `Email: Send Welcome Message`

**Bad names**:
- `HTTP Request`
- `Code`
- `Function 1`

**Why**: You (and others) need to understand workflows at a glance.

## Common Patterns

### Pattern 1: API Integration with Retry

For calling external APIs reliably:

```
[Trigger]
   ↓
[Validate Input]
   ↓
[HTTP Request] ← Retry: 3 times, Exponential backoff
   ↓ (success)
[Process Response]
   ↓
[Store Result]
   ↓ (error)
[Log Error] → [Notify Admin]
```

**Configuration**:
- HTTP Request node: Settings → Retry: 3
- Continue on fail: true
- Error workflow: Create separate error handler

### Pattern 2: Data Transformation Pipeline

Processing data through multiple steps:

```
[Webhook]
   ↓
[Code: Validate Schema]
   ↓
[Code: Transform Data]
   ↓
[Split in Batches] ← Process 10 items at a time
   ↓
[For Each Item]
   ↓
[HTTP: Call API]
   ↓
[Merge Results]
   ↓
[Store to Database]
```

**Why batching**: Prevents overwhelming external APIs or database.

### Pattern 3: Scheduled Tasks

Background jobs that run periodically:

```
[Schedule: Every Hour]
   ↓
[DB: Fetch Pending Items]
   ↓
[If: Items Exist?] ─No→ [Stop]
   ↓ Yes
[For Each Item]
   ↓
[Process Item]
   ↓
[DB: Mark Complete]
   ↓
[Cleanup Old Data]
```

**Best practices**:
- Use "Cron" trigger for precise scheduling
- Add "If" nodes to skip when no work needed
- Clean up old data to prevent database bloat

### Pattern 4: Webhook Handler

Receiving and processing webhooks:

```
[Webhook: POST /webhook/github]
   ↓
[Code: Verify Signature]
   ↓ (invalid)
[Return: 401 Unauthorized]
   ↓ (valid)
[Code: Parse Payload]
   ↓
[Switch: Event Type]
   ├─→ push → [Handle Push]
   ├─→ pr → [Handle PR]
   └─→ issue → [Handle Issue]
```

**Security**:
- Always verify webhook signatures
- Validate payload structure
- Rate limit if possible
- Return quickly (process async if needed)

### Pattern 5: Multi-Service Orchestration

Coordinating multiple services (via proxy pattern):

```
[Trigger]
   ↓
[HTTP: ocapistaine] ← Calls http://ocapistaine:8000
   ↓
[Code: Process Result]
   ↓
[HTTP: another-service] ← Calls http://another-service:3000
   ↓
[Combine Results]
   ↓
[Store & Notify]
```

**Benefits**:
- Services are interchangeable (dev vs prod)
- Easy to test with local instances
- Clean separation of concerns

## Code Node Best Practices

### Python Code Nodes

**Structure your code**:

```python
# Import at top
import json
import re
from datetime import datetime

# Get input data
items = $input.all()

# Process
results = []
for item in items:
    data = item.json

    # Your logic here
    processed = {
        'original': data,
        'timestamp': datetime.utcnow().isoformat(),
        'processed': True
    }

    results.append({'json': processed})

# Return
return results
```

**Tips**:
- Always return list of dicts with `json` key
- Use `$input.all()` for all items or `$input.first()` for single
- Available modules defined in `n8n-task-runners.json`
- Test code locally before putting in n8n

### JavaScript Code Nodes

```javascript
// Get all input items
const items = $input.all();

// Process
const results = items.map(item => {
  const data = item.json;

  // Your logic
  return {
    json: {
      original: data,
      timestamp: new Date().toISOString(),
      processed: true
    }
  };
});

// Return
return results;
```

**Tips**:
- Modern JS (ES6+) supported
- No external npm packages by default (configure in task-runners.json)
- Use `console.log()` for debugging
- Access environment vars via `$env`

## Data Flow Best Practices

### 1. Use Set Node for Data Shaping

**Instead of Code node**:
```
[HTTP Request]
   ↓
[Code: Extract fields] ← Avoid if possible
```

**Use Set node**:
```
[HTTP Request]
   ↓
[Set] ← Configure fields in UI
  - user.name → name
  - user.email → email
  - created_at → timestamp
```

**Why**: Easier to maintain, no coding needed.

### 2. Filter Early

Process only what you need:

```
[Fetch 1000 items]
   ↓
[Filter: status = 'pending'] ← Reduce to 50 items
   ↓
[Expensive Operation] ← Only runs 50 times
```

### 3. Merge Carefully

When combining data from multiple sources:

```
[Source A]    [Source B]
   ↓              ↓
   └──[Merge]─────┘
         ↓
    [Use merged data]
```

**Merge options**:
- **Append**: Combine all items
- **Keep Matches**: Inner join
- **Keep Non-Matches**: Left/right join

Choose based on your needs.

## Performance Optimization

### 1. Batch Operations

**Slow** (1000 database calls):
```
[For Each of 1000 Items]
   ↓
[DB: Insert One]
```

**Fast** (10 database calls):
```
[Split in Batches: 100]
   ↓
[DB: Bulk Insert 100]
```

### 2. Parallel Execution

For independent operations:

```
[Trigger]
   ├─→ [Task A] ─┐
   ├─→ [Task B] ─┤
   └─→ [Task C] ─┴→ [Merge & Continue]
```

Enable: Node settings → "Execute Once" (not "Run Once For Each Item")

### 3. Cache Results

For expensive operations that don't change often:

```
[Check Cache]
   ↓ (miss)
[Expensive API Call]
   ↓
[Store in Cache]
   ↓
[Return Result]
```

**Implementation**:
- Use n8n database nodes
- Set TTL (time to live)
- Clear cache when data updates

### 4. Limit Execution Time

Add timeouts to prevent hanging:

```
[HTTP Request]
  Timeout: 30 seconds
  Retry: 3 times
  Retry Wait: 5 seconds (exponential)
```

## Security Best Practices

### 1. Use Credentials

**Never hardcode**:
```javascript
// BAD!
const apiKey = 'sk-1234567890abcdef';
```

**Use n8n credentials**:
1. Settings → Credentials → Add
2. Create "API Key" credential
3. Reference in nodes: `{{ $credentials.myApiKey }}`

### 2. Validate Webhook Signatures

For GitHub webhooks:

```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)

# In workflow
signature = $input.first().headers['x-hub-signature-256']
is_valid = verify_signature(payload, signature, secret)

if not is_valid:
    raise Exception('Invalid signature')
```

### 3. Sanitize User Input

**Always validate and sanitize**:

```python
import re

def sanitize_input(user_input):
    # Remove special characters
    cleaned = re.sub(r'[^\w\s-]', '', user_input)
    # Limit length
    return cleaned[:100]

# Use in workflow
safe_input = sanitize_input(user_provided_data)
```

### 4. Use HTTPS

All external HTTP calls should use HTTPS:
```
URL: https://api.example.com  ✓
URL: http://api.example.com   ✗
```

Exception: Internal services (http://ocapistaine:8000 is fine)

## Testing Workflows

### Manual Testing

1. **Use Test Webhook**: Create temporary webhook for testing
2. **Execute Manually**: Click "Execute Workflow" button
3. **Check Each Node**: View input/output data
4. **Use Sample Data**: Create test trigger data

### Production Testing

1. **Start with disabled**: Create workflow, keep inactive
2. **Test in isolation**: Use separate test account/environment
3. **Monitor closely**: Watch first few executions
4. **Enable gradually**: Start with low traffic, increase slowly

### Debug Techniques

**View data between nodes**:
- Click on connector line between nodes
- See data flowing through
- Identify transformation issues

**Use Stop nodes**:
```
[Process A]
   ↓
[Stop] ← Temporarily stops here for inspection
   ↓
[Process B]
```

**Add logging**:
```javascript
// In Code node
console.log('Processing item:', item);
console.log('Result:', result);
```

View logs: `docker compose logs n8n | grep "Processing"`

## Workflow Organization

### Naming Convention

```
<Category>: <Action> - <Details>

Examples:
- GitHub: Process Push Events - Main Repo
- Email: Send Weekly Digest - Subscribers
- DB: Cleanup Old Records - Monthly
- API: Fetch User Data - Sync
```

### Tagging

Use tags for organization:
- `production` - Live workflows
- `test` - Testing workflows
- `archived` - Old/unused
- `critical` - High-priority workflows
- `scheduled` - Cron/timer triggers

### Documentation

Add notes to workflows:

1. Click workflow canvas
2. Add sticky notes with:
   - Purpose
   - Trigger conditions
   - Dependencies
   - Contact person
   - Last updated

### Version Control

n8n has built-in version history:
- Every save creates a version
- View: Workflow → Versions
- Restore previous versions if needed

**Also backup workflows**:
```bash
# Export all workflows (via n8n API or UI)
# Store in git repository
```

## Common Pitfalls

### 1. Not Handling Errors

**Problem**: Workflow fails silently
**Solution**: Add error handlers to all critical nodes

### 2. Infinite Loops

**Problem**: Workflow triggers itself
**Solution**:
- Add loop detection
- Use "Workflow Already Running" check
- Limit iterations

### 3. Memory Issues

**Problem**: Processing too much data at once
**Solution**:
- Use "Split in Batches" node
- Limit query results
- Stream large files

### 4. Rate Limiting

**Problem**: API blocks your requests
**Solution**:
- Add delays between requests
- Batch operations
- Implement backoff strategy

### 5. Timezone Confusion

**Problem**: Scheduled workflows run at wrong time
**Solution**:
- Set `GENERIC_TIMEZONE=Europe/Paris` in .env
- Use UTC internally, convert for display
- Test schedule triggers carefully

## Advanced Patterns

### Sub-Workflows

Break complex logic into reusable pieces:

**Main Workflow**:
```
[Trigger]
   ↓
[Execute Workflow: Process User]
   ↓
[Execute Workflow: Send Notification]
```

**Sub-Workflow: Process User**:
```
[Receive Input]
   ↓
[Validate]
   ↓
[Transform]
   ↓
[Return Result]
```

### State Machines

For complex multi-step processes:

```
[Check Current State]
   ↓
[Switch: State]
   ├─→ new → [Process New] → [Set State: processing]
   ├─→ processing → [Process Active] → [Set State: complete]
   └─→ complete → [Cleanup] → [Set State: archived]
```

Store state in database, update as workflow progresses.

### Event-Driven Architecture

Multiple workflows communicating:

**Workflow A**: Publishes event
```
[Action Happens]
   ↓
[HTTP: POST /webhook/event]
   Body: { "type": "user.created", "data": {...} }
```

**Workflow B**: Subscribes to event
```
[Webhook: /webhook/event]
   ↓
[Filter: type = 'user.created']
   ↓
[Handle User Created]
```

## Resources

- **n8n Workflow Templates**: https://n8n.io/workflows
- **n8n Community Forum**: https://community.n8n.io
- **Expression Reference**: https://docs.n8n.io/code/expressions/
- **ocapistaine Knowledge Base**: [../docs/docs/](../docs/docs/) - Methods, agents, and workflows for content moderation

## Next Steps

- [Development Workflow](./DEVELOPMENT.md) - Test locally with proxy pattern
- [Troubleshooting](./TROUBLESHOOTING.md) - Debug workflow issues
- [Architecture](./ARCHITECTURE.md) - Understand the system
