# Continuous Improvement of AI Agent Features

A methodology for systematically improving LLM-powered agent features through automated evaluation, cleanup, and optimization loops.

## Overview

AI agents like Forseti require continuous monitoring and improvement. Raw LLM outputs can drift, accumulate errors, and diverge from expected formats. This document describes OCapistaine's approach to **continuous improvement** through:

1. **Observability** - Trace all agent operations
2. **Cleanup** - Remove error traces before optimization
3. **Evaluation** - Measure output quality with custom metrics
4. **Iteration** - Scheduled tasks for ongoing improvement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONTINUOUS IMPROVEMENT LOOP                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────────┐  │
│    │  TRACE   │────▶│  CLEAN   │────▶│ EVALUATE │────▶│ OPTIMIZE PROMPT  │  │
│    │  (Opik)  │     │ (Errors) │     │ (Metrics)│     │ (Iterate)        │  │
│    └──────────┘     └──────────┘     └──────────┘     └────────┬─────────┘  │
│         ▲                                                      │            │
│         └──────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## The Problem

LLM-powered features face several challenges:

| Challenge | Impact | Solution |
|-----------|--------|----------|
| **Error accumulation** | Bad traces pollute datasets | Pre-experiment cleanup |
| **Format drift** | Outputs diverge from schema | Output format metric |
| **Confidence variance** | Inconsistent quality | Confidence threshold metric |
| **Provider differences** | Results vary by LLM | Provider/model tracking |
| **Async ingestion** | Spans delayed ~3 minutes | Scheduled evaluation task |

## Methodology

### Step 1: Trace Everything

Every agent feature should create Opik spans with:

```python
# In agent feature
with tracer.span("charter_validation", input=input_data) as span:
    result = await self._validate(...)
    span.update(
        output=result.model_dump(),
        metadata={
            "confidence": result.confidence,
            "is_valid": result.is_valid,
            "provider": self._provider.name,    # Track LLM
            "model": self._provider.model,       # Track model
            "added_to_dataset": False,
        },
    )
```

**Key metadata fields:**
- `provider` / `model` - Which LLM produced this output
- `confidence` - Agent's self-assessed confidence
- `added_to_dataset` - Prevent duplicate processing

### Step 2: Define the Ideal Output

Document the expected output format for each feature:

```python
# Ideal charter validation output
IDEAL_CHARTER_OUTPUT = {
    "is_valid": True,
    "violations": [],
    "encouraged_aspects": [
        "Concrete and argued proposals",
        "Constructive criticism",
        "Questions and requests for clarification",
    ],
    "reasoning": "Clear explanation of validation decision...",
    "confidence": 0.95,
}
```

This becomes the **target** for the output format metric.

### Step 3: Cleanup Before Optimization

Error traces pollute optimization. Remove them first:

```python
from app.processors.workflows.workflow_experiment import cleanup_error_traces

# Before any experiment
result = cleanup_error_traces()
print(f"Deleted {result['deleted']} error traces")
```

**Error patterns detected:**
- `"Validation error: Gemini retries exhausted"`
- `"rate limit"`, `"timeout"`, `"failed"`

### Step 4: Evaluate with Custom Metrics

Use metrics that measure alignment with the ideal format:

| Metric | What it measures | Score range |
|--------|------------------|-------------|
| `output_format` | Schema compliance | 0.0 - 1.0 |
| `confidence` | Confidence level | 0.0 - 1.0 |
| `charter_compliance` | is_valid accuracy | 0.0 or 1.0 |
| `hallucination` | False information | 0.0 - 1.0 |

**Output Format Scoring:**
```
+0.2 per required field with correct type (5 fields max)
-0.5 if reasoning contains error messages
-0.2 if reasoning is empty
-0.1 if confidence out of range
-0.1 if valid but no encouraged_aspects
```

### Step 5: Automate with Scheduled Tasks

Run evaluation periodically to catch issues early:

```python
# Cron: Every 30 minutes, 7 AM - 10 PM
OPIK_EVALUATE_CRON = "*/30 7-22 * * *"
```

The `task_opik_evaluate` task:
1. Cleans error traces
2. Finds new spans not yet evaluated
3. Creates dataset from spans
4. Runs Opik evaluate()
5. Reports results

### Step 6: Iterate on Prompts

Use evaluation results to improve prompts:

```
Low output_format score (< 0.7)
    → Review prompt structure
    → Add format examples to prompt
    → Specify required fields explicitly

Low confidence scores
    → Simplify task complexity
    → Provide more context
    → Consider model upgrade

High hallucination rate
    → Add grounding instructions
    → Include source citations
    → Reduce temperature
```

## Implementation

### Register Feature for Optimization

Add to `AGENT_FEATURE_REGISTRY`:

```python
AGENT_FEATURE_REGISTRY = {
    "charter_optimization": {
        "agent": "forseti",
        "feature": "charter_validation",  # Span name
        "prompt_key": "forseti.charter_validation",
        "dataset_prefix": "charter-optimization",
        "description": "Charter validation accuracy",
    },
}
```

### Run Experiment

```python
from app.processors.workflows import OpikExperimentConfig, run_opik_experiment

config = OpikExperimentConfig(
    experiment_name="charter-improvement-20260204",
    dataset_name="charter-optimization-20260204",
    experiment_type="charter_optimization",
    metrics=["hallucination", "output_format", "confidence"],
    task_provider="gemini",
    cleanup_errors=True,  # Clean before experiment
)

results = run_opik_experiment(config)
print(f"Average output_format: {results['eval_results']['average_scores']}")
```

### View Results in Opik

Results are logged to Opik platform with:
- Per-item scores
- Aggregate statistics
- Experiment configuration (provider, model, metrics)

## Metrics Deep Dive

### Output Format Metric

Measures structural compliance with ideal output:

```python
from app.processors.workflows.workflow_experiment import create_output_format_metric

metric = create_output_format_metric()

# Test with sample output
result = metric.score(
    expected_output={
        "is_valid": True,
        "violations": [],
        "encouraged_aspects": ["Good proposals"],
        "reasoning": "Valid contribution with concrete ideas",
        "confidence": 0.9,
    }
)
print(f"Score: {result.value}")  # 1.0 for ideal format
```

### Interpreting Scores

| Score | Interpretation | Action |
|-------|----------------|--------|
| 0.9 - 1.0 | Excellent | Maintain current prompt |
| 0.7 - 0.9 | Good | Minor refinements |
| 0.5 - 0.7 | Needs work | Review prompt structure |
| < 0.5 | Poor | Major prompt revision needed |

## Workflow Integration

### Admin Dashboard

The Admin tab provides:
- Manual experiment triggers
- Metric selection
- Provider configuration
- Result visualization

### Scheduled Automation

```
┌─────────────────────────────────────────────────────────────┐
│                    Daily Schedule                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  06:00  task_contributions_analysis (GitHub/Mockup)          │
│         └─▶ Creates new spans with Correctness feedback      │
│                                                              │
│  07:00  task_opik_evaluate (every 30 min until 22:00)        │
│    │    └─▶ Cleanup → Dataset → Evaluate → Report            │
│    │                                                         │
│  07:30  task_opik_evaluate                                   │
│    │                                                         │
│  ...    (repeats every 30 minutes)                           │
│                                                              │
│  22:00  Last task_opik_evaluate                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

### 1. Start with Observability

Before optimizing, ensure you have:
- Spans for all agent features
- Provider/model metadata
- Confidence scores
- Correctness feedback

### 2. Define Success Criteria

Set target metrics before optimization:
- `output_format >= 0.85`
- `confidence >= 0.8`
- `hallucination <= 0.1`

### 3. Clean Before Measuring

Always run cleanup before experiments:
```python
cleanup_error_traces()  # Remove noise first
```

### 4. Track Provider Performance

Compare metrics across providers:
```python
# Group results by provider in Opik dashboard
experiment_config = {
    "task_provider": "gemini",
    "task_model": "gemini-2.5-flash",
}
```

### 5. Iterate Incrementally

Make one change at a time:
1. Run baseline experiment
2. Modify prompt
3. Run comparison experiment
4. Measure improvement

## Files Reference

| File | Purpose |
|------|---------|
| `app/processors/workflows/workflow_experiment.py` | Cleanup, metrics, experiments |
| `app/services/tasks/task_opik_evaluate.py` | Scheduled evaluation |
| `app/services/tasks/__init__.py` | Feature registry |
| `app/agents/forseti/agent.py` | Agent with tracing |

## See Also

- [Experiment Workflow](./EXPERIMENT_WORKFLOW.md) - Technical details
- [Task: Opik Evaluate](../scheduler/tasks/TASK_OPIK_EVALUATE.md) - Scheduled task
- [Forseti Agent](../FORSETI_AGENT.md) - Agent implementation
- [Prompt Management](../PROMPT_MANAGEMENT.md) - Prompt optimization

---

*This methodology enables systematic improvement of AI agent features through automated evaluation loops, ensuring quality and consistency over time.*
