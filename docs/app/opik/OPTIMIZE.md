### Optimize with Opik

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
