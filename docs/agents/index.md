Agents are composed of features and prompts (system + user)

## prompts

## Features:

````
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
````

### [Forseti 461](../agents/forseti/):

1. Charter Compliance
   To allow on contribution to pass the inclusion into the program
2. Classification (RAGless)
   To have content that is linked with other contribution on the matter
3. Anonymisation
   To allow processing of transcripts (even if the content is public)
4. Contribution Mutations
   To build up edge case scenarios for agents to practive

### [Ocapistaine](../agents/ocapistaine/):

1. Classification (with RAG)
   Classification with RAG should improve performance at low cost over 95%
2. Contextualisation (with RAG)

### [Niove](../agents/niove/):

### Project-management:

Help with the hackathon organisation of tasks
