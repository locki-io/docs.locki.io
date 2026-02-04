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
    experiment_name="charter-eval-20260204",
    dataset_name="charter-opt-20260204",
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

To add a new optimizable feature:
1. Ensure the feature logs `Correctness` feedback via `tracer.log_span_feedback()`
2. Add `added_to_dataset: False` metadata to the span
3. Register in `AGENT_FEATURE_REGISTRY`

## Evaluation Flow

```
1. Load dataset from Opik
        ↓
2. For each dataset item:
   a. Run evaluation_task (Forseti with task_provider LLM)
   b. Get output: {input, output, context, is_valid, confidence}
        ↓
3. Opik evaluate() with scoring_metrics (judge_provider LLM)
   - Hallucination metric
   - Moderation metric
   - Custom metrics
        ↓
4. Results logged to Opik platform
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

## Files

| File | Purpose |
|------|---------|
| `app/processors/workflows/workflow_dataset.py` | Dataset creation |
| `app/processors/workflows/workflow_experiment.py` | Experiment execution |
| `app/services/opik_config.py` | Judge LLM config (Redis db=5) |
| `app/services/tasks/__init__.py` | AGENT_FEATURE_REGISTRY |

## References

- [Opik Evaluation Metrics](https://www.comet.com/docs/opik/evaluation/metrics/overview)
- [Opik Custom Metrics](https://www.comet.com/docs/opik/evaluation/metrics/custom_metric)
- [Opik Datasets](https://www.comet.com/docs/opik/evaluation/manage_datasets)
