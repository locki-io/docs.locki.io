# OCapistaine Scheduler Usage Examples

Complete guide for common scheduler tasks with code examples.

**Last Updated:** February 2026

---

## Table of Contents

1. [Adding a New Task](#adding-a-new-task)
2. [Database and Redis Access](#database-and-redis-access)
3. [Testing Tasks](#testing-tasks)
4. [Troubleshooting](#troubleshooting)

---

## Adding a New Task

### Step 1: Create Task File

Create `app/services/tasks/task_mynewtask.py`:

```python
"""
My New Task

Description of what this task does.
"""

from app.services.tasks import TaskError, _task_boilerplate, REDIS_SUCCESS_TTL


def task_mynewtask(date_string: str = None) -> dict:
    """
    Brief description of what this task does.

    Args:
        date_string: Date in YYYYMMDD format (optional, defaults to today)

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

    # Add custom result fields
    result["items_processed"] = 0

    try:
        # Your task logic here
        print(f"Running task_mynewtask for {date_string}")

        # Example: Process items
        items = []  # Fetch your items here
        for item in items:
            # Process item
            result["items_processed"] += 1

        # Mark as completed
        result["status"] = "success"
        l.set(success_key, "completed", ex=REDIS_SUCCESS_TTL)

        print(f"task_mynewtask completed: {result['items_processed']} items processed")
        return result

    except Exception as e:
        print(f"task_mynewtask failed: {e}")
        result["status"] = "failed"
        result["errors"].append(str(e))
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
            "depends_on": ["task_contributions_analysis"],  # Dependencies
        },
    ]
```

**Option B: Schedule as cron job**

```python
# In _register_jobs()
TASK_MYNEWTASK_CRON = "0 12 * * *"  # Daily at noon

scheduler.add_job(
    func=task_mynewtask,
    trigger=CronTrigger.from_crontab(TASK_MYNEWTASK_CRON),
    id="task_mynewtask",
    replace_existing=True,
    misfire_grace_time=300,
)
```

### Step 4: Test

```bash
# Import test
python3 -c "from app.services.tasks import task_mynewtask; print('Import OK')"

# Execution test
python3 -c "
from app.services.tasks import task_mynewtask
result = task_mynewtask('20260203')
print(f'Status: {result[\"status\"]}')
"

# Check Redis keys
redis-cli -n 6 KEYS "success:task_mynewtask:*"
redis-cli -n 6 KEYS "lock:task_mynewtask:*"
```

---

## Database and Redis Access

### Redis Usage - Scheduler Locks (db=6)

```python
from app.services.scheduler.utils import get_scheduler_redis

l = get_scheduler_redis()

# Acquire lock (nx=True means "only if not exists")
task_id = "unique-task-id"
acquired = l.set("lock:task_name:20260203", task_id, ex=300, nx=True)

if not acquired:
    print("Task already running")
else:
    try:
        # Do work...
        pass
    finally:
        # Always release lock
        l.delete("lock:task_name:20260203")

# Set success key
l.set("success:task_name:20260203", "completed", ex=86400)

# Check if completed
if l.exists("success:task_name:20260203"):
    print("Task already completed today")
```

### Redis Usage - Application Data (db=5)

```python
from app.data.redis_client import redis_connection
import json

# Store contribution data
with redis_connection() as r:
    key = f"contribution:{contribution_id}"
    r.setex(key, 86400, json.dumps(contribution_data))

# Retrieve contribution data
with redis_connection() as r:
    data = r.get(key)
    if data:
        contribution = json.loads(data)
```

---

## Testing Tasks

### Unit Test Pattern

```python
def test_task_mynewtask():
    """Test task logic."""
    from app.services.scheduler.utils import get_scheduler_redis

    # Clear any existing keys
    l = get_scheduler_redis()
    l.delete("success:task_mynewtask:20260203")
    l.delete("lock:task_mynewtask:20260203")

    # Execute task
    from app.services.tasks import task_mynewtask
    result = task_mynewtask("20260203")

    # Verify result
    assert result["status"] == "success"
    assert len(result["errors"]) == 0

    # Verify Redis keys
    assert l.exists("success:task_mynewtask:20260203")
    assert not l.exists("lock:task_mynewtask:20260203")  # Released
```

### Integration Test Pattern

```python
import asyncio

async def test_scheduler_startup():
    """Test scheduler starts correctly."""
    from app.services.scheduler import start_scheduler, stop_scheduler, get_scheduler_status

    # Start scheduler
    await start_scheduler()

    # Check status
    status = get_scheduler_status()
    assert status["status"] == "running"
    assert status["job_count"] > 0

    # Stop scheduler
    await stop_scheduler()
```

### Manual Testing Commands

```bash
# Run task directly
cd /Users/jnxmas/dev/ocapistaine
poetry run python -c "
from app.services.tasks import task_contributions_analysis
result = task_contributions_analysis('20260203')
print(result)
"

# Check scheduler status
poetry run python -c "
from app.services.scheduler import get_scheduler_status
print(get_scheduler_status())
"

# View task status in Redis
redis-cli -n 6 KEYS "success:*20260203"
redis-cli -n 6 KEYS "lock:*20260203"

# Clear stuck lock
redis-cli -n 6 DEL "lock:task_contributions_analysis:20260203"

# Re-run task (clear success key first)
redis-cli -n 6 DEL "success:task_contributions_analysis:20260203"
```

---

## Troubleshooting

### Task Not Running

**Check 1:** Is scheduler running?

```python
from app.services.scheduler import get_scheduler_status
status = get_scheduler_status()
print(f"Running: {status['status']}")
```

**Check 2:** Is task scheduled?

```python
from app.services.scheduler import get_scheduler_status
status = get_scheduler_status()
for job in status["jobs"]:
    print(f"{job['id']}: next run at {job['next_run']}")
```

**Check 3:** Is lock held?

```bash
redis-cli -n 6 KEYS "lock:task_name:*"
redis-cli -n 6 GET "lock:task_name:20260203"
```

**Check 4:** Already completed?

```bash
redis-cli -n 6 KEYS "success:task_name:*"
redis-cli -n 6 GET "success:task_name:20260203"
```

**Fix:**

```bash
# Clear stuck lock (if confirmed stale)
redis-cli -n 6 DEL "lock:task_contributions_analysis:20260203"

# Re-run task (clear success key)
redis-cli -n 6 DEL "success:task_contributions_analysis:20260203"

# Manually trigger
poetry run python -c "
from app.services.tasks import task_contributions_analysis
task_contributions_analysis('20260203')
"
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

### Circular Import Error

**Symptom:**

```
ImportError: cannot import name 'X' from partially initialized module
```

**Rules:**

- Tasks import from `app.services.scheduler.utils` (NOT `app.services.scheduler`)
- Tasks import from `app.services.tasks` (for boilerplate)
- Scheduler imports from `app.services.tasks`
- Tasks NEVER import from `app.services.scheduler`

---

## Cron Schedule Reference

```python
# Every day at 3 AM (nightly crawl)
"0 3 * * *"

# Every day at 5 AM (daily experiments)
"0 5 * * *"

# Every 7 minutes from 6 AM to 11 PM (task chain)
"*/7 6-23 * * *"

# Every 15 minutes from 9 AM to 6 PM
"*/15 9-18 * * *"

# Weekdays only at noon
"0 12 * * 1-5"

# First day of month
"0 0 1 * *"
```

**Tool:** Use `CronTrigger.from_crontab("...")` for validation.

---

## OCapistaine-Specific Tasks

### task_contributions_analysis

Validates citizen contributions using Forseti agent:

```python
# Check validation results
from app.services.tasks import task_contributions_analysis
result = task_contributions_analysis()
print(f"Validated: {result['contributions_validated']}")
print(f"Approved: {result['contributions_approved']}")
print(f"Flagged: {result['contributions_flagged']}")
```

### task_opik_experiment

Runs LLM evaluation experiments:

```python
# Run experiments manually
from app.services.tasks import task_opik_experiment
result = task_opik_experiment()
print(f"Experiments run: {result['experiments_run']}")
print(f"Metrics: {result.get('metrics', {})}")
```

### task_firecrawl

Crawls municipal documents:

```python
# Trigger crawl manually
from app.services.tasks import task_firecrawl
result = task_firecrawl()
print(f"Documents crawled: {result['documents_crawled']}")
print(f"Sources: {result.get('sources', {})}")
```

---

## References

- [Main Scheduler README](./README.md) - Architecture overview
- [Task Boilerplate Guide](./TASK_BOILERPLATE.md) - Detailed boilerplate usage

---

**Last Updated:** February 2026
