---
slug: forseti-prompt-architecture
title: "Forseti461 Feature Architecture: Modular Prompts with Opik Versioning"
authors: [jnxmas]
tags: [encode, ai-ml, civictech, observability, opik, architecture]
---

Today we completed a major architectural milestone: **modular prompt management** for Forseti461. Each feature now has its own versioned prompt in Opik, enabling independent optimization and A/B testing.

:::tip
From a single monolithic prompt to a clean separation of concerns — each Forseti feature can now evolve independently while sharing a common persona.
:::

<!-- truncate -->

## The Challenge

Our previous setup had prompts scattered across multiple files:
- `app/agents/forseti/prompts.py` — Python templates
- `app/processors/workflows/workflow_autocontribution.py` — Duplicate prompts
- Manual prompts in Opik (with a typo: `foreseti461`)

This made it hard to:
- Track which prompt version was deployed
- Run A/B tests on specific features
- Optimize one feature without affecting others
- Share prompts with N8N workflows (via Vaettir MCP)

## The Solution: Feature-Based Prompt Architecture

We reorganized Forseti into **4 distinct features**, each with its own prompt:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FORSETI 461 PROMPT ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SHARED SYSTEM PROMPT (Persona)                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  forseti461-system-persona                                      │ │
│  │  "You are Forseti, a vigilant assistant..."                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│  │ CHARTER          │ │ CATEGORY         │ │ WORDING          │    │
│  │ VALIDATION       │ │ CLASSIFICATION   │ │ CORRECTION       │    │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────┤    │
│  │ forseti461-user- │ │ forseti461-user- │ │ forseti461-user- │    │
│  │ charter-validation│ │ category-        │ │ wording-         │    │
│  │                  │ │ classification   │ │ correction       │    │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## What We Built Today

### 1. Centralized Prompt Registry

All prompts now live in `app/prompts/` with a unified registry:

```python
from app.prompts import get_registry

registry = get_registry()

# Get formatted messages for LLM chat API
messages = registry.get_messages(
    "forseti.charter_validation",
    title="Ma proposition",
    body="Je propose d'améliorer..."
)
```

The registry supports:
- **JSON chat format** (Opik-compatible with Mustache `{{input.var}}` syntax)
- **Python text format** (legacy fallback with `{var}` syntax)
- **Automatic fallback chain**: Local JSON → Local Python → Opik remote

### 2. Consistent Opik Naming Convention

We standardized all prompt names following **Option B** (descriptive without dates):

| Local Name | Opik Name | Commit |
|------------|-----------|--------|
| `forseti.persona` | `forseti461-system-persona` | `f73d1f4a` |
| `forseti.charter_validation` | `forseti461-user-charter-validation` | `4b187053` |
| `forseti.category_classification` | `forseti461-user-category-classification` | `efd48155` |
| `forseti.wording_correction` | `forseti461-user-wording-correction` | `f2bbedd1` |
| `forseti.batch_validation` | `forseti461-user-batch-validation` | `0e097ebb` |

Naming pattern: `forseti461-{role}-{feature}`

### 3. Feature Documentation

Created comprehensive `FORSETI_AGENT.md` with a **7-step procedure** to add new features:

1. Define prompt in `app/prompts/local/forseti.py`
2. Create result model in `app/agents/forseti/models.py`
3. Implement feature class in `app/agents/forseti/features/`
4. Register in `features/__init__.py` and `agent.py`
5. Add to `forseti_charter.json` for Opik sync
6. Write tests
7. Optimize with Opik (optional)

### 4. Batch Validation as Experiments

We decided **not** to make batch validation a feature class. Instead, it's handled as **Opik experiments** — allowing us to:
- Track metrics across validation runs
- Compare performance over time
- A/B test different prompt versions on the same dataset

## File Structure

```
app/prompts/
├── __init__.py              # Exports: get_registry, CATEGORIES
├── registry.py              # PromptRegistry with chat format support
├── constants.py             # CATEGORIES, CATEGORY_DESCRIPTIONS
├── opik_sync.py             # CLI: python -m app.prompts.opik_sync
├── optimizer.py             # Prompt optimization with opik-optimizer
└── local/
    ├── forseti_charter.json # Opik-synced prompts (chat format)
    ├── forseti.py           # Python prompts (fallback)
    └── autocontrib.py       # Auto-contribution prompts
```

## Syncing Prompts to Opik

One command syncs all Forseti prompts:

```bash
python -m app.prompts.opik_sync --prefix forseti.

# Output:
# ✅ forseti.persona (commit: f73d1f4a)
# ✅ forseti.charter_validation (commit: 4b187053)
# ✅ forseti.category_classification (commit: efd48155)
# ✅ forseti.wording_correction (commit: f2bbedd1)
# ✅ forseti.batch_validation (commit: 0e097ebb)
```

## Why This Matters

### Independent Optimization

Now we can optimize each feature separately:

```python
from app.prompts import optimize_forseti_charter

# Optimize just category classification
result = optimize_forseti_charter(
    dataset_name="forseti-category-training",
    optimizer_type="meta_prompt",
)
```

### Version Tracking

Every prompt change is tracked in Opik with a commit hash. We can:
- Roll back to previous versions
- Compare performance across versions
- Link experiments to specific prompt commits

### Vaettir MCP Integration (Future)

With prompts centralized, we're ready for Phase 3:
- Share prompts between Python app and N8N workflows
- Access via MCP tools: `get_prompt("forseti.charter_validation")`
- Single source of truth across all integrations

## What's Next

**Phase 4**: Update `ForsetiAgent` to use `registry.get_messages()` for all LLM calls, enabling:
- Automatic prompt versioning in traces
- Chat format for better model performance
- Seamless fallback if Opik is unavailable

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Prompt locations | 3+ files | 1 registry |
| Opik prompts synced | 2 (with typo) | 5 (correct naming) |
| Feature documentation | None | 7-step procedure |
| Tests | 17 passing | 17 passing |

**Branch:** `experiment/heavy_dowel_6216`

**Key files:**
- `app/prompts/local/forseti_charter.json` — Chat format prompts
- `app/prompts/registry.py` — Unified prompt access
- `docs/docs/app/FORSETI_AGENT.md` — Feature documentation
- `docs/docs/app/core/prompts.md` — Architecture overview

---

_Modular prompts, independent optimization, clean architecture._
