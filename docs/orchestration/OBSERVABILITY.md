# Observability with Opik

Guide to monitoring n8n workflows using Opik LLM observability platform.

## Overview

Opik provides tracing and monitoring for LLM applications and workflows. When integrated with n8n, it captures:

- ✅ Workflow executions
- ✅ LLM API calls (OpenAI, Anthropic, etc.)
- ✅ Performance metrics
- ✅ Error traces
- ✅ Cost tracking
- ✅ Custom annotations

## When to Use Opik

### Enable in Production ✓

- Monitor real workflow performance
- Track LLM costs and usage
- Debug production issues
- Analyze execution patterns
- Compliance and auditing

### Skip in Local Dev ✗

- Adds unnecessary overhead
- Creates noise in traces
- Costs API calls for testing
- Local logs are sufficient (`docker compose logs`)

**Recommendation**: Enable only on production server.

## Setup Guide

### Step 1: Create Opik Account

1. Go to https://www.comet.com/signup?product=opik
2. Sign up (free tier available)
3. Verify email

### Step 2: Get API Key

1. Log in to Comet
2. Go to Settings → API Keys
3. Create new API key for n8n
4. Copy the key (starts with `MC.`)

### Step 3: Create Workspace

1. In Comet dashboard: Create workspace
2. Name it (e.g., `vaettir-production`)
3. Note the workspace name

### Step 4: Configure Environment

On your **production server**:

```bash
ssh user@your-server
cd ~/vaettir
nano .env
```

Add these lines:
```bash
# Opik Observability
OPIK_API_KEY=MC.your_actual_api_key_here
OPIK_WORKSPACE=vaettir-production
OTEL_EXPORTER_OTLP_ENDPOINT=https://www.comet.com/opik/api/v1/private/otel
OTEL_EXPORTER_OTLP_HEADERS=Authorization=${OPIK_API_KEY},Comet-Workspace=${OPIK_WORKSPACE}
N8N_OTEL_SERVICE_NAME=vaettir-n8n-prod
EXTERNAL_HOOK_FILES=/opt/nodejs/node-v22.21.1/lib/node_modules/n8n-observability/dist/hooks.cjs
```

### Step 5: Restart n8n

```bash
docker compose restart n8n

# Check logs for errors
docker compose logs -f n8n
```

Look for:
```
External hooks init complete
```

### Step 6: Verify Integration

1. Execute a workflow in n8n
2. Go to Opik dashboard
3. Navigate to Traces
4. You should see the execution appear

## What Gets Traced

### Workflow Executions

Every workflow execution creates a trace:

```
Trace: workflow_execution_1234
  ├─ Span: Webhook Trigger
  ├─ Span: HTTP Request Node
  ├─ Span: Code Node (Python)
  ├─ Span: AI Agent
  │   ├─ Span: OpenAI API Call
  │   └─ Span: Response Processing
  └─ Span: Send Email
```

### LLM Calls

AI nodes automatically traced:
- Model used (gpt-4, claude-3, etc.)
- Prompt content
- Response content
- Token usage
- Latency
- Cost (estimated)

### Metadata

Each trace includes:
- Workflow name and ID
- Execution ID
- Start/end time
- Success/failure status
- Error messages (if failed)
- User who triggered (if applicable)

## Using the Opik Dashboard

### View Traces

1. Go to https://www.comet.com/workspace/opik
2. Click "Traces" in sidebar
3. See all workflow executions

**Filters**:
- Time range
- Workflow name
- Success/failure
- Duration
- Custom tags

### Analyze Performance

**Latency view**:
- See slowest nodes
- Identify bottlenecks
- Compare execution times

**Cost view**:
- LLM token usage
- Estimated costs
- Cost trends over time

### Debug Errors

When workflow fails:
1. Find trace in Opik
2. Click to expand
3. See exact error location
4. View full error message
5. Inspect input/output data

### Custom Annotations

Add metadata to traces from workflows:

```python
# In Code node
import os

# Add custom metadata (if supported by n8n-observability)
# This appears in Opik trace
metadata = {
    "user_id": "123",
    "feature": "content_moderation",
    "version": "1.2.3"
}

# Your workflow logic
result = process_data(input_data)

return [{
    "json": {
        "result": result,
        "metadata": metadata
    }
}]
```

## Configuration Options

### Service Name

Identifies your n8n instance in Opik:

```bash
N8N_OTEL_SERVICE_NAME=vaettir-n8n-prod
```

**Use different names** for multiple environments:
- `vaettir-n8n-prod` - Production
- `vaettir-n8n-staging` - Staging
- `vaettir-n8n-dev` - Development (if you enable it)

### Sampling

To reduce costs, sample traces (only send subset):

**Note**: n8n-observability may not support sampling yet. Check docs.

If available, add to .env:
```bash
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling
```

### Data Privacy

**Sensitive data handling**:

Opik receives:
- Workflow structure
- Node configurations
- Input/output data
- LLM prompts/responses

**To protect sensitive data**:

1. **Don't trace sensitive workflows**: Disable for PII-heavy flows
2. **Sanitize in code nodes**: Remove sensitive fields before processing
3. **Use self-hosted Opik**: Deploy Opik on your infrastructure

**Self-hosted Opik**:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:5173/api/v1/private/otel
# No Authorization header needed for self-hosted
```

## Troubleshooting

### Traces not appearing

**Check n8n logs**:
```bash
docker compose logs n8n | grep -i opik
docker compose logs n8n | grep -i otel
```

**Verify configuration**:
```bash
docker compose exec n8n env | grep OPIK
docker compose exec n8n env | grep OTEL
```

**Common issues**:
- `EXTERNAL_HOOK_FILES` not set correctly
- `OPIK_API_KEY` missing or invalid
- n8n-observability not installed (check Dockerfile.n8n)
- Network issues reaching Comet API

### n8n fails to start

**Error**: `Problem loading external hook file` or `Cannot find module '/usr/local/lib/node_modules/n8n-observability/dist/hooks.cjs'`

**Cause**: n8n-observability not installed or `EXTERNAL_HOOK_FILES` path incorrect

**Fix**:
```bash
# Option 1: Verify the correct installation path
docker run --rm vaettir/n8n:latest npm list -g n8n-observability
# Should show: /opt/nodejs/node-v22.21.1/lib

# Update .env with correct path
nano .env
# Set: EXTERNAL_HOOK_FILES=/opt/nodejs/node-v22.21.1/lib/node_modules/n8n-observability/dist/hooks.cjs
docker compose restart n8n

# Option 2: Disable observability temporarily
nano .env
# Comment out all OPIK/OTEL variables including EXTERNAL_HOOK_FILES

# Option 3: Rebuild if package not installed
docker compose build n8n --no-cache
docker compose up -d
```

**Important**: The n8n-observability package installs to `/opt/nodejs/node-v22.21.1/lib/node_modules/` in the official n8n Docker image, not `/usr/local/lib/node_modules/`. Always verify the installation path matches your `EXTERNAL_HOOK_FILES` setting.

### Partial traces

**Symptom**: Some nodes missing from traces

**Causes**:
- Node type not supported by n8n-observability
- Error in node (execution stopped)
- Async nodes not waited for

**Investigation**:
- Check n8n logs for errors
- Verify all nodes executed successfully
- Check Opik for partial traces (better than nothing)

### High costs

**Problem**: Too many traces, high Opik bill

**Solutions**:

1. **Sample traces**: Only send percentage
2. **Filter workflows**: Only trace important ones
3. **Disable for high-volume**: Skip simple/frequent workflows
4. **Self-host Opik**: No per-trace costs

### Data retention

Opik retains traces based on plan:
- Free: 30 days
- Paid: Longer (check plan)

**For longer retention**:
- Export traces periodically
- Use self-hosted Opik
- Store critical traces separately

## Best Practices

### 1. Tag Workflows

Add meaningful tags to workflows:
- Environment (prod, staging)
- Feature area (moderation, notifications)
- Criticality (critical, normal, low)
- Owner (team name)

Helps filtering in Opik.

### 2. Set Alerts

In Opik dashboard:
- Alert on high error rate
- Alert on slow executions
- Alert on high costs
- Send to Slack/email

### 3. Regular Review

Weekly:
- Check error trends
- Identify slow workflows
- Review LLM costs
- Optimize bottlenecks

### 4. Cost Monitoring

Set budgets:
- Daily LLM spend limit
- Alert when approaching
- Review biggest cost drivers

### 5. Privacy Compliance

Document:
- What data is sent to Opik
- How long it's retained
- Who has access
- GDPR/compliance notes

## Integration with Other Tools

### Grafana

Export Opik metrics to Grafana for custom dashboards.

**Setup**:
1. Use Opik API to fetch metrics
2. Create Grafana dashboard
3. Display alongside other metrics

### Slack Notifications

Get alerts in Slack:

1. Opik → Settings → Integrations
2. Connect Slack
3. Configure alert rules
4. Get notified of failures/anomalies

### PagerDuty

For critical alerts:

1. Opik → Integrations → PagerDuty
2. Connect account
3. Set up critical workflow alerts
4. On-call team gets paged

## Self-Hosted Opik

For full control and privacy:

### Install Opik Locally

```bash
# Using Docker Compose
git clone https://github.com/comet-ml/opik
cd opik/deployment/docker-compose

# Start Opik
docker compose up -d

# Access at http://localhost:5173
```

### Configure n8n

Update `.env`:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://opik:5173/api/v1/private/otel
# Remove OTEL_EXPORTER_OTLP_HEADERS (no auth needed)
N8N_OTEL_SERVICE_NAME=vaettir-n8n
EXTERNAL_HOOK_FILES=/usr/local/lib/node_modules/n8n-observability/dist/hooks.cjs
```

Add Opik to `docker-compose.yml`:
```yaml
services:
  opik:
    image: ghcr.io/comet-ml/opik:latest
    ports:
      - "5173:5173"
    volumes:
      - opik_data:/data
```

### Benefits

- ✅ No external API calls
- ✅ Full data control
- ✅ Unlimited retention
- ✅ No per-trace costs
- ✅ GDPR compliance easier

### Drawbacks

- ❌ Self-managed infrastructure
- ❌ No automatic updates
- ❌ Need to monitor Opik itself
- ❌ More complex setup

## Advanced: Custom Metrics

Beyond automatic tracing, send custom metrics:

```python
# In Code node (example - check n8n-observability API)
from opentelemetry import metrics

meter = metrics.get_meter("n8n.workflow")
counter = meter.create_counter("custom_metric")

# Increment
counter.add(1, {"workflow": "moderation", "result": "flagged"})
```

View in Opik metrics dashboard.

## Disabling Observability

To turn off Opik:

### Temporary

```bash
# Comment out in .env
# OPIK_API_KEY=...
# EXTERNAL_HOOK_FILES=...

# Restart
docker compose restart n8n
```

### Permanent

```bash
# Remove from .env entirely
nano .env
# Delete all OPIK/OTEL lines

# Remove from docker-compose.yml if you want
# (Already optional - safe to leave)

# Restart
docker compose restart n8n
```

## Comparison: Observability Options

| Feature | Opik Cloud | Opik Self-Hosted | n8n Logs | Alternatives |
|---------|------------|------------------|----------|--------------|
| Setup | Easy | Medium | None | Varies |
| Cost | Per-trace | Infrastructure | Free | Varies |
| LLM tracking | ✅ Native | ✅ Native | ❌ | Some |
| Visualization | ✅ Rich | ✅ Rich | ❌ Basic | ✅ Varies |
| Privacy | Cloud | ✅ Full control | ✅ Local | Varies |
| Retention | 30d (free) | ✅ Unlimited | Until rotation | Varies |

**Alternatives**:
- Datadog APM
- New Relic
- Honeycomb
- Jaeger (self-hosted)
- Zipkin (self-hosted)

## Resources

- **Opik Documentation**: https://www.comet.com/docs/opik
- **n8n-observability GitHub**: https://github.com/comet-ml/n8n-observability
- **n8n Integrations**: https://docs.n8n.io/integrations/
- **OpenTelemetry Docs**: https://opentelemetry.io/docs/

## Next Steps

- [Setup Guide](./SETUP.md) - Configure Opik integration
- [Troubleshooting](./TROUBLESHOOTING.md) - Debug issues
- [Workflows](./WORKFLOWS.md) - Build traceable workflows
