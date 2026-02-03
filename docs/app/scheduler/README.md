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
    ├── task_opik_experiment.py          # Opik evaluation runner
    └── task_firecrawl.py                # Document crawling
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
| `orchestrate_task_chain` | `*/7 6-23 * * *`   | Check/schedule daily tasks  |
| `task_firecrawl`         | `0 3 * * *`        | Nightly document crawling   |
| `task_opik_experiment`   | `0 5 * * *`        | Daily LLM evaluation        |

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

**Lock Keys** (TTL: 300 seconds):

```
lock:task_contributions_analysis:20260203
lock:task_firecrawl:20260203
lock:task_opik_experiment:20260203
```

**Success Keys** (TTL: 86400 seconds):

```
success:task_contributions_analysis:20260203
success:task_firecrawl:20260203
success:task_opik_experiment:20260203
```

**Purpose:**

- Lock keys: Prevent concurrent execution (distributed locking)
- Success keys: Enable idempotency (skip if already completed)

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

| Task | Schedule | Purpose |
|------|----------|---------|
| `orchestrate_task_chain` | `*/7 6-23 * * *` | Dependency-driven task orchestration |
| `task_contributions_analysis` | Via chain | Daily contribution validation |
| `task_opik_experiment` | `0 5 * * *` | Daily Opik experiments |
| `task_firecrawl` | `0 3 * * *` | Nightly document crawling |

---

**Last Updated:** February 2026
**Maintained by:** OCapistaine Team
**Architecture Version:** 1.0.0
