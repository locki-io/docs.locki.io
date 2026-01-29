# Forseti 461 Agent

## Overview

Forseti 461 is the charter validation agent for Audierne2026, named after the Norse god of justice. It validates citizen contributions against the community charter, classifies them into categories, and optionally suggests wording improvements.

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
│      └── wording_correction.py                                              │
│                                                                             │
│  app/prompts/                                                               │
│  ├── local/forseti.py         Python prompts (fallback)                     │
│  └── local/forseti_charter.json   Opik-synced prompts (chat format)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Features

### Feature 1: Charter Validation

Validates contributions against the charter rules.

| Property | Value |
|----------|-------|
| Class | `CharterValidationFeature` |
| Prompt | `forseti.charter_validation` |
| Opik Name | `forseti461-user-charter-28012026` |
| Variables | `title`, `body` |
| Output | `ValidationResult` |

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

| Property | Value |
|----------|-------|
| Class | `CategoryClassificationFeature` |
| Prompt | `forseti.category_classification` |
| Opik Name | `forseti461-user-category-29012026` |
| Variables | `title`, `body`, `current_category_line` |
| Output | `ClassificationResult` |

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

| Property | Value |
|----------|-------|
| Class | `WordingCorrectionFeature` |
| Prompt | `forseti.wording_correction` |
| Opik Name | `forseti461-user-wording-29012026` |
| Variables | `title`, `body` |
| Output | `WordingResult` |

**Improvements include:**
- Clarity and readability
- Grammar corrections
- More constructive phrasing
- Removing inflammatory language

### Batch Validation (Experiments)

Batch validation is handled as **Opik experiments**, not as a feature class. This allows:
- A/B testing different prompt versions
- Tracking metrics across validation runs
- Comparing performance over time

See [PROMPT_MANAGEMENT.md](./PROMPT_MANAGEMENT.md) for experiment setup.

## Prompt Organization

### Shared System Prompt

All features share the same persona (system message):

```
forseti.persona
├── Opik: forseti461-system-charter-28012026
├── Commit: a5195f45
└── Used by: ALL features
```

### Feature Prompts (User Messages)

Each feature has its own user prompt optimized for its task:

| Feature | Local Name | Opik Name | Status |
|---------|------------|-----------|--------|
| Charter | `forseti.charter_validation` | `forseti461-user-charter-28012026` | ✅ Synced |
| Category | `forseti.category_classification` | `forseti461-user-category-29012026` | ✅ Synced |
| Wording | `forseti.wording_correction` | `forseti461-user-wording-29012026` | ✅ Synced |

## Adding a New Feature

Follow this procedure to add a new feature with Opik integration.

### Step 1: Define the Prompt

1. **Create the prompt template** in `app/prompts/local/forseti.py`:

```python
MY_FEATURE_PROMPT = """You are performing [task description].

[Context and instructions]

Analyze the following contribution:

TITLE: {title}
BODY: {body}

Return a JSON object with:
- "field1": description
- "field2": description

Return JSON only, no markdown fences."""
```

2. **Add to PROMPTS dict**:

```python
PROMPTS = {
    # ... existing prompts ...
    "forseti.my_feature": {
        "template": MY_FEATURE_PROMPT,
        "type": "user",
        "variables": ["title", "body"],
        "description": "Description of what this feature does",
    },
}
```

### Step 2: Create the Result Model

Add to `app/agents/forseti/models.py`:

```python
class MyFeatureResult(BaseModel):
    """Result from my feature."""
    field1: str
    field2: list[str]
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)
```

### Step 3: Implement the Feature Class

Create `app/agents/forseti/features/my_feature.py`:

```python
"""
My Feature

Description of what this feature does.
"""

from app.providers import LLMProvider

from ..models import MyFeatureResult
from ..prompts import MY_FEATURE_PROMPT
from .base import FeatureBase


class MyFeatureFeature(FeatureBase):
    """
    Feature for [description].
    """

    @property
    def name(self) -> str:
        return "my_feature"

    @property
    def prompt(self) -> str:
        return MY_FEATURE_PROMPT

    async def execute(
        self,
        provider: LLMProvider,
        system_prompt: str,
        title: str,
        body: str,
        **kwargs,
    ) -> MyFeatureResult:
        """
        Execute the feature.

        Args:
            provider: LLM provider.
            system_prompt: Agent persona prompt.
            title: Contribution title.
            body: Contribution body.

        Returns:
            MyFeatureResult with results.
        """
        user_prompt = self.format_prompt(title=title, body=body)

        try:
            data = await self._get_json_response(
                provider=provider,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
            )

            return MyFeatureResult(
                field1=data.get("field1", ""),
                field2=data.get("field2", []),
                reasoning=data.get("reasoning", ""),
                confidence=float(data.get("confidence", 0.5)),
            )
        except Exception as e:
            return MyFeatureResult(
                field1="",
                field2=[],
                reasoning=f"Error: {e}",
                confidence=0.5,
            )
```

### Step 4: Register the Feature

1. **Export from features module** (`app/agents/forseti/features/__init__.py`):

```python
from .my_feature import MyFeatureFeature

__all__ = [
    # ... existing ...
    "MyFeatureFeature",
]
```

2. **Register in agent** (`app/agents/forseti/agent.py`):

```python
from .features import MyFeatureFeature

class ForsetiAgent(BaseAgent):
    def __init__(self, ..., enable_my_feature: bool = False):
        # ...
        if enable_my_feature:
            self.register_feature(MyFeatureFeature())

    async def my_feature(self, title: str, body: str) -> MyFeatureResult:
        """Public method for the feature."""
        return await self.execute_feature("my_feature", title=title, body=body)
```

### Step 5: Sync to Opik

1. **Add to JSON file** (`app/prompts/local/forseti_charter.json`):

```json
{
  "forseti.my_feature": {
    "name": "forseti461-user-myfeature-DDMMYYYY",
    "opik_commit": null,
    "type": "user",
    "format": "chat",
    "variables": ["input.title", "input.body"],
    "description": "Description",
    "messages": [
      {
        "role": "user",
        "content": "Your prompt with {{input.title}} and {{input.body}} variables"
      }
    ]
  }
}
```

2. **Sync to Opik**:

```bash
python -m app.prompts.opik_sync --prefix forseti.my_feature
```

3. **Update commit hash** after sync:
   - Get the commit ID from Opik UI or API
   - Update `opik_commit` in the JSON file

### Step 6: Write Tests

Create `tests/test_my_feature.py`:

```python
import pytest
from unittest.mock import AsyncMock, patch

from app.agents.forseti import ForsetiAgent
from app.agents.forseti.models import MyFeatureResult


@pytest.fixture
def mock_provider():
    provider = AsyncMock()
    provider.complete.return_value = AsyncMock(
        content='{"field1": "test", "field2": [], "reasoning": "ok", "confidence": 0.9}'
    )
    return provider


@pytest.mark.asyncio
async def test_my_feature(mock_provider):
    agent = ForsetiAgent(provider=mock_provider, enable_my_feature=True)
    result = await agent.my_feature(title="Test", body="Content")

    assert isinstance(result, MyFeatureResult)
    assert result.field1 == "test"
```

### Step 7: Optimize with Opik (Optional)

Once you have validation data, optimize the prompt:

```python
from app.prompts import optimize_forseti_charter

# Create a dataset in Opik with labeled examples
result = optimize_forseti_charter(
    dataset_name="forseti-my-feature-training",
    optimizer_type="meta_prompt",
    num_iterations=50,
)

print(f"Best score: {result.best_score:.2%}")
```

## Usage

### Basic Usage

```python
from app.agents.forseti import ForsetiAgent

agent = ForsetiAgent()

# Full validation (charter + classification)
result = await agent.validate(
    title="Proposition pour le port",
    body="Je propose d'améliorer l'éclairage du port..."
)

print(f"Valid: {result.is_valid}")
print(f"Category: {result.category}")
```

### Individual Features

```python
# Charter validation only
validation = await agent.validate_charter(title="...", body="...")

# Category classification only
classification = await agent.classify_category(title="...", body="...")

# Wording correction (requires enable_wording=True)
agent = ForsetiAgent(enable_wording=True)
wording = await agent.correct_wording(title="...", body="...")
```

### With Tracing

```python
from app.agents.tracing import get_tracer

tracer = get_tracer()
agent = ForsetiAgent(tracer=tracer)

# Traces automatically recorded to Opik
result = await agent.validate(title="...", body="...")
```

## Related Documentation

- [PROMPT_MANAGEMENT.md](./PROMPT_MANAGEMENT.md) - Prompt registry and Opik integration
- [AUTO_CONTRIBUTIONS.md](./AUTO_CONTRIBUTIONS.md) - Auto-contribution workflow using Forseti
- [LOGGING.md](./LOGGING.md) - Structured logging for agents
