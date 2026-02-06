# Opik Integration

Opik (by Comet ML) provides LLM observability, tracing, and prompt optimization for OCapistaine.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Opik Integration                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Tracing                    Evaluation                          │
│  ├─ LLM calls               ├─ Hallucination detection          │
│  ├─ Token usage             ├─ Output format scoring            │
│  ├─ Latency                 └─ Confidence calibration           │
│  └─ Error tracking                                              │
│                                                                 │
│  Datasets                   Optimization                        │
│  ├─ Training data           ├─ Prompt refinement                │
│  ├─ Test cases              └─ A/B testing                      │
│  └─ Evaluation sets                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Documentation

| Document | Description |
|----------|-------------|
| [Continuous Improvement](./CONTINUOUS_IMPROVEMENT.md) | Daily practices for keeping AI grounded |
| [Experiment Workflow](./EXPERIMENT_WORKFLOW.md) | Running evaluations and building datasets |

## Quick Start

### View Traces

```python
from app.agents.tracing import get_tracer

tracer = get_tracer()
# Traces automatically logged to Opik dashboard
```

### Run Evaluation

```bash
# Via scheduler
python -c "from app.services.scheduler import run_task_now; print(run_task_now('task_opik_evaluate'))"
```

### Sync Prompts

```bash
# Sync all forseti prompts to Opik
python -m app.prompts.opik_sync --prefix forseti.
```

## Related Tasks

- [task_opik_evaluate](../scheduler/tasks/TASK_OPIK_EVALUATE.md) - Automated evaluation
- [task_prompt_sync](../scheduler/tasks/TASK_PROMPT_SYNC.md) - Prompt synchronization
- [task_audierne_docs](../scheduler/tasks/TASK_AUDIERNE_DOCS.md) - Dataset generation

## Configuration

Environment variables:

```bash
OPIK_API_KEY=your-api-key
OPIK_PROJECT_NAME=ocapistaine-test
OPIK_WORKSPACE=your-workspace
```

Config file: `~/.opik.config`
