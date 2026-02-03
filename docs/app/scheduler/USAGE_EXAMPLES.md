# Scheduler Usage Examples

Complete guide for common scheduler tasks with code examples.

**Last Updated:** November 23, 2025

---

## Table of Contents

1. [Adding a New Task](#adding-a-new-task)
2. [Creating an Orchestrator](#creating-an-orchestrator)
3. [Database Access](#database-access)
4. [Redis Usage](#redis-usage)
5. [Testing Tasks](#testing-tasks)
6. [Troubleshooting](#troubleshooting)

---

## Adding a New Task

### Step 1: Create Task File

Create `app/services/tasks/task_mynewtask.py`:

```python
import logging
from app.services.tasks import TaskError, _task_boilerplate
from config.logging import alog

logger = alog.get_domain_logger(__name__)  # --> scheduler

def task_mynewtask(date_string: str = None) -> dict:
    """
    Brief description of what this task does.

    Args:
        date_string: Date in DDMMYYYY format (optional, defaults to today)

    Returns:
        dict: Task result with status, errors, and custom fields

    Raises:
        TaskError: For retry-able failures
    """
    # Use boilerplate for lock/success key management
    l, lock_key, success_key, result, task_id = _task_boilerplate(
        "task_mynewtask", date_string
    )

    # Early return if already completed or running
    if result["status"] == "skipped":
        return result

    # Remove boilerplate counters if not needed
    del result["mynewtask_successes"]
    del result["mynewtask_processed"]

    # Add custom result fields
    result["custom_metric"] = 0

    try:
        # Your task logic here
        logger.info(f"Running task_mynewtask for {date_string}")

        # ... do work ...

        # Mark as completed
        l.set(success_key, "completed", ex=86400)

        result["status"] = "success"
        alog.display(result, title="My New Task Succeeded")
        return result

    except Exception as e:
        logger.error(f"Task failed: {e}", exc_info=True)
        result["status"] = "failed"
        result["errors"].append(str(e))
        alog.display(result, title="My New Task Failed")
        raise TaskError("failed", str(e))

    finally:
        l.delete(lock_key)  # Always release lock
```

### Step 2: Export from Task Registry

Add to `app/services/tasks/__init__.py`:

```python
# Import at bottom of file (after _task_boilerplate definition)
from app.services.tasks.task_mynewtask import task_mynewtask

# Add to __all__
__all__ = [
    # ... existing exports ...
    "task_mynewtask",
]
```

### Step 3: Schedule in Scheduler

Add to `app/services/scheduler/__init__.py`:

**Option A: Add to daily task chain**

```python
def orchestrate_task_chain():
    task_chain = [
        # ... existing tasks ...
        {
            "id": "task_mynewtask",
            "func": task_mynewtask,
            "args": [today],
            "depends_on": ["task_program"],  # Dependencies
        },
    ]
```

**Option B: Schedule as cron job**

```python
# In start_scheduler()
TASK_MYNEWTASK_CRON = "0 12 * * *"  # Daily at noon

app.scheduler.add_job(
    func=task_mynewtask,
    trigger=CronTrigger.from_crontab(TASK_MYNEWTASK_CRON),
    id="task_mynewtask",
    replace_existing=True,
    misfire_grace_time=300,
)
```

**Option C: Schedule dynamically**

```python
app.scheduler.add_job(
    func=task_mynewtask,
    args=[date_string],
    trigger="date",
    run_date=target_datetime,
    id=f"task_mynewtask_{date_string}",
    replace_existing=True,
)
```

### Step 4: Test

```bash
# Import test
python3 -c "from app.services.tasks import task_mynewtask; print('✓ Import OK')"

# Execution test
python3 -c "
from app.services.tasks import task_mynewtask
result = task_mynewtask('23112025')
print(f'Status: {result[\"status\"]}')
"

# Check Redis keys
redis-cli -n 11 KEYS "success:task_mynewtask:*"
redis-cli -n 11 KEYS "lock:task_mynewtask:*"
```

---

## Creating an Orchestrator

Use the **Timestamp Scheduler** pattern for per-race task scheduling.

### Example: Schedule Task 30 Minutes Before Race Start

**Step 1:** Create orchestrator task

```python
# app/services/tasks/task_plan_mynewtask_init.py

from app.services.scheduler.timestamp_scheduler import schedule_tasks_by_timestamp
from app.services.tasks.task_mynewtask_per_race import task_mynewtask_per_race

def plan_mynewtask_init(date_string: str, tz_timezone, delay_minutes: int = -30):
    """
    Schedule mynewtask for all races (30 minutes before start).

    Args:
        date_string: Date in DDMMYYYY format
        tz_timezone: Timezone for scheduling
        delay_minutes: Offset from race start (negative = before)

    Returns:
        dict: Task result with scheduled_races and errors
    """
    result = schedule_tasks_by_timestamp(
        date_string=date_string,
        task_func=task_mynewtask_per_race,
        task_name="mynewtask",
        time_offset_minutes=delay_minutes,  # -30 = 30 minutes before
        tz_timezone=tz_timezone,
        race_filter_criteria=None,  # All races
        force_program_update=False,
        misfire_grace_minutes=10,
        skip_past_tasks=True,
    )

    return result
```

**Step 2:** Create per-race task

```python
# app/services/tasks/task_mynewtask_per_race.py

from app.services.tasks import TaskError, _task_boilerplate

def task_mynewtask_per_race(date_string: str, reunion_label: str, race_label: str) -> dict:
    """
    Execute mynewtask for a specific race.

    Args:
        date_string: Date in DDMMYYYY format
        reunion_label: Reunion identifier (e.g., "R1")
        race_label: Race identifier (e.g., "C3")

    Returns:
        dict: Task result
    """
    # Use custom lock key for per-race tasks
    thread_id = f"{date_string}:{reunion_label}{race_label}"

    l, lock_key, success_key, result, task_id = _task_boilerplate(
        f"task_mynewtask_per_race_{thread_id}", date_string
    )

    if result["status"] == "skipped":
        return result

    try:
        # Your per-race logic here
        logger.info(f"Running mynewtask for {thread_id}")

        # ... do work ...

        l.set(success_key, "completed", ex=86400)
        result["status"] = "success"
        return result

    except Exception as e:
        logger.error(f"Failed for {thread_id}: {e}", exc_info=True)
        result["status"] = "failed"
        result["errors"].append(str(e))
        raise TaskError("failed", str(e))

    finally:
        l.delete(lock_key)
```

**Step 3:** Add to orchestrator chain

```python
# In orchestrate_task_chain()
{
    "id": "plan_mynewtask_init",
    "func": plan_mynewtask_init,
    "args": [today, tz_timezone, -30],  # 30 min before
    "depends_on": ["task_program"],
},
```

---

## Database Access

### Pattern: Connection with Transaction Handling

```python
from app.services.scheduler.utils import get_db_scheduler
from app.services.init_db import init_engine
from sqlalchemy import text

engine = init_engine()

# Context manager handles commit/rollback
with get_db_scheduler(engine) as conn:
    # Execute query
    result = conn.execute(
        text("SELECT * FROM races WHERE date = :date"),
        {"date": "2025-11-23"}
    )

    races = result.fetchall()

    # Update data
    conn.execute(
        text("UPDATE races SET status = :status WHERE race_id = :id"),
        {"status": "FINISHED", "id": race_id}
    )

    # Auto-commits on success, rolls back on error
```

### Pattern: Bulk Insert

```python
with get_db_scheduler(engine) as conn:
    # Batch insert
    data = [
        {"race_id": "R1C1", "string_result": "3-7-5"},
        {"race_id": "R1C2", "string_result": "1-4-8"},
    ]

    conn.execute(
        text("INSERT INTO races (race_id, string_result) VALUES (:race_id, :string_result)"),
        data
    )
```

---

## Redis Usage

### Task Data Cache (db=0)

```python
from app.cache import get_redis_connection
import json

# Store race context
with get_redis_connection() as r:
    key = f"race_context:{date_string}:{reunion_label}{race_label}"
    r.setex(key, 86400, json.dumps(race_context.model_dump()))

# Retrieve race context
with get_redis_connection() as r:
    data = r.get(key)
    if data:
        race_context = json.loads(data)
```

### Scheduler Locks (db=11)

```python
from app.cache import get_lock_connection

l = get_lock_connection()

# Acquire lock (nx=True means "only if not exists")
task_id = "unique-task-id"
acquired = l.set("lock:task_name:23112025", task_id, ex=300, nx=True)

if not acquired:
    print("Task already running")
else:
    try:
        # Do work...
        pass
    finally:
        # Always release lock
        l.delete("lock:task_name:23112025")

# Set success key
l.set("success:task_name:23112025", "completed", ex=86400)

# Check if completed
if l.exists("success:task_name:23112025"):
    print("Task already completed today")
```

---

## Testing Tasks

### Unit Test Pattern

```python
def test_task_mynewtask():
    """Test task logic."""
    # Clear any existing keys
    l = get_lock_connection()
    l.delete("success:task_mynewtask:23112025")
    l.delete("lock:task_mynewtask:23112025")

    # Execute task
    result = task_mynewtask("23112025")

    # Verify result
    assert result["status"] == "success"
    assert len(result["errors"]) == 0

    # Verify Redis keys
    assert l.exists("success:task_mynewtask:23112025")
    assert not l.exists("lock:task_mynewtask:23112025")  # Released
```

### Integration Test Pattern

```python
def test_orchestrator():
    """Test full task chain."""
    from app.services.scheduler import start_scheduler, app

    # Start scheduler
    start_scheduler(flask_app)

    # Wait for chain to complete
    import time
    time.sleep(60)

    # Verify all success keys exist
    l = get_lock_connection()
    tasks = ["task_program", "task_participants", "task_careers"]

    for task in tasks:
        assert l.exists(f"success:{task}:23112025"), f"{task} not completed"
```

### Manual Testing Commands

```bash
# Run task directly
PYTHONPATH=/Users/jnxmas/dev/autohypo python3 -c "
from app.services.tasks import task_program
result = task_program('23112025')
print(result)
"

# Check scheduler jobs
redis-cli -n 11 KEYS "apscheduler*"

# View task status
redis-cli -n 11 KEYS "success:*23112025"
redis-cli -n 11 KEYS "lock:*23112025"

# Clear stuck lock
redis-cli -n 11 DEL "lock:task_program:23112025"

# Re-run task (clear success key first)
redis-cli -n 11 DEL "success:task_program:23112025"
```

---

## Troubleshooting

### Task Not Running

**Check 1:** Is scheduler running?

```python
from app.services.scheduler import app
print(app.scheduler.running)  # Should be True
```

**Check 2:** Is task scheduled?

```python
jobs = app.scheduler.get_jobs()
for job in jobs:
    print(f"{job.id}: next run at {job.next_run_time}")
```

**Check 3:** Is lock held?

```bash
redis-cli -n 11 KEYS "lock:task_name:*"
redis-cli -n 11 GET "lock:task_name:23112025"
```

**Check 4:** Already completed?

```bash
redis-cli -n 11 KEYS "success:task_name:*"
redis-cli -n 11 GET "success:task_name:23112025"
```

**Fix:**

```bash
# Clear stuck lock (if confirmed stale)
redis-cli -n 11 DEL "lock:task_program:23112025"

# Re-run task (clear success key)
redis-cli -n 11 DEL "success:task_program:23112025"

# Manually trigger
python3 -c "from app.services.tasks import task_program; task_program('23112025')"
```

---

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

### Orchestrator Repeats Every Run

**Symptom:** `plan_watch_results_init` runs every 7 minutes instead of once per day.

**Cause:** Task ID mismatch between orchestrator and success key.

**Fix:** Ensure task ID in `orchestrate_task_chain()` matches the success key set by `timestamp_scheduler.py`:

```python
# orchestrate_task_chain() - MUST match success key name
{
    "id": "plan_watch_results_init",  # ✅ Matches success:plan_watch_results_init:*
    "func": plan_watch_for_results_init,
    ...
},
```

**Verify:**

```bash
# Check what key the orchestrator sets
grep "lock_name = " app/services/scheduler/timestamp_scheduler.py
# Output: lock_name = f"plan_{task_name}_init"

# For task_name="watch_results", this becomes:
# success:plan_watch_results_init:DDMMYYYY
```

---

### Circular Import Error

**Symptom:**

```
ImportError: cannot import name 'X' from partially initialized module
```

**Rules:**

- ✅ Tasks import from `app.services.scheduler.utils` (NOT `app.services.scheduler`)
- ✅ Tasks import from `app.services.tasks` (for boilerplate)
- ✅ Scheduler imports from `app.services.tasks`
- ❌ Tasks NEVER import from `app.services.scheduler`

**Access scheduler app context:**

```python
# In tasks that need scheduler access
import app.services.scheduler as scheduler_module

# Access app
scheduler_module.app.scheduler.add_job(...)

# Access event loop
scheduler_module._loop
```

---

### Event Loop Not Running

**Symptom:**

```
Event loop not running for task_autochat
```

**Check:**

```python
from app.services.scheduler import _loop

assert _loop is not None, "Loop not initialized"
assert _loop.is_running(), "Loop not running"
```

**Fix:**

```python
from app.services.scheduler import start_event_loop

start_event_loop()
```

---

## Cron Schedule Reference

```python
# Every day at 10:52 AM
"52 10 * * *"

# Every 7 minutes from 4 AM to 11 PM
"*/7 4-23 * * *"

# Every 15 minutes from 10 AM to 8 PM
"*/15 10-20 * * *"

# Every 15 minutes from 7 AM to 10 PM
"*/15 7-22 * * *"

# Weekdays only at noon
"0 12 * * 1-5"

# First day of month
"0 0 1 * *"
```

**Tool:** Use `CronTrigger.from_crontab("...")` for validation.

---

## References

- [Main Scheduler README](./README.md) - Architecture overview
- [Task Boilerplate Guide](./TASK_BOILERPLATE.md) - Detailed boilerplate usage
- [Timestamp Scheduler](./TIMESTAMP_SCHEDULER.md) - Orchestrator pattern
- [Orchestrator Comparison](./ORCHESTRATOR_COMPARISON.md) - Pattern tradeoffs

---

**Last Updated:** November 23, 2025
