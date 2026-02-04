# OCapistaine Application Guide

> **Consolidated documentation for the OCapistaine application stack**
>
> This guide replaces the deprecated `ARCHITECTURE.md`, `FIRECRAWL_GUIDE.md`, and `QUICKSTART.md` from `docs/docs/`.

---

## Overview

OCapistaine is an AI-powered civic transparency system for local democracy in Audierne, France. It processes municipal documents and citizen contributions through a layered architecture.

**Key Components:**
- **Streamlit UI** - Citizen-facing interface (`app/front.py`)
- **FastAPI** - REST API for integrations (`app/main.py`)
- **Forseti Agent** - Charter validation (`app/agents/forseti/`)
- **Mockup System** - Testing framework (`app/mockup/`)
- **Crawlers** - Document acquisition (`src/`)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Streamlit UI  │  │   FastAPI REST  │  │   N8N (Vaettir repo)    │  │
│  │   (front.py)    │  │   (main.py)     │  │   FB / Email / Chat     │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────────┘  │
└───────────┼────────────────────┼─────────────────────┼──────────────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Providers  │  │   Logging   │  │    i18n     │  │    Services     │ │
│  │  (LLM APIs) │  │   System    │  │  (EN/FR)    │  │  (orchestration)│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                             │
│  ┌───────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │         AGENTS (ELv2)         │  │     PROCESSORS (Apache 2.0)     │ │
│  │  ┌─────────────────────────┐  │  │  ┌───────────────────────────┐  │ │
│  │  │ Forseti (Charter)       │  │  │  │ Mockup Processor          │  │ │
│  │  │ RAG Agent (pending)     │  │  │  │ (validation testing)      │  │ │
│  │  └─────────────────────────┘  │  │  └───────────────────────────┘  │ │
│  └───────────────────────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA & EXTERNAL SERVICES                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Redis     │  │  Firecrawl  │  │    Opik     │  │   Vaettir/N8N   │ │
│  │   Cache     │  │   (crawl)   │  │  (tracing)  │  │   (workflows)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
app/                           # Main application (replaces src/ for app code)
├── front.py                   # Streamlit UI entry point
├── sidebar.py                 # Streamlit sidebar
├── main.py                    # FastAPI entry point
├── i18n.py                    # Internationalization (EN/FR)
│
├── agents/                    # AI Agents (ELv2 licensed)
│   ├── forseti/               # Charter validation agent
│   │   ├── agent.py
│   │   ├── features/
│   │   └── prompts.py
│   └── tracing/               # Opik tracing integration
│       └── opik.py
│
├── processors/                # Data processors (Apache 2.0)
│   └── mockup_processor.py    # Charter testing workflow
│
├── mockup/                    # Testing framework (Apache 2.0)
│   ├── generator.py           # Contribution generation
│   ├── levenshtein.py         # Text mutations
│   ├── llm_mutations.py       # LLM-based mutations
│   ├── storage.py             # Redis persistence
│   ├── dataset.py             # Opik export
│   └── batch_view.py          # Streamlit UI
│
├── providers/                 # LLM providers (Apache 2.0)
│   ├── base.py
│   ├── gemini.py
│   ├── mistral.py
│   ├── claude.py
│   └── ollama.py
│
├── logging/                   # Domain logging (Apache 2.0)
│   ├── config.py
│   └── domains.py
│
└── translations/              # i18n JSON files
    ├── en.json
    └── fr.json

src/                           # Crawling utilities (Apache 2.0)
├── config.py                  # Data source configuration
├── firecrawl_utils.py         # Firecrawl manager
├── crawl_municipal_docs.py    # Main crawler script
├── download_pdfs.py           # PDF downloader
├── extract_pdf_urls.py        # URL extraction
└── extract_text_from_pdfs.py  # OCR/text extraction

ext_data/                      # Crawled documents
├── mairie_arretes/            # ~4010 arrêtés
├── mairie_deliberations/      # Council deliberations
└── commission_controle/       # Commission documents
```

---

## Quick Start

### 1. Environment Setup

```bash
# Install dependencies
poetry install

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# - FIRECRAWL_API_KEY
# - GEMINI_API_KEY (or other LLM)
# - OPIK_API_KEY (optional, for tracing)
```

### 2. Run the Application

```bash
# Start Streamlit UI (port 8502)
./scripts/run_streamlit.sh

# Or manually:
poetry run streamlit run app/front.py --server.port 8502

# Start FastAPI (port 8050) - optional
poetry run uvicorn app.main:app --reload --port 8050
```

### 3. Run Document Crawlers

```bash
# Dry run (preview)
poetry run python src/crawl_municipal_docs.py --dry-run

# Scrape single page (test)
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode scrape

# Full crawl
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode crawl --max-pages 100
```

---

## Document Crawling (Firecrawl)

### Data Sources

| Source | URL | Documents |
|--------|-----|-----------|
| `mairie_arretes` | audierne.bzh/publications-arretes/ | ~4010 |
| `mairie_deliberations` | audierne.bzh/deliberations-conseil-municipal/ | ~3965 |
| `commission_controle` | audierne.bzh/systeme/documentheque/?documents_category=49 | Variable |

### Commands

```bash
# Test API connection
poetry run python examples/simple_scrape.py

# Explore structure (single page)
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode scrape

# Limited crawl (validate)
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode crawl --max-pages 10

# Full crawl (production)
poetry run python src/crawl_municipal_docs.py --source all --mode crawl --max-pages 500
```

### Output Structure

```
ext_data/<source>/
├── *.md                        # Markdown content
├── *.html                      # HTML content
├── *_metadata.json             # Page metadata
├── index_<timestamp>.md        # Crawl index
├── crawl_metadata_<timestamp>.json
└── errors.log
```

### PDF Processing

```bash
# Download PDFs from crawled metadata
poetry run python src/download_pdfs.py

# Extract text from PDFs
poetry run python src/extract_text_from_pdfs.py
```

---

## Opik Integration (Dual Tracing)

OCapistaine uses **dual Opik tracing** for complete observability:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OPIK DUAL TRACING                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────┐       ┌─────────────────────────────────┐  │
│  │   OCapistaine App       │       │   Vaettir (N8N Workflows)       │  │
│  │   (Python Tracing)      │       │   (Workflow Tracing)            │  │
│  ├─────────────────────────┤       ├─────────────────────────────────┤  │
│  │ • Forseti agent calls   │       │ • Facebook integrations         │  │
│  │ • LLM provider requests │       │ • Email processing              │  │
│  │ • Mockup validation     │       │ • Chatbot workflows             │  │
│  │ • Charter evaluation    │       │ • Cross-channel orchestration   │  │
│  └───────────┬─────────────┘       └───────────────┬─────────────────┘  │
│              │                                     │                     │
│              └──────────────┬──────────────────────┘                     │
│                             ▼                                            │
│              ┌─────────────────────────────┐                             │
│              │   Comet ML / Opik Dashboard │                             │
│              │   (ocapistaine-dev workspace)│                             │
│              └─────────────────────────────┘                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Dual Tracing?

| Source | What It Traces | Use Case |
|--------|----------------|----------|
| **App (Python)** | Agent logic, LLM calls, validation | Debug prompt performance, measure accuracy |
| **Vaettir (N8N)** | Multi-channel workflows, integrations | Track citizen journey, FB→Agent→Response |

Both feed into the **same Opik workspace** (`ocapistaine-dev`) for unified observability.

### App-Side Configuration

```bash
# .env
OPIK_API_KEY=your_comet_api_key
OPIK_WORKSPACE=ocapistaine-dev
```

### App-Side Usage

```python
from app.agents.tracing.opik import OpikTracer

# Automatic tracing via decorator
@OpikTracer.track
def process_contribution(text: str):
    # Your logic here
    pass

# Or with spans for detailed tracing
with OpikTracer.span("charter_validation") as span:
    result = forseti.validate(contribution)
    span.log_output({"valid": result.is_valid})
```

**Location:** `app/agents/tracing/opik.py`

### Vaettir-Side Integration

Vaettir (N8N) has its own Opik integration for workflow tracing:
- **Repo:** github.com/locki-io/vaettir
- **Traces:** FB messages, email, chatbot interactions
- **Correlation:** Workflow ID links to app traces

### Unified Dashboard

Access all traces at: **comet.com → ocapistaine-dev workspace**

| View | Shows |
|------|-------|
| Traces | All LLM calls from both sources |
| Datasets | Exported mockup contributions |
| Experiments | Prompt optimization results |
| Metrics | Latency, accuracy, cost |

---

## Mockup Testing System

The mockup system tests Forseti's charter validation with controlled variations.

### Generate Test Contributions

```python
from app.mockup.generator import MockContribution, generate_variations

# Create base contribution
base = MockContribution(
    text="Je propose d'améliorer l'éclairage du port",
    category="environnement",
    expected_valid=True
)

# Generate variations
variations = generate_variations(base, count=10)
```

### Run Validation Tests

Access via Streamlit UI → "Mockup" tab, or programmatically:

```python
from app.processors.mockup_processor import MockupProcessor

processor = MockupProcessor()
results = processor.run_batch_validation(contributions)
```

### Export to Opik

```python
from app.mockup.dataset import export_to_opik

export_to_opik(contributions, dataset_name="forseti-charter-2026-01-28")
```

See [MOCKUP.md](./MOCKUP.md) for detailed documentation.

---

## Internationalization (i18n)

The UI supports English and French.

### Usage

```python
from app.i18n import get_text, set_language

set_language("fr")  # or "en"
text = get_text("welcome_message")
```

### Adding Translations

Edit `app/translations/{lang}.json`:

```json
{
  "welcome_message": "Bienvenue sur Ò Capistaine",
  "submit_button": "Soumettre"
}
```

See [I18N.md](./I18N.md) for details.

---

## Logging System

Domain-based logging with rotation.

### Domains

| Domain | Purpose |
|--------|---------|
| `presentation` | UI events |
| `services` | Business logic |
| `agents` | AI agent activity |
| `processors` | Data processing |
| `providers` | LLM API calls |
| `adapters` | External integrations |
| `data` | Data access |

### Usage

```python
from app.logging import get_logger

logger = get_logger("agents")
logger.info("Forseti validation started", extra={"contribution_id": "123"})
```

See [LOGGING.md](./LOGGING.md) for details.

---

## Environment Variables

```bash
# Required
FIRECRAWL_API_KEY=your_key          # Document crawling

# LLM Providers (at least one)
GEMINI_API_KEY=your_key
MISTRAL_API_KEY=your_key
OPENAI_API_KEY=your_key

# Optional
OPIK_API_KEY=your_key               # Tracing (or use Vaettir)
OPIK_WORKSPACE=ocapistaine-dev
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=5
```

---

## Running in Production

### Docker Compose

```yaml
version: "3.8"
services:
  streamlit:
    build: .
    ports:
      - "8502:8502"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

### ngrok (Demo/Hackathon)

```bash
# Start ngrok tunnel
./scripts/start_ngrok.py

# Access at: ocapistaine.ngrok.app
```

---

## License Split

| Component | License | Prize Eligible |
|-----------|---------|----------------|
| `app/providers/` | Apache 2.0 | Yes |
| `app/logging/` | Apache 2.0 | Yes |
| `app/mockup/` | Apache 2.0 | Yes |
| `app/processors/` | Apache 2.0 | Yes |
| `app/i18n.py` | Apache 2.0 | Yes |
| `src/` (crawlers) | Apache 2.0 | Yes |
| `app/agents/` | **ELv2** | No |
| `app/agents/forseti/` | **ELv2** | No |

See the COLLABORATION_ADDENDUM.md file in the repository root for hackathon prize distribution rules.

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [FORSETI_AGENT.md](./FORSETI_AGENT.md) | Forseti agent features and adding new features |
| [PROMPT_MANAGEMENT.md](./PROMPT_MANAGEMENT.md) | Prompt registry and Opik integration |
| [AUTO_CONTRIBUTIONS.md](./AUTO_CONTRIBUTIONS.md) | Auto-contribution workflow |
| [MOCKUP.md](./MOCKUP.md) | Mockup testing system details |
| [LOGGING.md](./LOGGING.md) | Logging system guide |
| [I18N.md](./I18N.md) | Internationalization guide |
| [STREAMLIT_SETUP.md](./STREAMLIT_SETUP.md) | Streamlit configuration |
| [sovereignty/rag-document-storage.md](../sovereignty/rag-document-storage.md) | Data sovereignty & storage architecture |

### Opik & Optimization

| Document | Description |
|----------|-------------|
| [opik/EXPERIMENT_WORKFLOW.md](./opik/EXPERIMENT_WORKFLOW.md) | Prompt optimization experiments |
| [opik/CONTINUOUS_IMPROVEMENT.md](./opik/CONTINUOUS_IMPROVEMENT.md) | Methodology for AI feature improvement |

### Scheduler & Tasks

| Document | Description |
|----------|-------------|
| [scheduler/README.md](./scheduler/README.md) | APScheduler integration |
| [scheduler/TASK_BOILERPLATE.md](./scheduler/TASK_BOILERPLATE.md) | Task implementation guide |
| [scheduler/tasks/TASK_OPIK_EVALUATE.md](./scheduler/tasks/TASK_OPIK_EVALUATE.md) | Scheduled Opik evaluation task |

---

## Troubleshooting

### Firecrawl Issues

```bash
# Check API key
echo $FIRECRAWL_API_KEY

# Test connection
poetry run python examples/simple_scrape.py

# Check errors
cat ext_data/mairie_arretes/errors.log
```

### Redis Connection

```bash
# Verify Redis is running
redis-cli ping

# Check connection
poetry run python -c "from app.data.redis_client import get_redis; print(get_redis().ping())"
```

### Streamlit Port Busy

```bash
# Kill existing process
./scripts/run_streamlit.sh  # Auto-kills port 8502
```

---

## Migration Notes

### From `src/` to `app/`

The `src/` directory now contains only **crawling utilities**. Application code has moved to `app/`:

| Old Location | New Location |
|--------------|--------------|
| `src/agents/` | `app/agents/` |
| `src/services/` | `app/services/` |
| `src/processors/` | `app/processors/` |
| `src/config.py` | `app/providers/config.py` (for app), `src/config.py` (for crawlers) |

### Opik Changes

Opik is now primarily used via **Vaettir** (N8N workflows). Local tracing remains in `app/agents/tracing/opik.py` but is secondary.

---

*Last updated: 2026-01-28*
