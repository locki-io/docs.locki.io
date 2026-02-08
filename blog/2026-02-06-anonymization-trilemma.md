---
slug: anonymization-trilemma
title: "The Anonymization Trilemma: Balancing Cost, Accuracy, and Speed in Civic AI"
authors: [jnxmas]
tags: [ai-ml, privacy, civictech, pii, anonymization]
description: "Three complementary approaches to document anonymization—and how auto-detection picks the right one for each document type"
---

# The Anonymization Trilemma: Balancing Cost, Accuracy, and Speed in Civic AI

**A hybrid approach that uses regex for transcripts, LLMs for general documents, and NLP guardrails for validation**

<!-- truncate -->

## The Problem: PII in Civic Data

Municipal transcripts, citizen contributions, and public hearing records contain sensitive personal information:

- **Names**: "Florent Lardic proposed that..."
- **Contact info**: Emails, phone numbers shared during Q&A
- **Addresses**: "I live at 12 rue de la Paix and..."

Before processing these documents through our AI pipeline for theme extraction, we need to anonymize them. But how?

## The Trilemma

Every anonymization approach forces a tradeoff:

```
           ACCURACY
              ▲
              │
              │    ★ LLM-based
              │    (understands context)
              │
              │         ★ NLP Guardrails
              │         (good entity detection)
              │
              │              ★ Regex
              │              (pattern matching only)
              │
    ──────────┼──────────────────────────▶ SPEED
              │
         COST │
              ▼
```

| Approach | Cost | Accuracy | Speed | Best For |
|----------|------|----------|-------|----------|
| **Regex** | Free | Medium | Instant | Structured formats (transcripts) |
| **LLM** | $$$ | High | Slow | Complex context, general docs |
| **NLP** | Free | Medium-High | Fast | Validation, pre-screening |

**You can't optimize all three.** But you can pick the right approach for each document type.

## Our Solution: Three-Mode Architecture

We implemented a hybrid system that auto-detects document type and routes to the appropriate anonymizer:

```
Input Text
    ↓
[Document Type Detection]
    ├── Transcript with names? → Regex Anonymizer (free, instant)
    ├── Already anonymous? → Skip (no processing needed)
    └── General document? → LLM Anonymizer (accurate, costly)
    ↓
[PII Validation] ← Opik Guardrail (NLP check)
    ↓
[Theme Extraction] → Uses anonymized text
```

### Mode 1: Transcript Regex (Free, Instant)

Municipal meeting transcripts follow a predictable format:

```
00:00:00 Florent Lardic
nous allons discuter du programme...

00:05:23 Malika Redaouia
je pense que nous devrions...
```

A regex pattern extracts speakers and replaces them consistently:

```python
# Pattern: HH:MM:SS followed by speaker name
TIMESTAMP_PATTERN = re.compile(
    r"^(\d{2}:\d{2}:\d{2})\s+(.+?)$", re.MULTILINE
)
```

**Result:**

```
00:00:00 Speaker_1
nous allons discuter du programme...

00:05:23 Speaker_2
je pense que nous devrions...
```

**Features:**

- **Consistent mapping**: Same name = same Speaker_N throughout
- **Fuzzy matching**: Handles "Karine" vs "Carine" variations (Levenshtein distance)
- **Inline replacement**: "comme Florent le disait" → "comme Speaker_1 le disait"

**Benchmarks (90k character transcript):**

| Metric | Value |
|--------|-------|
| Processing time | 12ms |
| API cost | $0.00 |
| Speakers detected | 7 |
| Replacements made | 199 |
| Accuracy | High for structured transcripts |

### Mode 2: LLM-Based (Accurate, Costly)

General documents need context understanding:

```
Jean Dupont habite au 12 rue de la Paix à Audierne.
Son email est jean.dupont@example.com.
La Mairie devrait améliorer...
```

An LLM understands that:

- "Jean Dupont" is a person → anonymize
- "12 rue de la Paix" is an address → anonymize
- "Audierne" is a public place → **keep as keyword**
- "La Mairie" is an institution → **keep as keyword**

**Result:**

```json
{
  "anonymized_text": "[PERSONNE_1] habite au [ADRESSE_1] à Audierne...",
  "entity_mapping": {
    "Jean Dupont": "[PERSONNE_1]",
    "12 rue de la Paix": "[ADRESSE_1]",
    "jean.dupont@example.com": "[EMAIL_1]"
  },
  "keywords_extracted": ["Audierne", "Mairie"]
}
```

**The key insight**: Organizations and places aren't PII—they're valuable keywords for theme extraction. The LLM distinguishes between what to hide and what to keep.

**Benchmarks (1k character document):**

| Metric | Value |
|--------|-------|
| Processing time | 2-5 seconds |
| API cost | ~$0.001-0.003 |
| Accuracy | High (context-aware) |
| Keywords extracted | Yes |

### Mode 3: NLP Guardrail (Validation)

Opik's PII guardrail uses traditional NER (Named Entity Recognition) to detect remaining PII:

```python
from app.mockup.anonymizer import validate_no_pii

result = validate_no_pii("Speaker_1 a dit que la mairie doit agir.")
# result.is_clean = True

result = validate_no_pii("Jean Dupont a dit que la mairie doit agir.")
# result.is_clean = False (PERSON detected)
```

**Use cases:**

1. **Pre-LLM check**: Quick validation before expensive LLM calls
2. **Post-processing audit**: Verify no PII leaked through
3. **Logging**: Track PII detection failures in Opik dashboard

**Benchmarks:**

| Metric | Value |
|--------|-------|
| Processing time | 50-100ms |
| API cost | $0.00 (local NLP) |
| Accuracy | Medium-High |
| Entity types | PERSON, EMAIL, PHONE, CREDIT_CARD, etc. |

## Auto-Detection Logic

The system automatically picks the right mode:

```python
def detect_document_type(text: str) -> DocumentType:
    matches = TIMESTAMP_PATTERN.finditer(text)

    if len(matches) < 3:
        return DocumentType.GENERAL  # → LLM mode

    # Check if speakers are already anonymous
    sample_speakers = [m.group(2) for m in matches[:10]]
    anonymous_count = sum(
        1 for s in sample_speakers
        if ANONYMOUS_PATTERN.match(s)  # "Speaker 1", "Intervenant 2"
    )

    if anonymous_count > len(sample_speakers) * 0.7:
        return DocumentType.TRANSCRIPT_ANONYMOUS  # → Skip

    return DocumentType.TRANSCRIPT_NAMED  # → Regex mode
```

**Detection accuracy**: 100% on our test corpus (transcripts have clear timestamp patterns).

## The Economics

### Scenario: Processing 100 municipal documents

| Doc Type | Count | Mode | Time | Cost |
|----------|-------|------|------|------|
| Meeting transcripts | 30 | Regex | 0.4s total | $0.00 |
| Already anonymous | 10 | Skip | 0s | $0.00 |
| Citizen letters | 40 | LLM | 160s (2.6min) | $0.12 |
| Short comments | 20 | LLM | 60s | $0.04 |
| **Total** | **100** | **Mixed** | **~3.5min** | **$0.16** |

**Compare to LLM-only approach:**

| Mode | Time | Cost |
|------|------|------|
| LLM for all | ~8 minutes | $0.30 |
| Auto-detect | ~3.5 minutes | $0.16 |
| **Savings** | **56%** | **47%** |

## Integration with Field Input Pipeline

The anonymization happens automatically before theme extraction:

```python
from app.mockup.field_input import FieldInputGenerator, AnonymizationConfig

gen = FieldInputGenerator(provider="gemini")

result = await gen.process_field_input(
    input_text=transcript_text,
    source_title="Conseil Municipal Janvier 2026",
    anonymization_config=AnonymizationConfig(
        enabled=True,
        mode="auto",  # or "transcript", "llm", "none"
    )
)

print(f"Anonymization: {result.anonymization_type}")  # "transcript"
print(f"Speakers: {len(result.anonymization_mapping)}")  # 7
print(f"Keywords: {result.keywords_from_anonymization}")  # From LLM mode
```

**Result fields added:**

- `anonymization_applied`: bool
- `anonymization_type`: "transcript" | "llm" | None
- `anonymization_mapping`: dict of original → anonymized
- `keywords_from_anonymization`: list (LLM mode only)

## Privacy vs Utility Tradeoff

| Priority | Configuration | Tradeoff |
|----------|--------------|----------|
| Maximum privacy | `mode="llm"` always | Higher cost, slower |
| Maximum speed | `mode="transcript"` always | May miss PII in general docs |
| Balanced | `mode="auto"` | Best cost/accuracy ratio |
| Debugging | `mode="none"` | No anonymization (dev only) |

For production, **auto mode** is recommended: it gets transcript anonymization essentially free while only paying for LLM when truly needed.

## Lessons Learned

### 1. Structure Is Free

Structured documents (transcripts, forms) can be anonymized with regex at zero cost. Invest in understanding your data formats before reaching for expensive solutions.

### 2. Context Costs Money

LLMs excel at understanding context ("Jean Dupont" is a person, "Dupont SA" is a company). But this understanding isn't free. Use it selectively.

### 3. Validation Is Cheap Insurance

NLP-based PII detection (Opik guardrails) is fast and free. Running it after anonymization catches mistakes before they reach production.

### 4. Keywords Are Side Benefits

LLM anonymization extracts useful keywords (organizations, places) as a side effect. These feed into theme extraction, improving downstream accuracy.

## The Trilemma, Resolved

You can't have the best of all three—but you can have **the right tool for each job**:

```
Document arrives
       │
       ▼
┌──────────────────┐
│ Type Detection   │ (instant, free)
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┐
    │         │              │
    ▼         ▼              ▼
┌───────┐ ┌───────┐    ┌──────────┐
│ Regex │ │ Skip  │    │   LLM    │
│ (0ms) │ │ (0ms) │    │ (2-5s)   │
│ ($0)  │ │ ($0)  │    │ ($0.003) │
└───┬───┘ └───┬───┘    └────┬─────┘
    │         │              │
    └────┬────┴──────────────┘
         │
         ▼
┌──────────────────┐
│ PII Validation   │ (50ms, free)
└────────┬─────────┘
         │
         ▼
    Clean text for
    theme extraction
```

**Result**: Fast where possible, accurate where necessary, validated always.

---

*Code reference: `app/mockup/anonymizer.py`, `app/mockup/field_input.py`, `app/agents/forseti/features/anonymization.py`*

*Related: [Reliability Without the Cloud Tax](/blog/reliability-without-the-cloud-tax) | [Grounding AI in Reality](/blog/grounding-ai-in-reality)*
