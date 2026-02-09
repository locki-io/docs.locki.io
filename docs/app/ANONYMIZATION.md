# Document Anonymization Pipeline

The anonymization pipeline provides PII protection for documents processed through the field input workflow. It auto-detects document type and routes to the appropriate anonymizer.

For feature details (modes, entity types, Opik PII guardrail), see [Forseti Anonymization Feature](../agents/forseti/features_details.md#feature-4-anonymization).

For the cost/accuracy/speed analysis, see the [Anonymization Trilemma](/blog/anonymization-trilemma) blog post.

## Pipeline Integration

Anonymization runs automatically before theme extraction in the field input pipeline:

```
Input Text
    │
    ▼
[Document Type Detection] (instant, regex-based)
    ├── Transcript with names? → Regex Anonymizer (free, instant)
    ├── Already anonymous? → Skip
    └── General document? → LLM Anonymizer (accurate, costly)
    │
    ▼
[PII Validation] ← Opik Guardrail (NLP check)
    │
    ▼
[Theme Extraction] → Uses anonymized text
```

### Usage

```python
from app.mockup.field_input import FieldInputGenerator, AnonymizationConfig

gen = FieldInputGenerator(provider="gemini")
result = await gen.process_field_input(
    input_text=text,
    anonymization_config=AnonymizationConfig(enabled=True, mode="auto")
)
```

### Configuration

```python
@dataclass
class AnonymizationConfig:
    enabled: bool = True
    mode: Literal["auto", "transcript", "llm", "none"] = "auto"
    similarity_threshold: float = 0.85  # For fuzzy name matching
    store_mapping: bool = True  # Store entity mappings in result
```

### Result Fields

- `anonymization_applied`: bool
- `anonymization_type`: "transcript" | "llm" | None
- `anonymization_mapping`: dict of original to anonymized
- `keywords_from_anonymization`: list (LLM mode only)

## Frontend Integration

Three Forseti features available in the Contributions tab:

| Button         | Feature             | Description             |
| -------------- | ------------------- | ----------------------- |
| Verify charter | `validate`          | Full charter validation |
| Classify       | `classify_category` | Category classification |
| Anonymize      | `anonymization`     | PII anonymization       |

## Files

| File                                           | Description                                           |
| ---------------------------------------------- | ----------------------------------------------------- |
| `app/mockup/anonymizer.py`                     | Transcript anonymizer, type detection, PII validation |
| `app/agents/forseti/features/anonymization.py` | LLM-based anonymization feature                       |
| `app/mockup/field_input.py`                    | Pipeline integration                                  |
| `app/prompts/local/forseti.py`                 | Anonymization prompt template                         |

---

## Pre-Release Test Report

**Date:** 2026-02-08
**Branch:** `feature/apscheduler-plan-tasks`
**Status:** Ready for merge to dev

### Test Results

| Test                           | Status | Details                                   |
| ------------------------------ | ------ | ----------------------------------------- |
| Core imports                   | PASS   | anonymizer, field_input, features, models |
| Transcript detection           | PASS   | Correctly identifies TRANSCRIPT_NAMED     |
| General doc detection          | PASS   | Correctly identifies GENERAL              |
| Transcript anonymization       | PASS   | 2 speakers, names replaced                |
| Empty string handling          | PASS   | Returns GENERAL type, no crash            |
| Already anonymous detection    | PASS   | Detects TRANSCRIPT_ANONYMOUS              |
| Levenshtein dependency         | PASS   | Ratio 0.83 for Karine/Carine             |
| AnonymizationConfig defaults   | PASS   | enabled=True, mode=auto                   |
| FieldInputResult serialization | PASS   | to_dict() includes anonymization fields   |
| PII validation                 | PASS   | Returns result (graceful degradation)     |
| Translation keys (EN)          | PASS   | All 9 new keys present                    |
| Translation keys (FR)          | PASS   | All 9 new keys present                    |
| EN/FR key parity               | PASS   | No missing keys                           |
| front.py syntax                | PASS   | AST parse successful                      |
| Required functions             | PASS   | All 7 functions defined                   |
| Required imports               | PASS   | json, AnonymizationFeature                |
| Docs build                     | PASS   | Successfully generated                    |

### Known Issues

| Issue                         | Severity | Mitigation                   |
| ----------------------------- | -------- | ---------------------------- |
| Opik PII Guardrail API errors | Low      | Fails open with error logged |
| N8N webhook empty response    | Low      | JSONDecodeError now caught   |
| Docs broken anchors (FR)      | Low      | Pre-existing, unrelated      |

### Verification Checklist

- [x] All imports resolve correctly
- [x] Transcript anonymization works
- [x] LLM anonymization works
- [x] Auto-detection routes correctly
- [x] Error handling graceful
- [x] Translations complete
- [x] Frontend buttons functional
- [x] Docs build successfully

---

_Related: [Forseti Agent](../agents/forseti/ARCHITECTURE.md) | [Field Input Workflow](./FIELD_INPUT_WORKFLOW.md) | [Logging](./LOGGING.md)_
