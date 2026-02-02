# Forseti Charter Validation

**Workflow ID:** `[TBD - assign after N8N creation]`
**Status:** Active
**MCP Tool:** `participons_validate_issue`
**Created:** 2026-01-30

## Purpose

Add the `conforme charte` label to a GitHub issue after the OCapistaine app has validated it against the contribution charter. This is a post-validation webhook - the LLM validation happens in the app, not in N8N.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OCapistaine App (front.py)                       │
│                                                                         │
│  User clicks "Validate" → ForsetiAgent validates → Result displayed    │
│                                    │                                    │
│                                    ▼                                    │
│                          if is_valid: POST to N8N                       │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          N8N Workflow (this doc)                        │
│                                                                         │
│  Webhook → Check existing labels → IF valid → Add Label → Respond      │
└─────────────────────────────────────────────────────────────────────────┘
```

## Workflow Structure (Simplified)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───►│ Get Issue    │───►│ IF           │───►│ Add Label    │
│ Trigger      │    │ (check labels)│   │ (should add) │    │ (conditional)│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                               │                    │
                                               │                    ▼
                                               │            ┌──────────────┐
                                               └───────────►│ Respond to   │
                                                            │ Webhook      │
                                                            └──────────────┘
```

## Nodes Configuration

### 1. Webhook Trigger

- **Method:** POST
- **Path:** `forseti/charter-valid`
- **Response Mode:** Response Node

### 2. HTTP Request - Get Issue (Check Existing Labels)

```
Method: GET
URL: https://api.github.com/repos/audierne2026/participons/issues/{{ $json.body.issueNumber }}

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Accept: application/vnd.github.v3+json
  User-Agent: N8N-Forseti461
```

### 3. IF Node - Should Add Label

Check if:
- `is_valid` is true (from webhook body)
- Issue doesn't already have `conforme charte` label

**Condition (JavaScript):**
```javascript
const isValid = $('Webhook').item.json.body.is_valid === true;
const labels = $input.item.json.labels || [];
const hasLabel = labels.some(l => l.name?.toLowerCase() === 'conforme charte');
return isValid && !hasLabel;
```

### 4. HTTP Request - Add Label (True Branch)

```
Method: POST
URL: https://api.github.com/repos/audierne2026/participons/issues/{{ $('Webhook').item.json.body.issueNumber }}/labels

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Accept: application/vnd.github.v3+json
  Content-Type: application/json
  User-Agent: N8N-Forseti461

Body:
["conforme charte"]
```

### 5. Respond to Webhook

Both branches (label added / not added) should respond with:

```json
{
  "success": true,
  "issueNumber": "{{ $('Webhook').item.json.body.issueNumber }}",
  "label_added": true/false,
  "reason": "Label added" / "Already has label" / "Not valid"
}
```

## Input Parameters (from App)

The OCapistaine app sends this after ForsetiAgent validates:

```json
{
  "issueNumber": 64,
  "is_valid": true,
  "category": "logement",
  "confidence": 0.92
}
```

## Output Format

### Label Change Effective

```json
{
  "success": true,
  "issueNumber": 64,
  "isValid": true,
  "new_category": "logement",
  "category_labels": ["conforme charte"],
  "new_title": "[logement] contribution...",
  "should_replace_label": true,
  "reason": "Label added"
}
```

### No Change (not assigned to Forseti)

```json
{
  "success": false,
  "issueNumber": 64,
  "isValid": true,
  "new_category": "logement",
  "category_labels": [],
  "new_title": "",
  "should_replace_label": false,
  "reason": "task not assigned to forseti461"
}
```

### No Change (already has label)

```json
{
  "success": false,
  "issueNumber": 64,
  "isValid": true,
  "new_category": "logement",
  "category_labels": ["conforme charte"],
  "new_title": "",
  "should_replace_label": false,
  "reason": "Already has conforme charte label"
}
```

**Note:** `success: true` means a change was made to the issue (label added/updated). `success: false` means no change was made (already compliant or not assigned).

## App Integration

The webhook is called from `app/front.py` in `_validate_with_forseti()`:

```python
# After ForsetiAgent validates successfully
if result.is_valid and issue_id:
    requests.post(
        N8N_CHARTER_VALID_WEBHOOK,
        json={
            "issueNumber": issue_id,
            "is_valid": result.is_valid,
            "category": result.category,
            "confidence": result.confidence,
        },
        timeout=10,
    )
```

## Testing

### Test from curl (simulating app call)

```bash
curl -X POST "https://vaettir.locki.io/webhook/forseti/charter-valid" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 64, "is_valid": true, "category": "logement", "confidence": 0.92}'
```

### Test with invalid (should not add label)

```bash
curl -X POST "https://vaettir.locki.io/webhook/forseti/charter-valid" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 64, "is_valid": false}'
```

## Learnings & Issues

### 1. Separation of Concerns

**Issue:** Originally tried to do LLM validation in N8N, but it duplicated work already done in the app.

**Solution:** KISS - N8N only handles the GitHub label action. Validation stays in the app where ForsetiAgent runs with proper Opik tracing.

### 2. Label Idempotency

**Issue:** Adding a label that already exists causes no error, but we should track it.

**Solution:** Check existing labels before adding and report whether label was actually added.

### 3. Opik Tracing

All LLM validation traces stay in the app where Opik is configured. N8N only logs the label action.

## N8N Setup Checklist

- [x] Configure GitHub credential (`audierne2026-github`) with scopes: `repo`, `issues:write`
- [x] Enable MCP access: Settings > Workflow > `availableInMCP: true`
- [ ] Activate workflow for production

## Dependencies

- **OCapistaine App** must be running and calling this webhook after validation
- **GitHub credential** with `repo`, `issues:write` scopes

## Related

- [N8N GitHub Integration Design](../n8n-github-integration.md)
- [Forseti 461 Agent](../../agents/forseti/README.md) - Charter validation agent
- [Contribution Charter](../contribution-charter.md) - Governance rules
- [List Issues Workflow](./Participons-List-Issues.md) - Related workflow
