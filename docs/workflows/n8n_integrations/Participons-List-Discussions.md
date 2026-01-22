# Participons - List Discussions

**Workflow ID:** `TBD`
**Status:** Design (not yet implemented)
**Created:** 2026-01-22

## Purpose

Fetch and view discussions from the `audierne2026/participons` GitHub repository using GraphQL API.

## Overview

GitHub Discussions are accessed via the GraphQL API (v4), not REST API. This workflow demonstrates:
- GraphQL query construction in N8N
- Discussion metadata extraction
- Category and label filtering
- Comment counting and participation metrics

## Workflow Structure

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───►│ HTTP Request │───►│ Python       │───►│ Respond to   │
│ Trigger      │    │ GraphQL API  │    │ Transform    │    │ Webhook      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## Nodes Configuration

### 1. Webhook Trigger

- **Method:** POST
- **Path:** `participons/discussions`
- **Response Mode:** Response Node

### 2. HTTP Request (GitHub GraphQL API)

```
Method: POST
URL: https://api.github.com/graphql

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Content-Type: application/json
  User-Agent: N8N-Forseti461

Body (JSON):
{
  "query": "{{ $json.body.graphql_query }}"
}
```

**Alternative: Use dynamic query construction in a Python node BEFORE the HTTP Request:**

```python
# Code Node: Build GraphQL Query
def build_discussions_query(owner, repo, first=10, category=None, after=None):
    """Build GraphQL query for fetching discussions."""

    category_filter = ""
    if category:
        category_filter = f', categoryId: "{category}"'

    after_clause = ""
    if after:
        after_clause = f', after: "{after}"'

    query = f"""
    query {{
      repository(owner: "{owner}", name: "{repo}") {{
        discussions(first: {first}{category_filter}{after_clause}, orderBy: {{field: UPDATED_AT, direction: DESC}}) {{
          totalCount
          pageInfo {{
            hasNextPage
            endCursor
          }}
          nodes {{
            id
            number
            title
            body
            url
            createdAt
            updatedAt
            author {{
              login
            }}
            category {{
              id
              name
              slug
            }}
            labels(first: 10) {{
              nodes {{
                name
              }}
            }}
            comments(first: 1) {{
              totalCount
            }}
            upvoteCount
            isAnswered
            answerChosenAt
          }}
        }}
        discussionCategories(first: 10) {{
          nodes {{
            id
            name
            slug
            description
          }}
        }}
      }}
    }}
    """
    return query

# Extract parameters from webhook input
owner = "audierne2026"
repo = "participons"
first = int($json.get("body", {}).get("per_page", 10))
category = $json.get("body", {}).get("category_slug")
after = $json.get("body", {}).get("after")

query = build_discussions_query(owner, repo, first, category, after)

return [{
    "json": {
        "query": query,
        "owner": owner,
        "repo": repo
    }
}]
```

### 3. Python Transform

```python
import json
import re
from datetime import datetime

def extract_category_info(discussion):
    """Extract category information from discussion."""
    category_data = discussion.get('category', {})
    return {
        'id': category_data.get('id'),
        'name': category_data.get('name'),
        'slug': category_data.get('slug')
    }

def extract_labels(discussion):
    """Extract label names from discussion."""
    labels_data = discussion.get('labels', {}).get('nodes', [])
    return [label['name'] for label in labels_data if label.get('name')]

def transform_discussions(graphql_response):
    """Transform GitHub GraphQL response to standardized format."""

    # Extract discussions data
    repo_data = graphql_response.get('data', {}).get('repository', {})
    discussions_data = repo_data.get('discussions', {})
    categories_data = repo_data.get('discussionCategories', {}).get('nodes', [])

    discussions_list = discussions_data.get('nodes', [])
    total_count = discussions_data.get('totalCount', 0)
    page_info = discussions_data.get('pageInfo', {})

    print(f"DEBUG: Processing {len(discussions_list)} discussions")

    # Transform each discussion
    transformed = []
    for disc in discussions_list:
        author = disc.get('author', {})
        author_login = author.get('login', 'unknown') if author else 'deleted'

        transformed.append({
            'id': disc.get('number'),
            'graphql_id': disc.get('id'),
            'title': disc.get('title'),
            'body': disc.get('body') or '',
            'url': disc.get('url'),
            'created_at': disc.get('createdAt'),
            'updated_at': disc.get('updatedAt'),
            'author': author_login,
            'category': extract_category_info(disc),
            'labels': extract_labels(disc),
            'comments_count': disc.get('comments', {}).get('totalCount', 0),
            'upvotes': disc.get('upvoteCount', 0),
            'is_answered': disc.get('isAnswered', False),
            'answer_chosen_at': disc.get('answerChosenAt')
        })

    print(f"DEBUG: Transformed {len(transformed)} discussions")

    # Build response
    result = {
        'success': True,
        'count': len(transformed),
        'total_count': total_count,
        'has_next_page': page_info.get('hasNextPage', False),
        'end_cursor': page_info.get('endCursor'),
        'discussions': transformed,
        'available_categories': [
            {
                'id': cat.get('id'),
                'name': cat.get('name'),
                'slug': cat.get('slug'),
                'description': cat.get('description')
            }
            for cat in categories_data
        ]
    }

    return result

# Extract GraphQL response
graphql_response = {}

if _items and len(_items) > 0:
    graphql_response = _items[0].get("json", {})
    print(f"DEBUG: Received GraphQL response")
else:
    print("DEBUG: No input data received")

# Transform and return
result = transform_discussions(graphql_response)
return [{'json': result}]
```

### 4. Respond to Webhook

- **Respond With:** JSON
- **Response Body:** `{{ $json }}`

## Input Parameters

```json
{
  "per_page": 10,          // Number of discussions to fetch (default: 10, max: 100)
  "category_slug": null,   // Filter by category slug (e.g., "ideas", "announcements")
  "after": null           // Pagination cursor for next page
}
```

## Output Format

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
      "graphql_id": "D_kwDOJxyz1M4AaBcD",
      "title": "Proposition pour améliorer le port d'Audierne",
      "body": "Je propose de moderniser les infrastructures portuaires...",
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
      "is_answered": false,
      "answer_chosen_at": null
    }
  ],
  "available_categories": [
    {
      "id": "DIC_kwDOJxyz1M4CZabc",
      "name": "Ideas",
      "slug": "ideas",
      "description": "Share ideas for new features"
    },
    {
      "id": "DIC_kwDOJxyz1M4CZdef",
      "name": "Announcements",
      "slug": "announcements",
      "description": "Updates from maintainers"
    }
  ]
}
```

## Webhook URL

```
POST https://vaettir.locki.io/webhook/participons/discussions
Content-Type: application/json

{
  "per_page": 10,
  "category_slug": "ideas"
}
```

## Testing

```bash
# List all discussions
curl -X POST "https://vaettir.locki.io/webhook/participons/discussions" \
  -H "Content-Type: application/json" \
  -d '{"per_page": 10}'

# Filter by category
curl -X POST "https://vaettir.locki.io/webhook/participons/discussions" \
  -H "Content-Type: application/json" \
  -d '{"per_page": 5, "category_slug": "ideas"}'

# Paginate to next page
curl -X POST "https://vaettir.locki.io/webhook/participons/discussions" \
  -H "Content-Type: application/json" \
  -d '{"per_page": 10, "after": "Y3Vyc29yOnYyOpK5MjAyNC0wMS0xNVQxMDozMDowMFo="}'
```

## GraphQL Query Reference

### Basic Query Structure

```graphql
query {
  repository(owner: "audierne2026", name: "participons") {
    discussions(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        number
        title
        body
        url
        createdAt
        updatedAt
        author {
          login
        }
        category {
          id
          name
          slug
        }
        labels(first: 10) {
          nodes {
            name
          }
        }
        comments(first: 1) {
          totalCount
        }
        upvoteCount
        isAnswered
      }
    }
  }
}
```

### Query with Category Filter

To filter by category, you need the category GraphQL ID (not the slug). You can:

1. **First fetch categories** (included in response)
2. **Then use category ID** in subsequent queries:

```graphql
query {
  repository(owner: "audierne2026", name: "participons") {
    discussions(
      first: 10,
      categoryId: "DIC_kwDOJxyz1M4CZabc",
      orderBy: {field: UPDATED_AT, direction: DESC}
    ) {
      nodes {
        title
        # ... rest of fields
      }
    }
  }
}
```

## Learnings & Issues

### 1. GraphQL vs REST API

**Key Difference:** GitHub Discussions are ONLY available via GraphQL API (v4), not REST API (v3).

**Solution:** Use HTTP Request node with `POST https://api.github.com/graphql` and build queries dynamically.

### 2. Category Filtering Requires ID

**Issue:** You cannot filter by category slug directly. You need the GraphQL ID.

**Solution:**
- Fetch categories first (included in response)
- Map slug → ID on the client side
- OR maintain a category mapping in N8N variables

### 3. Pagination with Cursors

**Issue:** GraphQL uses cursor-based pagination, not page numbers.

**Solution:**
- Use `endCursor` from `pageInfo`
- Pass it as `after` parameter in next request
- Check `hasNextPage` to know if more data exists

### 4. Authentication

**Important:** The GitHub credential in N8N must have `read:discussion` scope for public repos, or `repo` scope for private repos.

## Related Workflows

- [List Issues](./Participons-List-Issues.md) - Fetch GitHub Issues
- [N8N GitHub Integration Design](../n8n-github-integration.md)

## Next Steps

1. **Create workflow in N8N** using the node configurations above
2. **Test with curl** to verify webhook response
3. **Enable MCP access** in workflow settings
4. **Add to MCP tool list** in main integration document
5. **Create companion workflow** for single discussion details (with full comments)

## Future Enhancements

- **Filter by labels** in addition to categories
- **Search discussions** by keyword in title/body
- **Fetch discussion comments** (separate workflow or parameter)
- **Reaction counts** (👍, ❤️, etc.)
- **Export discussions** to markdown for archival
