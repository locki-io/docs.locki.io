# Test Coverage Report

> Last updated: 2026-02-03
> Overall coverage: **21%** (4930 statements, 3875 missed)

## Executive Summary

The current test suite focuses on **Forseti agent business logic** (charter validation, category classification) which has excellent coverage (96-100%). UI components and external integrations have minimal coverage, which is expected for a Streamlit-based application.

## Coverage by Area

### Well Tested (80-100%)

| Module | Coverage | Notes |
|--------|----------|-------|
| `forseti/features/category_classification.py` | 100% | Core business logic |
| `forseti/features/charter_validation.py` | 100% | Core business logic |
| `agents/forseti/models.py` | 96% | Data models |
| `services/__init__.py` | 100% | Service exports |
| `services/logging/config.py` | 88% | Logging configuration |
| `prompts/constants.py` | 100% | Static definitions |

### Partially Tested (20-79%)

| Module | Coverage | Priority | Notes |
|--------|----------|----------|-------|
| `agents/base.py` | 52% | Medium | Base agent class |
| `agents/forseti/features/base.py` | 80% | Low | Feature base class |
| `processors/workflows/workflow_autocontribution.py` | 72% | Medium | Auto-contribution flow |
| `services/logging/domains.py` | 57% | Low | Domain loggers |
| `providers/base.py` | 71% | Medium | Provider base class |
| `providers/config.py` | 84% | Low | Provider configuration |

### Not Tested (0%)

| Module | Coverage | Priority | Reason |
|--------|----------|----------|--------|
| **Streamlit UI** | | | |
| `front.py` | 0% | Low | UI - requires E2E testing |
| `sidebar.py` | 0% | Low | UI - requires E2E testing |
| `admin/scheduler_dashboard.py` | 0% | Low | UI - requires E2E testing |
| `auto_contribution/views.py` | 0% | Low | UI - requires E2E testing |
| `mockup/batch_view.py` | 0% | Low | UI - requires E2E testing |
| **Scheduler/Tasks** | | | |
| `services/scheduler/__init__.py` | 0% | High | New code, needs tests |
| `services/scheduler/utils.py` | 0% | High | New code, needs tests |
| `services/tasks/__init__.py` | 0% | High | Task boilerplate |
| `services/tasks/task_contributions_analysis.py` | 0% | High | Core task |
| `services/tasks/task_firecrawl.py` | 0% | Medium | Stub implementation |
| `services/tasks/task_opik_experiment.py` | 0% | Medium | Stub implementation |
| **API** | | | |
| `api/routes/validate.py` | 0% | Medium | FastAPI routes |
| `main.py` | 0% | Low | App entry point |
| **Auth** | | | |
| `auth.py` | 0% | Medium | Authentication |

## Improvement Priorities

### Priority 1: Scheduler & Tasks (High Impact)

The scheduler system is new and has no tests. These are critical for reliability:

```
tests/unit/services/
├── scheduler/
│   ├── test_scheduler_init.py      # Scheduler startup, job registration
│   └── test_scheduler_utils.py     # Redis helpers, key management
└── tasks/
    ├── test_task_boilerplate.py    # Lock acquisition, success keys
    └── test_task_contributions.py  # Contributions analysis logic
```

**Key test scenarios:**
- Lock acquisition and release
- Success key prevents duplicate runs
- Task skipping on already completed
- Provider failover logic
- Error handling and recovery

### Priority 2: Provider Testing (Medium Impact)

Providers have 16-20% coverage. Focus on error handling:

```python
# tests/unit/providers/test_provider_errors.py
class TestProviderErrorHandling:
    def test_rate_limit_detection(self):
        """Verify rate limit errors are correctly identified."""

    def test_api_key_missing(self):
        """Verify clear error when API key not configured."""

    def test_timeout_handling(self):
        """Verify timeout errors don't crash the app."""
```

### Priority 3: API Routes (Medium Impact)

The FastAPI validation endpoint needs testing:

```python
# tests/integration/test_api_validate.py
class TestValidateEndpoint:
    def test_validate_contribution_success(self):
        """POST /api/validate returns validation result."""

    def test_validate_missing_fields(self):
        """Returns 400 on missing required fields."""
```

### Not Worth Testing (Low ROI)

| Module | Reason |
|--------|--------|
| Streamlit UI (`front.py`, `sidebar.py`, etc.) | Requires Selenium/Playwright E2E tests. Manual testing is more practical for now. |
| `main.py` | Entry point, tested implicitly |
| Translation loading (`i18n.py`) | Simple JSON loading, low risk |
| Static configurations | No logic to test |

## Coverage Goals

| Timeframe | Target | Focus Areas |
|-----------|--------|-------------|
| Short-term | 30% | Scheduler, Tasks, Provider error handling |
| Medium-term | 45% | API routes, Workflow processors |
| Long-term | 60% | E2E tests with Playwright for critical flows |

## Running Coverage

```bash
# Generate coverage report
poetry run pytest --cov=app --cov-report=term-missing

# Generate HTML report
poetry run pytest --cov=app --cov-report=html
# Open htmlcov/index.html

# Coverage for specific module
poetry run pytest --cov=app/services/scheduler --cov-report=term-missing

# Fail if coverage below threshold
poetry run pytest --cov=app --cov-fail-under=25
```

## Test File Locations

```
tests/
├── conftest.py                           # Shared fixtures
├── test_autocontribution_integration.py  # Auto-contribution tests
├── test_contribution_assistant.py        # Draft generation tests
├── integration/
│   └── test_n8n_integration.py           # N8N webhook tests
└── unit/
    └── forseti/
        ├── test_batch_validation.py      # Batch processing
        ├── test_category_classification.py # Category tests (100%)
        └── test_charter_validation.py    # Charter tests (100%)
```

## Recommended New Test Files

```
tests/
├── unit/
│   ├── services/
│   │   ├── scheduler/
│   │   │   ├── __init__.py
│   │   │   ├── test_scheduler_init.py
│   │   │   └── test_scheduler_utils.py
│   │   └── tasks/
│   │       ├── __init__.py
│   │       ├── test_task_boilerplate.py
│   │       └── test_task_contributions.py
│   └── providers/
│       ├── __init__.py
│       ├── test_provider_base.py
│       └── test_provider_errors.py
└── integration/
    ├── test_api_validate.py
    └── test_redis_storage.py
```

## CI Integration

Add coverage check to CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: poetry run pytest --cov=app --cov-fail-under=25 --cov-report=xml

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    file: ./coverage.xml
```
