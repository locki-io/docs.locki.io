# Forseti 461 Architecture

Technical documentation for the Forseti 461 agent implementation.

## Agents Directory Structure

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FORSETI 461 AGENT                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  app/agents/forseti/                                                        │
│  ├── __init__.py              Module exports                                │
│  ├── agent.py                 ForsetiAgent class                            │
│  ├── models.py                Pydantic models (ValidationResult, etc.)      │
│  ├── prompts.py               Re-exports from app/prompts/                  │
│  └── features/                                                              │
│      ├── __init__.py          Feature exports                               │
│      ├── base.py              FeatureBase abstract class                    │
│      ├── charter_validation.py                                              │
│      ├── category_classification.py                                         │
│      ├── wording_correction.py                                              │
│      ├── anonymization.py     LLM-based PII anonymization                  │
│      └── translation.py       FR→EN translation (available, not integrated) │
│                                                                             │
│  app/prompts/                                                               │
│  ├── local/forseti.py         Python prompts (fallback)                     │
│  └── local/forseti_charter.json   Opik-synced prompts (chat format)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Concepts

Prompts (System+User) matching concept
[prompts](../../app/core/prompts.md)

## Feature executions

Features are registered with agents and executed independently:
[features details](features_details.md)

## Data Flow

```
                                  ┌─────────────────┐
                                  │   REST API      │
                                  │ /api/v1/validate│
                                  └────────┬────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      ForsetiAgent                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Persona    │  │  Features   │  │      Provider       │  │
│  │  Prompt     │  │             │  │  (Gemini/Claude/...)│  │
│  └─────────────┘  │ ┌─────────┐ │  └─────────────────────┘  │
│                   │ │Charter  │ │                           │
│                   │ │Validation│───────────┐                │
│                   │ └─────────┘ │          │                │
│                   │ ┌─────────┐ │          ▼                │
│                   │ │Category │ │    ┌──────────┐           │
│                   │ │Classify │─────▶│  LLM     │           │
│                   │ └─────────┘ │    │ Provider │           │
│                   │ ┌─────────┐ │    └──────────┘           │
│                   │ │Wording  │ │          │                │
│                   │ │Correct  │────────────┘                │
│                   │ └─────────┘ │                           │
│                   │ ┌─────────┐ │                           │
│                   │ │Anonymize│ │  (standalone, not auto-   │
│                   │ │  (PII)  │ │   registered)             │
│                   │ └─────────┘ │                           │
│                   └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │  AgentTracer    │
                                  │    (Opik)       │
                                  └─────────────────┘
```

## Pydantic Models

### Core Models

```python
class ValidationResult(BaseModel):
    is_valid: bool
    violations: list[str]
    encouraged_aspects: list[str]
    reasoning: str
    confidence: float  # 0.0 - 1.0

class ClassificationResult(BaseModel):
    category: str  # One of CATEGORIES
    reasoning: str
    confidence: float

class FullValidationResult(BaseModel):
    is_valid: bool
    category: str
    original_category: str | None
    violations: list[str]
    encouraged_aspects: list[str]
    reasoning: str
    confidence: float
```

### Anonymization Models

```python
class EntityType(str, Enum):
    PERSON = "PERSONNE"
    EMAIL = "EMAIL"
    PHONE = "TELEPHONE"
    ADDRESS = "ADRESSE"

class DetectedEntity(BaseModel):
    original: str
    placeholder: str
    entity_type: EntityType

class AnonymizationResult(BaseModel):
    anonymized_text: str
    entities: list[DetectedEntity]
    entity_mapping: dict[str, str]
    keywords_extracted: list[str]
    reasoning: str
```

### Batch Models

```python
class BatchItem(BaseModel):
    id: str
    title: str
    body: str
    category: str | None

class BatchResult(BaseModel):
    id: str
    is_valid: bool
    violations: list[str]
    encouraged_aspects: list[str]
    category: str
    reasoning: str
    confidence: float
```

## Configuration

### Environment Variables

```bash
# Provider selection
DEFAULT_PROVIDER=gemini  # gemini | claude | mistral | ollama

# Gemini
GOOGLE_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
GEMINI_RATE_LIMIT=12.0  # seconds between calls

# Claude
ANTHROPIC_API_KEY=...
CLAUDE_MODEL=claude-3-haiku-20240307

# Mistral
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-small-latest

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral:latest

# Tracing
OPIK_API_KEY=...
OPIK_WORKSPACE=...
OPIK_PROJECT=forseti
```

### ProviderConfig

Configuration is managed via pydantic-settings:

```python
from app.providers.config import get_config

config = get_config()
print(config.default_provider)  # "gemini"
print(config.gemini_model)      # "gemini-1.5-flash"
```

## Tracing

### Automatic Feature Tracing

Use the `@trace_feature` decorator:

```python
from app.agents.tracing import trace_feature

class MyFeature(FeatureBase):
    @trace_feature("my_feature")
    async def execute(self, provider, system_prompt, **kwargs):
        # Automatically traced
        return result
```

### Manual Tracing

```python
from app.agents.tracing import get_tracer

tracer = get_tracer()
tracer.trace(
    name="custom_operation",
    input={"title": "..."},
    output={"is_valid": True},
    metadata={"confidence": 0.95},
    tags=["forseti", "custom"],
)
```

## Error Handling

Features fail gracefully with safe defaults:

```python
# Charter validation: fail open (allow content through)
except Exception as e:
    return ValidationResult(
        is_valid=True,  # Fail open
        violations=[],
        reasoning=f"Validation error: {e}",
        confidence=0.5,
    )

# Category classification: use default category
except Exception as e:
    return ClassificationResult(
        category=current_category or CATEGORIES[0],  # Default to first
        reasoning=f"Classification error: {e}",
        confidence=0.5,
    )
```

## Testing

```bash
# Run all tests
poetry run pytest tests/test_providers/ tests/test_agents/

# Test specific provider
poetry run pytest tests/test_providers/test_gemini.py

# Test Forseti agent
poetry run pytest tests/test_agents/test_forseti.py
```
