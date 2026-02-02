# N8N Workflows for Participons Integration

This directory contains detailed documentation for N8N workflows that integrate with the `audierne2026/participons` GitHub repository.

## Available Workflows

### 1. [List Issues](./Participons-List-Issues.md)
**Status:** ✅ Active
**MCP Tool:** `participons_list_issues`

Fetch and filter GitHub Issues from the participons repository. Supports filtering by state, labels, and category extraction.

**Quick Test:**
```bash
curl -X POST "https://vaettir.locki.io/webhook/participons/issues" \
  -H "Content-Type: application/json" \
  -d '{"state": "open", "labels": "Task", "per_page": 10}'
```

### 2. [List Discussions](./Participons-List-Discussions.md)
**Status:** 📋 Design (Not Yet Implemented)
**MCP Tool:** `participons_list_discussions`

Fetch GitHub Discussions using GraphQL API. Supports category filtering and cursor-based pagination.

**Features:**
- Category filtering (ideas, announcements, Q&A)
- Pagination with cursors
- Upvote and answer tracking
- Comment counts

**Quick Test (once implemented):**
```bash
curl -X POST "https://vaettir.locki.io/webhook/participons/discussions" \
  -H "Content-Type: application/json" \
  -d '{"per_page": 10, "category_slug": "ideas"}'
```

### 3. [Get Discussion](./Participons-Get-Discussion.md)
**Status:** 📋 Design (Not Yet Implemented)
**MCP Tool:** `participons_get_discussion`

Get full details of a single discussion including all comments, replies, and reactions.

**Features:**
- Complete discussion thread
- Nested comment replies
- Reaction counts (👍, ❤️, 🚀, etc.)
- Answer tracking for Q&A discussions

**Quick Test (once implemented):**
```bash
curl -X POST "https://vaettir.locki.io/webhook/participons/discussion" \
  -H "Content-Type: application/json" \
  -d '{"number": 5}'
```

### 4. [Forseti Charter Validation](./Forseti-Charter-Validation.md)
**Status:** ✅ Active
**MCP Tool:** `participons_validate_issue`

Add `conforme charte` label to a GitHub issue after validation by the OCapistaine app. This is a post-validation webhook - the LLM validation happens in the app, N8N only handles the label action.

**Features:**
- Receives validation result from app
- Checks existing labels (idempotent)
- Adds `conforme charte` label if valid
- Reports label change status

**Quick Test:**
```bash
curl -X POST "https://vaettir.locki.io/webhook/forseti/charter-valid" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 64, "is_valid": true, "category": "logement", "confidence": 0.92}'
```

## Using with Claude Code (MCP)

Once the workflows are configured in N8N and exposed via MCP, you can use them directly from Claude Code:

### Example: List All Discussions

```python
# In Claude Code conversation:
# "Use the MCP tool to list all discussions in the ideas category"

# This will invoke:
# participons_list_discussions(category_slug="ideas", per_page=20)
```

### Example: Get Discussion Details

```python
# In Claude Code conversation:
# "Show me the full details of discussion #5 including all comments"

# This will invoke:
# participons_get_discussion(number=5, include_comments=True)
```

## Workflow Architecture

All workflows follow the same pattern:

```
Webhook → [GraphQL Builder] → HTTP Request → Python Transform → Response
```

### Key Conventions

1. **Python Only**: All code nodes use Python (not JavaScript)
2. **GraphQL for Discussions**: Discussions require GraphQL API, not REST
3. **REST for Issues**: Issues use REST API v3
4. **Consistent Output**: All workflows return JSON with `success`, `count`, and data fields

## Setup Checklist

- [ ] Create GitHub credential in N8N (`audierne2026-github`)
- [ ] Configure credential with scopes: `repo`, `read:discussion`
- [ ] Import workflow JSON into N8N
- [ ] Test webhook endpoints
- [ ] Enable MCP access in workflow settings
- [ ] Configure MCP server to expose tools
- [ ] Test with Claude Code

## API References

### GitHub REST API (Issues)
- **Base URL:** `https://api.github.com`
- **Docs:** https://docs.github.com/en/rest/issues

### GitHub GraphQL API (Discussions)
- **Base URL:** `https://api.github.com/graphql`
- **Docs:** https://docs.github.com/en/graphql
- **Explorer:** https://docs.github.com/en/graphql/overview/explorer

## Related Documentation

- [N8N GitHub Integration Design](../n8n-github-integration.md) - Main design document
- [Forseti 461 Agent](../../agents/forseti/README.md) - Charter validation agent
- [Contribution Charter](../contribution-charter.md) - Governance rules

## Contributing

When adding new workflows:

1. Create detailed documentation using the template from existing workflows
2. Follow the naming convention: `Participons-<Action>-<Resource>.md`
3. Include GraphQL/REST API examples
4. Add learnings & issues section
5. Update this README
6. Update main integration document
7. Add MCP tool definition

## Troubleshooting

### Credential Errors

**Error:** `Credential with ID "FORSETI_TOKEN" does not exist`

**Solution:** In N8N UI, select credential from dropdown (don't reference by name/ID string)

### GraphQL Errors

**Error:** `Field 'discussions' doesn't exist on type 'Repository'`

**Solution:** Ensure GitHub API token has `read:discussion` scope

### Webhook Not Found

**Error:** 404 on webhook URL

**Solution:**
1. Check workflow is active in N8N
2. Verify webhook path matches configuration
3. Check N8N base URL is correct (`https://vaettir.locki.io`)

## Support

For issues or questions:
- N8N Documentation: https://docs.n8n.io
- GitHub API Status: https://www.githubstatus.com
- Project Issues: https://github.com/locki-io/vaettir/issues
