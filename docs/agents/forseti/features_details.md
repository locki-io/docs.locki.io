## Features

### Feature 1: Charter Validation

Validates contributions against the charter rules.

| Property  | Value                                |
| --------- | ------------------------------------ |
| Class     | `CharterValidationFeature`           |
| Prompt    | `forseti.charter_validation`         |
| Opik Name | `forseti461-user-charter-validation` |
| Variables | `title`, `body`                      |
| Output    | `ValidationResult`                   |
| Registered | Auto (always)                       |

**Checks for violations:**

- Personal attacks or discrimination
- Spam or advertising
- Off-topic content (unrelated to Audierne-Esquibien)
- False information

**Identifies encouraged aspects:**

- Concrete proposals
- Constructive criticism
- Questions and clarifications
- Shared expertise

### Feature 2: Category Classification

Assigns contributions to one of 7 predefined categories.

| Property  | Value                                     |
| --------- | ----------------------------------------- |
| Class     | `CategoryClassificationFeature`           |
| Prompt    | `forseti.category_classification`         |
| Opik Name | `forseti461-user-category-classification` |
| Variables | `title`, `body`, `current_category_line`  |
| Output    | `ClassificationResult`                    |
| Registered | Auto (always)                            |

**Categories:**

- `economie` - Commerce, tourism, port, fishing
- `logement` - Housing, urban planning
- `culture` - Heritage, events, associations
- `ecologie` - Environment, energy, biodiversity
- `associations` - Local organizations
- `jeunesse` - Youth, schools, education
- `alimentation-bien-etre-soins` - Food, health, wellness

### Feature 3: Wording Correction

Suggests improvements for clarity and constructiveness.

| Property  | Value                                |
| --------- | ------------------------------------ |
| Class     | `WordingCorrectionFeature`           |
| Prompt    | `forseti.wording_correction`         |
| Opik Name | `forseti461-user-wording-correction` |
| Variables | `title`, `body`                      |
| Output    | `WordingResult`                      |
| Registered | Optional (`enable_wording=True`)    |

**Improvements include:**

- Clarity and readability
- Grammar corrections
- More constructive phrasing
- Removing inflammatory language

### Feature 4: Anonymization

PII (Personally Identifiable Information) protection with three complementary modes.

| Property  | Value                           |
| --------- | ------------------------------- |
| Class     | `AnonymizationFeature`          |
| Prompt    | `forseti.anonymization`         |
| Variables | `text`                          |
| Output    | `AnonymizationResult`           |
| Registered | Manual (standalone execution)  |

**Three modes (the [Anonymization Trilemma](/blog/anonymization-trilemma)):**

#### Transcript Mode (Deterministic, Regex)

For Plaud AI and timestamped meeting transcripts. Free, instant, deterministic:

```
00:00:00 Florent Lardic    →    00:00:00 Speaker_1
00:05:23 Malika Redaouia   →    00:05:23 Speaker_2
```

- Consistent Speaker_N assignment across the document
- Fuzzy matching for spelling variations (Levenshtein distance)
- Inline mention replacement
- **Cost:** Free | **Speed:** Instant | **Accuracy:** High for structured formats

#### LLM Mode (Experimental)

For general documents requiring context understanding:

- Names &rarr; `[PERSONNE_N]`, emails &rarr; `[EMAIL_N]`, phones &rarr; `[TELEPHONE_N]`, addresses &rarr; `[ADRESSE_N]`
- Extracts non-PII keywords (organizations, places) for theme analysis
- **Cost:** ~$0.001-0.003 per doc | **Speed:** 2-5s | **Accuracy:** High

> **Opik PII Guardrail as alternative:** [`opik.guardrails.guards.pii.PII`](https://www.comet.com/docs/opik/python-sdk-reference/guardrails/pii.html) provides NLP-based entity detection (50-100ms, free) that may be a more efficient replacement for LLM mode in many cases. Currently used for post-processing validation, but could serve as primary anonymizer for simpler documents. See the [Anonymization Trilemma](/blog/anonymization-trilemma) blog post for cost/accuracy/speed tradeoffs.

#### Auto Mode (Default)

Detects document type and routes automatically:

- Transcript with speaker names &rarr; Regex mode
- Already anonymous &rarr; Skip
- General document &rarr; LLM mode
- All modes &rarr; PII validation (Opik Guardrail)

**Entity types anonymized:**

| Entity | Placeholder | Example |
|--------|------------|---------|
| Person | `[PERSONNE_N]` | Jean Dupont &rarr; `[PERSONNE_1]` |
| Email | `[EMAIL_N]` | jean@example.com &rarr; `[EMAIL_1]` |
| Phone | `[TELEPHONE_N]` | 06 12 34 56 78 &rarr; `[TELEPHONE_1]` |
| Address | `[ADRESSE_N]` | 12 rue de la Paix &rarr; `[ADRESSE_1]` |

**Preserved as keywords** (not anonymized): organizations, public places, institutions.

**Files:**

| File | Description |
| ---- | ----------- |
| `app/agents/forseti/features/anonymization.py` | LLM-based feature |
| `app/mockup/anonymizer.py` | Transcript regex, type detection, PII validation |
| `app/mockup/field_input.py` | Pipeline integration |

### Feature 5: Translation (Available, Not Integrated)

Translates French contributions to English.

| Property  | Value                           |
| --------- | ------------------------------- |
| Class     | `TranslationFeature`            |
| Variables | French constat + idees          |
| Output    | `TranslationResult`             |
| Registered | Not integrated                 |
| Status    | Defined, no active usage        |

### Batch Validation (Experiments)

Batch validation is handled as **Opik experiments**, not as a feature class. This allows:

- A/B testing different prompt versions
- Tracking metrics across validation runs
- Comparing performance over time

See [Prompt Management](../../app/core/prompts.md) for experiment setup.

## Feature Summary

| # | Feature | Registration | Status |
|---|---------|-------------|--------|
| 1 | Charter Validation | Auto | Active |
| 2 | Category Classification | Auto | Active |
| 3 | Wording Correction | Optional | Active if enabled |
| 4 | Anonymization | Manual | Active (standalone) |
| 5 | Translation | Not integrated | Available |
