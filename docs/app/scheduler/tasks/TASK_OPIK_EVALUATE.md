# Task: Opik Evaluate

Scheduled task that processes recent Opik spans and runs evaluation experiments.

## Overview

`task_opik_evaluate` handles the async nature of Opik span ingestion (spans take ~3 minutes to appear after creation) by running periodically to:

1. Clean up error traces (optional)
2. Search for recent spans not yet added to a dataset
3. Create a dataset from those spans
4. Run Opik evaluate() with configured metrics
5. Report results

## Schedule

```python
# Cron: Every 30 minutes, 7 AM - 10 PM
OPIK_EVALUATE_CRON = "*/30 7-22 * * *"
```

## Parameters

| Parameter         | Type        | Default                              | Description                           |
| ----------------- | ----------- | ------------------------------------ | ------------------------------------- |
| `date_string`     | str         | today                                | Date in YYYYMMDD format               |
| `experiment_type` | str         | `"charter_optimization"`             | Type from AGENT_FEATURE_REGISTRY      |
| `max_items`       | int         | 50                                   | Maximum spans to include              |
| `lookback_hours`  | int         | 24                                   | Hours to look back for spans          |
| `metrics`         | list`[str]` | `["hallucination", "output_format"]` | Opik metrics to use                   |
| `task_provider`   | str         | `"gemini"`                           | LLM provider for evaluation task      |
| `skip_if_empty`   | bool        | True                                 | Skip without error if no new spans    |
| `cleanup_errors`  | bool        | True                                 | Delete error traces before processing |

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   task_opik_evaluate                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 0: Cleanup Error Traces (if cleanup_errors=True)      │
│          Delete traces with "error", "retries exhausted"    │
│                         ↓                                   │
│  Step 1: Search Recent Spans                                │
│          Filter: name = "{span_name}" AND type = "llm"      │
│                         ↓                                   │
│  Step 2: Filter Already-Added                               │
│          Exclude spans with added_to_dataset feedback       │
│                         ↓                                   │
│  Step 3: Create Dataset                                     │
│          dataset: {prefix}-{date}-{time}                    │
│                         ↓                                   │
│  Step 4: Run Opik Evaluate                                  │
│          experiment: {feature}-eval-{date}-{time}           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Via Admin Dashboard

1. Navigate to **Admin** tab
2. Find **task_opik_evaluate** in Manual Triggers
3. Configure:
   - Experiment type
   - LLM provider
   - Max items
4. Click **Run Now**

### Via Scheduler

The task runs automatically every 30 minutes. To modify:

```python
# In app/services/scheduler/__init__.py
OPIK_EVALUATE_CRON = "0 */2 * * *"  # Every 2 hours instead
```

### Programmatically

```python
from app.services.tasks.task_opik_evaluate import task_opik_evaluate

result = task_opik_evaluate(
    experiment_type="charter_optimization",
    max_items=100,
    metrics=["hallucination", "moderation", "output_format"],
    task_provider="ollama",
    cleanup_errors=True,
)
```

## Result Structure

```python
{
    "status": "success",  # or "skipped", "failed"
    "task_id": "task_opik_evaluate",
    "date_string": "20260204",
    "experiment_type": "charter_optimization",
    "max_items": 50,
    "lookback_hours": 24,
    "metrics": ["hallucination", "output_format"],
    "task_provider": "gemini",
    "cleanup_errors": True,
    "cleanup_result": {
        "project": "ocapistaine-test",
        "total_traces": 408,
        "error_traces": 5,
        "deleted": 5,
        "error_patterns": {"error": 3, "retries exhausted": 2}
    },
    "spans_found": 25,
    "spans_new": 12,
    "dataset_name": "charter-optimization-20260204-143052",
    "experiment_result": {
        "status": "success",
        "experiment_name": "charter_validation-eval-20260204-143052",
        "eval_results": {...}
    },
    "errors": [],
    "warnings": []
}
```

## Metrics

### Default Metrics

| Metric          | Type    | Description                            |
| --------------- | ------- | -------------------------------------- |
| `hallucination` | builtin | Detects false information (LLM judge)  |
| `output_format` | custom  | Measures format compliance (0-1 scale) |

### Available Metrics

```python
from app.processors.workflows.workflow_experiment import list_available_metrics

for m in list_available_metrics():
    print(f"{m['name']}: {m['description']} ({m['type']})")
```

## Error Cleanup

The task can automatically delete error traces before processing. This prevents:

- Polluted optimization data
- Divergent experiment results
- Wasted compute on invalid traces

### Error Patterns Detected

- `"error"` - Generic errors
- `"retries exhausted"` - API retry failures
- `"rate limit"` - Rate limiting errors
- `"validation error"` - LLM validation failures
- `"timeout"` - Request timeouts
- `"failed"` - Generic failures

### Disable Cleanup

```python
result = task_opik_evaluate(cleanup_errors=False)
```

## Redis Keys

| Key Pattern                         | TTL   | Purpose                 |
| ----------------------------------- | ----- | ----------------------- |
| `lock:task_opik_evaluate:{date}`    | 5 min | Prevent concurrent runs |
| `success:task_opik_evaluate:{date}` | 24h   | Track completion        |

Note: Task uses `skip_success_check=True` so it can run multiple times per day.

## Files

| File                                              | Purpose              |
| ------------------------------------------------- | -------------------- |
| `app/services/tasks/task_opik_evaluate.py`        | Task implementation  |
| `app/processors/workflows/workflow_experiment.py` | Experiment execution |
| `app/services/scheduler/__init__.py`              | Cron registration    |

## See Also

- [Experiment Workflow](../../opik/EXPERIMENT_WORKFLOW.md)
- [Task Boilerplate](../TASK_BOILERPLATE.md)
- [Scheduler README](../README.md)
