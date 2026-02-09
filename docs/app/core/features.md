## Implement the Feature Class

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

## feature registry

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

## **Export from features module** (`app/agents/forseti/features/__init__.py`):

```python
from .my_feature import MyFeatureFeature

__all__ = [
    # ... existing ...
    "MyFeatureFeature",
]
```

## **Register in agent** (`app/agents/forseti/agent.py`):

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

## Write Tests

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
