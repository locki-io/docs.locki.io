## Prompt Sync (Bidirectional)

Prompts are synced bidirectionally between local JSON files and Opik:

- **Push** (local &rarr; Opik): Individual and composite prompts are pushed to Opik for versioning, playground testing, and optimization
- **Pull** (Opik &rarr; local): Composites optimized in the Opik Playground are pulled back, decomposed into individual prompts, and written to `forseti_charter.json`

### Add a New Prompt

1. **Add to JSON file** (`app/prompts/local/forseti_charter.json`):

```json
{
  "forseti.my_feature": {
    "name": "forseti461-user-myfeature-DDMMYYYY",
    "opik_commit": null,
    "type": "user",
    "format": "chat",
    "variables": ["input.title", "input.body"],
    "description": "Description",
    "messages": [
      {
        "role": "user",
        "content": "Your prompt with {{input.title}} and {{input.body}} variables"
      }
    ]
  }
}
```

2. **Push to Opik**:

```bash
python -m app.prompts.opik_sync --prefix forseti.my_feature
```

3. **Update commit hash** after sync:
   - Get the commit ID from Opik UI or API
   - Update `opik_commit` in the JSON file

### Pull Optimized Prompts from Opik

After optimizing a composite prompt in the Opik Playground:

```bash
# Pull a specific composite
python -m app.prompts.opik_sync --pull forseti-persona-category

# Pull all composites (dry run first)
python -m app.prompts.opik_sync --pull-all --dry-run
python -m app.prompts.opik_sync --pull-all

# Then push updated individuals + rebuild composites
python -m app.prompts.opik_sync --all
```

The pull decomposes the composite's system/user messages and updates the corresponding individual prompts in `forseti_charter.json`. If the system prompt (`forseti.persona`) changed, a warning is shown since it is shared across all composites.

### View Experiment Performance

```bash
# Show latest experiment scores for all composites
python -m app.prompts.opik_sync --performance

# Combined with pull
python -m app.prompts.opik_sync --pull forseti-persona-charter --performance
```

Performance data is fetched by looking up experiments linked to the prompt (via prompt ID or `AGENT_FEATURE_REGISTRY` experiment type).
