# Experiment Workflow

This document describes the prompt optimization experiment workflow using Opik's native evaluation API.

## Overview

The experiment workflow enables systematic evaluation and optimization of LLM prompts used by OCapistaine agents. It leverages Opik's built-in LLM judge metrics to assess prompt quality.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Experiment Workflow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Dataset   │───▶│  Evaluation │───▶│   Opik Platform     │ │
│  │   (Opik)    │    │    Task     │    │   (Results)         │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│                            │                                    │
│                     ┌──────┴──────┐                            │
│                     ▼             ▼                            │
│              ┌──────────┐  ┌──────────────┐                    │
│              │ Task LLM │  │ Judge LLM    │                    │
│              │ (Sidebar)│  │ (OpenAI)     │                    │
│              └──────────┘  └──────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Two LLMs

The experiment uses two separate LLMs for different purposes:

| LLM | Purpose | Configuration |
|-----|---------|---------------|
| **Task LLM** | Runs the actual Forseti agent (validation/classification) | Sidebar selection (Gemini, Claude, Mistral, Ollama) |
| **Judge LLM** | Runs Opik's evaluation metrics (Hallucination, Moderation) | Admin dashboard (default: OpenAI gpt-4o-mini) |

### Task LLM (Sidebar)

The task LLM is the same provider selected in the sidebar. It executes:
- Charter validation (`charter_validation` span)
- Category classification (`category_classification` span)
- Other agent features

### Judge LLM (Opik)

The judge LLM runs Opik's built-in metrics. Configuration stored in Redis db=5:

```python
# Default configuration
{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "api_key_env": "OPENAI_API_KEY"
}
```

Configure via Admin dashboard: **Opik Judge LLM** section.

## Available Metrics

### Opik Built-in Metrics (LLM Judges)

| Metric | Description |
|--------|-------------|
| `hallucination` | Detects generated false information |
| `moderation` | Checks adherence to content standards |
| `answer_relevance` | Evaluates how well the answer fits the question |
| `context_recall` | Measures retrieval of relevant context (RAG) |
| `context_precision` | Measures precision of retrieved context (RAG) |

### Custom Metrics

| Metric | Description |
|--------|-------------|
| `charter_compliance` | Checks if is_valid matches expected output |
| `confidence` | Checks if confidence meets threshold |
| `output_format` | Measures output format compliance (0-1 scale) |

### Output Format Metric

The `output_format` metric evaluates how well LLM output matches the ideal charter validation format:

**Ideal Format:**
```json
{
  "is_valid": true,
  "violations": [],
  "encouraged_aspects": [
    "Concrete and argued proposals",
    "Constructive criticism",
    "Questions and requests for clarification"
  ],
  "reasoning": "Clear explanation of why the contribution is valid...",
  "confidence": 0.95
}
```

**Scoring (0.0 to 1.0):**
- **+0.2** per required field with correct type (5 fields = 1.0 max)
- **-0.5** if reasoning contains error messages
- **-0.2** if reasoning is empty
- **-0.1** if confidence out of [0, 1] range
- **-0.1** if valid but no `encouraged_aspects`

**Example Scores:**
| Output Type | Score | Reason |
|-------------|-------|--------|
| Ideal format | 1.00 | All fields correct |
| Error in reasoning | 0.50 | Contains "Validation error" |
| Missing fields | 0.10-0.40 | Partial structure |

## Workflow Components

### 1. workflow_dataset.py

Creates Opik datasets from various sources:

```python
from app.processors.workflows import create_dataset_from_spans

result = create_dataset_from_spans(
    experiment_type="charter_optimization",
    dataset_name="charter-opt-20260204",
    max_correctness=0.7,  # Spans with Correctness < 0.7
    max_items=50,
    task_provider="gemini",  # Track which LLM was used
)
```

**Sources:**
- Opik spans (filtered by Correctness feedback score)
- MockupStorage records (filtered by confidence)

### 2. workflow_experiment.py

Runs experiments using Opik's native `evaluate()` API:

```python
from app.processors.workflows import OpikExperimentConfig, run_opik_experiment

config = OpikExperimentConfig(
    experiment_name="charter_validation-eval-20260204-143022",
    dataset_name="charter-optimization-20260204-143022",
    experiment_type="charter_optimization",
    task_provider="gemini",  # Sidebar LLM for Forseti
    metrics=["hallucination", "moderation"],
)

results = run_opik_experiment(config)
```

## Dataset Item Format

```json
{
  "id": "unique-id",
  "input": {
    "title": "Contribution title...",
    "body": "Contribution body...",
    "category": "economie",
    "original_confidence": 0.8,
    "original_is_valid": true,
    "record_id": "span_019c27cb..."
  },
  "expected_output": {
    "is_valid": true,
    "confidence_threshold": 1.0
  },
  "tags": [],
  "created_at": "2026-02-04T08:34:58Z"
}
```

## Agent Feature Registry

Experiment types are defined in `AGENT_FEATURE_REGISTRY`:

```python
AGENT_FEATURE_REGISTRY = {
    "charter_optimization": {
        "agent": "forseti",
        "feature": "charter_validation",  # Span name
        "prompt_key": "forseti.charter_validation",
        "dataset_prefix": "charter-optimization",
    },
    "category_optimization": {
        "agent": "forseti",
        "feature": "category_classification",
        "prompt_key": "forseti.category_classification",
        "dataset_prefix": "category-optimization",
    },
}
```

**Naming conventions:**

| Entity | Pattern | Example |
|--------|---------|---------|
| Dataset | `{dataset_prefix}-{YYYYMMDD}-{HHMMSS}` | `charter-optimization-20260209-154003` |
| Experiment | `{feature}-eval-{YYYYMMDD}-{HHMMSS}` | `charter_validation-eval-20260209-154003` |

The experiment name uses the **feature name** (span name) so experiments are directly identifiable by what they evaluate.

To add a new optimizable feature:
1. Ensure the feature logs `Correctness` feedback via `tracer.log_span_feedback()`
2. Add `added_to_dataset: False` metadata to the span
3. Register in `AGENT_FEATURE_REGISTRY`

## Pre-experiment Cleanup

Before running experiments, error traces can pollute optimization and diverge results. The workflow includes an optional cleanup step.

### Error Patterns Detected

- `"error"` - Generic errors
- `"retries exhausted"` - API retry failures
- `"rate limit"` - Rate limiting errors
- `"validation error"` - LLM validation failures
- `"timeout"` - Request timeouts
- `"failed"` - Generic failures

### Using Cleanup

```python
from app.processors.workflows.workflow_experiment import cleanup_error_traces

# Dry run (preview only)
result = cleanup_error_traces(dry_run=True)
print(f"Would delete {result['error_traces']} traces")

# Actual cleanup
result = cleanup_error_traces()
print(f"Deleted {result['deleted']} error traces")
```

### Cleanup in Experiments

Cleanup is enabled by default in `OpikExperimentConfig`:

```python
config = OpikExperimentConfig(
    experiment_name="...",
    dataset_name="...",
    experiment_type="charter_optimization",
    cleanup_errors=True,  # Default: True
)
```

## Evaluation Flow

```
1. (Optional) Cleanup error traces
        ↓
2. Load dataset from Opik
        ↓
3. For each dataset item:
   a. Run evaluation_task (Forseti with task_provider LLM)
   b. Get output: {input, output, context, is_valid, confidence}
        ↓
4. Opik evaluate() with scoring_metrics (judge_provider LLM)
   - Hallucination metric
   - Moderation metric
   - output_format metric (custom)
   - Other custom metrics
        ↓
5. Results logged to Opik platform
   - Per-item scores
   - Aggregate statistics
```

## Admin Dashboard Integration

The Admin tab includes:

1. **Opik Judge LLM Configuration**
   - Provider selection (OpenAI, Anthropic)
   - Model selection (gpt-4o-mini, gpt-4o, claude-3-haiku)
   - API key status indicator

2. **Experiment Type Selection**
   - Dynamic from AGENT_FEATURE_REGISTRY
   - Shows agent and feature info

3. **Opik Span Statistics**
   - Total spans by type
   - Spans with Correctness below threshold
   - Already added to dataset count

## Scheduled Task

The `task_opik_evaluate` runs periodically to handle async span ingestion:

```python
# Cron: Every 30 minutes, 7 AM - 10 PM
OPIK_EVALUATE_CRON = "*/30 7-22 * * *"
```

**Workflow:**
1. Cleanup error traces (optional)
2. Search for recent spans not yet in dataset
3. Create dataset from new spans
4. Run Opik evaluate()
5. Mark spans as processed

See [Task: Opik Evaluate](../scheduler/tasks/TASK_OPIK_EVALUATE.md) for details.

## Files

| File | Purpose |
|------|---------|
| `app/processors/workflows/workflow_dataset.py` | Dataset creation |
| `app/processors/workflows/workflow_experiment.py` | Experiment execution, cleanup, custom metrics |
| `app/services/opik_config.py` | Judge LLM config (Redis db=5) |
| `app/services/tasks/__init__.py` | AGENT_FEATURE_REGISTRY |
| `app/services/tasks/task_opik_evaluate.py` | Scheduled evaluation task |

## References

- [Opik Evaluation Metrics](https://www.comet.com/docs/opik/evaluation/metrics/overview)
- [Opik Custom Metrics](https://www.comet.com/docs/opik/evaluation/metrics/custom_metric)
- [Opik Datasets](https://www.comet.com/docs/opik/evaluation/manage_datasets)
