# Forseti 461 Architecture

Technical documentation for the Forseti 461 agent implementation.

## Directory Structure

```
app/
├── providers/                 # LLM Provider Abstraction
│   ├── __init__.py           # Factory: get_provider()
│   ├── base.py               # LLMProvider ABC, Message, CompletionResponse
│   ├── config.py             # ProviderConfig (pydantic-settings)
│   ├── gemini.py             # Google Gemini
│   ├── claude.py             # Anthropic Claude
│   ├── mistral.py            # Mistral AI
│   └── ollama.py             # Local Ollama
│
├── agents/
│   ├── __init__.py           # Exports BaseAgent, AgentFeature
│   ├── base.py               # BaseAgent with feature composition
│   ├── tracing/
│   │   ├── __init__.py
│   │   └── opik.py           # AgentTracer, trace_feature decorator
│   └── forseti/
│       ├── __init__.py
│       ├── agent.py          # ForsetiAgent class
│       ├── prompts.py        # PERSONA_PROMPT, feature prompts
│       ├── models.py         # Pydantic models
│       └── features/
│           ├── __init__.py
│           ├── base.py       # FeatureBase ABC
│           ├── charter_validation.py
│           ├── category_classification.py
│           └── wording_correction.py
│
└── api/routes/
    └── validate.py           # REST API endpoints
```

## Core Concepts

### Provider Abstraction

All LLM providers implement the `LLMProvider` abstract base class:

```python
class LLMProvider(ABC):
    @property
    def name(self) -> str: ...
    @property
    def model(self) -> str: ...

    async def complete(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        json_mode: bool = False,
    ) -> CompletionResponse: ...

    async def stream(
        self,
        messages: list[Message],
        temperature: float = 0.7,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]: ...
```

Use the factory to get providers:

```python
from app.providers import get_provider

# Default provider (from DEFAULT_PROVIDER env var)
provider = get_provider()

# Specific provider
provider = get_provider("claude")

# With custom settings
provider = get_provider("gemini", api_key="...", model="gemini-1.5-pro")
```

### Feature Composition

Agents are composed of features that implement the `AgentFeature` protocol:

```python
@runtime_checkable
class AgentFeature(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def prompt(self) -> str: ...

    async def execute(
        self,
        provider: LLMProvider,
        system_prompt: str,
        **kwargs,
    ) -> Any: ...
```

Features are registered with agents and executed independently:

```python
class ForsetiAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.register_feature(CharterValidationFeature())
        self.register_feature(CategoryClassificationFeature())

        if enable_wording:
            self.register_feature(WordingCorrectionFeature())

    # Execute specific feature
    result = await agent.execute_feature("charter_validation", title="...", body="...")

    # Execute all features
    results = await agent.execute_all(title="...", body="...")
```

### Prompt Separation

Prompts are separated into:

1. **Persona Prompt** (system message): Defines WHO the agent is
   - Identity, values, response style
   - Shared across all features

2. **Feature Prompts** (user message): Defines WHAT to do
   - Specific task instructions
   - Expected output format
   - Feature-specific context

```python
# Persona (system prompt)
PERSONA_PROMPT = """You are Forseti 461, the impartial guardian..."""

# Feature prompt (user prompt)
CHARTER_VALIDATION_PROMPT = """Validate this contribution...
TITLE: {title}
BODY: {body}
Return JSON: {"is_valid": ..., "violations": [...]}"""
```

## Data Flow

```
                                  ┌─────────────────┐
                                  │   REST API      │
                                  │ /api/v1/validate│
                                  └────────┬────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────┐
│                      ForsetiAgent                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Persona    │  │  Features   │  │      Provider       │  │
│  │  Prompt     │  │             │  │  (Gemini/Claude/...)│  │
│  └─────────────┘  │ ┌─────────┐ │  └─────────────────────┘  │
│                   │ │Charter  │ │                            │
│                   │ │Validation│──────────┐                  │
│                   │ └─────────┘ │          │                 │
│                   │ ┌─────────┐ │          ▼                 │
│                   │ │Category │ │    ┌──────────┐            │
│                   │ │Classify │─────▶│  LLM     │            │
│                   │ └─────────┘ │    │ Provider │            │
│                   │ ┌─────────┐ │    └──────────┘            │
│                   │ │Wording  │ │          │                 │
│                   │ │Correct  │──────────┘                  │
│                   │ └─────────┘ │                            │
│                   └─────────────┘                            │
└──────────────────────────────────────────────────────────────┘
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

## Migration from Legacy

The new implementation maintains backward compatibility:

```python
# Old way (still works via charterAgent/)
from charterAgent.charter_agent import validate_issue
result = validate_issue(title="...", body="...")

# New way (preferred)
from app.agents.forseti import ForsetiAgent
agent = ForsetiAgent()
result = await agent.validate(title="...", body="...")
```

The `charterAgent/validate_repo.py` script automatically uses the new agent when available.
