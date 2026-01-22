# Participons - Get Discussion

**Workflow ID:** `TBD`
**Status:** Design (not yet implemented)
**Created:** 2026-01-22

## Purpose

Fetch a single discussion with full details and all comments from the `audierne2026/participons` GitHub repository.

## Overview

This workflow retrieves complete discussion details including:
- Full discussion body and metadata
- All comments (not just count)
- Reaction counts and types
- Answer status (for Q&A discussions)
- Full author information

## Workflow Structure

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Webhook      │───►│ Python Build │───►│ HTTP Request │───►│ Python       │
│ Trigger      │    │ GraphQL      │    │ GraphQL API  │    │ Transform    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                    │
                                                                    ▼
                                                             ┌──────────────┐
                                                             │ Response     │
                                                             │ JSON         │
                                                             └──────────────┘
```

## Nodes Configuration

### 1. Webhook Trigger

- **Method:** POST (or GET with number in path)
- **Path:** `participons/discussions/:number` or `participons/discussion`
- **Response Mode:** Response Node

### 2. Python Build GraphQL Query

```python
# Code Node: Build GraphQL Query for Single Discussion
def build_discussion_query(owner, repo, number, include_comments=True, comments_limit=100):
    """Build GraphQL query for fetching a single discussion with comments."""

    # Comments section (optional)
    comments_section = ""
    if include_comments:
        comments_section = f"""
        comments(first: {comments_limit}) {{
          totalCount
          pageInfo {{
            hasNextPage
            endCursor
          }}
          nodes {{
            id
            body
            createdAt
            updatedAt
            author {{
              login
              avatarUrl
            }}
            replies(first: 10) {{
              totalCount
              nodes {{
                id
                body
                createdAt
                author {{
                  login
                }}
              }}
            }}
            reactionGroups {{
              content
              users {{
                totalCount
              }}
            }}
            isAnswer
          }}
        }}
        """

    query = f"""
    query {{
      repository(owner: "{owner}", name: "{repo}") {{
        discussion(number: {number}) {{
          id
          number
          title
          body
          bodyHTML
          bodyText
          url
          createdAt
          updatedAt
          publishedAt
          author {{
            login
            avatarUrl
          }}
          category {{
            id
            name
            slug
            description
            emojiHTML
          }}
          labels(first: 20) {{
            nodes {{
              name
              color
              description
            }}
          }}
          {comments_section}
          reactionGroups {{
            content
            users {{
              totalCount
            }}
          }}
          upvoteCount
          isAnswered
          answer {{
            id
            body
            createdAt
            author {{
              login
            }}
          }}
          answerChosenAt
          answerChosenBy {{
            login
          }}
          locked
          activeLockReason
        }}
      }}
    }}
    """
    return query

# Extract parameters
owner = "audierne2026"
repo = "participons"

# Get discussion number from webhook body or path parameter
discussion_number = None
if "body" in $json and "number" in $json.get("body", {}):
    discussion_number = int($json["body"]["number"])
elif "params" in $json and "number" in $json.get("params", {}):
    discussion_number = int($json["params"]["number"])
else:
    # Error case
    return [{
        "json": {
            "error": "Missing discussion number",
            "message": "Provide 'number' in request body or URL path"
        }
    }]

include_comments = $json.get("body", {}).get("include_comments", True)
comments_limit = int($json.get("body", {}).get("comments_limit", 100))

query = build_discussion_query(owner, repo, discussion_number, include_comments, comments_limit)

return [{
    "json": {
        "query": query,
        "owner": owner,
        "repo": repo,
        "discussion_number": discussion_number
    }
}]
```

### 3. HTTP Request (GitHub GraphQL API)

```
Method: POST
URL: https://api.github.com/graphql

Headers:
  Authorization: Bearer {{ $credentials.githubApi.accessToken }}
  Content-Type: application/json
  User-Agent: N8N-Forseti461

Body (JSON):
{
  "query": "{{ $json.query }}"
}
```

### 4. Python Transform

```python
import json
from datetime import datetime

def extract_reactions(reaction_groups):
    """Extract and format reaction data."""
    reactions = {}
    emoji_map = {
        'THUMBS_UP': '👍',
        'THUMBS_DOWN': '👎',
        'LAUGH': '😄',
        'HOORAY': '🎉',
        'CONFUSED': '😕',
        'HEART': '❤️',
        'ROCKET': '🚀',
        'EYES': '👀'
    }

    for group in reaction_groups:
        content = group.get('content')
        count = group.get('users', {}).get('totalCount', 0)
        emoji = emoji_map.get(content, content)
        if count > 0:
            reactions[emoji] = count

    return reactions

def transform_comments(comments_data):
    """Transform comments into simplified format."""
    if not comments_data:
        return []

    comments_list = comments_data.get('nodes', [])
    transformed_comments = []

    for comment in comments_list:
        author = comment.get('author', {})
        author_login = author.get('login', 'unknown') if author else 'deleted'

        replies_data = comment.get('replies', {})
        replies_count = replies_data.get('totalCount', 0)
        replies_list = replies_data.get('nodes', [])

        transformed_comments.append({
            'id': comment.get('id'),
            'body': comment.get('body', ''),
            'created_at': comment.get('createdAt'),
            'updated_at': comment.get('updatedAt'),
            'author': author_login,
            'author_avatar': author.get('avatarUrl'),
            'is_answer': comment.get('isAnswer', False),
            'reactions': extract_reactions(comment.get('reactionGroups', [])),
            'replies_count': replies_count,
            'replies': [
                {
                    'id': reply.get('id'),
                    'body': reply.get('body', ''),
                    'created_at': reply.get('createdAt'),
                    'author': reply.get('author', {}).get('login', 'unknown')
                }
                for reply in replies_list
            ]
        })

    return transformed_comments

def extract_labels(labels_data):
    """Extract label information."""
    if not labels_data:
        return []

    labels_list = labels_data.get('nodes', [])
    return [
        {
            'name': label.get('name'),
            'color': label.get('color'),
            'description': label.get('description')
        }
        for label in labels_list
    ]

def transform_discussion(graphql_response):
    """Transform GitHub GraphQL response to standardized format."""

    # Extract discussion data
    repo_data = graphql_response.get('data', {}).get('repository', {})
    discussion = repo_data.get('discussion')

    if not discussion:
        return {
            'success': False,
            'error': 'Discussion not found',
            'discussion': None
        }

    print(f"DEBUG: Processing discussion #{discussion.get('number')}")

    # Extract author
    author = discussion.get('author', {})
    author_login = author.get('login', 'unknown') if author else 'deleted'

    # Extract category
    category_data = discussion.get('category', {})
    category = {
        'id': category_data.get('id'),
        'name': category_data.get('name'),
        'slug': category_data.get('slug'),
        'description': category_data.get('description'),
        'emoji': category_data.get('emojiHTML')
    }

    # Extract answer (if exists)
    answer_data = discussion.get('answer')
    answer = None
    if answer_data:
        answer_author = answer_data.get('author', {})
        answer = {
            'id': answer_data.get('id'),
            'body': answer_data.get('body'),
            'created_at': answer_data.get('createdAt'),
            'author': answer_author.get('login', 'unknown') if answer_author else 'deleted'
        }

    # Build result
    result = {
        'success': True,
        'discussion': {
            'id': discussion.get('number'),
            'graphql_id': discussion.get('id'),
            'title': discussion.get('title'),
            'body': discussion.get('body', ''),
            'body_html': discussion.get('bodyHTML', ''),
            'body_text': discussion.get('bodyText', ''),
            'url': discussion.get('url'),
            'created_at': discussion.get('createdAt'),
            'updated_at': discussion.get('updatedAt'),
            'published_at': discussion.get('publishedAt'),
            'author': author_login,
            'author_avatar': author.get('avatarUrl'),
            'category': category,
            'labels': extract_labels(discussion.get('labels')),
            'reactions': extract_reactions(discussion.get('reactionGroups', [])),
            'upvotes': discussion.get('upvoteCount', 0),
            'is_answered': discussion.get('isAnswered', False),
            'answer': answer,
            'answer_chosen_at': discussion.get('answerChosenAt'),
            'answer_chosen_by': discussion.get('answerChosenBy', {}).get('login'),
            'locked': discussion.get('locked', False),
            'lock_reason': discussion.get('activeLockReason'),
            'comments': transform_comments(discussion.get('comments')),
            'comments_count': discussion.get('comments', {}).get('totalCount', 0),
            'comments_has_next_page': discussion.get('comments', {}).get('pageInfo', {}).get('hasNextPage', False),
            'comments_end_cursor': discussion.get('comments', {}).get('pageInfo', {}).get('endCursor')
        }
    }

    print(f"DEBUG: Transformed discussion with {len(result['discussion']['comments'])} comments")
    return result

# Extract GraphQL response
graphql_response = {}

if _items and len(_items) > 0:
    graphql_response = _items[0].get("json", {})
    print(f"DEBUG: Received GraphQL response")
else:
    print("DEBUG: No input data received")

# Transform and return
result = transform_discussion(graphql_response)
return [{'json': result}]
```

### 5. Respond to Webhook

- **Respond With:** JSON
- **Response Body:** `{{ $json }}`

## Input Parameters

```json
{
  "number": 5,                // Discussion number (required)
  "include_comments": true,   // Include all comments (default: true)
  "comments_limit": 100       // Max comments to fetch (default: 100)
}
```

## Output Format

```json
{
  "success": true,
  "discussion": {
    "id": 5,
    "graphql_id": "D_kwDOJxyz1M4AaBcD",
    "title": "Proposition pour améliorer le port d'Audierne",
    "body": "Je propose de moderniser les infrastructures...",
    "body_html": "<p>Je propose de moderniser...</p>",
    "body_text": "Je propose de moderniser...",
    "url": "https://github.com/audierne2026/participons/discussions/5",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:20:00Z",
    "published_at": "2024-01-15T10:30:00Z",
    "author": "citizen123",
    "author_avatar": "https://avatars.githubusercontent.com/u/123456?v=4",
    "category": {
      "id": "DIC_kwDOJxyz1M4CZabc",
      "name": "Ideas",
      "slug": "ideas",
      "description": "Share ideas for new features",
      "emoji": "💡"
    },
    "labels": [
      {
        "name": "economie",
        "color": "0E8A16",
        "description": "Economic proposals"
      }
    ],
    "reactions": {
      "👍": 8,
      "❤️": 3,
      "🚀": 2
    },
    "upvotes": 8,
    "is_answered": true,
    "answer": {
      "id": "DC_kwDOJxyz1M4AaBcD",
      "body": "This is a great idea! We'll implement it...",
      "created_at": "2024-01-18T09:15:00Z",
      "author": "maintainer"
    },
    "answer_chosen_at": "2024-01-18T09:15:00Z",
    "answer_chosen_by": "maintainer",
    "locked": false,
    "lock_reason": null,
    "comments_count": 12,
    "comments_has_next_page": false,
    "comments_end_cursor": null,
    "comments": [
      {
        "id": "DC_kwDOJxyz1M4AaBcE",
        "body": "Excellent idea! I support this.",
        "created_at": "2024-01-15T12:00:00Z",
        "updated_at": "2024-01-15T12:00:00Z",
        "author": "supporter1",
        "author_avatar": "https://avatars.githubusercontent.com/u/789?v=4",
        "is_answer": false,
        "reactions": {
          "👍": 5
        },
        "replies_count": 2,
        "replies": [
          {
            "id": "DC_kwDOJxyz1M4AaBcF",
            "body": "I agree!",
            "created_at": "2024-01-15T13:00:00Z",
            "author": "supporter2"
          }
        ]
      }
    ]
  }
}
```

## Webhook URL

```
POST https://vaettir.locki.io/webhook/participons/discussion
Content-Type: application/json

{
  "number": 5,
  "include_comments": true
}
```

Or using path parameter:

```
GET https://vaettir.locki.io/webhook/participons/discussions/5
```

## Testing

```bash
# Get full discussion with comments
curl -X POST "https://vaettir.locki.io/webhook/participons/discussion" \
  -H "Content-Type: application/json" \
  -d '{"number": 5}'

# Get discussion without comments
curl -X POST "https://vaettir.locki.io/webhook/participons/discussion" \
  -H "Content-Type: application/json" \
  -d '{"number": 5, "include_comments": false}'

# Limit comments returned
curl -X POST "https://vaettir.locki.io/webhook/participons/discussion" \
  -H "Content-Type: application/json" \
  -d '{"number": 5, "comments_limit": 20}'
```

## Learnings & Issues

### 1. GraphQL Nested Data

**Challenge:** Comments can have replies, which are nested in the GraphQL response.

**Solution:** The transform function recursively extracts replies and flattens them into a manageable structure.

### 2. Reaction Types

**Note:** GitHub uses enum types for reactions (THUMBS_UP, HEART, etc.). Map these to emoji characters for better display.

### 3. Comment Pagination

**Important:** If a discussion has 100+ comments, you'll need to paginate comments separately using the `endCursor` from comments' `pageInfo`.

**Future Enhancement:** Add a separate workflow or parameter to fetch additional comment pages.

### 4. Deleted Authors

**Issue:** Some authors may be deleted/null in the response.

**Solution:** Check if author exists before accessing `login` field, default to "deleted" or "unknown".

## Related Workflows

- [List Discussions](./Participons-List-Discussions.md) - Fetch multiple discussions
- [List Issues](./Participons-List-Issues.md) - Fetch GitHub Issues
- [N8N GitHub Integration Design](../n8n-github-integration.md)

## Use Cases

### 1. Display Discussion Details

Show full discussion content on a web page or in Claude Code.

### 2. Analysis & Moderation

- Count reactions and identify popular discussions
- Review comments for charter compliance
- Track answer rates (for Q&A categories)

### 3. Export & Archival

Export discussion threads to markdown or PDF for offline viewing.

### 4. Integration with Forseti 461

Validate discussion content against the contribution charter, similar to issue validation.

## Future Enhancements

- **Fetch additional comment pages** if `comments_has_next_page` is true
- **Add comment** to discussion (POST comment via GraphQL mutation)
- **React to discussion** (add upvote, emoji reactions)
- **Mark comment as answer** (for Q&A discussions)
- **Lock/unlock discussion** (moderation feature)
