# N8N GitHub Integration Workflows

Design document for N8N workflows managing GitHub issues from `audierne2026/participons`.

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

### OCapistaine API (internal network)

- **Base URL**: `http://localhost:8050` (or internal Docker network URL)
- No authentication required for local calls

---

## Workflow 1: List Participons Issues

**Purpose**: Fetch and filter issues from the participons repository.

### Trigger

- **Type**: Webhook / MCP Tool
- **Method**: POST
- **Path**: `/webhook/participons/issues`

### Input Parameters

```json
{
  "state": "open", // open | closed | all
  "labels": ["Task"], // filter by labels
  "category": null, // filter by category label
  "per_page": 50, // max results
  "since": null // ISO date, only issues updated after
}
```

### Flow

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│ Webhook  │───►│ GitHub Node  │───►│ Filter/Map   │───►│ Response │
│ Trigger  │    │ List Issues  │    │ Transform    │    │ JSON     │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘
```

### GitHub Node Configuration

- **Resource**: Issue
- **Operation**: Get Many
- **Repository Owner**: `audierne2026`
- **Repository Name**: `participons`
- **Return All**: false (use pagination)
- **Filters**: state, labels, since

### Output Transformation

```javascript
// Code node to transform GitHub response
return items.map((issue) => ({
  id: issue.number,
  title: issue.title,
  body: issue.body || "",
  state: issue.state,
  labels: issue.labels.map((l) => l.name),
  category: extractCategory(issue), // from [category] in title or body
  created_at: issue.created_at,
  updated_at: issue.updated_at,
  html_url: issue.html_url,
  user: issue.user.login,
}));

function extractCategory(issue) {
  // Check title for [category]
  const titleMatch = issue.title.match(/\[([^\]]+)\]/);
  if (titleMatch) return titleMatch[1].toLowerCase();

  // Check body for Category: xxx
  if (issue.body) {
    const bodyMatch = issue.body.match(/Category:\s*(\w+)/i);
    if (bodyMatch) return bodyMatch[1].toLowerCase();
  }

  // Check labels
  const categoryLabels = [
    "economie",
    "logement",
    "culture",
    "ecologie",
    "associations",
    "jeunesse",
    "alimentation-bien-etre-soins",
  ];
  for (const label of issue.labels) {
    if (categoryLabels.includes(label.name.toLowerCase())) {
      return label.name.toLowerCase();
    }
  }

  return null;
}
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

### Label Logic

```javascript
// Code node after validation
const result = $input.first().json;

// Simple logic: only add "conforme charte" if valid
// Violations are tracked in Opik, not via GitHub labels
const labelsToAdd = result.is_valid ? ["conforme charte"] : [];

return {
  issue_number: $("Get Issue").first().json.number,
  labels_to_add: labelsToAdd,
  is_valid: result.is_valid,
  validation_result: result,
  // Note: violations logged to Opik automatically by OCapistaine
};
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
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌──────────┐
│ Claude  │     │  N8N    │     │ OCapistaine │     │  GitHub  │
│  Code   │     │ Vaettir │     │ Forseti 461 │     │   API    │
└────┬────┘     └────┬────┘     └──────┬──────┘     └────┬─────┘
     │               │                 │                  │
     │ MCP: list_issues               │                  │
     │──────────────►│                 │                  │
     │               │ GET /issues     │                  │
     │               │────────────────────────────────────►
     │               │                 │     issues[]     │
     │               │◄────────────────────────────────────
     │  issues[]     │                 │                  │
     │◄──────────────│                 │                  │
     │               │                 │                  │
     │ MCP: validate_issue(42)        │                  │
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
