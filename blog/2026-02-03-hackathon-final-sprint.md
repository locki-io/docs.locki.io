---
slug: hackathon-final-sprint
title: "The Impossible Sprint: Building Civic AI in 4 Weeks"
authors: [jnxmas]
tags: [encode, civictech, ai-ml, opik, rag, mistral]
image: /img/article_audierne2026_en.png
description: "How we pivoted from OCR blockers to Mistral Document AI in the final hours of the Encode Hackathon - and why civic transparency is worth the chaos."
---

# The Impossible Sprint: Building Civic AI in 4 Weeks

> "It looks impossible - but it's a hackathon. Cheers!"

This is the story of **OCapistaine**, a civic transparency AI built during the Encode "Commit to Change" Hackathon. It's a story of blocked pipelines, strategic pivots, 4,000 municipal PDFs, and the belief that AI can help citizens understand their local democracy.

**Spoiler**: We shipped it. Barely.
![impossible is not ocapistaine](/img/the_impossible_sprint.jpg)

<!-- truncate -->

## The Mission

Audierne is a small coastal town in Brittany, France. Like many municipalities, it has years of public documents - council deliberations, municipal decrees, budget reports - scattered across websites and PDFs. Citizens _technically_ have access, but practically? Good luck finding what you need.

**OCapistaine** aims to change that: a RAG-powered Q&A system where citizens can ask questions in plain French and get answers with source citations. No hallucinations. Full transparency. Trust through traceability.

## The Journey (A Timeline of Chaos)

### Week 1: Foundation

- Built the **Forseti agent** for charter validation (contribution moderation)
- Deployed **N8N orchestration** on our Vaettir server
- Set up **Opik** for LLM observability
- Scraped ~4,000 municipal PDFs via Firecrawl

**Feeling**: Optimistic. We got this.

### Week 2: The OCR Wall

- Text extraction worked for ~1,800 PDFs
- But ~3,000 were **image-based scans** requiring OCR
- Tested pdf2ocr, Tabula, pypdf... all blocked by installation issues
- Victor spent days fighting library dependencies

**Feeling**: Concerned. The RAG needs documents.

### Week 3: The Opik Pivot

- Shifted focus to what _was_ working: **prompt optimization**
- Built an **Opik Prompt Library** - no more hardcoded prompts
- Created **mockup generation** for testing Forseti with synthetic contributions
- Forseti accuracy jumped from ~20% to **90%+**

**Feeling**: Progress, but RAG still blocked.

### Week 4 (Today): The Mistral Gambit

**Sunday, February 3rd, 2026 - 48 hours to deadline**

The team sync call started with bad news: OCR was still blocked. Then someone asked:

> "What if we don't build OCR? What if someone else already did?"

Enter **Mistral Document AI**.

- Native PDF processing with **built-in OCR**
- Batch endpoint with **50% discount**
- Agent API for RAG queries
- ~$2 per 1,000 pages

**The pivot**: Instead of custom RAG infrastructure, use Mistral's managed solution. Upload documents, train an agent, integrate Opik tracing, ship.

**Feeling**: Terrified excitement. Classic hackathon energy.

## The Architecture (Post-Pivot)

```
┌─────────────────────────────────────────────────────────────────┐
│                     OCapistaine Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Municipal PDFs ──► Mistral Document AI ──► Trained Agent       │
│  (~4,000 docs)        (OCR + indexing)       (RAG queries)      │
│                                                    │            │
│                                                    ▼            │
│  Streamlit UI ◄──────────────────────────── Agent API          │
│       │                                           │            │
│       └──────────► Opik Tracing ◄─────────────────┘            │
│                    (observability)                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Forseti Agent: Charter validation for citizen contributions    │
│  N8N Workflows: Email/Facebook → GitHub issue automation        │
│  Vaettir Server: Orchestration and webhook handling             │
└─────────────────────────────────────────────────────────────────┘
```

## What We Built

### 1. Forseti 461 - The Charter Guardian

An LLM agent that validates citizen contributions against the participation charter:

- No personal attacks or naming individuals
- Constructive and factual content
- Relevant to local issues
- Proper category classification (7 categories)

**Results**: 90%+ accuracy after Opik-guided prompt optimization.

### 2. Auto-Contribution Workflow

Citizens can submit ideas via email or Facebook. The system:

1. Receives submission via N8N webhook
2. Validates against charter (Forseti)
3. Creates GitHub issue if compliant
4. Tracks everything in Opik

### 3. RAG Q&A (The Final Sprint)

Upload 4,000+ municipal documents to Mistral, train an agent, let citizens ask:

- "What was the 2024 budget for road maintenance?"
- "When was the last deliberation about the port?"
- "What environmental measures has the council discussed?"

Every answer comes with **source citations**. No trust without transparency.

### 4. Opik Observability

Every LLM call is traced:

- Prompt versions tracked in Opik Prompt Library
- Latency, tokens, and costs monitored
- Hallucination detection via evaluation pipelines
- A/B testing for prompt improvements

## The Trust Architecture

This isn't just about answering questions. It's about **building trust** between citizens and AI systems.

Our approach:

| Layer          | Mechanism          | Transparency              |
| -------------- | ------------------ | ------------------------- |
| **Input**      | Charter validation | Citizens know the rules   |
| **Processing** | Opik tracing       | Every decision is logged  |
| **Output**     | Source citations   | Answers are verifiable    |
| **Feedback**   | Accuracy metrics   | Performance is measurable |

The goal: Civil servants and citizens can **audit** the AI's reasoning. If it's wrong, we know. If it improves, we can prove it.

## Lessons Learned

### 1. Pivots Are Not Failures

The OCR blocker felt like a disaster. The Mistral pivot turned it into an advantage - better OCR, managed infrastructure, faster shipping.

### 2. Observability Is Non-Negotiable

Without Opik, we'd have no idea if Forseti was improving. The prompt library and tracing made optimization possible in days, not weeks.

### 3. Hackathons Require Scope Ruthlessness

We wanted custom embeddings, MongoDB, a full document service. We shipped a working demo by choosing "good enough now" over "perfect later."

### 4. Civic Tech Needs Humans

The best AI can't replace citizen participation. It can only make it **easier** to participate and **harder** for information to be hidden.

## What's Next

Post-hackathon roadmap:

- [ ] Custom vector embeddings for better retrieval
- [ ] MongoDB for document tracking and change detection
- [ ] Multi-channel deployment (dedicated chatbot, Facebook integration)
- [ ] Breton language support (yes, really)
- [ ] Self-improving feedback loops via Opik experiments

## The Team

- **@jnxmas** - Lead, infrastructure, Opik integration, sleep deprivation
- **@zcbtvag** - Backend, Firecrawl scraping, OCR battles, Mistral uploads
- **@GurmeherSingh** - ML engineering, Forseti agent, charter validation

## Try It

- **Live Demo**: [ocapistaine.ngrok.app](https://ocapistaine.ngrok.app)
- **GitHub**: [locki-io/ocapistaine](https://github.com/locki-io/ocapistaine)
- **Docs**: [docs.locki.io](https://docs.locki.io)
- **Opik Dashboard**: [comet.com/opik](https://www.comet.com/opik)

---

## To the Jury

This project exists because we believe:

1. **Local democracy matters** - and it's broken by information asymmetry
2. **AI can help** - but only if it's transparent and auditable
3. **Civic tech should be open** - our code, our process, our mistakes are all public

We didn't build a perfect system. We built a **working** system in 4 weeks, with:

- Real municipal documents (not synthetic data)
- Real observability (not just logs)
- Real transparency (source citations, not "trust me")

The impossible sprint taught us that the hardest part of civic AI isn't the technology. It's earning the trust of the people it's supposed to serve.

We're just getting started.

---

_Built with caffeine, Opik traces, and the stubborn belief that citizens deserve better tools._

**#EncodeHackathon #CommitToChange #CivicTech #OCapistaine**
