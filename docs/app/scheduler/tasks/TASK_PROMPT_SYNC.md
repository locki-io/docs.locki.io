# Task: Prompt Sync

**File:** `app/services/tasks/task_prompt_sync.py`
**Schedule:** `0 0 * * *` (Daily at midnight)

---

## Purpose

Synchronizes local prompt templates to the Opik platform for:
- Version tracking and history
- A/B testing in Opik prompt studio
- Collaborative prompt optimization

## What It Does

1. **Syncs Individual Prompts** (`forseti.*`)
   - Charter validation prompt
   - Category classification prompt
   - Wording correction prompt
   - Synced as `text` type

2. **Syncs Composite Prompts** (`forseti-persona-*`)
   - Combines system + user prompts
   - Used for playground testing
   - Synced as `chat` type (messages array)

## Configuration

```python
# In app/prompts/opik_sync.py
COMPOSITE_PROMPTS = {
    "forseti-persona-wording": {
        "system": "forseti.system",
        "user": "forseti.wording_correction",
    },
    "forseti-persona-category": {
        "system": "forseti.system",
        "user": "forseti.category_classification",
    },
}
```

## Manual Run

```bash
# Via scheduler
python -c "from app.services.scheduler import run_task_now; print(run_task_now('task_prompt_sync'))"

# Via CLI
python -m app.prompts.opik_sync --all
```

## Success Keys

```
success:task_prompt_sync:YYYYMMDD
```

## Related

- [Prompt Management](../../PROMPT_MANAGEMENT.md)
- [Opik Integration](../../opik/)
