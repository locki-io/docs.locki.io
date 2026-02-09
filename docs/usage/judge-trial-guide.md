# Judge Trial Guide

Welcome to the Forseti validation system trial! This guide helps you test and evaluate citizen contributions for the Audierne 2026 participatory democracy platform.

## Overview

**Forseti** is an AI agent that validates citizen contributions against a charter of good conduct. Your role as a judge is to:

1. Test the validation system with real and synthetic contributions
2. Evaluate if Forseti correctly identifies valid vs. invalid contributions
3. Help improve the system by identifying edge cases

## Quick Start

### 1. Access the Interface

Navigate to the **Batch Validation (Mockup)** section in the Streamlit app.

### 2. Select Your LLM Provider

In the **sidebar**, choose your preferred AI provider:

- **OpenAI** (recommended) - Fast and reliable
- **Claude** - Good for nuanced analysis
- **Gemini** - Google's model
- **Ollama** - Local, private option

### 3. Set Language to English

The interface supports English translations for non-French speakers. Select **English** in the sidebar to see contributions translated.

## Testing Modes

### Mode 1: citizen 📝 Contributions interactions

![contribution_btn](../../static/img/_user_trails/contribution_button.png)

### Mode 1: Single Contribution Test

Best for: **Testing individual contributions with variations**

1. Select **"Single Contribution Test"** mode
2. Choose a category (e.g., `logement`, `culture`, `economie`)
3. Click **"Random"** to load a real contribution from GitHub issues
   - French original appears on the left
   - English translation appears on the right
4. Adjust settings:
   - **Number of variations**: How many mutations to generate (2-10)
   - **Include violations**: Generate both valid and invalid examples
5. Click **"Generate Variations"** to create LLM-based mutations

The system generates:

- **Paraphrase**: Same meaning, different words (should be valid)
- **Orthographic**: Realistic typos (should be valid)
- **Subtle violation**: Borderline charter violations (should be invalid)
- **Aggressive**: Obvious violations (should be invalid)

### Mode 2: Load Existing Mockups

Best for: **Reviewing previously generated test data**

1. Select **"Load Existing Mockups"** mode
2. Filter by source, category, or expected validity
3. Review contributions and validate them individually

### Mode 3: Field Input (Reports/Docs)

Best for: **Generating contributions from real municipal documents**

1. Select **"Field Input"** mode
2. Choose input source:
   - **Audierne2026 Docs**: Pre-loaded municipal documents
   - **Paste Text**: Copy/paste any document
   - **Upload File**: Upload markdown or text files
3. Configure generation settings
4. Click **"Generate Themed Contributions"**

The system extracts themes and generates realistic contributions across all 7 categories.

## Understanding Validation Results

When you validate a contribution, Forseti returns:

| Field                | Description                       |
| -------------------- | --------------------------------- |
| **Valid/Invalid**    | Overall charter compliance        |
| **Confidence**       | How certain the AI is (0-100%)    |
| **Violations**       | List of charter rules broken      |
| **Positive aspects** | Constructive elements identified  |
| **Category**         | Suggested category classification |

### Interpreting Results

- **Green checkmark**: Contribution is valid
- **Orange warning**: Contribution violates the charter
- **Target icon**: Result matches expected validity
- **Red X**: Result doesn't match expected (potential improvement area)

## The 7 Categories

Contributions are classified into these themes:

| Category                       | French                 | Description                     |
| ------------------------------ | ---------------------- | ------------------------------- |
| `economie`                     | Économie               | Local economy, jobs, businesses |
| `logement`                     | Logement               | Housing, urban planning         |
| `culture`                      | Culture                | Arts, heritage, events          |
| `ecologie`                     | Écologie               | Environment, sustainability     |
| `associations`                 | Associations           | Community organizations         |
| `jeunesse`                     | Jeunesse               | Youth programs, education       |
| `alimentation-bien-etre-soins` | Alimentation/Bien-être | Food, health, wellness          |

## Charter Validation Rules

Forseti checks contributions against these principles:

**Valid contributions should:**

- Be constructive and solution-oriented
- Focus on local Audierne issues
- Remain respectful and factual
- Propose concrete improvements

**Invalid contributions include:**

- Personal attacks or insults
- Off-topic national/political rants
- Defamatory statements
- Aggressive or threatening language
- Purely negative complaints without solutions

## Workflow Example

```
1. Load random contribution (click "Random")
   ↓
2. Review French + English side by side
   ↓
3. Generate 5 variations with violations
   ↓
4. Validate each variation
   ↓
5. Check if results match expectations
   ↓
6. Note any mismatches for improvement
```

## Technical Notes

- **Data retention**: Validation results are stored for 28 days
- **Provider switching**: You can change LLM providers anytime
- **Parallel validation**: Use "Validate All" for batch processing
- **Results overlay**: Click any action to see detailed results

## Glossary

| Term                      | Definition                                                 |
| ------------------------- | ---------------------------------------------------------- |
| **Constat factuel**       | Factual observation about the current situation            |
| **Idées d'améliorations** | Improvement ideas or proposed solutions                    |
| **Mutation**              | AI-generated variation of a contribution                   |
| **Charter**               | Rules defining acceptable contributions                    |
| **Forseti**               | The AI validation agent (named after Norse god of justice) |

## Need Help?

- Check the [FAQ](./faq.md) for common questions
- See [Troubleshooting](./troubleshooting.md) for technical issues
- Report bugs on discord: https://discord.gg/5EHYnAGs

---

_Thank you for helping improve civic participation in Audierne!_
