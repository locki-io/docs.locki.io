## Hackathon Project name

```
Ò Capistaine !
```

## One-Liner

Making local democracy accessible through AI — because understanding your town council shouldn't require a law degree.

## Overview

Ò Capistaine is an AI-powered civic transparency platform that crawls, processes, and makes accessible 6 years of municipal documents (arrêtés, délibérations, commission reports) for Audierne, France. It serves as a training ground for civic AI agents that help citizens engage with local democracy.

The platform supports [audierne2026.fr](https://audierne2026.fr), a real participatory democracy initiative.

## Project Challenges and Tracks

![alt text](image.png)

## Submission Details

**Key Features:**

- Document Intelligence — 4,000+ municipal documents indexed and searchable (RAG in development)
- Forseti 461 Agent — Charter validation, category classification (7 local themes), and anonymization
- Document Anonymization Pipeline — Three modes (regex, LLM-based, auto-detect) with Opik PII guardrails
- APScheduler Integration — Background tasks for processing, Opik evaluation, prompt sync
- Provider Failover — Automatic chain (ollama → openai → claude → mistral → gemini) + Ollama lock
- Auto-Contribution Workflow — 5-step wizard for generating citizen contributions
- Vaettir N8N Integration — Webhook endpoints for workflow orchestration
- Bilingual UI — Full French/English support
- LLM Observability — Complete Opik tracing, cost tracking, and evaluation

**Status Summary (from last PR):**

- All pre-release tests passed (16/16)
- Transcript + LLM anonymization verified
- Frontend buttons & translations functional
- Redis, Firecrawl, Opik connected (RAG 🟡 in dev)
- Demo video, docs, and blog posts ready

## Links

[Link to Code](https://github.com/locki-io/ocapistaine)
[Link to Demo Video](https://youtu.be/EAZiVUMtfp8)
[Live Demo Link](https://ocapistaine.onrender.com/)
[Link to Presentation](https://www.canva.com/design/DAHAoIZFuWg/-bzA1pSxf2bEpPF5_Pj7rA/edit?utm_content=DAHAoIZFuWg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)
