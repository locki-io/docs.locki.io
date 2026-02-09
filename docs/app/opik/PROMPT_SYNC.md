## **Sync to Opik**:

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

### with script

```bash
python -m app.prompts.opik_sync --prefix forseti.my_feature
```

3. **Update commit hash** after sync:
   - Get the commit ID from Opik UI or API
   - Update `opik_commit` in the JSON file
