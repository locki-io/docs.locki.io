# Scheduler Service Documentation

Production-grade task orchestration system for horse racing data workflows.

**Last Updated:** November 23, 2025
**Architecture Version:** 2.1.1 (Orchestrator Key Mismatch Fix)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Task Types](#task-types)
4. [Orchestration Patterns](#orchestration-patterns)
5. [Core Components](#core-components)
6. [Quick Start](#quick-start)
7. [References](#references)

---

## Overview

The Scheduler Service coordinates all automated workflows in the application using APScheduler with Redis-based coordination. It manages data fetching, processing, caching, and notification scheduling with a focus on reliability and avoiding duplicate work.

### Key Features

- **Task Orchestration**: Dependency-driven task chains with sequential and parallel execution
- **Per-Contribution Scheduling**: Dynamic job creation based on contribution
- **Distributed Locking**: Redis-based coordination prevents duplicate work
- **Idempotency**: Success keys ensure tasks run once per day
- **Error Handling**: TaskError propagation with automatic retries
- **Event Loop Management**: Async chat operations in background thread

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
│   ├── __init__.py         # Main scheduler, app context, event loop
│   ├── utils.py            # Shared utilities (breaks circular imports)
│
│
└── tasks/                  # Individual task modules
    ├── __init__.py         # Task registry, _task_boilerplate
    ├── task_contributions.py     # Daily tasks
    ├── task_crawl.py
    ├── task_article_contributions.py

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

### Global State

```python
# In app.services.scheduler
app = None           # Flask app instance (set by start_scheduler)
_loop = None         # Async event loop for chat tasks
_loop_thread = None  # Background thread running event loop
```

Tasks access scheduler state via module import:

```python
import app.services.scheduler as scheduler_module
scheduler_module.app.scheduler.add_job(...)
```

---

## Task Types

### 1. Daily Workflow Tasks (Once Per Day)

Run sequentially via `orchestrate_task_chain()` at 10:40 AM:

| Task                    | Purpose                         | Dependencies          |
| ----------------------- | ------------------------------- | --------------------- |
| `task_clear_log`        | Truncate logs, clear Redis keys | None                  |
| `task_today`            | Initialize today's data         | `task_clear_log`      |
| `task_pastraces`        | Fetch historical race data      | `task_today`          |
| `task_yesterday`        | Archive yesterday's data        | `task_pastraces`      |
| `task_predictions`      | Generate ML predictions         | `task_yesterday`      |
| `task_history`          | Process historical performance  | `task_predictions`    |
| `task_program`          | Fetch/merge program data        | Multiple deps         |
| `task_participants`     | Fetch/merge participant details | `task_program`        |
| `task_careers`          | Fetch/process horse careers     | `task_participants`   |
| `task_favorability`     | Calculate favorability scores   | `task_careers`        |
| `plan_race_task_init`   | Schedule autochat notifications | `task_careers`        |
| `task_prepare_tomorrow` | Setup for next day              | `plan_race_task_init` |

**Success Keys:** `success:{task_name}:DDMMYYYY` (24h TTL)

### 2. Recurring Tasks (Cron-Based)

Run on fixed schedules throughout the day:

| Task                     | Schedule           | Purpose                     |
| ------------------------ | ------------------ | --------------------------- |
| `task_odds`              | `*/15 7-22 * * *`  | Fetch odds every 15 minutes |
| `task_ground_condition`  | `*/15 10-20 * * *` | Update ground conditions    |
| `orchestrate_task_chain` | `*/7 4-23 * * *`   | Check/schedule daily tasks  |

**Note:** These tasks use `skip_success_check=True` to run multiple times per day.

### 3. Orchestrators (Once Per Day, Schedule Per-Race Jobs)

Run once to schedule multiple per-race tasks:

| Orchestrator              | Purpose                         | Offset  |
| ------------------------- | ------------------------------- | ------- |
| `plan_watch_results_init` | Schedule result watchers        | +10 min |
| `plan_race_task_init`     | Schedule autochat notifications | -15 min |

**Pattern:** Orchestrator runs once per day, creates individual jobs for each race at computed times.

**Success Keys:**

- Orchestrator: `success:plan_{name}_init:DDMMYYYY` (24h TTL)
- Per-race: `success:task_{name}:DDMMYYYY_R{X}_C{Y}` (24h TTL)

### 4. Per-Race Tasks (Dynamically Scheduled)

Scheduled by orchestrators at race-specific times:

| Task                     | Triggered By              | Timing  |
| ------------------------ | ------------------------- | ------- |
| `task_sync_autochat`     | `plan_race_task_init`     | -15 min |
| `task_watch_for_results` | `plan_watch_results_init` | +10 min |

**Job IDs:** `{task_name}_{DDMMYYYY}_{reunion}_{race}` (e.g., `watch_results_23112025_R1_C3`)

---

## Orchestration Patterns

### Pattern 1: Once-Per-Day Orchestrator (Timestamp Scheduler)

**Use Case:** Schedule per-race tasks at computed timestamps (relative to race start time).

**Example:** `plan_watch_results_init` - Schedule result watchers +10 min after each race starts.

**Architecture:**

```
Orchestrator (runs once)           Per-Race Jobs (scheduled)
plan_watch_results_init  →  task_watch_for_results (R1C1 at 14:10)
                         →  task_watch_for_results (R1C2 at 14:40)
                         →  task_watch_for_results (R1C3 at 15:10)
```

**Implementation:**

```python
# app/services/tasks/task_plan_watch_for_results_init.py

from app.services.scheduler.timestamp_scheduler import schedule_tasks_by_timestamp

def plan_watch_for_results_init(date_string: str, tz_timezone, delay_minutes: int = 10):
    """Schedule result watchers for all races (+10 min after start)."""
    result = schedule_tasks_by_timestamp(
        date_string=date_string,
        task_func=task_watch_for_results,
        task_name="watch_results",  # Used for success key
        time_offset_minutes=delay_minutes,  # Positive = after start
        tz_timezone=tz_timezone,
        race_filter_criteria=None,  # All races
        force_program_update=True,
        misfire_grace_minutes=10,
        skip_past_tasks=True,
    )
    return result
```

**Key Features:**

- **Reusable Boilerplate**: 60 lines vs 200+ for custom (90% reduction)
- **Configurable Offset**: Positive (after start) or negative (before start)
- **Success Key Management**: Automatic lock and success key handling
- **Race Filtering**: Optional criteria dict for selective scheduling

**Success Keys:**

```bash
# Orchestrator (runs once per day)
success:plan_watch_results_init:23112025

# Per-race tasks (one per race)
success:task_watch_for_results:23112025_R1_C1
success:task_watch_for_results:23112025_R1_C2
```

**Critical Fix (Nov 23, 2025):**

Task ID in orchestrator chain MUST match success key name from `timestamp_scheduler.py`:

```python
# ❌ WRONG - Mismatch causes orchestrator to repeat every run
{
    "id": "plan_watch_for_results_init",  # Orchestrator checks this
    "func": plan_watch_for_results_init,   # Sets success:plan_watch_results_init
}

# ✅ CORRECT - IDs match
{
    "id": "plan_watch_results_init",      # Matches success key
    "func": plan_watch_for_results_init,   # Sets success:plan_watch_results_init
}
```

**Why This Matters:**

`timestamp_scheduler.py` generates: `success:plan_{task_name}_init:{date}`

For `task_name="watch_results"`: `success:plan_watch_results_init:23112025`

Orchestrator must check the SAME key, or it will re-run every 7 minutes.

### Pattern 2: Custom Orchestrator

**Use Case:** Complex validation, custom filtering, history checks.

**Example:** `plan_race_task_init` - Schedule autochat -15 min before races with custom filters.

**Key Features:**

- 200+ lines of custom code
- Hardcoded time offset
- Custom filtering logic (e.g., `starters_count > 8`)
- History key validation for missed races
- Manual lock/success key management

**When to Use:**

- Complex validation requirements beyond timestamp + filter
- Custom history checks or recovery logic
- Legacy patterns (prefer timestamp scheduler for new code)

### Pattern 3: Recurring Tasks

**Use Case:** Tasks that run multiple times per day on fixed schedule.

**Example:** `task_odds` runs every 15 minutes from 7 AM to 10 PM.

**Key Requirement:** Use `skip_success_check=True` in `_task_boilerplate`:

```python
l, lock_key, success_key, result, task_id = _task_boilerplate(
    "task_odds", date_string, skip_success_check=True
)
```

**Without this flag:** Task sets success key on first run, skips all subsequent runs that day.

### Orchestrator Success Key Behavior

**Question:** Why does orchestrator run once per day if it has 24h TTL?

**Answer:** The orchestrator sets success key when it COMPLETES scheduling all races:

```python
# In timestamp_scheduler.py (line 177)
l.set(success_key, "completed", ex=86400)
```

**Orchestrate task chain checks this key every 7 minutes:**

```python
# In orchestrate_task_chain() (line 344)
if l.exists(success_key):
    logger.info(f"Skipping {task_id}: already completed {task_date}")
    continue
```

**Timeline:**

```
10:40 AM - orchestrate_task_chain runs → plan_watch_results_init not completed → schedules it
10:42 AM - plan_watch_results_init completes → sets success key (24h TTL)
10:47 AM - orchestrate_task_chain runs → finds success key → skips
10:54 AM - orchestrate_task_chain runs → finds success key → skips
...
[All day - keeps skipping because success key exists]
```

**This is correct behavior:** Orchestrator runs once to schedule all per-race jobs. The per-race jobs themselves have individual success keys and run at their scheduled times.

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

- `l`: Redis connection (db=11)
- `lock_key`: `lock:task_name:DDMMYYYY`
- `success_key`: `success:task_name:DDMMYYYY`
- `result`: Pre-initialized dict with status, errors, warnings
- `task_id`: Unique UUID for this execution

**Parameters:**

- `skip_success_check`: Set `True` for recurring tasks (default: `False`)

### 2. Scheduler Utils (`app/services/scheduler/utils.py`)

**Purpose:** Shared utilities to avoid circular imports between scheduler and tasks.

**Functions:**

```python
@contextmanager
def get_db_scheduler(engine):
    """SQLAlchemy connection with transaction handling."""
    ...

def normalize_timestamp(ts):
    """Convert millisecond timestamps to seconds."""
    ...

def clear_old_notification_jobs(scheduler):
    """Remove stale notification jobs."""
    ...
```

### 3. Timestamp Scheduler (`app/services/scheduler/timestamp_scheduler.py`)

**Purpose:** Generic boilerplate for per-race task scheduling at computed timestamps.

**Function:**

```python
def schedule_tasks_by_timestamp(
    date_string: str,
    task_func: Callable,
    task_name: str,
    time_offset_minutes: int,
    tz_timezone: pytz.timezone,
    race_filter_criteria: Optional[Dict] = None,
    force_program_update: bool = True,
    misfire_grace_minutes: int = 10,
    skip_past_tasks: bool = True,
) -> Dict[str, Any]:
    ...
```

**Key Logic:**

1. Fetch program (optionally with `force_update`)
2. Filter races (via criteria or all races)
3. Get race start timestamps via `RaceContextWorkflow`
4. Calculate schedule time: `start_time + timedelta(minutes=time_offset_minutes)`
5. Schedule job via APScheduler
6. Set success key when all races scheduled

### 4. Redis Keys

**Lock Keys** (TTL: 300 seconds):

```
lock:task_program:23112025
lock:task_ground_condition:23112025
lock:task_watch_for_results:23112025_R1_C3
```

**Success Keys** (TTL: 86400 seconds):

```
success:task_program:23112025
success:plan_watch_results_init:23112025
success:task_watch_for_results:23112025_R1_C3
```

**Purpose:**

- Lock keys: Prevent concurrent execution (distributed locking)
- Success keys: Enable idempotency (skip if already completed)

### 5. TaskError Exception

```python
class TaskError(Exception):
    """Custom exception for task failures."""

    def __init__(self, status, error_message):
        self.status = status
        self.error_message = error_message
        super().__init__(error_message)
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
from app.services.tasks import TaskError, _task_boilerplate

def task_mynewtask(date_string: str = None) -> dict:
    l, lock_key, success_key, result, task_id = _task_boilerplate(
        "task_mynewtask", date_string
    )

    if result["status"] == "skipped":
        return result

    try:
        # Your logic here
        l.set(success_key, "completed", ex=86400)
        result["status"] = "success"
        return result
    finally:
        l.delete(lock_key)
```

**3. Export from task registry:** `app/services/tasks/__init__.py`

**4. Schedule in orchestrator:** `app/services/scheduler/__init__.py`

**See:** [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for complete examples.

### Creating an Orchestrator

**Use the timestamp scheduler pattern:**

```python
from app.services.scheduler.timestamp_scheduler import schedule_tasks_by_timestamp

def plan_mynewtask_init(date_string: str, tz_timezone, delay_minutes: int = -15):
    return schedule_tasks_by_timestamp(
        date_string=date_string,
        task_func=task_mynewtask_per_race,
        task_name="mynewtask",
        time_offset_minutes=delay_minutes,  # Negative = before start
        tz_timezone=tz_timezone,
        race_filter_criteria=None,
        force_program_update=False,
        misfire_grace_minutes=10,
        skip_past_tasks=True,
    )
```

**See:** [TIMESTAMP_SCHEDULER.md](./TIMESTAMP_SCHEDULER.md) for detailed guide.

---

## Best Practices

### ✅ DO

- Use `_task_boilerplate` for consistency
- Return standardized result dict
- Mark task as completed with success key
- Release lock in `finally` block
- Log errors with full context (`exc_info=True`)
- Use domain loggers (`alog.get_domain_logger(__name__)`)
- Keep tasks idempotent

### ❌ DON'T

- Skip lock acquisition (causes duplicate work)
- Forget to release lock (blocks future runs)
- Raise generic `Exception` (use `TaskError`)
- Import from `app.services.scheduler` in tasks (use `scheduler.utils`)
- Mismatch orchestrator task ID and success key name

### Database Access

```python
from app.services.scheduler.utils import get_db_scheduler

with get_db_scheduler(engine) as conn:
    result = conn.execute(text("SELECT ..."))
    # Auto-commits on success, rolls back on error
```

### Redis Usage

```python
from app.cache import get_redis_connection, get_lock_connection

# Task data (db=0)
with get_redis_connection() as r:
    r.setex("race_context:23112025:R1C3", 86400, json.dumps(data))

# Scheduler locks (db=11)
l = get_lock_connection()
l.set("lock:task_program:23112025", task_id, ex=300, nx=True)
```

---

## Troubleshooting

### Task Not Running

**Check:**

1. Scheduler running: `app.scheduler.running == True`
2. Task scheduled: `app.scheduler.get_jobs()`
3. Lock held: `redis-cli -n 11 KEYS "lock:task_name:*"`
4. Already completed: `redis-cli -n 11 KEYS "success:task_name:*"`

**Fix:**

```bash
# Clear stuck lock
redis-cli -n 11 DEL "lock:task_program:23112025"

# Re-run task
redis-cli -n 11 DEL "success:task_program:23112025"
```

### Orchestrator Repeats Every Run

**Symptom:** Orchestrator runs every 7 minutes instead of once per day.

**Cause:** Task ID mismatch between orchestrator chain and success key.

**Fix:** Ensure task ID matches success key pattern:

```python
# In orchestrate_task_chain()
{
    "id": "plan_watch_results_init",  # ✅ Must match success key
    "func": plan_watch_for_results_init,
}
```

**Verify:**

```bash
# Check success key name
grep "lock_name = " app/services/scheduler/timestamp_scheduler.py
# Output: lock_name = f"plan_{task_name}_init"

# For task_name="watch_results":
# success:plan_watch_results_init:DDMMYYYY
```

**See:** [USAGE_EXAMPLES.md#troubleshooting](./USAGE_EXAMPLES.md#troubleshooting) for more.

---

## References

### Documentation

- **[USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md)** - Complete how-to guide with code examples
- **[TASK_BOILERPLATE.md](./TASK_BOILERPLATE.md)** - Detailed boilerplate usage
- **[TIMESTAMP_SCHEDULER.md](./TIMESTAMP_SCHEDULER.md)** - Orchestrator pattern guide
- **[ORCHESTRATOR_COMPARISON.md](./ORCHESTRATOR_COMPARISON.md)** - Pattern comparison
- **[TASK_FLOW_DIAGRAM.md](./TASK_FLOW_DIAGRAM.md)** - Visual workflow

### Implementation Details

- **[PLAN_WATCH_FOR_RESULTS.md](./PLAN_WATCH_FOR_RESULTS.md)** - Watch for results spec
- **[PHASE_2_3_COMPLETE_SUMMARY.md](./PHASE_2_3_COMPLETE_SUMMARY.md)** - Refactoring summary

### Achievement Reports

See [Achievements](../achievements/README.md) for detailed implementation reports.

---

## Changelog

### v2.1.1 - November 23, 2025 ✅ **BUG FIX**

**Critical Fix: Orchestrator Key Mismatch**

- **Issue**: `plan_watch_results_init` running every 7 minutes instead of once per day
- **Root Cause**: Task ID `"plan_watch_for_results_init"` != success key `"plan_watch_results_init"`
- **Fix**: Changed orchestrator task ID to `"plan_watch_results_init"` (removed "for")
- **Location**: `app/services/scheduler/__init__.py:288`
- **Impact**: Orchestrator now runs once per day as designed

**Race Condition Fix: File Cache**

- **Issue**: `task_odds` failing with `FileNotFoundError` on concurrent runs
- **Root Cause**: `task_watch_for_results` deletes file between `os.path.exists()` check and `open()`
- **Fix**: Added `FileNotFoundError` handler to fall through to API fetch
- **Locations**: `app/fetchers/equidia/program.py:212-217`, `app/fetchers/turfinfo/program.py:195-200`
- **Impact**: Graceful handling of concurrent force_update operations

### v2.1 - November 11, 2025 ✅

- Watch For Results System Complete
- Critical Fix: Program cache race_status updates via `WorkflowProgram.persist_program()`
- Timestamp Scheduler Pattern (90% code reduction)
- Database Integration for race results

### v2.0 - November 8, 2025 ✅

- Task extraction to `app/services/tasks/` modules
- Circular import resolution via `scheduler/utils.py`
- `_task_boilerplate` standardization
- Smart early-exit logic for recurring tasks

---

**Last Updated:** November 23, 2025
**Maintained by:** Development Team
**Architecture Version:** 2.1.1 (Orchestrator Key Mismatch Fix)
