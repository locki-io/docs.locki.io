# Task: Audierne Docs Processing

**File:** `app/services/tasks/task_audierne_docs.py`
**Schedule:** `0 */2 * * *` (Every 2 hours - dev mode)
**LLM Provider:** Ollama (default) with gemini failover
**Resource Lock:** `lock:ollama:global` (TTL: 600s)

---

## Purpose

Processes audierne2026 markdown documents to build training datasets for Forseti prompt optimization. Designed for continuous improvement of charter validation.

## What It Does

1. **Reads Progress File**
   - Checks `docs/docs/audierne2026/PROCESSING_PROGRESS.md`
   - Identifies next unprocessed document

2. **Acquires Ollama Lock** (if using Ollama)
   - Prevents concurrent Ollama usage with other tasks
   - TTL: 600 seconds (10 minutes)
   - Falls back to gemini if lock unavailable

3. **Processes One Document**
   - Extracts themes using LLM (chunked for large docs: 15k chars, 500 overlap)
   - Generates contributions (2 per theme by default)
   - Includes violation examples for testing

4. **Creates Opik Dataset**
   - Dataset name: `audierne-{filename}-{date}`
   - Contains input/output pairs for optimization

5. **Updates Progress**
   - Marks document as complete
   - Logs themes, contributions, dataset name

6. **Releases Ollama Lock**
   - Always releases in finally block

## Documents

Located in `docs/docs/audierne2026/`:

| File | Size | Description |
|------|------|-------------|
| Mayor-2026-wishes.md | 21KB | Mayor's New Year speech |
| municipal-council-january2026.md | 22KB | Council meeting minutes |
| MVP_meeting.md | 13KB | MVP planning meeting |
| MVP-meeting-satellite.md | 11KB | Satellite meeting notes |
| overview.md | 6KB | Project overview |

## Progress Tracking

Progress file: `docs/docs/audierne2026/PROCESSING_PROGRESS.md`

```markdown
| File | Status | Processed At | Themes | Contributions | Dataset |
|------|--------|--------------|--------|---------------|---------|
| MVP-meeting-satellite.md | ✅ Done | 2026-02-06 11:29 | 3 | 12 | audierne-MVP-meeting-satellite-20260206 |
| MVP_meeting.md | ⏳ Pending | - | - | - | - |
```

## Configuration

```python
# Default settings in task file
DEFAULT_PROVIDER = "ollama"
FALLBACK_PROVIDER = "gemini"     # Used when Ollama unavailable
CONTRIBUTIONS_PER_THEME = 2
INCLUDE_VIOLATIONS = True
OLLAMA_LOCK_TTL = 600            # 10 minutes
```

## Failover Behavior

When Ollama is unavailable or locked by another task:

1. Task checks `lock:ollama:global` in Redis
2. If locked → automatically uses gemini instead
3. Result includes `provider_used` to show actual provider

```python
# Task result with failover
{
    "status": "success",
    "provider_used": "gemini",  # Failover occurred
    "warnings": ["Ollama busy, using gemini"]
}
```

**Disable Failover:**

```python
# Force Ollama only (will skip if locked)
result = task_audierne_docs(
    provider="ollama",
    enable_failover=False
)
# Returns status="skipped", reason="ollama_locked" if busy
```

## Manual Run

```bash
# Run next pending document
python -c "from app.services.scheduler import run_task_now; print(run_task_now('task_audierne_docs'))"

# Force specific document
python -c "
from app.services.tasks.task_audierne_docs import task_audierne_docs
result = task_audierne_docs(force_doc='Mayor-2026-wishes.md')
print(result)
"
```

## Success Keys

Note: Uses `skip_success_check=True` to allow multiple runs per day (one doc at a time).

```
success:task_audierne_docs:YYYYMMDD  # Set when ALL docs are processed
```

## Output

Each run produces:
- **Opik Dataset**: `audierne-{filename}-{date}` with training data
- **Progress Update**: Markdown table with status
- **Redis Storage**: Contributions stored for validation testing

## Workflow Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                  Continuous Improvement Loop                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  task_audierne_docs (every 2h)                                  │
│        ↓                                                        │
│  Generate contributions from real docs                          │
│        ↓                                                        │
│  Create Opik dataset                                            │
│        ↓                                                        │
│  task_opik_evaluate (every 30min)                               │
│        ↓                                                        │
│  Evaluate Forseti accuracy                                      │
│        ↓                                                        │
│  Opik Optimizer                                                 │
│        ↓                                                        │
│  Improved prompts                                               │
│        ↓                                                        │
│  task_prompt_sync (midnight)                                    │
│        ↓                                                        │
│  Updated prompts in production                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Related

- [Mockup System](../../MOCKUP.md)
- [Field Input Workflow](../../FIELD_INPUT_WORKFLOW.md)
- [Opik Integration](../../opik/)
