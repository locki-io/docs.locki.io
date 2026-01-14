---
id: firecrawl
title: Firecrawl Workflow
sidebar_label: Firecrawl
sidebar_position: 3
description: Web scraping workflow for municipal documents
---

# Firecrawl Workflow

## Overview

The Firecrawl workflow collects and processes municipal documents from the Audierne website for the RAG knowledge base.

## Architecture

```
src/
├── config.py                    # Data source configuration
├── firecrawl_utils.py          # Firecrawl manager and utilities
└── crawl_municipal_docs.py     # Main orchestration script

ext_data/
├── mairie_arretes/             # Output: arrêtés & publications
├── mairie_deliberations/       # Output: délibérations
└── commission_controle/        # Output: commission documents
```

## Data Sources

| Source | URL | Method | Expected Count |
|--------|-----|--------|----------------|
| `mairie_arretes` | audierne.bzh/publications-arretes/ | firecrawl+ocr | ~4010 |
| `mairie_deliberations` | audierne.bzh/deliberations-conseil-municipal/ | firecrawl+ocr | - |
| `commission_controle` | audierne.bzh/systeme/documentheque/?documents_category=49 | firecrawl+ocr | - |

## Usage

### Quick Start

```bash
# Set API key
export FIRECRAWL_API_KEY="your_key_here"

# Install dependencies
poetry install

# Dry run
poetry run python src/crawl_municipal_docs.py --dry-run
```

### Scrape Single Page (Testing)

```bash
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode scrape
```

### Crawl Full Site (Production)

```bash
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode crawl --max-pages 500
```

## Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--source` | Which source to process | `all` |
| `--mode` | `scrape` (single page) or `crawl` (full site) | `scrape` |
| `--max-pages` | Maximum pages to crawl | `100` |
| `--api-key` | Firecrawl API key | env var |
| `--dry-run` | Preview without crawling | `false` |

## Output Structure

```
ext_data/<source_name>/
├── <page1>.md                    # Markdown content
├── <page1>.html                  # HTML content
├── <page1>_metadata.json         # Full metadata
├── index_<timestamp>.md          # Index of all pages
├── crawl_metadata_<timestamp>.json
└── errors.log                    # Error log (if any)
```

## Recommended Workflow

### Phase 1: Exploration

```bash
# Test each source structure
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode scrape
```

### Phase 2: Limited Crawl

```bash
# Validate with small sample
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode crawl --max-pages 10
```

### Phase 3: Full Crawl

```bash
# Production crawl
poetry run python src/crawl_municipal_docs.py --source mairie_arretes --mode crawl --max-pages 500
```

### Phase 4: OCR Processing

After Firecrawl completes, process downloaded PDFs:
- Apply OCR (language: French)
- Extract text from scanned documents
- Feed into RAG system

## Troubleshooting

### Rate Limiting
- Wait a few minutes between large crawls
- Reduce `--max-pages`
- Process sources one at a time

### Empty Files
- Check `errors.log` in output directory
- Try `--mode scrape` first to test structure
- Verify URL is accessible

## Integration with Opik

All crawl operations are traced via Opik for observability:
- Track crawl duration and success rates
- Monitor API usage and costs
- Identify problematic pages
