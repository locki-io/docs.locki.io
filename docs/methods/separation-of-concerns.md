---
id: separation-of-concerns
title: Separation of Concerns
sidebar_label: Separation of Concerns
sidebar_position: 2
description: Modular design for workflows and code organization
---

# Separation of Concerns (SoC)

## Overview

Separation of Concerns is a design principle for separating a system into distinct sections, each addressing a separate concern. In OCapistaine, we apply this to both code architecture and workflow design.

## Application in OCapistaine

### Code Architecture

| Layer | Concern | Implementation |
|-------|---------|----------------|
| **Data Collection** | Web scraping & OCR | `src/firecrawl_utils.py` |
| **Configuration** | Data sources & settings | `src/config.py` |
| **Orchestration** | CLI & workflow control | `src/crawl_municipal_docs.py` |
| **Storage** | Document persistence | `ext_data/` directory |

### Workflow Separation

| Workflow | Responsibility |
|----------|---------------|
| **Firecrawl** | Document acquisition |
| **OCR Processing** | Text extraction from PDFs |
| **RAG System** | Semantic search & Q&A |
| **N8N Orchestration** | Multi-channel integration |

## Benefits

1. **Maintainability** - Changes to one concern don't affect others
2. **Testability** - Each component can be tested independently
3. **Scalability** - Components can be scaled based on load
4. **Collaboration** - Team members can work on different concerns simultaneously

## Related Principles

- [TRIZ Methodology](/docs/methods/triz) - Principle #1 Segmentation
- [Theory of Constraints](/docs/methods/theory-of-constraints) - Focus on bottlenecks
