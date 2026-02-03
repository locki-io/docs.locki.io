# OCapistaine Testing Strategy

## Overview

This document outlines the testing strategy for OCapistaine, including unit tests, integration tests, and Opik-based experimentation for LLM optimization.

## Testing Pyramid

```
                    ┌───────────────┐
                    │   E2E Tests   │  Manual / Opik Experiments
                    │   (few)       │
                    └───────┬───────┘
                            │
                ┌───────────┴───────────┐
                │  Integration Tests    │  N8N webhooks, Redis, API
                │  (some)               │
                └───────────┬───────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │           Unit Tests                  │  Agents, Models, Utils
        │           (many)                      │
        └───────────────────────────────────────┘
```

## Test Categories

### 1. Unit Tests (Fast, Mocked)

| Module | Test File | Coverage |
|--------|-----------|----------|
| ForsetiAgent | `test_forseti_agent.py` | Validation logic, prompt generation |
| ContributionAssistant | `test_contribution_assistant.py` | Draft generation, categories |
| ValidationRecord | `test_validation_record.py` | Serialization, Opik format |
| LLM Mutations | `test_llm_mutations.py` | Mutation strategies |

**Principles:**
- Mock all external calls (LLM providers, Redis, HTTP)
- Test business logic in isolation
- Fast execution (< 1s per test)

### 2. Integration Tests (External Dependencies)

| Integration | Test File | What it tests |
|-------------|-----------|---------------|
| N8N Webhooks | `test_n8n_integration.py` | Webhook calls, response handling |
| Redis Storage | `test_redis_integration.py` | ValidationRecord persistence |
| GitHub API | `test_github_integration.py` | Issue fetching (via N8N) |

**Principles:**
- Use test fixtures and mocks where possible
- Mark with `@pytest.mark.integration` for selective running
- Can be skipped in CI if external services unavailable

### 3. Opik Experiments (LLM Evaluation)

Not traditional tests - these are **evaluation runs** that measure LLM performance.

| Experiment | Purpose | Metrics |
|------------|---------|---------|
| Charter Accuracy | Validate Forseti decisions | `CharterAccuracyMetric` |
| Violation Detection | Measure recall on violations | `ViolationDetectionMetric` |
| Confidence Calibration | Confidence vs actual accuracy | `ConfidenceCalibrationMetric` |

## Directory Structure

```
tests/
├── conftest.py                      # Shared fixtures
├── test_contribution_assistant.py   # Existing unit tests
├── test_autocontribution_integration.py  # Existing integration tests
├── unit/
│   ├── forseti/                     # Forseti feature tests → Opik experiments
│   │   ├── test_charter_validation.py     → forseti-charter-accuracy
│   │   ├── test_category_classification.py → forseti-category-accuracy
│   │   └── test_batch_validation.py       → forseti-batch-throughput
│   ├── test_validation_record.py
│   └── test_llm_mutations.py
├── integration/
│   ├── test_n8n_integration.py      # N8N webhook tests
│   └── test_redis_integration.py
└── experiments/
    └── test_opik_experiments.py     # Opik experiment runners
```

## Shared Fixtures (`conftest.py`)

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

# === Mock Providers ===

@pytest.fixture
def mock_llm_provider():
    """Mock LLM provider that returns controlled responses."""
    provider = MagicMock()
    provider.generate = AsyncMock(return_value="mocked response")
    return provider

@pytest.fixture
def mock_forseti_response():
    """Standard Forseti validation response."""
    return {
        "is_valid": True,
        "category": "economie",
        "violations": [],
        "encouraged_aspects": ["Constructive proposal"],
        "reasoning": "The contribution is constructive.",
        "confidence": 0.85
    }

# === Mock External Services ===

@pytest.fixture
def mock_n8n_response():
    """Mock N8N webhook response."""
    return [{
        "success": True,
        "issueNumber": 64,
        "isValid": True,
        "reason": "Label added"
    }]

@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    redis = MagicMock()
    redis.hset = MagicMock(return_value=True)
    redis.hget = MagicMock(return_value=None)
    redis.hgetall = MagicMock(return_value={})
    return redis

# === Sample Data ===

@pytest.fixture
def sample_contribution():
    """Sample contribution for testing."""
    return {
        "title": "[economie] Proposition pour le port",
        "body": "Je propose d'améliorer les infrastructures portuaires...",
        "category": "economie"
    }

@pytest.fixture
def sample_validation_record():
    """Sample ValidationRecord for testing."""
    from app.mockup.storage import ValidationRecord
    return ValidationRecord(
        id="test-123",
        constat_factuel="Le port nécessite des rénovations",
        idees_ameliorations="Moderniser les quais",
        category="economie",
        is_valid=True,
        violations=[],
        encouraged_aspects=["Proposition concrète"],
        reasoning="Contribution constructive",
        confidence=0.9,
        source="test"
    )
```

## N8N Integration Testing

### Approach: Mock HTTP, Not N8N

We don't need a mockup GitHub repo. Instead:

```python
# tests/integration/test_n8n_integration.py

import pytest
from unittest.mock import patch, MagicMock

class TestN8NCharterValidation:
    """Test N8N charter validation webhook integration."""

    @patch("requests.post")
    def test_webhook_called_on_valid_contribution(self, mock_post, mock_n8n_response):
        """N8N webhook is called when Forseti validates as compliant."""
        mock_post.return_value = MagicMock(
            ok=True,
            json=lambda: mock_n8n_response
        )

        # Call the validation function
        from app.front import _validate_with_forseti
        # ... test implementation

        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[1]["json"]["issueNumber"] == 64
        assert call_args[1]["json"]["is_valid"] is True

    @patch("requests.post")
    def test_webhook_not_called_on_invalid(self, mock_post):
        """N8N webhook is NOT called when validation fails."""
        # Mock ForsetiAgent to return is_valid=False
        # ... test implementation

        mock_post.assert_not_called()

    @patch("requests.post")
    def test_handles_n8n_error_gracefully(self, mock_post):
        """App continues working if N8N is unavailable."""
        mock_post.side_effect = requests.RequestException("Connection refused")

        # Should not raise, just log warning
        # ... test implementation
```

### Manual E2E Testing

For full end-to-end testing with real N8N:

```bash
# 1. Use N8N test mode
curl -X POST "https://vaettir.locki.io/webhook-test/forseti/charter-valid" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": 64, "is_valid": true, "category": "logement"}'

# 2. Use a dedicated test issue in real repo
# Issue #999 labeled "test-issue" - safe to modify
```

## Forseti Feature Tests → Opik Experiments Mapping

Each Forseti feature has dedicated unit tests that map directly to Opik experiments:

| Test File | Opik Experiment | Metrics | Purpose |
|-----------|-----------------|---------|---------|
| `test_charter_validation.py` | `forseti-charter-accuracy` | CharterAccuracyMetric, ViolationDetectionMetric | Validate charter compliance decisions |
| `test_category_classification.py` | `forseti-category-accuracy` | CategoryAccuracyMetric, ConfusionMatrix | Validate category assignments |
| `test_batch_validation.py` | `forseti-batch-throughput` | BatchThroughput, BatchAccuracy | Validate batch processing |

### Test Case Categories

Each test file contains test classes that represent different scenarios:

**Charter Validation:**
- `TestCharterValidationCompliant` → Valid contributions (expected is_valid=True)
- `TestCharterValidationNonCompliant` → Invalid contributions (expected is_valid=False)
- `TestCharterValidationEdgeCases` → Ambiguous cases for confidence calibration

**Category Classification:**
- `TestCategoryEconomie`, `TestCategoryLogement`, etc. → Per-category accuracy
- `TestCategoryEdgeCases` → Misclassification scenarios
- `TestCategoryConfusionMatrix` → Common confusion pairs

### From Tests to Opik Datasets

Test fixtures can be exported to Opik datasets:

```python
# Example: Export test cases to Opik dataset
from tests.unit.forseti.test_charter_validation import TestCharterValidationOpikMapping

test_class = TestCharterValidationOpikMapping()
valid_item = test_class.opik_valid_item()
invalid_item = test_class.opik_invalid_item()

# Add to Opik dataset
dataset_manager.add_items([valid_item, invalid_item])
```

## Opik Experimentation Strategy

### Dataset Management

```
┌─────────────────────────────────────────────────────────────┐
│                     Data Pipeline                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Framaforms ──┐                                             │
│               │                                             │
│  Mockup ──────┼──► ValidationRecord ──► Redis ──► Opik     │
│               │         │                          Dataset  │
│  Manual ──────┘         │                             │     │
│                         ▼                             ▼     │
│                   Local Storage              Train/Val/Test │
│                                                   Split     │
└─────────────────────────────────────────────────────────────┘
```

### Experiment Types

#### 1. Accuracy Experiments (Daily)

```python
# Run via MockupProcessor
processor = MockupProcessor(storage, dataset_manager)
results = processor.run_daily_experiment(
    experiment_name=f"forseti-daily-{date}",
    dataset_name="forseti-charter-validation"
)
```

**Metrics tracked:**
- Charter accuracy (is_valid match)
- Violation detection recall
- Confidence calibration

#### 2. Prompt Optimization (Weekly)

```python
# Use Opik Optimizer Studio
from opik_optimizer import optimize_prompt

results = optimize_prompt(
    base_prompt=FORSETI_CHARTER_PROMPT,
    dataset="forseti-charter-training",
    metric="charter_accuracy",
    n_iterations=10
)
```

#### 3. Model Comparison (On-demand)

```python
# Compare providers/models
providers = ["openai:gpt-4", "anthropic:claude-3", "mistral:large"]
for provider in providers:
    processor.run_experiment(
        experiment_name=f"model-comparison-{provider}",
        provider=provider
    )
```

### Dataset Splits

| Dataset | Purpose | Size | Update Frequency |
|---------|---------|------|------------------|
| `forseti-charter-training` | Prompt optimization | 70% | Weekly |
| `forseti-charter-validation` | Experiment evaluation | 15% | Weekly |
| `forseti-charter-test` | Final benchmarks | 15% | Monthly |

## Running Tests

```bash
# All unit tests (fast)
pytest tests/unit/ -v

# Integration tests (requires services)
pytest tests/integration/ -v -m integration

# Skip slow tests
pytest -v -m "not slow"

# With coverage
pytest --cov=app --cov-report=html

# Run Opik experiments (separate from pytest)
python -m app.processors.mockup_processor --experiment daily
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: pytest tests/unit/ -v

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - name: Run integration tests
        run: pytest tests/integration/ -v -m integration
        env:
          REDIS_URL: ${{ secrets.REDIS_URL }}
```

## Opik Dashboard

Access experiment results at: https://www.comet.com/opik

Key dashboards:
- **Forseti Accuracy Trends** - Daily accuracy over time
- **Model Comparison** - Provider/model performance
- **Prompt Versions** - A/B testing results

## Next Steps

1. [ ] Create `conftest.py` with shared fixtures
2. [ ] Split existing tests into `unit/` and `integration/`
3. [ ] Add `test_forseti_agent.py` unit tests
4. [ ] Add `test_n8n_integration.py`
5. [ ] Set up daily Opik experiment automation
6. [ ] Add GitHub Actions workflow for CI
