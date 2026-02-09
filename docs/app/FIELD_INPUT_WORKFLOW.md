# Field Input Workflow

Generate themed contributions from real-world field data to keep AI agents grounded in reality.

## Overview

The **Field Input** feature transforms real field data (Plaud recordings, press articles, mayor speeches, meeting notes) into structured contributions that challenge Forseti's charter validation. This keeps the agent trained on current, authentic civic discourse rather than synthetic examples.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FIELD INPUT WORKFLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FIELD DATA              THEME EXTRACTION         CONTRIBUTION GENERATION   │
│   ┌──────────┐            ┌──────────┐            ┌──────────────────────┐  │
│   │ Plaud AI │───┐        │          │            │  Valid Contribution  │  │
│   │Recording │   │        │  LLM     │    ┌──────▶│  (expected: true)    │  │
│   └──────────┘   │        │ Extract  │    │       └──────────────────────┘  │
│   ┌──────────┐   │        │  Themes  │    │       ┌──────────────────────┐  │
│   │  Press   │───┼───────▶│  (3-5    │────┼──────▶│  Subtle Violation    │  │
│   │ Article  │   │        │  themes) │    │       │  (expected: false)   │  │
│   └──────────┘   │        │          │    │       └──────────────────────┘  │
│   ┌──────────┐   │        └──────────┘    │       ┌──────────────────────┐  │
│   │  Speech  │───┘                        └──────▶│  Aggressive Violation│  │
│   │  Notes   │                                    │  (expected: false)   │  │
│   └──────────┘                                    └──────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Why Field Input?

AI agents can drift into "bubble" behavior - optimizing for patterns in training data rather than real-world discourse. Field Input solves this by:

| Problem              | Field Input Solution                          |
| -------------------- | --------------------------------------------- |
| **Synthetic bias**   | Uses real citizen language and concerns       |
| **Topic drift**      | Grounds in current local issues               |
| **Outdated context** | Updates with latest municipal developments    |
| **Overfitting**      | Introduces authentic variation and edge cases |

## Using the Feature

### Via Streamlit UI

1. Navigate to **Mockup** tab
2. Select **Field Input (Reports/Docs)**
3. Choose input method:
   - **Select audierne2026 doc**: Load from `docs/docs/audierne2026/`
   - **Paste markdown**: Direct input of field data
4. Configure generation:
   - **LLM Provider**: Gemini (recommended), Claude, or Ollama
   - **Contributions per theme**: 1-3 (default: 2)
   - **Include violations**: Generate invalid examples for testing
5. Click **Generate Contributions**

### Programmatically

```python
from app.mockup.field_input import (
    FieldInputGenerator,
    process_field_input_sync,
)

# Quick sync usage
result = process_field_input_sync(
    input_text=my_field_data,
    source_title="Reunion conseil municipal 2026-02-03",
    provider="gemini",
    contributions_per_theme=2,
    include_violations=True,
)

print(f"Generated {result.contributions_generated} contributions")
print(f"Categories: {result.categories_covered}")

# Async usage
generator = FieldInputGenerator(provider="gemini")
result = await generator.process_field_input(
    input_text=plaud_transcript,
    source_title="Public hearing - Budget 2026",
)
```

## Input Sources

### Plaud AI Recordings

Transcribed meeting recordings provide authentic citizen voices:

```markdown
# Reunion Conseil Municipal - 03/02/2026

## Intervention Mme Dupont

"Le budget pour les écoles est insuffisant. On voit bien que
les travaux de la cantine traînent depuis deux ans..."

## Intervention M. Martin

"Pourquoi on investit dans le port alors que les trottoirs
du centre-ville sont dans un état lamentable ?"
```

### Press Articles

Local journalism captures community concerns:

```markdown
# Le Télégramme - 01/02/2026

## Audierne: inquiétude autour du projet éolien offshore

Les pêcheurs de la commune s'inquiètent des impacts...
```

### Meeting Notes

Structured summaries from public hearings:

```markdown
# Audience Publique - PLU 2026

## Thèmes abordés:

- Densification du centre-ville
- Protection du littoral
- Stationnement

## Points de friction:

- Hauteur des constructions nouvelles
- Accès à la plage...
```

## Output Structure

### Generated Contributions

Each theme generates:

- **2+ valid contributions** - Constructive, charter-compliant
- **1 subtle violation** - Appears valid but contains issues
- **1 aggressive violation** - Clear charter violation

```python
MockContribution(
    id="field_economie_a3f2c8d1",
    category="economie",
    constat_factuel="Les travaux de rénovation de l'école...",
    idees_ameliorations="Il serait souhaitable de prévoir...",
    source="derived",
    expected_valid=True,  # Ground truth for evaluation
    violations_injected=None,  # or ["subtle_violation", "aggressive"]
    metadata={
        "field_input": True,
        "theme": "renovation_ecole",
        "source_title": "Reunion CM 2026-02-03",
        "generated_date": "2026-02-04",
        "llm_model": "gemini-2.5-flash",
    },
)
```

### Extracted Themes

```python
ExtractedTheme(
    category="economie",
    theme="renovation_ecole",
    keywords=["école", "budget", "travaux", "cantine"],
    context="les travaux de la cantine traînent depuis deux ans",
)
```

## Integration with Continuous Improvement

Field Input feeds directly into the continuous improvement loop:

```
                         ┌─────────────────────────────────────┐
                         │         CONTINUOUS LOOP             │
                         └─────────────────────────────────────┘
                                        │
     ┌──────────────────────────────────┼──────────────────────────────────┐
     │                                  │                                  │
     ▼                                  ▼                                  ▼
┌─────────┐                      ┌─────────────┐                    ┌─────────────┐
│  FIELD  │                      │   FORSETI   │                    │    OPIK     │
│  INPUT  │─────────────────────▶│  VALIDATE   │───────────────────▶│  EVALUATE   │
│         │                      │             │                    │             │
│ Generate│                      │ Trace spans │                    │ Metrics:    │
│ contribs│                      │ with Opik   │                    │ - format    │
└─────────┘                      └─────────────┘                    │ - halluc.   │
     │                                  │                           │ - confidence│
     │                                  │                           └─────────────┘
     │                                  │                                  │
     └──────────────────────────────────┴──────────────────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │ PROMPT IMPROVE  │
                               │ Based on scores │
                               └─────────────────┘
```

### Daily Workflow

1. **Morning**: Process new field data (recordings, articles)
2. **Generate**: Create contributions with Field Input
3. **Evaluate**: Forseti validates contributions (traced to Opik)
4. **Measure**: Scheduled task runs metrics (output_format, hallucination)
5. **Iterate**: Identify prompt improvements based on scores

### Scheduled Integration

The `task_opik_evaluate` task automatically picks up field-generated contributions:

```python
# Cron: Every 30 minutes, 7 AM - 10 PM
# Evaluates new spans including those from Field Input contributions
OPIK_EVALUATE_CRON = "*/30 7-22 * * *"
```

## Configuration

### LLM Providers

| Provider | Model             | Best For                                         |
| -------- | ----------------- | ------------------------------------------------ |
| `ollama` | mistral:latest    | Local development, privacy-sensitive data        |
| `gemini` | gemini-2.5-flash  | **Recommended** - Fast, grounded, good reasoning |
| `claude` | claude-3-5-sonnet | Strong reasoning, nuanced violations             |

### Category Themes

Customize theme extraction in `app/mockup/data/category_themes.json`:

```json
{
  "categories": {
    "economie": {
      "label": "Économie locale",
      "themes": ["commerce", "emploi", "tourisme", "port"],
      "keywords": ["budget", "investissement", "développement"]
    },
    "environnement": {
      "label": "Environnement",
      "themes": ["littoral", "énergie", "déchets"],
      "keywords": ["écologie", "protection", "durable"]
    }
  }
}
```

## Best Practices

### 1. Source Variety

Mix different input types to ensure breadth:

- 40% meeting transcripts
- 30% press articles
- 20% citizen feedback
- 10% official documents

### 2. Regular Updates

Process field data daily to stay current:

```bash
# Example: Process today's Plaud recording
python -c "
from app.mockup.field_input import process_field_input_sync
result = process_field_input_sync(
    open('plaud_2026-02-04.md').read(),
    source_title='Daily briefing',
    provider='gemini'
)
print(result.to_dict())
"
```

### 3. Balance Valid/Invalid

Maintain a healthy ratio:

- **70%** valid contributions (expected_valid=True)
- **30%** violations (expected_valid=False)

This tests both acceptance AND rejection capabilities.

### 4. Track Provenance

Always set `source_title` for traceability:

```python
result = process_field_input_sync(
    input_text=data,
    source_title="Le Télégramme 2026-02-04 - Port fishing quota",
)
```

## Files Reference

| File                                   | Purpose                       |
| -------------------------------------- | ----------------------------- |
| `app/mockup/field_input.py`            | Core generator implementation |
| `app/mockup/data/category_themes.json` | Theme configuration           |
| `docs/docs/audierne2026/`              | Sample input documents        |
| `app/front.py`                         | Streamlit UI (Mockup tab)     |

## See Also

- [Continuous Improvement](./opik/CONTINUOUS_IMPROVEMENT.md) - Full methodology
- [Experiment Workflow](./opik/EXPERIMENT_WORKFLOW.md) - Opik evaluation details
- [Mockup Generator](./MOCKUP.md) - Synthetic contribution generation
- [Forseti Agent](../agents/forseti/ARCHITECTURE.md) - Charter validation agent

---

_Field Input transforms reality into training signal, keeping AI agents honest and grounded in actual civic discourse._
