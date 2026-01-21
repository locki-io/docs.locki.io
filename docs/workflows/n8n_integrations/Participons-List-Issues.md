# Participons - List Issues

**Workflow ID:** `sRidwFGSiKYfYwEJ`
**Status:** Active (requires credential configuration)
**Created:** 2026-01-20

## Purpose

Fetch and filter issues from the `audierne2026/participons` GitHub repository.

## Learnings & Issues

### 1. GitHub Node - getAll Operation Not Available

**Issue:** The `getAll` operation for issues does not exist in the N8N GitHub node.

**Solution:** Use the HTTP Request node with GitHub REST API directly:

```
GET https://api.github.com/repos/audierne2026/participons/issues
```

With query parameters:

- `state`: open | closed | all
- `labels`: comma-separated label names
- `per_page`: results per page (max 100)
- `page`: page number

### 2. Credential Reference by ID

**Issue:** Credentials must be referenced by their N8N internal ID, not by name.

**Error encountered:**

```
Credential with ID "FORSETI_TOKEN" does not exist for type "githubApi".
```

**Solution:** In N8N UI, select the credential from the dropdown - N8N will automatically use the correct internal ID.

### 3. MCP Visibility

**Issue:** Workflows are not visible via MCP by default.

**Setting:** `availableInMCP: false` (default)

**Solution:** Enable MCP access in N8N workflow settings if you want to execute via MCP.

## Workflow Structure

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───►│ HTTP Request │───►│ Python       │───►│ Respond to   │
│ Trigger      │    │ GitHub API   │    │ Transform    │    │ Webhook      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## Nodes Configuration

### 1. Webhook Trigger

- **Method:** POST
- **Path:** `participons/issues`
- **Response Mode:** Response Node

### 2. HTTP Request (GitHub API)

```
Method: GET
URL: https://api.github.com/repos/audierne2026/participons/issues

Query Parameters:
  state: {{ $json.body.state || 'open' }}
  labels: {{ $json.body.labels || 'Task' }}
  per_page: {{ $json.body.per_page || 50 }}

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Accept: application/vnd.github.v3+json
  User-Agent: N8N-Forseti461
```

### 3. Python Transform

```python
import json
import re

def extract_category(issue):
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
    category_labels = [
        'economie', 'logement', 'culture', 'ecologie',
        'associations', 'jeunesse', 'alimentation-bien-etre-soins'
    ]
    for label in labels:
        label_name = label.get('name', '') if isinstance(label, dict) else str(label)
        if label_name.lower() in category_labels:
            return label_name.lower()

    return None


def transform_issues(github_issues):
    print(f"DEBUG: transform_issues received {len(github_issues)} raw issues")
    issues = []
    for item in github_issues:
        print(f"DEBUG: processing item with title: {item.get('title', 'NO TITLE')}")

        # Extract label names (your code already handles list of dicts)
        labels = item.get('labels', [])
        label_names = [l['name'] if isinstance(l, dict) else str(l) for l in labels]

        issues.append({
            'id': item.get('number'),
            'title': item.get('title'),
            'body': item.get('body') or '',
            'state': item.get('state'),
            'labels': label_names,
            'category': extract_category(item),
            'created_at': item.get('created_at'),
            'updated_at': item.get('updated_at'),
            'html_url': item.get('html_url'),
            'user': item.get('user', {}).get('login', 'unknown'),
            'has_conforme_charte': 'conforme charte' in [l.lower() for l in label_names]
        })
    print(f"DEBUG: transformed {len(issues)} issues")
    return {
        'success': True,
        'count': len(issues),
        'issues': issues
    }

# ── Safe input extraction ──
github_issues = []

if _items and len(_items) > 0:
    raw = _items[0].get("json", [])   # .get() prevents KeyError if "json" missing

    if isinstance(raw, list):
        github_issues = raw
        print(f"DEBUG: Found {len(github_issues)} issues in json payload")
    else:
        print("DEBUG: json payload is not a list → type fallback used")
        github_issues = [raw] if raw else []

else:
    print("DEBUG: No _items or empty input")

print(f"DEBUG: Final github_issues has {len(github_issues)} elements")

# Quick check on first item if exists
if github_issues:
    first = github_issues[0]
    print(f"DEBUG: First issue title: {first.get('title', 'MISSING TITLE')}")
    print(f"DEBUG: Has body? {'body' in first}")
    print(f"DEBUG: Has labels? {len(first.get('labels', [])) > 0}")

result = transform_issues(github_issues)
return [{'json': result}]
```

### 4. Respond to Webhook

- **Respond With:** JSON
- **Response Body:** `{{ $json }}`

## Input Parameters

```json
{
  "state": "open", // open | closed | all (default: open)
  "labels": "Task", // comma-separated (default: Task)
  "per_page": 50 // max results (default: 50, max: 100)
}
```

## Output Format

```json
{
  "success": true,
  "count": 15,
  "issues": [
    {
      "id": 42,
      "title": "[economie] Amélioration du port",
      "body": "Proposition pour moderniser...",
      "state": "open",
      "labels": ["Task", "economie"],
      "category": "economie",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-16T14:20:00Z",
      "html_url": "https://github.com/audierne2026/participons/issues/42",
      "user": "citizen123",
      "has_conforme_charte": false
    }
  ]
}
```

## Webhook URL

```
POST https://vaettir.locki.io/webhook/participons/issues
Content-Type: application/json

{
  "state": "open",
  "labels": "Task",
  "per_page": 20
}
```

## Testing

```bash
curl -X POST "https://vaettir.locki.io/webhook/participons/issues" \
  -H "Content-Type: application/json" \
  -d '{"state": "open", "type": "Task","per_page": 5, "page": 1}'
```

## Related

- [N8N GitHub Integration Design](../n8n-github-integration.md)
- [Forseti 461 Agent](../../agents/forseti/README.md)
