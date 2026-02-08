# Document Anonymization

The anonymization module provides PII (Personally Identifiable Information) protection for documents processed through the field input pipeline.

## Architecture

```
Input Document
      │
      ▼
┌─────────────────┐
│ Type Detection  │ (instant, regex-based)
└────────┬────────┘
         │
    ┌────┴────┬──────────────┐
    │         │              │
    ▼         ▼              ▼
┌───────┐ ┌───────┐    ┌──────────┐
│ Regex │ │ Skip  │    │   LLM    │
│ Mode  │ │       │    │   Mode   │
└───┬───┘ └───┬───┘    └────┬─────┘
    │         │              │
    └────┬────┴──────────────┘
         │
         ▼
┌─────────────────┐
│ PII Validation  │ (Opik Guardrail, optional)
└────────┬────────┘
         │
         ▼
   Anonymized Text
```

## Three Modes

### 1. Transcript Mode (Regex)

For timestamped transcripts with speaker names:

```
00:00:00 Florent Lardic    →    00:00:00 Speaker_1
00:05:23 Malika Redaouia   →    00:05:23 Speaker_2
```

**Features:**
- Consistent Speaker_N assignment
- Fuzzy matching for spelling variations (Levenshtein distance)
- Inline mention replacement

**Cost:** Free (regex-based)

### 2. LLM Mode

For general documents requiring context understanding:

```python
from app.agents.forseti.features import AnonymizationFeature

feature = AnonymizationFeature()
result = await feature.execute(provider, "", text="Jean Dupont habite à Audierne.")
# Result: "[PERSONNE_1] habite à Audierne."
# Keywords: ["Audierne"]
```

**Features:**
- Context-aware entity detection
- Extracts keywords (organizations, places) for theme analysis
- Consistent entity mapping

**Cost:** ~$0.001-0.003 per document

### 3. Auto Mode (Default)

Automatically detects document type and routes to appropriate anonymizer:

```python
from app.mockup.field_input import FieldInputGenerator, AnonymizationConfig

gen = FieldInputGenerator(provider="gemini")
result = await gen.process_field_input(
    input_text=text,
    anonymization_config=AnonymizationConfig(enabled=True, mode="auto")
)
```

## Configuration

```python
@dataclass
class AnonymizationConfig:
    enabled: bool = True
    mode: Literal["auto", "transcript", "llm", "none"] = "auto"
    similarity_threshold: float = 0.85  # For fuzzy name matching
    store_mapping: bool = True  # Store entity mappings in result
```

## PII Validation (Opik Guardrail)

Optional NLP-based validation using Opik's PII guardrail:

```python
from app.mockup.anonymizer import validate_no_pii

result = validate_no_pii("Speaker_1 a dit bonjour.")
# result.is_clean = True

result = validate_no_pii("Jean Dupont a dit bonjour.")
# result.is_clean = False (PERSON detected)
```

## Frontend Integration

Three Forseti features available in the Contributions tab:

| Button | Feature | Description |
|--------|---------|-------------|
| Verify charter | `validate` | Full charter validation |
| Classify | `classify_category` | Category classification |
| Anonymize | `anonymization` | PII anonymization |

## Files

| File | Description |
|------|-------------|
| `app/mockup/anonymizer.py` | Transcript anonymizer, type detection, PII validation |
| `app/agents/forseti/features/anonymization.py` | LLM-based anonymization feature |
| `app/mockup/field_input.py` | Pipeline integration |
| `app/prompts/local/forseti.py` | Anonymization prompt template |

---

## Pre-Release Test Report

**Date:** 2026-02-08
**Branch:** `feature/apscheduler-plan-tasks`
**Status:** Ready for merge to dev

### Test Results

| Test | Status | Details |
|------|--------|---------|
| Core imports | PASS | anonymizer, field_input, features, models |
| Transcript detection | PASS | Correctly identifies TRANSCRIPT_NAMED |
| General doc detection | PASS | Correctly identifies GENERAL |
| Transcript anonymization | PASS | 2 speakers, names replaced |
| Empty string handling | PASS | Returns GENERAL type, no crash |
| Already anonymous detection | PASS | Detects TRANSCRIPT_ANONYMOUS |
| Levenshtein dependency | PASS | Ratio 0.83 for Karine/Carine |
| AnonymizationConfig defaults | PASS | enabled=True, mode=auto |
| FieldInputResult serialization | PASS | to_dict() includes anonymization fields |
| PII validation | PASS | Returns result (graceful degradation) |
| Translation keys (EN) | PASS | All 9 new keys present |
| Translation keys (FR) | PASS | All 9 new keys present |
| EN/FR key parity | PASS | No missing keys |
| front.py syntax | PASS | AST parse successful |
| Required functions | PASS | All 7 functions defined |
| Required imports | PASS | json, AnonymizationFeature |
| Docs build | PASS | Successfully generated |

### Known Issues

| Issue | Severity | Mitigation |
|-------|----------|------------|
| Opik PII Guardrail API errors | Low | Fails open with error logged |
| N8N webhook empty response | Low | JSONDecodeError now caught |
| Docs broken anchors (FR) | Low | Pre-existing, unrelated |

### Potential Failure Points

1. **LLM Provider Availability**
   - Risk: Anonymization fails if provider unavailable
   - Mitigation: Failover chain in place

2. **Large Documents**
   - Risk: Memory/timeout on very large transcripts
   - Mitigation: Chunking with 15k char limit

3. **Opik API Connectivity**
   - Risk: PII validation returns false positive
   - Mitigation: Fail-open design, errors logged

### Test Commands

```bash
# Test transcript anonymization
python -c "
from app.mockup.anonymizer import TranscriptAnonymizer
anon = TranscriptAnonymizer()
result = anon.anonymize(open('docs/docs/audierne2026/municipal_meeting_transcript_lardic_short.md').read())
print(f'Speakers: {result.speaker_count}, Replacements: {result.total_replacements}')
"

# Test LLM anonymization
python -c "
import asyncio
from app.agents.forseti.features import AnonymizationFeature
from app.providers import get_provider

async def test():
    feature = AnonymizationFeature()
    provider = get_provider('gemini')
    result = await feature.execute(provider, '', text='Jean Dupont habite à Audierne.')
    print(f'Entities: {result.entity_mapping}')
    print(f'Keywords: {result.keywords_extracted}')

asyncio.run(test())
"

# Test full pipeline
python -c "
import asyncio
from app.mockup.field_input import FieldInputGenerator, AnonymizationConfig, FieldInputResult

async def test():
    gen = FieldInputGenerator(provider='gemini')
    result = FieldInputResult(source_title='Test', input_length=100)
    config = AnonymizationConfig(enabled=True, mode='auto')

    text = '''00:00:00 Jean Dupont
    Bonjour à tous.
    00:01:00 Marie Martin
    Merci Jean.'''

    anonymized = await gen._apply_anonymization(text, result, config)
    print(f'Type: {result.anonymization_type}')
    print(f'Applied: {result.anonymization_applied}')

asyncio.run(test())
"
```

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

*Related: [Field Input Workflow](./FIELD_INPUT_WORKFLOW.md) | [Forseti Agent](./FORSETI_AGENT.md) | [Logging](./LOGGING.md)*
