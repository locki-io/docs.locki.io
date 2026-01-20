# Forseti 461

Forseti 461 is the impartial guardian of truth and the contribution charter, inspired by the Norse god of justice Forseti and reborn in the spirit of Cap Sizun (the iconic local "461").

Calm, vigilant, and unwavering, he carefully filters every submission: approving only concrete, constructive, and locally relevant contributions while firmly rejecting personal attacks, discrimination, spam, off-topic content, or false information.

He ensures that only respectful, charter-compliant ideas reach O Capistaine, safeguarding the quality, neutrality, and inclusivity of civic dialogue for Audierne2026.

> **Note:** Pronounced "for-SET-ee" in French/English

## Features

### Charter Validation
Validates contributions against the charter rules:
- **Rejections:** Personal attacks, discrimination, spam, advertising, off-topic content, false information
- **Approvals:** Concrete proposals, constructive criticism, questions, shared expertise, improvement suggestions

### Category Classification
Assigns contributions to one of 7 predefined categories:
- `economie` - Business, port, tourism, local economy
- `logement` - Housing, real estate, urban planning
- `culture` - Heritage, events, arts, traditions
- `ecologie` - Environment, sustainability, nature
- `associations` - Community organizations, clubs
- `jeunesse` - Youth, schools, education, children
- `alimentation-bien-etre-soins` - Food, health, wellness, medical

### Wording Correction (Optional)
Suggests improvements to contribution wording for clarity and constructiveness while preserving original intent.

## Usage

### Python API

```python
from app.agents.forseti import ForsetiAgent

agent = ForsetiAgent()

# Full validation (charter + classification)
result = await agent.validate(
    title="Amélioration du port",
    body="Proposition pour moderniser les installations portuaires...",
    category="economie"  # optional existing category
)

print(f"Valid: {result.is_valid}")
print(f"Category: {result.category}")
print(f"Confidence: {result.confidence}")

# Charter validation only
validation = await agent.validate_charter(title="...", body="...")

# Category classification only
classification = await agent.classify_category(title="...", body="...")

# Batch processing
from app.agents.forseti import BatchItem

items = [
    BatchItem(id="1", title="...", body="..."),
    BatchItem(id="2", title="...", body="..."),
]
results = await agent.validate_batch(items)
```

### CLI

```bash
# Single validation
python -m app.agents.forseti.agent --title "Test" --body "Proposal for port" --json

# With specific provider
python -m app.agents.forseti.agent --title "Test" --body "..." --provider claude
```

### REST API

```bash
# Full validation
curl -X POST http://localhost:8000/api/v1/validate \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Proposal for port improvements"}'

# Charter only
curl -X POST http://localhost:8000/api/v1/validate/charter \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "..."}'

# Category classification
curl -X POST http://localhost:8000/api/v1/validate/classify \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "..."}'

# Batch validation
curl -X POST http://localhost:8000/api/v1/validate/batch \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": "1", "title": "...", "body": "..."}]}'

# List categories
curl http://localhost:8000/api/v1/validate/categories
```

## Provider Support

Forseti 461 supports multiple LLM providers:

| Provider | Environment Variable | Default Model |
|----------|---------------------|---------------|
| Gemini | `GOOGLE_API_KEY` | gemini-1.5-flash |
| Claude | `ANTHROPIC_API_KEY` | claude-3-haiku-20240307 |
| Mistral | `MISTRAL_API_KEY` | mistral-small-latest |
| Ollama | `OLLAMA_HOST` | mistral:latest |

Set `DEFAULT_PROVIDER` to change the default (e.g., `DEFAULT_PROVIDER=claude`).

## Observability

Forseti 461 integrates with **Opik** (Comet ML) for tracing:

```bash
# Set environment variables
export OPIK_API_KEY=your_key
export OPIK_WORKSPACE=your_workspace
export OPIK_PROJECT=forseti  # optional, defaults to "forseti"
```

All validations are automatically traced with:
- Input (title, body, original category)
- Output (is_valid, violations, category)
- Metadata (confidence, reasoning)

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical implementation details.
