# Forseti Charter Validation

**Workflow ID:** `[TBD - assign after N8N creation]`
**Status:** Active
**MCP Tool:** `participons_validate_issue`
**Created:** 2026-01-30

## Purpose

Validate a GitHub issue from the `audierne2026/participons` repository against the contribution charter using Forseti 461. Optionally adds the `conforme charte` label if the issue is valid.

## Workflow Structure

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───►│ Get Issue    │───►│ Validate     │───►│ Python       │
│ Trigger      │    │ GitHub API   │    │ OCapistaine  │    │ Transform    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                    ┌──────────────┐    ┌──────────────┐            │
                    │ Respond to   │◄───│ Add Label    │◄───────────┤
                    │ Webhook      │    │ (if valid)   │            │
                    └──────────────┘    └──────────────┘            │
                           ▲                                        │
                           └────────────────────────────────────────┘
                                    (if not adding label)
```

## Nodes Configuration

### 1. Webhook Trigger

- **Method:** POST
- **Path:** `forseti/charter-valid`
- **Response Mode:** Response Node

### 2. HTTP Request - Get Issue from GitHub

```
Method: GET
URL: https://api.github.com/repos/audierne2026/participons/issues/{{ $json.body.number }}

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Accept: application/vnd.github.v3+json
  User-Agent: N8N-Forseti461
```

### 3. HTTP Request - Validate with OCapistaine

```
Method: POST
URL: http://localhost:8050/validate
Timeout: 30000ms  # LLM calls are slow

Headers:
  Content-Type: application/json

Body:
{
  "title": "{{ $node['Get Issue from GitHub'].json.title }}",
  "body": "{{ $node['Get Issue from GitHub'].json.body }}",
  "category": null
}
```

**Note:** For Docker deployments, replace `localhost:8050` with the Docker service URL (e.g., `http://ocapistaine:8050`).

### 4. Python Transform

```python
import re

def extract_existing_category(issue):
    """Extract category from issue title, body, or labels."""
    title = issue.get('title', '')
    body = issue.get('body', '') or ''
    labels = issue.get('labels', [])

    # Check title for [category]
    title_match = re.search(r'\[([^\]]+)\]', title)
    if title_match:
        return title_match.group(1).lower()

    # Check body for Category: xxx
    body_match = re.search(r'Category:\s*(\w+)', body, re.IGNORECASE)
    if body_match:
        return body_match.group(1).lower()

    # Check labels
    category_labels = ['economie', 'logement', 'culture', 'ecologie',
                       'associations', 'jeunesse', 'alimentation-bien-etre-soins']
    for label in labels:
        label_name = label.get('name', '') if isinstance(label, dict) else str(label)
        if label_name.lower() in category_labels:
            return label_name.lower()
    return None

# Main transform
webhook_body = _input.first().json.get('body', {})
github_issue = _node['Get Issue from GitHub'].first().json
validation = _node['Validate with Forseti'].first().json

issue_number = webhook_body.get('number') or github_issue.get('number')
auto_label = webhook_body.get('auto_label', True)

labels = github_issue.get('labels', [])
label_names = [l.get('name', '') if isinstance(l, dict) else str(l) for l in labels]
has_conforme_charte = 'conforme charte' in [l.lower() for l in label_names]

is_valid = validation.get('is_valid', False)
should_add_label = auto_label and is_valid and not has_conforme_charte

return [{'json': {
    'success': True,
    'issue_number': issue_number,
    'issue_url': github_issue.get('html_url'),
    'issue_title': github_issue.get('title'),
    'validation': {
        'is_valid': is_valid,
        'category': validation.get('category'),
        'original_category': extract_existing_category(github_issue),
        'violations': validation.get('violations', []),
        'encouraged_aspects': validation.get('encouraged_aspects', []),
        'reasoning': validation.get('reasoning', ''),
        'confidence': validation.get('confidence', 0.5)
    },
    'actions': {
        'auto_label': auto_label,
        'should_add_label': should_add_label,
        'had_conforme_charte': has_conforme_charte
    },
    'should_add_label': should_add_label
}}]
```

### 5. IF Node - Check Label Condition

**Condition:** `{{ $json.should_add_label }} === true`

Routes to:
- **True branch:** Add Label node
- **False branch:** Respond to Webhook (skip labeling)

### 6. HTTP Request - Add Label (Conditional)

```
Method: POST
URL: https://api.github.com/repos/audierne2026/participons/issues/{{ $json.issue_number }}/labels

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Accept: application/vnd.github.v3+json
  Content-Type: application/json
  User-Agent: N8N-Forseti461

Body:
["conforme charte"]
```

### 7. Respond to Webhook

- **Respond With:** JSON
- **Response Body:** `{{ $json }}`

## Input Parameters

```json
{
  "number": 42,           // Required: GitHub issue number
  "auto_label": true      // Optional: add "conforme charte" label if valid (default: true)
}
```

## Output Format

```json
{
  "success": true,
  "issue_number": 42,
  "issue_url": "https://github.com/audierne2026/participons/issues/42",
  "issue_title": "[economie] Proposition pour le port",
  "validation": {
    "is_valid": true,
    "category": "economie",
    "original_category": "economie",
    "violations": [],
    "encouraged_aspects": ["Concrete proposal", "Budget consideration"],
    "reasoning": "The contribution proposes specific improvements...",
    "confidence": 0.92
  },
  "actions": {
    "auto_label": true,
    "should_add_label": true,
    "had_conforme_charte": false
  }
}
```

### Validation Failure Example

```json
{
  "success": true,
  "issue_number": 43,
  "issue_url": "https://github.com/audierne2026/participons/issues/43",
  "issue_title": "Bad proposal",
  "validation": {
    "is_valid": false,
    "category": null,
    "original_category": null,
    "violations": ["Personal attack detected", "No constructive proposal"],
    "encouraged_aspects": [],
    "reasoning": "The contribution contains personal criticism without...",
    "confidence": 0.85
  },
  "actions": {
    "auto_label": true,
    "should_add_label": false,
    "had_conforme_charte": false
  }
}
```

## Webhook URLs

### Test Mode (workflow must be in test mode)

```
POST https://vaettir.locki.io/webhook-test/forseti/charter-valid
Content-Type: application/json

{"number": 42}
```

### Production Mode (workflow must be active)

```
POST https://vaettir.locki.io/webhook/forseti/charter-valid
Content-Type: application/json

{"number": 42}
```

## Testing

### Basic Validation

```bash
# Validate issue #1
curl -X POST "https://vaettir.locki.io/webhook-test/forseti/charter-valid" \
  -H "Content-Type: application/json" \
  -d '{"number": 1}'
```

### Validation Without Auto-Label

```bash
# Validate without adding label
curl -X POST "https://vaettir.locki.io/webhook-test/forseti/charter-valid" \
  -H "Content-Type: application/json" \
  -d '{"number": 1, "auto_label": false}'
```

### Test OCapistaine Directly

```bash
# Test the validation endpoint directly
curl -X POST "http://localhost:8050/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "[economie] Proposition pour le port",
    "body": "Je propose d améliorer les infrastructures portuaires..."
  }'
```

## MCP Usage

Once configured with `availableInMCP: true`, use from Claude Code:

```
Use participons_validate_issue with number=42
```

Or:

```
Validate issue #42 against the charter
```

## Learnings & Issues

### 1. Timeout Configuration

**Issue:** OCapistaine validation calls involve LLM processing which can be slow.

**Solution:** Set HTTP Request timeout to 30000ms (30 seconds) for the validation call.

### 2. Label Idempotency

**Issue:** Adding a label that already exists causes no error, but we should avoid unnecessary API calls.

**Solution:** Check existing labels in the Python transform and set `should_add_label: false` if `conforme charte` already exists.

### 3. Opik Tracing

**Issue:** Violations should be logged for analysis but not necessarily stored on GitHub.

**Solution:** OCapistaine logs all validations to Opik for tracing and evaluation. GitHub only receives the `conforme charte` label for valid issues.

### 4. Category Preservation

**Issue:** The original issue may already have a category that should be preserved.

**Solution:** The transform extracts `original_category` from the issue and includes both original and validated categories in the response.

## N8N Setup Checklist

- [ ] Create workflow in N8N with nodes as documented
- [ ] Configure GitHub credential (`audierne2026-github`) with scopes: `repo`, `issues:write`
- [ ] Set OCapistaine URL (localhost:8050 or Docker service URL)
- [ ] Set 30s timeout on validation HTTP request
- [ ] Test with webhook-test endpoint
- [ ] Enable MCP access: Settings > Workflow > `availableInMCP: true`
- [ ] Set MCP tool name: `participons_validate_issue`
- [ ] Activate workflow for production

## Dependencies

- **OCapistaine API** running at `localhost:8050` (or Docker URL)
- **GitHub credential** with `repo`, `issues:write` scopes
- **Opik** configured for tracing (optional but recommended)

## Related

- [N8N GitHub Integration Design](../n8n-github-integration.md) - MCP tool spec at lines 732-743
- [Forseti 461 Agent](../../agents/forseti/README.md) - Charter validation agent
- [Contribution Charter](../contribution-charter.md) - Governance rules
- [List Issues Workflow](./Participons-List-Issues.md) - Related workflow
