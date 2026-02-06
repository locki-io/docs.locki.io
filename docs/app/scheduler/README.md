# OCapistaine Scheduler Service

Production-grade task orchestration system for civic transparency workflows.

**Last Updated:** February 2026
**Architecture Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Task Types](#task-types)
4. [Core Components](#core-components)
5. [Quick Start](#quick-start)
6. [References](#references)

---

## Overview

The Scheduler Service coordinates all automated workflows in OCapistaine using APScheduler with Redis-based coordination. It manages data crawling, contribution analysis, and LLM evaluation with a focus on reliability and avoiding duplicate work.

### Key Features

- **Task Orchestration**: Dependency-driven task chains with sequential execution
- **Distributed Locking**: Redis-based coordination prevents duplicate work
- **Idempotency**: Success keys ensure tasks run once per day
- **Error Handling**: TaskError propagation with automatic retries
- **FastAPI Integration**: Seamless lifespan management

### Design Principles

1. **Tasks are isolated workflow units** - Each task file is self-contained
2. **Scheduler is an orchestration service** - Manages timing and dependencies
3. **No circular dependencies** - Clean import hierarchy via `scheduler.utils`
4. **Shared utilities** - Common patterns in `_task_boilerplate`
5. **Redis coordination** - Lock and success keys prevent duplicate work

---

## Architecture

### Directory Structure

```
app/services/
├── scheduler/              # Orchestration service
│   ├── __init__.py         # Main scheduler, FastAPI lifespan integration
│   └── utils.py            # Shared utilities (breaks circular imports)
│
└── tasks/                  # Individual task modules
    ├── __init__.py         # Task registry, _task_boilerplate
    ├── task_contributions_analysis.py   # Daily contribution validation
    ├── task_opik_experiment.py          # Opik dataset creation
    ├── task_opik_evaluate.py            # Opik evaluation runner
    ├── task_firecrawl.py                # Document crawling
    ├── task_prompt_sync.py              # Prompt sync to Opik (midnight)
    └── task_audierne_docs.py            # Audierne docs processing (every 2h)
```

### Import Hierarchy (No Circular Dependencies)

```
app/services/tasks/__init__.py
  ↓ defines utilities (TaskError, _task_boilerplate)
  ↓ imports task modules

app/services/tasks/task_*.py
  ↓ imports from app.services.scheduler.utils
  ↓ (NOT from app.services.scheduler)

app/services/scheduler/__init__.py
  ↓ imports from app.services.scheduler.utils
  ↓ imports from app.services.tasks
  ✓ No circular dependency
```

### FastAPI Integration

The scheduler integrates with FastAPI via the lifespan context manager:

```python
# In app/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from app.services.scheduler import start_scheduler
    await start_scheduler()

    yield

    # Shutdown
    from app.services.scheduler import stop_scheduler
    await stop_scheduler()
```

---

## Task Types

### 1. Daily Workflow Tasks (Once Per Day)

Run sequentially via `orchestrate_task_chain()` every 7 minutes from 6 AM to 11 PM:

| Task                         | Purpose                              | Dependencies |
| ---------------------------- | ------------------------------------ | ------------ |
| `task_contributions_analysis` | Validate citizen contributions       | None         |

**Success Keys:** `success:{task_name}:YYYYMMDD` (24h TTL)

### 2. Recurring Tasks (Cron-Based)

Run on fixed schedules:

| Task                     | Schedule           | Purpose                     |
| ------------------------ | ------------------ | --------------------------- |
| `orchestrate_task_chain` | `*/30 6-23 * * *`  | Check/schedule daily tasks  |
| `task_firecrawl`         | `0 3 * * *`        | Nightly document crawling   |
| `task_opik_experiment`   | `0 5 * * *`        | Daily dataset creation      |
| `task_opik_evaluate`     | `*/30 7-22 * * *`  | Periodic LLM evaluation     |
| `task_prompt_sync`       | `0 0 * * *`        | Daily prompt sync to Opik   |
| `task_audierne_docs`     | `0 */2 * * *`      | Process audierne docs (dev) |

---

## Task Execution Conditions

Each task has specific execution conditions and LLM requirements. Understanding these is critical for avoiding conflicts.

### Ollama Global Lock

Tasks that use local Ollama coordinate via a global Redis lock:

```
lock:ollama:global  (TTL: 600s for audierne_docs)
```

This prevents Ollama from being overwhelmed by concurrent requests.

### Task Execution Matrix

| Task | LLM Provider | Ollama Lock | Failover | Notes |
|------|--------------|-------------|----------|-------|
| `task_prompt_sync` | None | No | N/A | Syncs prompts to Opik, no LLM calls |
| `task_audierne_docs` | Ollama (default) | **Acquires** | gemini | Acquires lock for 10min, falls back to gemini if locked |
| `task_opik_evaluate` | Gemini (default) | **Checks** | gemini | Checks lock if using ollama, auto-failover |
| `task_opik_experiment` | Ollama (default) | **Checks** | gemini | Checks lock if using ollama |
| `task_contributions_analysis` | Configurable | Optional | Yes | Supports full failover chain |
| `task_firecrawl` | None | No | N/A | Web crawling only, no LLM |

### Execution Order (Recommended Daily Timeline)

```
00:00  task_prompt_sync        [No LLM] Sync prompts to Opik
03:00  task_firecrawl          [No LLM] Crawl municipal documents
05:00  task_opik_experiment    [Ollama/Gemini] Create evaluation datasets
06:00+ task_chain              [Various] Daily contribution analysis
07:00+ task_opik_evaluate      [Gemini] Run evaluations (every 30min)
*:00   task_audierne_docs      [Ollama/Gemini] Process docs (every 2h)
```

### Failover Chain

When Ollama is unavailable or locked, tasks automatically fail over:

```
ollama → openai → claude → mistral → gemini
```

**Note:** Gemini is last due to aggressive rate limits (20 req/day on free tier).

Failover is enabled by default for most tasks. Configuration:

```python
# In task call
result = task_audierne_docs(
    enable_failover=True,   # Use gemini if ollama locked
    provider="ollama",      # Primary provider
)
```

### Conflict Resolution

**Scenario:** `task_audierne_docs` is processing a large document with Ollama (holds lock for 10 min)

**Meanwhile:** `task_opik_evaluate` triggers at :30

**Resolution:**
1. `task_opik_evaluate` checks `lock:ollama:global`
2. Lock exists → task uses gemini instead
3. Both tasks complete successfully without conflicts

**Manual Override:**

```bash
# Clear Ollama lock if stuck
redis-cli -n 6 DEL "lock:ollama:global"

# Force task to skip failover
python -c "
from app.services.scheduler import run_task_now
result = run_task_now('task_audierne_docs', provider='ollama', enable_failover=False)
"
```

---

## Core Components

### 1. Task Boilerplate (`_task_boilerplate`)

**Location:** `app/services/tasks/__init__.py`

**Purpose:** Eliminates repetitive code in every task (lock, success key, result dict).

**Usage:**

```python
from app.services.tasks import _task_boilerplate, TaskError

l, lock_key, success_key, result, task_id = _task_boilerplate(
    "task_name", date_string, skip_success_check=False
)

if result["status"] == "skipped":
    return result  # Already completed or running
```

**Returns:**

- `l`: Redis connection (db=6)
- `lock_key`: `lock:task_name:YYYYMMDD`
- `success_key`: `success:task_name:YYYYMMDD`
- `result`: Pre-initialized dict with status, errors, warnings
- `task_id`: Unique UUID for this execution

**Parameters:**

- `skip_success_check`: Set `True` for recurring tasks (default: `False`)

### 2. Scheduler Utils (`app/services/scheduler/utils.py`)

**Purpose:** Shared utilities to avoid circular imports between scheduler and tasks.

**Functions:**

```python
def get_scheduler_redis() -> redis.Redis:
    """Get Redis connection for scheduler locks (db=6)."""
    ...

def normalize_timestamp(ts: int | float) -> int:
    """Convert millisecond timestamps to seconds."""
    ...

def clear_old_jobs(scheduler, prefix: str = "task_") -> int:
    """Remove stale jobs with given prefix."""
    ...
```

### 3. Redis Keys

**Task Lock Keys** (TTL: 300 seconds):

```
lock:task_contributions_analysis:20260206
lock:task_firecrawl:20260206
lock:task_opik_experiment:20260206
lock:task_opik_evaluate:20260206
lock:task_prompt_sync:20260206
lock:task_audierne_docs:20260206
```

**Success Keys** (TTL: 86400 seconds):

```
success:task_contributions_analysis:20260206
success:task_firecrawl:20260206
success:task_opik_experiment:20260206
success:task_opik_evaluate:20260206
success:task_prompt_sync:20260206
success:task_audierne_docs:20260206
```

**Resource Lock Keys** (global, not date-based):

```
lock:ollama:global   (TTL: 600s) - Prevents concurrent Ollama usage
```

**Purpose:**

- **Task locks**: Prevent concurrent execution of the same task (distributed locking)
- **Success keys**: Enable idempotency (skip if already completed)
- **Resource locks**: Prevent concurrent usage of shared resources (Ollama)

### 4. TaskError Exception

```python
class TaskError(Exception):
    """Custom exception for task failures."""

    def __init__(self, status: str, message: str):
        self.status = status
        self.message = message
        super().__init__(message)
```

**Usage:**

```python
try:
    result = fetch_data()
    if not result:
        raise TaskError("failed", "No data returned from API")
except RequestException as e:
    raise TaskError("failed", f"API request failed: {e}")
```

---

## Quick Start

### Adding a New Task

**1. Create task file:** `app/services/tasks/task_mynewtask.py`

**2. Use boilerplate pattern:**

```python
from app.services.tasks import TaskError, _task_boilerplate, REDIS_SUCCESS_TTL

def task_mynewtask(date_string: str = None) -> dict:
    l, lock_key, success_key, result, task_id = _task_boilerplate(
        "task_mynewtask", date_string
    )

    if result["status"] == "skipped":
        return result

    try:
        # Your logic here
        result["status"] = "success"
        l.set(success_key, "completed", ex=REDIS_SUCCESS_TTL)
        return result
    except Exception as e:
        result["status"] = "failed"
        result["errors"].append(str(e))
        raise TaskError("failed", str(e))
    finally:
        l.delete(lock_key)
```

**3. Export from task registry:** `app/services/tasks/__init__.py`

**4. Schedule in orchestrator:** `app/services/scheduler/__init__.py`

**See:** [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for complete examples.

---

## Best Practices

### DO

- Use `_task_boilerplate` for consistency
- Return standardized result dict
- Mark task as completed with success key
- Release lock in `finally` block
- Log errors with full context
- Keep tasks idempotent

### DON'T

- Skip lock acquisition (causes duplicate work)
- Forget to release lock (blocks future runs)
- Raise generic `Exception` (use `TaskError`)
- Import from `app.services.scheduler` in tasks (use `scheduler.utils`)

### Redis Usage

```python
from app.services.scheduler.utils import get_scheduler_redis

# Scheduler locks (db=6)
l = get_scheduler_redis()
l.set("lock:task_name:20260203", task_id, ex=300, nx=True)

# Application data (db=5, via redis_client)
from app.data.redis_client import redis_connection
with redis_connection() as r:
    r.setex("contribution:abc123", 86400, json.dumps(data))
```

---

## Troubleshooting

### Task Not Running

**Check:**

1. Scheduler running: `scheduler.running == True`
2. Task scheduled: `scheduler.get_jobs()`
3. Lock held: `redis-cli -n 6 KEYS "lock:task_name:*"`
4. Already completed: `redis-cli -n 6 KEYS "success:task_name:*"`

**Fix:**

```bash
# Clear stuck lock
redis-cli -n 6 DEL "lock:task_contributions_analysis:20260203"

# Re-run task
redis-cli -n 6 DEL "success:task_contributions_analysis:20260203"
```

### Task Runs Multiple Times

**Cause:** Lock not acquired properly or released prematurely.

**Fix:** Always use `_task_boilerplate` and release lock in `finally`:

```python
l, lock_key, success_key, result, task_id = _task_boilerplate(...)

if result["status"] == "skipped":
    return result

try:
    # Task logic
    pass
finally:
    l.delete(lock_key)  # CRITICAL: Always release
```

### Ollama 404 Errors

**Symptom:** Tasks fail with `Client error '404 Not Found' for url 'http://localhost:11434/api/chat'`

**Cause:** Ollama is not running or is busy with another request.

**Fix:**

```bash
# 1. Check if Ollama is running
curl http://localhost:11434/api/tags

# 2. Start Ollama if not running
ollama serve

# 3. Check if Ollama lock is held
redis-cli -n 6 GET "lock:ollama:global"

# 4. Clear stuck lock if needed
redis-cli -n 6 DEL "lock:ollama:global"
```

**Prevention:**
- Tasks now use automatic failover to gemini when Ollama is unavailable
- The `lock:ollama:global` key prevents concurrent Ollama usage
- Check `result["provider_used"]` to see which provider was actually used

### Tasks Skipping Due to Ollama Lock

**Symptom:** Task returns `status=skipped, reason=ollama_locked`

**Cause:** Another task holds the Ollama lock.

**Normal behavior:** Tasks fail over to gemini automatically.

**If not using failover:**

```bash
# Check what's holding the lock
redis-cli -n 6 GET "lock:ollama:global"

# Check TTL remaining
redis-cli -n 6 TTL "lock:ollama:global"

# Wait for lock to expire (max 10 min for audierne_docs)
# Or clear manually if stuck:
redis-cli -n 6 DEL "lock:ollama:global"
```

---

## References

### Documentation

- **[USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)** - Complete how-to guide with code examples
- **[TASK_BOILERPLATE.md](./TASK_BOILERPLATE.md)** - Detailed boilerplate usage

### Related Projects

- **Vaettir** (github.com/locki-io/vaettir) - N8N workflows for decision-making
- **audierne2026/participons** - Public participation platform

---

## Task Schedule Summary

| Task | Schedule | LLM | Lock | Purpose |
|------|----------|-----|------|---------|
| `task_prompt_sync` | `0 0 * * *` | None | Task | Daily prompt sync to Opik |
| `task_firecrawl` | `0 3 * * *` | None | Task | Nightly document crawling |
| `task_opik_experiment` | `0 5 * * *` | Ollama/Gemini | Check | Daily Opik dataset creation |
| `orchestrate_task_chain` | `*/30 6-23 * * *` | Various | Task | Dependency-driven task orchestration |
| `task_contributions_analysis` | Via chain | Configurable | Task | Daily contribution validation |
| `task_opik_evaluate` | `*/30 7-22 * * *` | Gemini | Check | Periodic LLM evaluation |
| `task_audierne_docs` | `0 */2 * * *` | Ollama/Gemini | **Acquire** | Process audierne docs (dev) |

**Lock column:**
- **Task**: Standard task lock only
- **Check**: Checks `lock:ollama:global` before using Ollama
- **Acquire**: Acquires `lock:ollama:global` for duration

---

## Continuous Improvement Tasks

Three key tasks support the continuous improvement workflow:

### 1. Prompt Sync (`task_prompt_sync`)

**Schedule:** Daily at midnight (`0 0 * * *`)
**LLM:** None (metadata sync only)
**Lock:** Task lock only

Synchronizes local prompts to Opik platform for version tracking and A/B testing:
- Individual prompts (`forseti.*`) synced as `text` type
- Composite prompts (`forseti-persona-*`) synced as `chat` type
- Enables prompt optimization via Opik studio

See: [TASK_PROMPT_SYNC.md](./tasks/TASK_PROMPT_SYNC.md)

### 2. Audierne Docs Processing (`task_audierne_docs`)

**Schedule:** Every 2 hours (`0 */2 * * *`) - Development mode
**LLM:** Ollama (default) with gemini failover
**Lock:** Acquires `lock:ollama:global` (TTL: 600s)

Processes audierne2026 markdown documents to build training datasets:
- One document per run (prevents overload)
- **Acquires Ollama lock** before processing (10 min TTL)
- **Fails over to gemini** if Ollama is locked/unavailable
- Extracts themes using LLM chunking (15k chars, 500 overlap)
- Generates contributions with violations
- Creates Opik dataset per document
- Progress tracked in `docs/docs/audierne2026/PROCESSING_PROGRESS.md`

**Progress File Example:**
```markdown
| File | Status | Themes | Contributions | Dataset |
|------|--------|--------|---------------|---------|
| MVP-meeting-satellite.md | ✅ Done | 3 | 12 | audierne-MVP-meeting-satellite-20260206 |
| MVP_meeting.md | ⏳ Pending | - | - | - |
```

See: [TASK_AUDIERNE_DOCS.md](./tasks/TASK_AUDIERNE_DOCS.md)

### 3. Opik Evaluate (`task_opik_evaluate`)

**Schedule:** Every 30 minutes (`*/30 7-22 * * *`)
**LLM:** Gemini (default)
**Lock:** Checks `lock:ollama:global` if using ollama

Evaluates LLM outputs using Opik metrics:
- **Checks Ollama lock** before using (if configured for ollama)
- **Auto-failover to gemini** if Ollama is locked
- Runs hallucination and output_format metrics
- Creates evaluation datasets from recent spans
- Reports results to Opik dashboard

**Important:** This task defaults to `gemini` to avoid conflicts with `task_audierne_docs`.

---

## Continuous Improvement Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Continuous Improvement Loop                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  task_prompt_sync (midnight) [No LLM]                           │
│        ↓                                                        │
│  Prompts synced to Opik                                         │
│        ↓                                                        │
│  task_audierne_docs (every 2h) [Ollama → Gemini failover]       │
│        ↓                                                        │
│  Generate contributions from real docs (acquires Ollama lock)   │
│        ↓                                                        │
│  Create Opik dataset per document                               │
│        ↓                                                        │
│  task_opik_evaluate (every 30min) [Gemini - avoids conflict]    │
│        ↓                                                        │
│  Evaluate Forseti accuracy                                      │
│        ↓                                                        │
│  Opik Optimizer                                                 │
│        ↓                                                        │
│  Improved prompts → task_prompt_sync (next midnight)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** February 2026
**Maintained by:** OCapistaine Team
**Architecture Version:** 1.2.0
