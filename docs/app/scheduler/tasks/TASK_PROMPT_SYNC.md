# Task: Prompt Sync (Bidirectional)

**File:** `app/services/tasks/task_prompt_sync.py`
**Schedule:** `0 0 * * *` (Daily at midnight)

---

## Purpose

Bidirectional synchronization between local prompt templates and the Opik platform:

- **Pull** optimized composites from Opik (update local JSON)
- **Push** individual and composite prompts to Opik for version tracking, A/B testing, and collaborative optimization

## What It Does

**Step 0: Pull optimized composites from Opik**
- Calls `pull_all_composites()` to fetch latest composite versions
- Decomposes composites into individual prompts (system + user)
- Updates `forseti_charter.json` if content changed
- Warns when shared prompts (e.g., `forseti.persona`) are modified

**Step 1: Push individual prompts** (`forseti.*`)
- Charter validation prompt
- Category classification prompt
- Wording correction prompt
- Synced as `text` type

**Step 2: Push composite prompts** (`forseti-persona-*`)
- Combines system + user prompts
- Rebuilt from (possibly updated) individual prompts
- Used for playground testing
- Synced as `chat` type (messages array)

## Result Tracking

| Field | Description |
|-------|-------------|
| `pull_changed` | Number of individual prompts updated from Opik |
| `pull_failed` | Number of composite pulls that failed |
| `individual_synced` | Individual prompts successfully pushed |
| `individual_failed` | Individual prompts that failed to push |
| `composite_synced` | Composite prompts successfully pushed |
| `composite_failed` | Composite prompts that failed to push |

## Configuration

```python
# In app/prompts/opik_sync.py
COMPOSITE_PROMPTS = {
    "forseti-persona-charter": {
        "system_prompt": "forseti.persona",
        "user_prompt": "forseti.charter_validation",
    },
    "forseti-persona-category": {
        "system_prompt": "forseti.persona",
        "user_prompt": "forseti.category_classification",
    },
    "forseti-persona-wording": {
        "system_prompt": "forseti.persona",
        "user_prompt": "forseti.wording_correction",
    },
}
```

## Manual Run

```bash
# Via scheduler
python -c "from app.services.scheduler import run_task_now; print(run_task_now('task_prompt_sync'))"

# Via CLI (push only)
python -m app.prompts.opik_sync --all

# Via CLI (pull + push)
python -m app.prompts.opik_sync --pull-all && python -m app.prompts.opik_sync --all

# View experiment performance
python -m app.prompts.opik_sync --performance
```

## Success Keys

```
success:task_prompt_sync:YYYYMMDD
```

## Related

- [Prompt Management](../../core/prompts.md)
- [Prompt Sync Quick Reference](../../opik/PROMPT_SYNC.md)
- [Experiment Workflow](../../opik/EXPERIMENT_WORKFLOW.md)
- [Opik Integration](../../opik/)
