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
