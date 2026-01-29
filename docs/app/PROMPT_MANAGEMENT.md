# Prompt Management Architecture

## Overview

This document outlines the unified prompt management strategy for OCapistaine, integrating:
- **Opik** for versioning, optimization, and experiments
- **Vaettir MCP** for centralized prompt storage and retrieval (future)
- **Local JSON/Python prompts** as fallback during development

## Current State ✅

Prompts are now centralized in `app/prompts/` with:
- Single source of truth for categories and descriptions
- JSON format for chat-based prompts (synced from Opik)
- Python format for text-based prompts (legacy)
- Registry with Opik fallback chain

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PROMPT MANAGEMENT LAYERS                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 1: PROMPT REGISTRY (app/prompts/)                        ✅ COMPLETE  │    │
│  │  ────────────────────────────────────────────────────────────────────────────│    │
│  │  • PromptRegistry class         Central prompt access                        │    │
│  │  • get_prompt(name, version)    Retrieve by name + optional version          │    │
│  │  • get_messages(name, **vars)   Get chat-format messages                     │    │
│  │  • format_prompt(name, **vars)  Format with Mustache/Python variables        │    │
│  │  • list_prompts()               Enumerate available prompts                  │    │
│  │                                                                               │    │
│  │  Sources (priority order):                                                    │    │
│  │  1. Local JSON (chat format)  → Synced from Opik                            │    │
│  │  2. Local Python (text)       → Legacy fallback                             │    │
│  │  3. Opik Prompt Library       → Remote versioned (when configured)          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                              │
│                                       ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 2: OPIK INTEGRATION                                      ✅ COMPLETE  │    │
│  │  ────────────────────────────────────────────────────────────────────────────│    │
│  │  • opik_sync.py               Sync local ↔ Opik library                     │    │
│  │  • optimizer.py               Prompt optimization with opik-optimizer        │    │
│  │  • Charter accuracy metric    Custom scoring for validation                  │    │
│  │  • Experiment support         Track prompt versions in experiments           │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                              │
│                                       ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 3: VAETTIR MCP                                           🔜 PLANNED   │    │
│  │  ────────────────────────────────────────────────────────────────────────────│    │
│  │  • MCP Tool: get_prompt         Fetch prompt from Vaettir realm              │    │
│  │  • MCP Tool: list_prompts       List available prompts                       │    │
│  │  • Multi-agent sharing          Same prompts across N8N + Python             │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Prompt Inventory

### Forseti Agent Prompts (JSON - Chat Format)

All Forseti feature prompts are now in JSON chat format for Opik compatibility:

| Local Name | Opik Name | Commit | Type | Variables |
|------------|-----------|--------|------|-----------|
| `forseti.persona` | `forseti461-system-persona` | `f73d1f4a` | system | None |
| `forseti.charter_validation` | `forseti461-user-charter-validation` | `4b187053` | user | `{{input.title}}`, `{{input.body}}` |
| `forseti.category_classification` | `forseti461-user-category-classification` | `efd48155` | user | `{{input.title}}`, `{{input.body}}`, `{{input.current_category}}` |
| `forseti.wording_correction` | `forseti461-user-wording-correction` | `f2bbedd1` | user | `{{input.title}}`, `{{input.body}}` |

### Forseti Batch Validation (Experiments)

Batch validation is handled as **Opik experiments**, not as a feature prompt:

| Prompt Name | Type | Variables | Notes |
|-------------|------|-----------|-------|
| `forseti.batch_validation` | user | `{items_json}` | Python format, for experiment runs |

See [FORSETI_AGENT.md](./FORSETI_AGENT.md) for experiment setup and feature documentation.

### Auto-Contribution Prompts (Python - Text Format)

| Prompt Name | Type | Variables |
|-------------|------|-----------|
| `autocontrib.draft_fr` | user | `{source_text}`, `{category}`, `{category_desc}`, `{source_title_section}` |
| `autocontrib.draft_en` | user | `{source_text}`, `{category}`, `{category_desc}`, `{source_title_section}` |

### Shared Constants

| Constant | Location | Description |
|----------|----------|-------------|
| `CATEGORIES` | `app/prompts/constants.py` | 7 charter categories (single source) |
| `CATEGORY_DESCRIPTIONS` | `app/prompts/constants.py` | FR/EN/prompt descriptions |
| `VIOLATIONS_TEXT` | `app/prompts/constants.py` | Charter violation rules |
| `ENCOURAGED_TEXT` | `app/prompts/constants.py` | Charter values |

## File Structure

```
app/prompts/
├── __init__.py              # Exports: get_registry, sync_all_prompts, optimize_forseti_charter
├── registry.py              # PromptRegistry class with chat format support
├── constants.py             # CATEGORIES, CATEGORY_DESCRIPTIONS (single source)
├── opik_sync.py             # Sync prompts to Opik library (CLI + API)
├── optimizer.py             # Prompt optimization with opik-optimizer
└── local/
    ├── __init__.py          # Aggregates JSON + Python prompts
    ├── json_loader.py       # JSON prompt loader with Mustache support
    ├── forseti_charter.json # Synced from Opik (chat format)
    ├── forseti.py           # Legacy Python prompts (text format)
    └── autocontrib.py       # AutoContrib prompts (FR/EN)
```

## Usage

### Get Prompt Registry

```python
from app.prompts import get_registry

registry = get_registry()

# List all prompts
prompts = registry.list_prompts()
# ['autocontrib.draft_en', 'autocontrib.draft_fr', 'forseti.charter_validation', ...]
```

### Get Chat Messages (JSON Format)

```python
# Get formatted messages for LLM chat API
messages = registry.get_messages(
    "forseti.charter_validation",
    title="My contribution title",
    body="My contribution content",
)
# Returns: [{"role": "user", "content": "Validate a citizen contribution..."}]

# Get system prompt
persona = registry.get_prompt("forseti.persona")
system_message = persona.messages[0]
# {"role": "system", "content": "## Your Identity\nYou are Forseti..."}
```

### Format Text Prompt (Python Format)

```python
# For text-based prompts with {var} format
formatted = registry.format_prompt(
    "autocontrib.draft_fr",
    source_text="...",
    category="economie",
    category_desc="Commerce, tourisme...",
    source_title_section=" - Document Title",
)
```

### Check Prompt Metadata

```python
info = registry.get_prompt("forseti.charter_validation")
print(f"Format: {info.format}")        # "chat"
print(f"Type: {info.type}")            # "user"
print(f"Opik name: {info.opik_name}")  # "foreseti461-user-charter-28012026"
print(f"Version: {info.version}")      # "ae49fab0"
print(f"Variables: {info.variables}")  # ["input.title", "input.body"]
```

## CLI Commands

### List Local Prompts
```bash
python -m app.prompts.opik_sync --list
```

### Sync to Opik
```bash
# Sync all prompts
python -m app.prompts.opik_sync

# Sync only Forseti prompts
python -m app.prompts.opik_sync --prefix forseti.
```

### Compare Local vs Opik
```bash
python -m app.prompts.opik_sync --compare
```

## Optimization

### Run Prompt Optimization
```python
from app.prompts import optimize_forseti_charter

result = optimize_forseti_charter(
    dataset_name="forseti-charter-training",
    optimizer_type="meta_prompt",  # or "few_shot_bayesian", "evolutionary"
    num_iterations=50,
)

print(f"Best score: {result.best_score:.2%}")
print(f"Optimized prompt saved to Opik")
```

### Available Optimizers

| Optimizer | Description |
|-----------|-------------|
| `few_shot_bayesian` | Select best examples for few-shot prompts |
| `meta_prompt` | LLM-generated prompt improvements |
| `evolutionary` | Genetic algorithm for prompt evolution |

## Migration Plan

### Phase 1: Consolidate ✅ Complete
- [x] Identify all prompts (7 templates)
- [x] Extract `CATEGORY_DESCRIPTIONS` to shared location
- [x] Create `app/prompts/` module with local registry
- [x] Update Forseti to use registry
- [x] Update AutoContribution to use registry
- [x] 17 tests passing

### Phase 2: Opik Integration ✅ Complete
- [x] Install `opik-optimizer` package
- [x] Create `opik_sync.py` for syncing prompts
- [x] Create `optimizer.py` for prompt optimization
- [x] Add charter accuracy metric
- [x] Access user's Opik prompts (`forseti461-*`)
- [x] Sync Opik prompts to local JSON format
- [x] Support chat format with Mustache variables
- [x] Add `get_messages()` method for chat API

### Phase 3: Vaettir MCP (Future)
- [ ] Define MCP tools in Vaettir
- [ ] Create prompt sync between Opik ↔ Vaettir
- [ ] Update registry to check MCP first
- [ ] Test with N8N workflows

### Phase 4: Update Forseti Agent (Next)
- [ ] Update `ForsetiAgent` to use `registry.get_messages()`
- [ ] Use chat format for validation calls
- [ ] Add system prompt from `forseti.persona`

## Variable Formats

The registry supports two variable formats:

| Format | Syntax | Used By |
|--------|--------|---------|
| Mustache | `{{input.title}}`, `{{var}}` | JSON prompts (Opik) |
| Python | `{title}`, `{var}` | Python prompts (legacy) |

Both formats are handled transparently by `format_prompt()` and `get_messages()`.

## Related Documentation

- [FORSETI_AGENT.md](./FORSETI_AGENT.md) - Forseti agent features and how to add new features
- [AUTO_CONTRIBUTIONS.md](./AUTO_CONTRIBUTIONS.md) - Auto-contribution workflow using prompts

## External References

- [Opik Prompt Management](https://www.comet.com/docs/opik/prompt_engineering/prompt_management)
- [Opik Agent Optimizer](https://www.comet.com/docs/opik/agent_optimization/overview)
- [opik-optimizer PyPI](https://pypi.org/project/opik-optimizer/)
