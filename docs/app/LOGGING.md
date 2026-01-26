# Logging System

OCapistaine uses a domain-based logging system following Separation of Concerns principles. Each architectural layer has its own logger with structured logging methods.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOMAINS                                   │
├─────────────────────────────────────────────────────────────────┤
│  presentation  │  services  │  agents  │  processors  │  data   │
│  (UI, API)     │  (app svc) │  (logic) │  (transform) │ (store) │
└────────┬───────┴─────┬──────┴────┬─────┴──────┬───────┴────┬────┘
         │             │           │            │            │
         ▼             ▼           ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        LOG FILES                                 │
│  logs/                                                           │
│  ├── presentation.log       ├── presentation_errors.log         │
│  ├── services.log           ├── services_errors.log             │
│  ├── agents.log             ├── agents_errors.log               │
│  ├── processors.log         ├── processors_errors.log           │
│  ├── data.log               ├── data_errors.log                 │
│  └── providers.log          └── providers_errors.log            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```python
from app.services import service_logger, ServiceLogger

# Use pre-configured logger
service_logger.log_request(user_id="abc123", operation="chat")

# Or create component-specific logger
rag_logger = ServiceLogger("rag")
rag_logger.log_request(user_id="abc123", operation="query", query="Budget?")
```

## Domain Loggers

### PresentationLogger

For Streamlit UI, FastAPI endpoints, and webhooks.

```python
from app.services import PresentationLogger

logger = PresentationLogger("streamlit")

# Page views
logger.log_page_view(page="contributions", user_id="abc123")

# User actions
logger.log_user_action(action="click_validate", user_id="abc123")

# API requests
logger.log_api_request(
    method="POST",
    path="/api/v1/chat",
    user_id="abc123",
    status_code=200,
    latency_ms=150.5
)

# Webhooks
logger.log_webhook(source="n8n", event_type="issue_created", success=True)
```

### ServiceLogger

For application layer services (orchestrator, RAG, chat, document).

```python
from app.services import ServiceLogger

logger = ServiceLogger("chat")

# Service requests
logger.log_request(
    user_id="abc123",
    operation="send_message",
    query="What is the budget?",
    thread_id="thread_xyz"
)

# Service responses
logger.log_response(
    user_id="abc123",
    operation="send_message",
    success=True,
    latency_ms=1200.0,
    result_count=3
)

# Cache operations
logger.log_cache_hit(cache_type="redis", key="chat:abc123", hit=True)

# Errors
logger.log_service_error(
    operation="send_message",
    error="Provider timeout",
    user_id="abc123",
    recoverable=True
)
```

### AgentLogger

For business logic agents (RAG, crawler, evaluation, Forseti).

```python
from app.services import AgentLogger

logger = AgentLogger("forseti")

# Agent lifecycle
logger.log_agent_start(task="validate_contribution", input_data="Title...")
logger.log_agent_complete(task="validate_contribution", success=True, latency_ms=500)

# RAG operations
logger.log_retrieval(query="budget 2024", num_results=5, top_score=0.89)
logger.log_generation(model="gemini-2.0-flash", input_tokens=500, output_tokens=200)

# Evaluation (Opik)
logger.log_evaluation(metric="hallucination", score=0.95, threshold=0.8, passed=True)

# Validation (Forseti)
logger.log_validation(
    validator="charter",
    is_valid=True,
    violations=[],
    confidence=0.92
)
```

### ProcessorLogger

For business logic processors (embeddings, parser, formatter).

```python
from app.services import ProcessorLogger

logger = ProcessorLogger("embeddings")

# Processing lifecycle
logger.log_process_start(processor="embeddings", input_type="text", input_size=1500)
logger.log_process_complete(processor="embeddings", output_type="vector", output_size=768)

# Embeddings
logger.log_embedding(model="text-embedding-3-small", num_texts=10, dimensions=768)

# Document parsing
logger.log_parse(
    source_type="pdf",
    source_path="/ext_data/gwaien/bulletin_42.pdf",
    success=True,
    pages=12,
    chars=45000
)
```

### DataLogger

For data access layer (Redis, vector store, file storage).

```python
from app.services import DataLogger

logger = DataLogger("redis")

# Connections
logger.log_connection(store="redis", status="connected", host="localhost:6379")

# Operations
logger.log_operation(store="redis", operation="get", key="session:abc123", success=True)

# Redis-specific
logger.log_redis_command(command="HSET", key="chat:abc123:thread1", ttl=604800)

# Vector search
logger.log_vector_search(collection="documents", num_results=5, latency_ms=45.2)

# File operations
logger.log_file_operation(operation="write", path="/ext_data/doc.md", size_bytes=4096)
```

### ProviderLogger

For LLM providers (existing, backwards compatible).

```python
from app.services import ProviderLogger

logger = ProviderLogger("gemini")

logger.log_request(model="gemini-2.0-flash", input_tokens=500, temperature=0.7)
logger.log_response(model="gemini-2.0-flash", output_tokens=200, latency_ms=1200)
logger.log_error("RATE_LIMIT", "Quota exceeded", model="gemini-2.0-flash", retry_after=30)
```

## Log File Configuration

| Domain | Main Log | Error Log | Rotation |
|--------|----------|-----------|----------|
| presentation | presentation.log | presentation_errors.log | 10MB / 5 backups |
| services | services.log | services_errors.log | 10MB / 5 backups |
| agents | agents.log | agents_errors.log | 10MB / 5 backups |
| processors | processors.log | processors_errors.log | 10MB / 5 backups |
| data | data.log | data_errors.log | 10MB / 5 backups |
| providers | providers.log | providers_errors.log | 10MB / 5 backups |

Error logs are rotated daily and kept for 30 days.

## Log Format

```
2026-01-26 14:30:00 | INFO     | ocapistaine.services.rag | REQUEST | operation=query | user_id=abc12345 | query=What is the budget?
```

Format: `timestamp | level | logger_name | message | key=value | key=value ...`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_CONSOLE` | Enable console output for all domains | `false` |
| `PRESENTATION_LOG_CONSOLE` | Console output for presentation | `false` |
| `SERVICES_LOG_CONSOLE` | Console output for services | `false` |
| `AGENTS_LOG_CONSOLE` | Console output for agents | `false` |
| `PROCESSORS_LOG_CONSOLE` | Console output for processors | `false` |
| `DATA_LOG_CONSOLE` | Console output for data | `false` |
| `PROVIDER_LOG_CONSOLE` | Console output for providers | `false` |

## Adding a New Logger

### 1. Create Component Logger

```python
from app.services import ServiceLogger

# Create logger for your component
my_logger = ServiceLogger("my_component")

# Use structured methods
my_logger.log_request(user_id="abc", operation="my_op")

# Or generic methods
my_logger.info("Custom message", key1="value1", key2="value2")
```

### 2. Add Custom Methods (Optional)

```python
from app.logging.domains import BaseLogger

class MyCustomLogger(BaseLogger):
    domain = "services"  # Uses services.log

    def log_my_event(self, event_type: str, data: dict) -> None:
        self.info("MY_EVENT", type=event_type, **data)

# Usage
logger = MyCustomLogger("my_component")
logger.log_my_event("created", {"id": 123, "name": "test"})
```

## Best Practices

1. **Use structured logging** - Prefer `log_*` methods over raw `info/error`
2. **Truncate sensitive data** - User IDs are truncated to 8 chars automatically
3. **Include latency** - Always log `latency_ms` for performance tracking
4. **Use appropriate levels**:
   - `DEBUG`: Detailed diagnostic info (cache hits, individual operations)
   - `INFO`: Normal operations (requests, responses, agent tasks)
   - `WARNING`: Recoverable issues (validation failures, retries)
   - `ERROR`: Failures requiring attention (API errors, data corruption)
