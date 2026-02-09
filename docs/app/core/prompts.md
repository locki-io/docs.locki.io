# Prompt Management Architecture

## Overview

This document outlines the unified prompt management strategy for OCapistaine, integrating:

- **Opik** for versioning, optimization, and experiments
- **Vaettir MCP** for centralized prompt storage and retrieval (future)
- **Local JSON/Python prompts** as fallback during development

## Current State

Prompts are now centralized in `app/prompts/` with:

- Single source of truth for categories and descriptions
- JSON format for chat-based prompts (synced from Opik)
- Python format for text-based prompts (legacy)
- Registry with Opik fallback chain

### Prompt Separation

Prompts are separated into:

1. **Persona Prompt** (system message): Defines WHO the agent is
   - Identity, values, response style
   - Shared across all features

2. **Feature Prompts** (user message): Defines WHAT to do
   - Specific task instructions
   - Expected output format
   - Feature-specific context

```python
# Persona (system prompt)
PERSONA_PROMPT = """You are Forseti 461, the impartial guardian..."""

# Feature prompt (user prompt)
CHARTER_VALIDATION_PROMPT = """Validate this contribution...
TITLE: {title}
BODY: {body}
Return JSON: {"is_valid": ..., "violations": [...]}"""
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           PROMPT MANAGEMENT LAYERS                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 1: PROMPT REGISTRY (app/prompts/)                        ✅ COMPLETE │    │
│  │  ───────────────────────────────────────────────────────────────────────────│    │
│  │  • PromptRegistry class         Central prompt access                       │    │
│  │  • get_prompt(name, version)    Retrieve by name + optional version         │    │
│  │  • get_messages(name, **vars)   Get chat-format messages                    │    │
│  │  • format_prompt(name, **vars)  Format with Mustache/Python variables       │    │
│  │  • list_prompts()               Enumerate available prompts                 │    │
│  │                                                                             │    │
│  │  Sources (priority order):                                                  │    │
│  │  1. Local JSON (chat format)  → Synced from Opik                            │    │
│  │  2. Local Python (text)       → Legacy fallback                             │    │
│  │  3. Opik Prompt Library       → Remote versioned (when configured)          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                             │
│                                       ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 2: OPIK INTEGRATION                                      ✅ COMPLETE │    │
│  │  ───────────────────────────────────────────────────────────────────────────│    │
│  │  • opik_sync.py               Sync local ↔ Opik library                     │    │
│  │  • optimizer.py               Prompt optimization with opik-optimizer       │    │
│  │  • Charter accuracy metric    Custom scoring for validation                 │    │
│  │  • Experiment support         Track prompt versions in experiments          │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                       │                                             │
│                                       ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │  LAYER 3: VAETTIR MCP                                           🔜 PLANNED  │    │
│  │  ───────────────────────────────────────────────────────────────────────────│    │
│  │  • MCP Tool: get_prompt         Fetch prompt from Vaettir realm             │    │
│  │  • MCP Tool: list_prompts       List available prompts                      │    │
│  │  • Multi-agent sharing          Same prompts across N8N + Python            │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Bidirectional Sync (Pull from Opik)

Composite prompts optimized in the Opik Playground can be pulled back to update the local JSON source of truth. This closes the optimization loop:

```
Opik Playground (optimize composite)
  │
  ▼ pull_composite_from_opik()
  ├── extract system message → update forseti.persona locally
  └── extract user message → update forseti.category_classification locally
  │
  ▼ sync_all_prompts() + sync_all_composites()
  ├── push updated individuals (text type)
  └── recompose ALL composites with new individuals (chat type)
```

**Key constraint:** Individual prompts are shared across composites. Updating `forseti.persona` from one composite affects all others. The pull function warns when a shared prompt changes.

### Pull CLI Commands

```bash
# Pull a single optimized composite
python -m app.prompts.opik_sync --pull forseti-persona-category

# Pull all composites (dry run — show what would change)
python -m app.prompts.opik_sync --pull-all --dry-run

# Pull + show experiment performance data
python -m app.prompts.opik_sync --pull forseti-persona-category --performance

# Full round-trip: pull optimized → update locals → push all
python -m app.prompts.opik_sync --pull-all && python -m app.prompts.opik_sync --all
```

### What Pull Does

1. Fetches the composite prompt from Opik via `get_chat_prompt(name)`
2. Looks up component names from `COMPOSITE_PROMPTS` (system + user)
3. Extracts `messages[0].content` (system) and `messages[1].content` (user)
4. Compares with current local content in `forseti_charter.json`
5. If changed: updates JSON content + `opik_commit` field
6. If system prompt changed: logs a warning listing all affected composites

### Automated Bidirectional Sync

The daily `task_prompt_sync` scheduler task now runs **pull before push** (Step 0):

1. Pull optimized composites from Opik (update local JSON)
2. Push individual prompts (text type)
3. Push composite prompts (chat type)

This ensures that optimizations made in Opik Playground are automatically propagated.

## Experiment Performance Tracking

Performance data from Opik experiments can be fetched per composite prompt:

```bash
# Show performance for all composites
python -m app.prompts.opik_sync --performance

# Show performance for a specific composite
python -m app.prompts.opik_sync --pull forseti-persona-charter --performance
```

**Example output:**

```
Performance Data:
--------------------------------------------------
  forseti-persona-charter:
    Experiment: charter_validation-eval-20260209-154003
    Provider: gemini
    Model: gemini-2.5-flash
    Evaluated: 2026-02-09 14:40:04
    Traces: 50
    Scores:
      output_format: 0.994
      hallucination_metric: 0.436
```

### How It Works

The `get_composite_performance()` function uses two strategies to find experiments:

1. **Prompt ID lookup**: Fetches the prompt from Opik, uses its internal ID to query `find_experiments(prompt_id=...)` for experiments directly linked to that prompt
2. **Registry fallback**: Maps the composite's user prompt to `AGENT_FEATURE_REGISTRY` to find the `experiment_type`, then searches experiments by that name pattern (e.g., `charter_optimization`)

Experiments are named `{feature}-eval-{YYYYMMDD}-{HHMMSS}` (e.g., `charter_validation-eval-20260209-154003`) and created by the `task_opik_evaluate` scheduler task every 30 minutes.

### Performance Metadata in JSON

When pulling with performance data, the JSON file can store a `performance` field:

```json
{
  "forseti.category_classification": {
    "opik_commit": "71eedbe0",
    "performance": {
      "last_evaluated": "2026-02-09T14:30:00",
      "scores": {"hallucination": 0.92, "output_format": 0.88},
      "provider": "gemini",
      "experiment": "charter-eval-20260209"
    }
  }
}
```

## How to Add a New Prompt

### Step 1: Define the Prompt

1. **Create the prompt template** in `app/prompts/local/forseti.py`:

```python
MY_FEATURE_PROMPT = """You are performing [task description].

[Context and instructions]

Analyze the following contribution:

TITLE: {title}
BODY: {body}

Return a JSON object with:
- "field1": description
- "field2": description

Return JSON only, no markdown fences."""
```

2. **Add to PROMPTS dict**:

```python
PROMPTS = {
    # ... existing prompts ...
    "forseti.my_feature": {
        "template": MY_FEATURE_PROMPT,
        "type": "user",
        "variables": ["title", "body"],
        "description": "Description of what this feature does",
    },
}
```

### Step 2: Create the Result Model

Add to `app/agents/forseti/models.py`:

```python
class MyFeatureResult(BaseModel):
    """Result from my feature."""
    field1: str
    field2: list[str]
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)
```

### Step 3: Sync to Opik

```bash
python -m app.prompts.opik_sync --prefix forseti.
```

## Prompt Inventory

### Forseti Agent Prompts (JSON - Chat Format)

All Forseti feature prompts are now in JSON chat format for Opik compatibility:

| Local Name                        | Opik Name                                 | Commit     | Type   | Variables                                                 |
| --------------------------------- | ----------------------------------------- | ---------- | ------ | --------------------------------------------------------- |
| `forseti.persona`                 | `forseti461-system-persona`               | `f73d1f4a` | system | None                                                      |
| `forseti.charter_validation`      | `forseti461-user-charter-validation`      | `4b187053` | user   | `{{input.title}}`, `{{input.body}}`                       |
| `forseti.category_classification` | `forseti461-user-category-classification` | `efd48155` | user   | `{{input.title}}`, `{{input.body}}`, `{{input.category}}` |
| `forseti.wording_correction`      | `forseti461-user-wording-correction`      | `f2bbedd1` | user   | `{{input.title}}`, `{{input.body}}`                       |

### Forseti Python-Only Prompts (Text Format)

| Prompt Name                | Type | Variables      | Notes                              |
| -------------------------- | ---- | -------------- | ---------------------------------- |
| `forseti.batch_validation` | user | `{items_json}` | For experiment runs                |
| `forseti.anonymization`    | user | `{text}`       | PII removal with keyword extraction |

### Composite Prompts (Chat Type - For Playground)

Composite prompts combine **persona (system)** + **task (user)** into a single chat-format prompt for use in the Opik Playground. These are auto-generated from individual prompts and synced using `create_chat_prompt()`.

| Composite Name             | Components                                            | Commit     | Description                               |
| -------------------------- | ----------------------------------------------------- | ---------- | ----------------------------------------- |
| `forseti-persona-charter`  | `forseti.persona` + `forseti.charter_validation`      | `a5da4eaf` | Charter validation with full persona      |
| `forseti-persona-category` | `forseti.persona` + `forseti.category_classification` | `c4c6352a` | Category classification with full persona |
| `forseti-persona-wording`  | `forseti.persona` + `forseti.wording_correction`      | `b1c013b5` | Wording correction with full persona      |

**Why Composite Prompts?**

- **Opik Playground** requires complete conversations (system + user) to test prompts interactively
- **Individual prompts** are maintained separately for modularity and reuse
- **Composites are auto-generated** - when you update `forseti.persona` or a task prompt, re-sync composites to propagate changes

**Composite Structure (OpenAI Chat Format):**

```json
[
  { "role": "system", "content": "## Your Identity\nYou are Forseti..." },
  {
    "role": "user",
    "content": "Validate a citizen contribution...\n\nTITLE: {{input.title}}\nBODY: {{input.body}}"
  }
]
```

**Adding New Composites:**

Edit `COMPOSITE_PROMPTS` in `app/prompts/opik_sync.py`:

```python
COMPOSITE_PROMPTS = {
    "forseti-persona-charter": {
        "system_prompt": "forseti.persona",
        "user_prompt": "forseti.charter_validation",
        "description": "Forseti persona + charter validation (for playground)",
    },
    # Add new composites here
}
```

### Auto-Contribution Prompts (Python - Text Format)

| Prompt Name            | Type | Variables                                                                  |
| ---------------------- | ---- | -------------------------------------------------------------------------- |
| `autocontrib.draft_fr` | user | `{source_text}`, `{category}`, `{category_desc}`, `{source_title_section}` |
| `autocontrib.draft_en` | user | `{source_text}`, `{category}`, `{category_desc}`, `{source_title_section}` |

### Shared Constants

| Constant                | Location                   | Description                          |
| ----------------------- | -------------------------- | ------------------------------------ |
| `CATEGORIES`            | `app/prompts/constants.py` | 7 charter categories (single source) |
| `CATEGORY_DESCRIPTIONS` | `app/prompts/constants.py` | FR/EN/prompt descriptions            |
| `VIOLATIONS_TEXT`       | `app/prompts/constants.py` | Charter violation rules              |
| `ENCOURAGED_TEXT`       | `app/prompts/constants.py` | Charter values                       |

## File Structure

```
app/prompts/
├── __init__.py              # Exports: get_registry, sync_all_prompts, optimize_forseti_charter
├── registry.py              # PromptRegistry class with chat format support
├── constants.py             # CATEGORIES, CATEGORY_DESCRIPTIONS (single source)
├── opik_sync.py             # Sync prompts to Opik library (CLI + API)
│                            # Contains COMPOSITE_PROMPTS config for auto-generation
├── optimizer.py             # Prompt optimization with opik-optimizer
└── local/
    ├── __init__.py          # Aggregates JSON + Python prompts
    ├── json_loader.py       # JSON prompt loader with Mustache support
    ├── forseti_charter.json # Synced from Opik (chat format, individual prompts)
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
print(f"Opik name: {info.opik_name}")  # "forseti461-user-charter-validation"
print(f"Version: {info.version}")      # "4b187053"
print(f"Variables: {info.variables}")  # ["input.title", "input.body"]
```

## CLI Commands

### List Local Prompts

```bash
# List individual and composite prompts
python -m app.prompts.opik_sync --list
```

### Sync Individual Prompts to Opik

```bash
# Sync all individual prompts
python -m app.prompts.opik_sync

# Sync only Forseti prompts
python -m app.prompts.opik_sync --prefix forseti.
```

### Sync Composite Prompts (Chat Type)

```bash
# Sync composite prompts only (persona + task combinations)
python -m app.prompts.opik_sync --composites

# Sync both individual AND composite prompts
python -m app.prompts.opik_sync --all
```

**Recommended workflow after editing prompts locally:**

```bash
# 1. Update individual prompts
python -m app.prompts.opik_sync --prefix forseti.

# 2. Rebuild composites from updated individuals
python -m app.prompts.opik_sync --composites
```

**Recommended workflow after optimizing in Opik Playground:**

```bash
# 1. Pull optimized composites back to local JSON
python -m app.prompts.opik_sync --pull-all

# 2. Push updated individuals + rebuild all composites
python -m app.prompts.opik_sync --all
```

### Pull Optimized Composites from Opik

```bash
# Pull a specific composite (updates local JSON)
python -m app.prompts.opik_sync --pull forseti-persona-category

# Pull all composites
python -m app.prompts.opik_sync --pull-all

# Dry run (show changes without writing)
python -m app.prompts.opik_sync --pull-all --dry-run

# Pull + show experiment performance scores
python -m app.prompts.opik_sync --pull forseti-persona-category --performance
```

### View Experiment Performance

```bash
# Show performance data for all composites
python -m app.prompts.opik_sync --performance
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

| Optimizer           | Description                               |
| ------------------- | ----------------------------------------- |
| `few_shot_bayesian` | Select best examples for few-shot prompts |
| `meta_prompt`       | LLM-generated prompt improvements         |
| `evolutionary`      | Genetic algorithm for prompt evolution    |

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
- [x] Composite prompts (persona + task) for playground
- [x] Auto-sync composites via `--composites` CLI flag
- [x] Use `create_chat_prompt()` for chat-type prompts
- [x] Bidirectional sync: pull optimized composites from Opik (`--pull`)
- [x] Decompose composites into individual prompts on pull
- [x] Shared prompt change warnings (persona affects all composites)
- [x] Experiment performance tracking (`--performance`)
- [x] Automated pull-before-push in daily `task_prompt_sync`

### Phase 3: Update Forseti Agent (Next)

- [ ] Update `ForsetiAgent` to use `registry.get_messages()`
- [ ] Use chat format for validation calls
- [x] Add system prompt from `forseti.persona`

### Phase 4: Vaettir MCP (Future)

- [ ] Define MCP tools in Vaettir
- [ ] Create prompt sync between Opik and Vaettir
- [ ] Update registry to check MCP first
- [ ] Test with N8N workflows

## Prompt Types and Formats

### Opik Prompt Types

Opik distinguishes between two prompt structures that **cannot be changed once created**:

| Type     | API Method             | Structure                          | Use Case                            |
| -------- | ---------------------- | ---------------------------------- | ----------------------------------- |
| **text** | `create_prompt()`      | Single string template             | Individual prompts (system or user) |
| **chat** | `create_chat_prompt()` | Messages array `[{role, content}]` | Composite prompts for playground    |

> **Important:** If you need to change a prompt's type (text to chat or vice versa), you must delete it in Opik first, then re-sync.

### Variable Formats

The registry supports two variable formats:

| Format   | Syntax                       | Used By                 |
| -------- | ---------------------------- | ----------------------- |
| Mustache | `{{input.title}}`, `{{var}}` | JSON prompts (Opik)     |
| Python   | `{title}`, `{var}`           | Python prompts (legacy) |

Both formats are handled transparently by `format_prompt()` and `get_messages()`.

### Field Naming Convention

For consistency across spans, datasets, and prompts, use these field names:

| Field          | Correct          | Deprecated                   |
| -------------- | ---------------- | ---------------------------- |
| Category input | `input.category` | ~~`input.current_category`~~ |

See [Troubleshooting: Dataset and Prompt Field Mismatches](../../usage/troubleshooting.md#dataset-and-prompt-field-mismatches) for migration details.

## Related Documentation

- [Forseti Agent](../../agents/forseti/ARCHITECTURE.md) - Forseti agent features and how to add new features
- [Auto-Contributions](../AUTO_CONTRIBUTIONS.md) - Auto-contribution workflow using prompts

## External References

- [Opik Prompt Management](https://www.comet.com/docs/opik/prompt_engineering/prompt_management)
- [Opik Agent Optimizer](https://www.comet.com/docs/opik/agent_optimization/overview)
- [opik-optimizer PyPI](https://pypi.org/project/opik-optimizer/)
