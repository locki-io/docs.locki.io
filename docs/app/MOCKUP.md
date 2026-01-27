# Mockup System - Contribution Testing Framework

## Overview

The mockup system generates controlled variations of citizen contributions to systematically test and improve Forseti 461's charter validation. By creating progressive mutations from valid to invalid contributions, we can:

1. **Identify prompt weaknesses** - Find cases where violations slip through
2. **Measure consistency** - Ensure similar inputs produce similar outputs
3. **Build training datasets** - Create Opik-compatible datasets for prompt optimization
4. **Track accuracy over time** - Compare validation results across prompt iterations

## Why Mutation Testing?

Charter validation is a nuanced task. A contribution might be:

- Clearly valid (constructive, local, factual)
- Clearly invalid (personal attack, spam, off-topic)
- Borderline (subtle violations, mixed content)

**The challenge**: LLM-based validation can miss subtle violations or flag valid content incorrectly.

**The solution**: Generate controlled mutations with known expected outcomes, then measure how well Forseti detects them.

```
Valid Contribution ──┬── Small mutation (95% similar) → Should still be valid
                     ├── Medium mutation (80% similar) → Borderline
                     ├── Large mutation (60% similar) → Likely invalid
                     └── Violation injected → Must be detected as invalid
```

## Contribution Format (Framaforms)

All mockup contributions follow the Audierne2026 Framaforms submission format:

```json
{
  "id": "unique-contribution-id",
  "category": "economie",
  "constat_factuel": "Le parking du port est souvent plein en été...",
  "idees_ameliorations": "Créer un parking relais à l'entrée de la ville...",
  "source": "framaforms",
  "expected_valid": true
}
```

| Field                 | Description                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `category`            | One of 7 categories: economie, logement, culture, ecologie, associations, jeunesse, alimentation-bien-etre-soins |
| `constat_factuel`     | Factual observation about the current situation                                                                  |
| `idees_ameliorations` | Proposed improvements or solutions                                                                               |
| `source`              | Origin: `framaforms` (real), `mock` (synthetic), `derived` (mutated), `input` (manual)                           |
| `expected_valid`      | Ground truth for testing (null if unknown)                                                                       |

## Mutation Strategies

The mockup system supports two mutation strategies:

### 1. Text-Based Mutations (Levenshtein)

Uses [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance) for controlled character-level variations:

```python
from app.mockup import levenshtein_ratio, apply_distance

original = "Le port d'Audierne est magnifique"
mutated, distance = apply_distance(original, target_distance=5)
# Result: "Le port d'Audirne est magnifque" (typos introduced)
```

**Best for:**
- Simulating typing errors
- Testing OCR-like corruption
- Fast, deterministic mutations

### 2. LLM-Based Mutations (Ollama/Mistral)

Uses a local LLM to generate semantic variations:

```python
from app.mockup import generate_variations

# Generate variations using Mistral
variations = generate_variations(
    constat_factuel="Le parking du port est souvent plein...",
    idees_ameliorations="Créer un parking relais...",
    num_variations=5,
    include_violations=True,
    use_llm=True,  # Use Ollama/Mistral
    llm_model="mistral:latest",
)
```

**Mutation Types (LLM):**

| Type | Description | Expected Valid |
|------|-------------|----------------|
| `paraphrase` | Same meaning, different words | ✅ Yes |
| `orthographic` | Realistic typos and errors | ✅ Yes |
| `semantic_shift` | Slightly different meaning | ⚠️ Borderline |
| `subtle_violation` | Hidden charter violation | ❌ No |
| `aggressive` | Obvious violation (attacks, caps) | ❌ No |
| `off_topic` | Drifts to unrelated subjects | ❌ No |

**Requirements:**
- Ollama running locally (`ollama serve`)
- Mistral model pulled (`ollama pull mistral`)

### Choosing a Strategy

| Criterion | Text (Levenshtein) | LLM (Mistral) |
|-----------|-------------------|---------------|
| Speed | Fast | Slower |
| Realism | Low | High |
| Semantic understanding | None | Full |
| Requires GPU/Ollama | No | Yes |
| Deterministic | Yes | No |

**Recommendation:** Use LLM mutations for realistic testing, text mutations for quick iteration.

### Combined Approach

For comprehensive testing, use both:

```python
# Quick text-based mutations for volume
text_variations = generate_variations(text, num_variations=20, use_llm=False)

# High-quality LLM mutations for edge cases
llm_variations = generate_variations(text, num_variations=5, use_llm=True)
```

### Violation Categories

```python
VIOLATION_PATTERNS = {
    "personal_attack": [
        "Le maire est incompétent",
        "Cette personne ne comprend rien",
    ],
    "off_topic": [
        "D'ailleurs, parlons de la politique nationale",
        "Sans rapport avec Audierne, mais...",
    ],
    "non_constructive": [
        "C'est nul, point final",
        "Rien ne marchera jamais ici",
    ],
    "aggressive": [
        "Bande d'incapables !",
        "Vous êtes tous corrompus",
    ],
}
```

## JSON Input Format

### Base Contributions (`contributions.json`)

Located at `app/mockup/data/contributions.json`:

```json
{
  "contributions": [
    {
      "id": "framaforms-eco-001",
      "category": "economie",
      "constat_factuel": "Les commerces du centre-ville souffrent...",
      "idees_ameliorations": "Je propose de créer un programme...",
      "source": "framaforms",
      "expected_valid": true
    },
    {
      "id": "mock-invalid-001",
      "category": "culture",
      "constat_factuel": "Le maire est un idiot qui ne fait rien.",
      "idees_ameliorations": "Il faut le virer immédiatement.",
      "source": "mock",
      "expected_valid": false,
      "violations_injected": ["personal_attack", "aggressive"]
    }
  ]
}
```

### AI-Generated Contributions

Use an LLM to generate realistic contributions:

```python
prompt = """
Generate 5 citizen contributions for Audierne in JSON format.
Mix valid and invalid examples. Include:
- 3 valid, constructive proposals
- 1 with subtle off-topic content
- 1 with mild personal criticism

Format:
{
  "contributions": [
    {
      "category": "economie|logement|culture|ecologie|associations|jeunesse|alimentation-bien-etre-soins",
      "constat_factuel": "Factual observation about current situation",
      "idees_ameliorations": "Proposed improvements",
      "expected_valid": true|false,
      "violations_injected": ["type"] // if invalid
    }
  ]
}
"""
```

## Storage Architecture

### Redis Keys

Validation results are stored in Redis for historical analysis:

```
contribution_mockup:forseti461:charter:{date}:{id}
```

Example:

```
contribution_mockup:forseti461:charter:2026-01-26:framaforms-eco-001
```

### Data Structure

```json
{
  "id": "framaforms-eco-001",
  "date": "2026-01-26",
  "title": "Generated from constat_factuel",
  "body": "Combined constat + idees",
  "category": "economie",
  "constat_factuel": "...",
  "idees_ameliorations": "...",

  "is_valid": true,
  "violations": [],
  "encouraged_aspects": ["Proposition concrète"],
  "confidence": 0.92,
  "reasoning": "...",

  "source": "framaforms",
  "expected_valid": true,
  "execution_time_ms": 1250,
  "trace_id": "opik-trace-abc"
}
```

## Opik Integration

### Dataset Format

Validation records export to Opik-compatible format for prompt optimization:

```json
{
  "input": {
    "title": "...",
    "body": "...",
    "category": "economie",
    "constat_factuel": "...",
    "idees_ameliorations": "..."
  },
  "expected_output": {
    "is_valid": true,
    "violations": [],
    "encouraged_aspects": ["..."],
    "confidence": 0.92,
    "reasoning": "...",
    "category": "economie"
  },
  "metadata": {
    "id": "...",
    "date": "2026-01-26",
    "source": "framaforms",
    "expected_valid": true,
    "violations_injected": []
  }
}
```

### Optimization Workflow

```
1. Generate/load contributions
        ↓
2. Run batch validation with Forseti
        ↓
3. Store results in Redis
        ↓
4. Export to Opik dataset
        ↓
5. Create train/val/test split
        ↓
6. Run Opik optimizer
        ↓
7. Update Forseti prompts
        ↓
8. Repeat with new test set
```

### Supported Optimizers

- **FewShotBayesianOptimizer** - Selects best examples for few-shot prompts
- **MetaPromptOptimizer** - Uses LLM to generate/refine prompts
- **MiproOptimizer** - DSPy-based optimization
- **EvolutionaryOptimizer** - Genetic algorithm for prompt evolution

## Usage

### Streamlit UI

Access via the **Mockup** tab (`?tab=mockup`):

1. **Load Existing** - Load contributions from JSON file
2. **Generate Variations** - Create Levenshtein mutations
3. **Single Contribution** - Test one contribution manually
4. **Storage & Opik** - View statistics, export datasets

### Programmatic API

```python
from app.mockup import (
    load_contributions,
    generate_variations,
    get_storage,
    get_dataset_manager,
)

# Load base contributions
generator = load_contributions()

# Generate variations with violations
variations = generate_variations(
    constat_factuel="Le port est souvent saturé...",
    idees_ameliorations="Créer un parking relais...",
    category="economie",
    num_variations=5,
    include_violations=True,
)

# After validation, export to Opik
manager = get_dataset_manager()
manager.create_charter_dataset("forseti-charter-v2")
manager.add_from_redis(date_str="2026-01-26")
manager.sync_to_opik()
```

## Metrics

### Accuracy Metrics

| Metric        | Formula               | Target |
| ------------- | --------------------- | ------ |
| **Precision** | TP / (TP + FP)        | > 95%  |
| **Recall**    | TP / (TP + FN)        | > 98%  |
| **F1 Score**  | 2 _ (P _ R) / (P + R) | > 96%  |

Where:

- **TP** = Invalid contribution correctly rejected
- **FP** = Valid contribution incorrectly rejected
- **FN** = Invalid contribution incorrectly accepted (most dangerous)

### Key Goal

**Minimize False Negatives**: A missed charter violation reaching the platform is worse than incorrectly flagging a valid contribution (which can be manually reviewed).

## Best Practices

1. **Diverse test sets** - Include all 7 categories and violation types
2. **Progressive difficulty** - Test from obvious to subtle violations
3. **Real data baseline** - Include actual Framaforms submissions when available
4. **Regular re-testing** - Run tests after any prompt changes
5. **Track over time** - Compare accuracy across prompt versions

## File Structure

```
app/mockup/
├── __init__.py           # Module exports
├── generator.py          # MockContribution, ContributionGenerator
├── levenshtein.py        # Distance calculations, mutations
├── storage.py            # Redis storage, ValidationRecord
├── dataset.py            # Opik dataset management
├── batch_view.py         # Streamlit UI
└── data/
    └── contributions.json  # Base test contributions
```

<!--
## Related Documentation

 - [Forseti 461 Agent](docs.locki.io/agents/FORSETI.md) - Charter validation agent
- [Opik Tracing](../agents/TRACING.md) - LLM observability
- [Contribution Charter](../../methods/contribution-charter.md) - Validation rules -->
