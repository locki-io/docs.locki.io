# OCapistaine Task Boilerplate Documentation

## Overview

The `_task_boilerplate()` function in `app/services/tasks/__init__.py` provides standardized initialization, locking, and result handling for all scheduler tasks. This ensures consistent behavior across all tasks and simplifies implementation.

## Purpose

The boilerplate handles:
1. **Task Identification**: Generates unique task IDs for logging/tracking
2. **Redis Locking**: Prevents concurrent execution of the same task
3. **Success Keys**: Tracks task completion to avoid duplicate runs
4. **Result Dictionary**: Standardized result structure
5. **Skip Logic**: Automatically skips already-completed or running tasks

## Function Signature

```python
def _task_boilerplate(
    task_name: str,
    date_string: str = None,
    skip_success_check: bool = False,
) -> Tuple[redis.Redis, str, str, Dict[str, Any], str]:
    """
    Standard task initialization boilerplate.

    Args:
        task_name: Full task identifier (e.g., "task_contributions_analysis")
        date_string: Date in YYYYMMDD format. Defaults to today.
        skip_success_check: If True, skip success key check (for recurring tasks).

    Returns:
        tuple: (redis_conn, lock_key, success_key, result_dict, task_id)
    """
```

## Return Values

| Value | Type | Description |
|-------|------|-------------|
| `l` | Redis connection | Scheduler Redis connection (db=6) for locks/success keys |
| `lock_key` | str | Redis key for task locking (`lock:{task_name}:{date_string}`) |
| `success_key` | str | Redis key for completion tracking (`success:{task_name}:{date_string}`) |
| `result` | dict | Pre-initialized result dictionary with standard fields |
| `task_id` | str | Unique UUID (8 chars) for this task execution |

## Result Dictionary Structure

The boilerplate creates a result dictionary with:

```python
{
    "task": task_name,           # Full task name
    "date": date_string,         # Date being processed (YYYYMMDD)
    "task_id": task_id,          # Unique execution ID
    "status": "pending",         # pending | success | skipped | failed
    "errors": [],                # List of error messages
    "warnings": [],              # List of non-fatal warnings
    "reason": None,              # Reason for skip/failure (optional)
}
```

## Usage Pattern

### Basic Usage

```python
from app.services.tasks import TaskError, _task_boilerplate, REDIS_SUCCESS_TTL

def task_example(date_string: str = None) -> dict:
    """
    Example task using boilerplate.

    Args:
        date_string: Date in YYYYMMDD format

    Returns:
        dict: Task result with status

    Raises:
        TaskError: For critical failures
    """
    # 1. Call boilerplate
    l, lock_key, success_key, result, task_id = _task_boilerplate(
        "task_example", date_string
    )

    # 2. Check if already skipped
    if result["status"] == "skipped":
        return result

    # 3. Add custom result fields
    result["items_processed"] = 0
    result["items_succeeded"] = 0

    try:
        # 4. Do your work here
        for item in items_to_process:
            try:
                # Process item
                result["items_processed"] += 1
                result["items_succeeded"] += 1

            except Exception as e:
                error_msg = f"Failed processing {item}: {str(e)}"
                print(error_msg)
                result["errors"].append(error_msg)
                result["items_processed"] += 1
                continue

        # 5. Check for failures
        if result["errors"] and result["items_succeeded"] == 0:
            result["status"] = "failed"
            raise TaskError("failed", f"All items failed: {len(result['errors'])} errors")

        # 6. Mark success
        result["status"] = "success"
        l.set(success_key, "completed", ex=REDIS_SUCCESS_TTL)
        return result

    except TaskError:
        raise  # Re-raise TaskErrors cleanly

    except Exception as e:
        print(f"Unexpected error: {e}")
        result["status"] = "failed"
        if not result["errors"]:
            result["errors"].append(f"Unexpected error: {str(e)}")
        raise TaskError("failed", f"Unexpected error: {str(e)}")

    finally:
        # 7. Always release lock
        l.delete(lock_key)
```

### Recurring Task (Multiple Runs Per Day)

For tasks like `task_odds` that run multiple times per day:

```python
def task_recurring(date_string: str = None) -> dict:
    # Use skip_success_check=True to allow multiple runs
    l, lock_key, success_key, result, task_id = _task_boilerplate(
        "task_recurring", date_string, skip_success_check=True
    )

    if result["status"] == "skipped":
        return result  # Still respects lock (concurrent run protection)

    try:
        # Task logic...
        result["status"] = "success"
        # Note: Don't set success key for recurring tasks
        return result
    finally:
        l.delete(lock_key)
```

## Skip Logic

The boilerplate automatically handles two skip scenarios:

### 1. Task Already Completed

```python
if not skip_success_check and l.exists(success_key):
    result["status"] = "skipped"
    result["reason"] = "already_completed"
    return l, lock_key, success_key, result, task_id
```

### 2. Task Already Running

```python
acquired = l.set(lock_key, task_id, ex=REDIS_LOCK_TIMEOUT, nx=True)
if not acquired:
    result["status"] = "skipped"
    result["reason"] = "lock_held"
    return l, lock_key, success_key, result, task_id
```

**Important**: Always check if result status is "skipped" after calling boilerplate:

```python
l, lock_key, success_key, result, task_id = _task_boilerplate("task_name", date_string)

# Early return if already skipped
if result["status"] == "skipped":
    return result
```

## Redis Key Patterns

### Lock Keys
- Format: `lock:{task_name}:{date_string}`
- TTL: 300 seconds (`REDIS_LOCK_TIMEOUT`)
- Purpose: Prevent concurrent execution
- Always deleted in `finally` block

### Success Keys
- Format: `success:{task_name}:{date_string}`
- TTL: 86400 seconds (24 hours)
- Purpose: Track task completion
- Set after successful execution

## Error Handling Pattern

### TaskError

Use `TaskError` for controlled failures:

```python
raise TaskError("failed", error_message)
```

### Exception Handling Template

```python
try:
    # Main work
    pass

except TaskError:
    raise  # Clean re-raise, already logged

except redis.RedisError as e:
    print(f"Redis error: {e}")
    result["status"] = "failed"
    result["errors"].append(f"Redis error: {str(e)}")
    raise TaskError("failed", f"Redis error: {str(e)}")

except Exception as e:
    print(f"Unexpected error: {e}")
    result["status"] = "failed"
    if not result["errors"]:
        result["errors"].append(f"Unexpected error: {str(e)}")
    raise TaskError("failed", f"Unexpected error: {str(e)}")

finally:
    l.delete(lock_key)  # ALWAYS release lock
```

## Best Practices

### 1. Always Check Skip Status

```python
l, lock_key, success_key, result, task_id = _task_boilerplate("task_name", date)

if result["status"] == "skipped":
    return result  # Early return
```

### 2. Add Custom Counters

```python
# Add task-specific counters
result["contributions_processed"] = 0
result["contributions_validated"] = 0
result["contributions_flagged"] = 0
```

### 3. Track All Operations

```python
for contribution in contributions:
    try:
        # Process contribution
        result["contributions_processed"] += 1

        if is_valid:
            result["contributions_validated"] += 1
        else:
            result["contributions_flagged"] += 1

    except Exception as e:
        result["errors"].append(str(e))
        result["contributions_processed"] += 1
```

### 4. Always Release Lock

```python
finally:
    l.delete(lock_key)  # Critical - prevents deadlocks
```

## Common Mistakes

### Wrong: Not Checking Skip Status

```python
# BAD: Continuing after skip
l, lock_key, success_key, result, task_id = _task_boilerplate("task_name", date)
# ... do work anyway ...

# GOOD: Early return on skip
l, lock_key, success_key, result, task_id = _task_boilerplate("task_name", date)
if result["status"] == "skipped":
    return result
```

### Wrong: Forgetting Lock Release

```python
# BAD: No finally block
try:
    # work
    l.delete(lock_key)  # Only happens on success

# GOOD: Always release
try:
    # work
finally:
    l.delete(lock_key)  # Always happens
```

### Wrong: Setting Success Key for Recurring Tasks

```python
# BAD: Setting success key blocks subsequent runs
def task_recurring(...):
    ...
    l.set(success_key, "completed", ex=86400)  # Blocks next run!

# GOOD: Don't set success key for recurring tasks
def task_recurring(...):
    ...
    # No success key - task can run again
```

## Integration with Task Chain

Tasks are orchestrated in `app/services/scheduler/__init__.py`:

```python
task_chain = [
    {
        "id": "task_contributions_analysis",
        "func": task_contributions_analysis,
        "depends_on": [],
    },
    # Future tasks with dependencies:
    # {
    #     "id": "task_rag_indexing",
    #     "func": task_rag_indexing,
    #     "depends_on": ["task_contributions_analysis"],
    # },
]
```

Each task:
1. Runs only if dependencies succeeded
2. Uses boilerplate for initialization
3. Skips if already completed or running
4. Raises TaskError on failure
5. Sets success key on completion

## Summary

The task boilerplate provides:
- Consistent initialization across all tasks
- Automatic locking and skip logic
- Standardized result structure
- Clear error handling patterns

Use it for every scheduler task to ensure reliability, consistency, and maintainability.

---

**Last Updated:** February 2026
