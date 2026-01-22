---
id: n8n-github-integration
title: Integration of the N8N server to allow github actions
sidebar_label: n8n-integration
sidebar_position: 4
description: n8n allows to integrate external services like github - email - discord
---

# N8N GitHub Integration Workflows

Design document for N8N workflows managing GitHub issues from `audierne2026/participons`.

> **Important**: All N8N Code nodes should use **Python** for consistency and maintainability.
> See individual workflow documentation in `n8n_integrations/` for implementation details.

## Conventions

### Code Nodes: Python Only

All transformation and logic code in N8N workflows **must be written in Python** for:

- Consistency with OCapistaine backend (Python)
- Easier debugging and testing
- Shared utility functions

### GitHub API Access

Use **HTTP Request node** instead of the GitHub node for listing issues. The GitHub node's `getAll` operation is not available for issues.

```
GET https://api.github.com/repos/{owner}/{repo}/issues
Headers:
  Authorization: Bearer {token}
  Accept: application/vnd.github.v3+json
```

### Workflow Documentation

Each workflow has detailed documentation in `n8n_integrations/`:

- [Participons - List Issues](./n8n_integrations/Participons-List-Issues.md)
- [Participons - List Discussions](./n8n_integrations/Participons-List-Discussions.md)
- [Participons - Get Discussion](./n8n_integrations/Participons-Get-Discussion.md)

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         N8N (Vaettir)                                  │
│                                                                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ GitHub          │    │ Credential      │    │ MCP Server      │     │
│  │ Node            │◄───│ Store           │    │ /mcp-server/http│     │
│  │                 │    │ (audierne2026)  │    │                 │     │
│  └─────────────────┘    └─────────────────┘    └────────┬────────┘     │
│           │                                             │              │
│           ▼                                             │              │
│  ┌─────────────────────────────────────────────────────┐│              │
│  │                    WORKFLOWS                        ││              │
│  │                                                     ││              │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐   ││              │
│  │  │ List Issues │  │ Get Issue   │  │ Update     │   ││              │
│  │  │             │  │ Details     │  │ Issue      │   ││              │
│  │  └─────────────┘  └─────────────┘  └────────────┘   ││              │
│  │                                                     ││              │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐   ││              │
│  │  │ Validate    │  │ Batch       │  │ Webhook    │   ││              │
│  │  │ Issue       │  │ Validate    │  │ Listener   │   ││              │
│  │  └─────────────┘  └─────────────┘  └────────────┘   ││              │
│  └─────────────────────────────────────────────────────┘│              │
└─────────────────────────────────────────────────────────┼──────────────┘
                                                          │
                               MCP Protocol (HTTP + JWT)  │
                                                          ▼
                                              ┌───────────────────┐
                                              │   OCapistaine     │
                                              │   Claude Code     │
                                              │   Forseti 461     │
                                              └───────────────────┘
```

## Credential Setup in N8N

> **Note**: GitHub credentials for `audierne2026/participons` will be created directly in N8N by the administrator. They are NOT stored in OCapistaine.

### GitHub Credential (to be created in N8N)

- **Name**: `audierne2026-github`
- **Type**: GitHub OAuth2 or Personal Access Token
- **Scopes**: `repo`, `issues:read`, `issues:write`
- **Repository**: `audierne2026/participons`

### Forseti461 :

Personal Access Token : FORSETI_TOKEN
github_username : forseti461

### OCapistaine API (internal network)

Personal Access Token : OCAP_TOKEN
github_username : ocapistaine

- **Base URL**: `http://localhost:8050` (or internal Docker network URL)
- No authentication required for local calls

---

## Workflow 1: List Participons Issues

**Purpose**: Fetch and filter issues from the participons repository.

> **Documentation**: [n8n_integrations/Participons - List Issues.md](./n8n_integrations/Participons-List-Issues.md)

### Trigger

- **Type**: Webhook / MCP Tool
- **Method**: POST
- **Path**: `/webhook/participons/issues`

### Input Parameters

```json
{
  "state": "open",
  "labels": "Task",
  "per_page": 50
}
```

### Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ Webhook  │───►│ HTTP Request │───►│ Python       │───►│ Response │
│ Trigger  │    │ GitHub API   │    │ Transform    │    │ JSON     │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
```

> **Note**: Use HTTP Request node instead of GitHub node. The GitHub node's `getAll` operation for issues is not available.

### HTTP Request Configuration

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

### Output Transformation (Python)

```python
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


def transform_issues(items):
    """Transform GitHub API response to standardized format."""
    issues = []
    for item in items:
        issue = item if isinstance(item, dict) else item.get('json', {})
        labels = issue.get('labels', [])
        label_names = [l.get('name') if isinstance(l, dict) else str(l) for l in labels]

        issues.append({
            'id': issue.get('number'),
            'title': issue.get('title'),
            'body': issue.get('body') or '',
            'state': issue.get('state'),
            'labels': label_names,
            'category': extract_category(issue),
            'created_at': issue.get('created_at'),
            'updated_at': issue.get('updated_at'),
            'html_url': issue.get('html_url'),
            'user': issue.get('user', {}).get('login', 'unknown'),
            'has_conforme_charte': 'conforme charte' in [l.lower() for l in label_names]
        })

    return {'success': True, 'count': len(issues), 'issues': issues}


# N8N entry point
items = $input.all()
github_issues = items[0]['json'] if items and isinstance(items[0].get('json'), list) else [i.get('json', i) for i in items]
return [{'json': transform_issues(github_issues)}]
```

### Response Format

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
      "html_url": "https://github.com/audierne2026/participons/issues/42",
      "user": "citizen123"
    }
  ]
}
```

---

## Workflow 2: Get Issue Details

**Purpose**: Fetch a single issue with full details and comments.

### Trigger

- **Type**: Webhook / MCP Tool
- **Method**: GET
- **Path**: `/webhook/participons/issues/:number`

### Input Parameters

```json
{
  "number": 42, // Issue number (required)
  "include_comments": true // Whether to fetch comments
}
```

### Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ Webhook  │───►│ GitHub Node  │───►│ GitHub Node  │───►│ Merge &  │
│ Trigger  │    │ Get Issue    │    │ Get Comments │    │ Response │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
                                           │
                                    (if include_comments)
```

### Response Format

```json
{
  "success": true,
  "issue": {
    "id": 42,
    "title": "[economie] Amélioration du port",
    "body": "Proposition détaillée...",
    "state": "open",
    "labels": ["Task", "economie"],
    "category": "economie",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-16T14:20:00Z",
    "html_url": "https://github.com/audierne2026/participons/issues/42",
    "user": "citizen123",
    "comments_count": 3,
    "comments": [
      {
        "id": 123,
        "body": "Bonne idée !",
        "user": "autre_citoyen",
        "created_at": "2024-01-15T12:00:00Z"
      }
    ]
  }
}
```

---

## Workflow 3: Validate Issue (via OCapistaine)

**Purpose**: Send an issue to Forseti 461 for charter validation.

### Trigger

- **Type**: Webhook / MCP Tool
- **Method**: POST
- **Path**: `/webhook/participons/validate`

### Input Parameters

```json
{
  "number": 42, // Issue number to validate
  "auto_label": true, // Automatically add validation labels
  "auto_comment": false // Post validation result as comment
}
```

### Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook  │───►│ GitHub Node  │───►│ HTTP Request │───►│ IF Valid?    │
│ Trigger  │    │ Get Issue    │    │ POST to      │    │              │
└──────────┘    └──────────────┘    │ /api/v1/     │    └──────┬───────┘
                                    │ validate     │           │
                                    └──────────────┘           │
                    ┌──────────────────────────────────────────┤
                    │ YES                                      │ NO
                    ▼                                          ▼
           ┌──────────────┐                           ┌──────────────┐
           │ Add Label    │                           │ No label     │
           │ "conforme    │                           │ change       │
           │  charte"     │                           │ (Opik logs)  │
           └──────────────┘                           └──────────────┘
                    │                                          │
                    └──────────────────┬───────────────────────┘
                                       ▼
                              ┌──────────────┐
                              │ Response     │
                              └──────────────┘
```

**Note**: All validation results (valid or invalid) are automatically traced to Opik by OCapistaine. Violations are visible in the Opik dashboard, not on GitHub.

### HTTP Request to OCapistaine

```
POST http://localhost:8050/api/v1/validate
Content-Type: application/json

{
  "title": "{{ $json.issue.title }}",
  "body": "{{ $json.issue.body }}",
  "category": "{{ $json.issue.category }}"
}
```

### Label Logic (Python)

```python
# Code node after validation
result = $input.first().json

# Simple logic: only add "conforme charte" if valid
# Violations are tracked in Opik, not via GitHub labels
labels_to_add = ['conforme charte'] if result.get('is_valid') else []

return [{
    'json': {
        'issue_number': $node['Get Issue'].json.get('number'),
        'labels_to_add': labels_to_add,
        'is_valid': result.get('is_valid'),
        'validation_result': result
        # Note: violations logged to Opik automatically by OCapistaine
    }
}]
```

### Response Format

```json
{
  "success": true,
  "issue_number": 42,
  "validation": {
    "is_valid": true,
    "category": "economie",
    "original_category": "economie",
    "violations": [],
    "encouraged_aspects": ["Concrete proposal", "Constructive"],
    "confidence": 0.92
  },
  "actions_taken": {
    "labels_added": ["conforme charte"],
    "opik_trace_id": "abc123"
  }
}
```

---

## Workflow 4: Batch Validate Issues

**Purpose**: Validate all open Task issues in batch.

### Trigger

- **Type**: Webhook / MCP Tool / Schedule
- **Method**: POST
- **Path**: `/webhook/participons/validate-batch`

### Input Parameters

```json
{
  "state": "open",
  "labels": ["Task"],
  "exclude_validated": true, // Skip already validated issues
  "limit": 20, // Max issues to process
  "dry_run": false // If true, don't update GitHub
}
```

### Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook  │───►│ List Issues  │───►│ Filter       │───►│ HTTP Request │
│ Trigger  │    │ (Workflow 1) │    │ Unvalidated  │    │ POST /batch  │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │ Loop: Update │
                                                        │ Each Issue   │
                                                        │ Labels       │
                                                        └──────────────┘
                                                               │
                                                               ▼
                                                        ┌──────────────┐
                                                        │ Summary      │
                                                        │ Response     │
                                                        └──────────────┘
```

### HTTP Request to OCapistaine (Batch)

```
POST http://localhost:8050/api/v1/validate/batch
Content-Type: application/json

{
  "items": [
    {"id": "42", "title": "...", "body": "...", "category": "..."},
    {"id": "43", "title": "...", "body": "...", "category": "..."}
  ]
}
```

### Response Format

```json
{
  "success": true,
  "summary": {
    "total_processed": 15,
    "valid": 12,
    "invalid": 3,
    "category_corrections": 2
  },
  "results": [
    {
      "issue_number": 42,
      "is_valid": true,
      "category": "economie",
      "label_added": "conforme charte"
    },
    {
      "issue_number": 43,
      "is_valid": false,
      "category": "logement",
      "label_added": null,
      "violations_logged_to_opik": true
    }
  ],
  "dry_run": false
}
```

---

## Workflow 5: Issue Webhook Listener

**Purpose**: Automatically validate new issues when created.

### Trigger

- **Type**: GitHub Webhook
- **Events**: `issues.opened`, `issues.edited`

### Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ GitHub       │───►│ Filter:      │───►│ Validate     │───►│ Update Issue │
│ Webhook      │    │ Has [Task]   │    │ (Workflow 3) │    │ Labels       │
│ issues.opened│    │ label?       │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### GitHub Webhook Configuration

In `audierne2026/participons` repository settings:

- **Payload URL**: `https://vaettir.locki.io/webhook/participons/new-issue`
- **Content type**: `application/json`
- **Events**: Issues (opened, edited)

---

## Workflow 6: Update Issue

**Purpose**: Update issue labels, add comments, or close issues.

### Trigger

- **Type**: Webhook / MCP Tool
- **Method**: PATCH
- **Path**: `/webhook/participons/issues/:number`

### Input Parameters

```json
{
  "number": 42,
  "add_labels": ["conforme charte"],
  "remove_labels": [],
  "add_comment": null,
  "state": null // "open" | "closed" | null (no change)
}
```

### Response Format

```json
{
  "success": true,
  "issue_number": 42,
  "changes": {
    "labels_added": ["conforme charte"],
    "labels_removed": [],
    "state": "open"
  }
}
```

**Note**: Only use existing labels. Do not create new labels via this workflow.

---

## Workflow 7: List Discussions

**Purpose**: Fetch discussions from the participons repository using GitHub's GraphQL API.

> **Documentation**: [n8n_integrations/Participons - List Discussions.md](./n8n_integrations/Participons-List-Discussions.md)

### Trigger

- **Type**: Webhook / MCP Tool
- **Method**: POST
- **Path**: `/webhook/participons/discussions`

### Input Parameters

```json
{
  "per_page": 10,          // Number of discussions (default: 10, max: 100)
  "category_slug": null,   // Filter by category (e.g., "ideas", "announcements")
  "after": null            // Pagination cursor
}
```

### Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook  │───►│ Python Build │───►│ HTTP Request │───►│ Python       │
│ Trigger  │    │ GraphQL      │    │ GraphQL API  │    │ Transform    │
└──────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                │
                                                                ▼
                                                         ┌──────────────┐
                                                         │ Response     │
                                                         │ JSON         │
                                                         └──────────────┘
```

### GraphQL Query (built in Python node)

```python
def build_discussions_query(owner, repo, first=10, category=None, after=None):
    """Build GraphQL query for fetching discussions."""
    category_filter = f', categoryId: "{category}"' if category else ""
    after_clause = f', after: "{after}"' if after else ""

    query = f"""
    query {{
      repository(owner: "{owner}", name: "{repo}") {{
        discussions(first: {first}{category_filter}{after_clause},
                   orderBy: {{field: UPDATED_AT, direction: DESC}}) {{
          totalCount
          pageInfo {{ hasNextPage endCursor }}
          nodes {{
            id number title body url createdAt updatedAt
            author {{ login }}
            category {{ id name slug }}
            labels(first: 10) {{ nodes {{ name }} }}
            comments(first: 1) {{ totalCount }}
            upvoteCount isAnswered answerChosenAt
          }}
        }}
        discussionCategories(first: 10) {{
          nodes {{ id name slug description }}
        }}
      }}
    }}
    """
    return query
```

### HTTP Request Configuration

```
Method: POST
URL: https://api.github.com/graphql

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Content-Type: application/json
  User-Agent: N8N-Forseti461

Body:
  { "query": "{{ $json.query }}" }
```

### Response Format

```json
{
  "success": true,
  "count": 10,
  "total_count": 45,
  "has_next_page": true,
  "end_cursor": "Y3Vyc29yOnYyOpK5MjAyNC0wMS0xNVQxMDozMDowMFo=",
  "discussions": [
    {
      "id": 5,
      "title": "Proposition pour améliorer le port d'Audierne",
      "body": "Je propose de moderniser...",
      "url": "https://github.com/audierne2026/participons/discussions/5",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:20:00Z",
      "author": "citizen123",
      "category": {
        "id": "DIC_kwDOJxyz1M4CZabc",
        "name": "Ideas",
        "slug": "ideas"
      },
      "labels": ["economie", "infrastructure"],
      "comments_count": 12,
      "upvotes": 8,
      "is_answered": false
    }
  ],
  "available_categories": [
    {
      "id": "DIC_kwDOJxyz1M4CZabc",
      "name": "Ideas",
      "slug": "ideas",
      "description": "Share ideas for new features"
    }
  ]
}
```

**Note**: GitHub Discussions use GraphQL API (v4), not REST API. Category filtering requires GraphQL IDs, which are provided in the response's `available_categories` field.

---

## MCP Tool Definitions

When exposed via N8N's MCP Server, these workflows become tools:

```json
{
  "tools": [
    {
      "name": "participons_list_issues",
      "description": "List issues from audierne2026/participons repository",
      "inputSchema": {
        "type": "object",
        "properties": {
          "state": { "type": "string", "enum": ["open", "closed", "all"] },
          "labels": { "type": "array", "items": { "type": "string" } },
          "category": { "type": "string" },
          "per_page": { "type": "integer", "default": 50 }
        }
      }
    },
    {
      "name": "participons_get_issue",
      "description": "Get details of a specific issue",
      "inputSchema": {
        "type": "object",
        "properties": {
          "number": { "type": "integer" },
          "include_comments": { "type": "boolean", "default": false }
        },
        "required": ["number"]
      }
    },
    {
      "name": "participons_validate_issue",
      "description": "Validate an issue against the contribution charter using Forseti 461",
      "inputSchema": {
        "type": "object",
        "properties": {
          "number": { "type": "integer" },
          "auto_label": { "type": "boolean", "default": true }
        },
        "required": ["number"]
      }
    },
    {
      "name": "participons_validate_batch",
      "description": "Validate all pending issues in batch",
      "inputSchema": {
        "type": "object",
        "properties": {
          "limit": { "type": "integer", "default": 20 },
          "dry_run": { "type": "boolean", "default": false }
        }
      }
    },
    {
      "name": "participons_list_discussions",
      "description": "List discussions from audierne2026/participons repository using GraphQL API",
      "inputSchema": {
        "type": "object",
        "properties": {
          "per_page": { "type": "integer", "default": 10, "maximum": 100 },
          "category_slug": {
            "type": "string",
            "enum": ["ideas", "announcements", "q-and-a", "general"],
            "description": "Filter by discussion category slug"
          },
          "after": {
            "type": "string",
            "description": "Pagination cursor for next page (from previous response's end_cursor)"
          }
        }
      }
    },
    {
      "name": "participons_get_discussion",
      "description": "Get details of a specific discussion including all comments",
      "inputSchema": {
        "type": "object",
        "properties": {
          "number": { "type": "integer" },
          "include_comments": { "type": "boolean", "default": true }
        },
        "required": ["number"]
      }
    }
  ]
}
```

---

## Labels Schema

**Important**: Do NOT create new labels. Use only existing labels in `audierne2026/participons`.

| Label             | Action       | Description                      |
| ----------------- | ------------ | -------------------------------- |
| `Task`            | Read only    | Identifies citizen contributions |
| `conforme charte` | Add if valid | Issue passed charter validation  |

### Validation Outcomes

| Outcome     | Label Action          | Tracking                            |
| ----------- | --------------------- | ----------------------------------- |
| **Valid**   | Add `conforme charte` | Logged in Opik                      |
| **Invalid** | No label change       | Violations logged in Opik dashboard |

**Note**: Violations are NOT tracked via GitHub labels. All violation details (type, reasoning, confidence) are recorded in Opik for analysis and auditing. This keeps the GitHub interface clean while maintaining full traceability.

---

## Environment Variables (N8N)

```bash
# OCapistaine API
OCAPISTAINE_API_URL=http://localhost:8050
OCAPISTAINE_API_KEY=optional_api_key

# GitHub (stored in N8N credential store, not env)
# GITHUB_PAT=... (use credential node instead)
```

---

## Sequence Diagram: Full Validation Flow

```
┌─────────┐     ┌─────────┐     ┌─────────────┐      ┌──────────┐
│ Claude  │     │  N8N    │     │ OCapistaine │      │  GitHub  │
│  Code   │     │ Vaettir │     │ Forseti 461 │      │   API    │
└────┬────┘     └────┬────┘     └──────┬──────┘      └────┬─────┘
     │               │                 │                  │
     │ MCP: list_issues                │                  │
     │──────────────►│                 │                  │
     │               │ GET /issues     │                  │
     │               │────────────────────────────────────►
     │               │                 │     issues[]     │
     │               │◄────────────────────────────────────
     │  issues[]     │                 │                  │
     │◄──────────────│                 │                  │
     │               │                 │                  │
     │ MCP: validate_issue(42)         │                  │
     │──────────────►│                 │                  │
     │               │ GET /issues/42  │                  │
     │               │────────────────────────────────────►
     │               │                 │      issue       │
     │               │◄────────────────────────────────────
     │               │                 │                  │
     │               │ POST /validate  │                  │
     │               │────────────────►│                  │
     │               │                 │ (Forseti 461)    │
     │               │  validation     │                  │
     │               │◄────────────────│                  │
     │               │                 │                  │
     │               │ PATCH /issues/42/labels            │
     │               │────────────────────────────────────►
     │               │                 │      ok          │
     │               │◄────────────────────────────────────
     │  result       │                 │                  │
     │◄──────────────│                 │                  │
     │               │                 │                  │
```

---

## Next Steps

1. **Create GitHub credential** in N8N with audierne2026 PAT
2. **Import workflow templates** (can be exported as JSON)
3. **Configure MCP server** to expose workflows as tools
4. **Test with Claude Code** using the MCP endpoint
5. **Set up GitHub webhook** for automatic validation
