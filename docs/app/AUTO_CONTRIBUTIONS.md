# Auto-Contribution Workflow

## Overview

The Auto-Contribution system guides citizens through creating charter-compliant contributions via a 5-step workflow with Forseti 461 validation.

## Architecture

```
app/processors/workflows/workflow_autocontribution.py  ← Business Logic
app/auto_contribution/views.py                         ← Streamlit UI
app/auto_contribution/__init__.py                      ← Module exports
```

## Workflow Steps

| Step | Function | Description |
|------|----------|-------------|
| 1 | `step_1_load_sources()` | Load Audierne2026 docs or accept pasted text |
| 2 | `step_2_select_category()` | Return 7 charter categories |
| 3 | `step_3_generate_draft()` | LLM generates constat_factuel + idees_ameliorations |
| 4 | `step_4_edit_contribution()` | User edits draft (UI handles this) |
| 5 | `step_5_validate_and_save()` | Forseti validates → Redis storage |

## Key Classes

- `AutoContributionWorkflow` - Orchestrates the workflow programmatically
- `AutoContributionConfig` - Provider/model/language settings
- `AutoContributionResult` - Validation results + contribution ID
- `DraftContribution` - Generated draft content
- `ContributionAssistant` - LLM wrapper for draft generation

## Integration Points

- **Mockup Tab**: Loads contributions from Redis first (fallback: JSON)
- **Forseti 461**: Pre-save validation with full result storage
- **Redis Storage**: `source="input"` distinguishes from mockup data
- **Bilingual**: FR/EN translations with `autocontrib_*` keys
- **Prompt Registry**: Uses `app/prompts/` for centralized prompt management (see [Prompt Management](./core/prompts.md))

## TODO: Complete Refactoring

### Tests (Priority)
- [x] Update `tests/test_contribution_assistant.py` imports to use workflow
- [x] Update `tests/test_questions_integration.py` → `test_autocontribution_integration.py`
- [x] Run `poetry run pytest tests/ -v` (17 tests passing)

### Documentation
- [x] Update MOCKUP.md references from "Questions Tab" to "Auto-Contribution Tab"
- [x] Delete PLAN_QUESTIONS_TAB.md (no longer needed)

### Cleanup
- [x] Remove old `app/questions/` references if any remain
- [x] Verify all `questions_*` translation keys are renamed to `autocontrib_*`
- [x] Test the Streamlit UI at `?tab=autocontrib` (user confirmed working)

## Current Status

**All tasks completed ✅**

- ✅ Created `app/processors/workflows/` directory
- ✅ Created `workflow_autocontribution.py` with all 5 step functions
- ✅ Renamed `app/questions/` → `app/auto_contribution/`
- ✅ Updated `views.py` to use workflow functions
- ✅ Updated `front.py` import and tab config
- ✅ Updated FR/EN translations (`autocontrib_*` keys)
- ✅ Updated `processors/__init__.py` exports
- ✅ Updated tests to new import paths (17 tests passing)
- ✅ Updated MOCKUP.md documentation
- ✅ Manual testing of full workflow

## Separation of Concerns (SoC)

The Auto-Contribution system follows a clear separation between **UI**, **Business Logic**, and **Shared Services**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SEPARATION OF CONCERNS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  UI LAYER (Presentation)                                             │    │
│  │  app/auto_contribution/views.py                                      │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  • autocontribution_view()        Main view entry point              │    │
│  │  • _render_step_1_source()        Source selection UI                │    │
│  │  • _render_step_2_category()      Category picker UI                 │    │
│  │  • _render_step_3_inspiration()   Draft generation UI + spinner      │    │
│  │  • _render_step_4_edit()          Editable text_area widgets         │    │
│  │  • _render_step_5_confirmation()  Success + Forseti results display  │    │
│  │  • _init_state() / _reset_state() Session state management           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  BUSINESS LOGIC LAYER (Processing)                                   │    │
│  │  app/processors/workflows/workflow_autocontribution.py               │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  Step Functions (stateless, reusable):                               │    │
│  │  • step_1_load_sources()          → List[Dict] of doc metadata       │    │
│  │  • load_source_content()          → str document content             │    │
│  │  • step_2_select_category()       → List[str] categories             │    │
│  │  • get_category_description()     → str localized description        │    │
│  │  • step_3_generate_draft()        → DraftContribution (sync)         │    │
│  │  • step_4_edit_contribution()     → DraftContribution (edited)       │    │
│  │  • step_5_validate_and_save()     → AutoContributionResult           │    │
│  │  • run_forseti_validation()       → Dict validation results          │    │
│  │                                                                       │    │
│  │  Classes:                                                             │    │
│  │  • ContributionAssistant          LLM wrapper for draft generation   │    │
│  │  • AutoContributionWorkflow       Orchestrator for programmatic use  │    │
│  │                                                                       │    │
│  │  Data Classes:                                                        │    │
│  │  • DraftContribution              constat + idees + category + title │    │
│  │  • AutoContributionConfig         provider + model + language        │    │
│  │  • AutoContributionResult         validation results + contrib_id    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  SHARED SERVICES LAYER (Infrastructure)                              │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  app/agents/forseti/                                                  │    │
│  │  • ForsetiAgent.validate()        Charter validation                 │    │
│  │  • CATEGORIES                     7 category constants               │    │
│  │                                                                       │    │
│  │  app/mockup/                                                          │    │
│  │  • field_input.py                 list_audierne_docs(), read_md()    │    │
│  │  • storage.py                     get_storage(), ValidationRecord    │    │
│  │                                                                       │    │
│  │  app/providers.py                                                     │    │
│  │  • get_provider()                 LLM abstraction (Gemini/Claude)    │    │
│  │                                                                       │    │
│  │  app/i18n.py                                                          │    │
│  │  • _(), get_language()            Translation functions              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Function Inventory

| Layer | Function | Concern | Reusable |
|-------|----------|---------|----------|
| **UI** | `autocontribution_view()` | Entry point, routing | No |
| **UI** | `_render_step_*()` | Step-specific widgets | No |
| **UI** | `_init_state()` | Session management | No |
| **Logic** | `step_1_load_sources()` | Document discovery | ✅ Yes |
| **Logic** | `load_source_content()` | File reading | ✅ Yes |
| **Logic** | `step_2_select_category()` | Category list | ✅ Yes |
| **Logic** | `get_category_description()` | i18n helper | ✅ Yes |
| **Logic** | `step_3_generate_draft()` | LLM draft (sync) | ✅ Yes |
| **Logic** | `step_4_edit_contribution()` | Merge edits | ✅ Yes |
| **Logic** | `step_5_validate_and_save()` | Forseti + Redis | ✅ Yes |
| **Logic** | `run_forseti_validation()` | Validation only | ✅ Yes |
| **Logic** | `ContributionAssistant` | LLM prompts | ✅ Yes |
| **Logic** | `AutoContributionWorkflow` | Orchestrator | ✅ Yes |
| **Shared** | `ForsetiAgent.validate()` | Charter rules | ✅ Yes |
| **Shared** | `list_audierne_docs()` | Doc listing | ✅ Yes |
| **Shared** | `get_storage()` | Redis access | ✅ Yes |
| **Shared** | `get_provider()` | LLM factory | ✅ Yes |

### Design Principles

1. **UI knows nothing about LLMs** - Views call workflow functions, not providers
2. **Business logic is stateless** - Step functions take inputs, return outputs
3. **Shared services are generic** - No workflow-specific code in agents/mockup
4. **Data flows downward** - UI → Logic → Services (no callbacks)
5. **Testing is easy** - Mock at service boundaries (providers, storage)

## Usage

```python
from app.processors import AutoContributionWorkflow, AutoContributionConfig

# Programmatic usage
config = AutoContributionConfig(provider="gemini", language="fr")
workflow = AutoContributionWorkflow(config)

sources = workflow.load_sources()
content = workflow.load_source_content(sources[0]["path"])
draft = workflow.generate_draft(content, "economie")
result = workflow.validate_and_save(draft)

print(f"ID: {result.contribution_id}, Valid: {result.is_valid}")
```

## Streamlit URL

Access via: `http://localhost:8502/?tab=autocontrib`
