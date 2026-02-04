---
slug: grounding-ai-in-reality
title: "Grounding AI in Reality: How Field Data Keeps Our Agents Honest"
authors: [jnxmas]
tags: [ai-ml, civictech, methodology, continuous-improvement, forseti]
image: /img/continuous_improvement_loop.png
description: "How real-world inputs from recordings, meetings, and press keep AI agents from drifting into comfortable bubbles"
---

# Grounding AI in Reality: How Field Data Keeps Our Agents Honest

**The daily practice of challenging AI prompts with messy, real-world data**

<!-- truncate -->

## The Bubble Problem

Every AI system risks becoming a bubble. Train it on clean data, test it on similar clean data, and it performs beautifully—in the lab. Then reality arrives:

- A citizen uses slang the model never saw
- A press article frames an issue differently than our categories expect
- A field recording captures a concern that doesn't fit our charter's neat boxes
- An official explains a nuance that our prompts don't account for

**The AI doesn't know what it doesn't know.** And worse: it will confidently give wrong answers, because its training data said that's how the world works.

This is the gap between [our trust-building vision](/blog/self-improving-civic-ai) and daily reality. The vision is beautiful. The practice is messy. This article is about the messy part.

## Our Reality Streams

We're constantly receiving signals from the field. Each one is a potential challenge to our AI's worldview:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REALITY STREAMS INTO SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  PLAUD AI    │   │  CITIZEN     │   │  OFFICIAL    │   │    PRESS     │  │
│  │  Recordings  │   │  Contribs    │   │  Meetings    │   │   Articles   │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  │
│         │                  │                  │                  │          │
│         │   Unstructured   │   Structured     │   Context-rich   │  External│
│         │   Spontaneous    │   Intentional    │   Nuanced        │  Framing │
│         │   Local dialect  │   Formal tone    │   Political      │  Diverse │
│         │                  │                  │                  │          │
│         └──────────────────┼──────────────────┼──────────────────┘          │
│                            │                  │                              │
│                            ▼                  ▼                              │
│                    ┌─────────────────────────────────┐                       │
│                    │      DOES THIS CHALLENGE        │                       │
│                    │      OUR AI'S ASSUMPTIONS?      │                       │
│                    └─────────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Plaud AI Recordings

We record field conversations (with consent). A fisherman explaining why the port needs work doesn't speak like a formal contribution. He uses local terms, references shared history, expresses frustration in ways our polite training data never showed.

**Challenge**: Can Forseti recognize validity when the tone is raw?

### Citizen Contributions

These are our bread and butter—but they surprise us constantly. Edge cases appear weekly:
- A contribution that's clearly well-intentioned but technically violates charter rules
- A valid concern expressed as a complaint about a specific person (borderline personal attack?)
- A suggestion that spans multiple categories

**Challenge**: Are our categories and rules aligned with how citizens actually think?

### Official Meetings

When we meet with municipal staff, they explain the *why* behind policies. "We categorize it this way because of budget structure." "That phrase is actually a compliment in local context." These insights rarely make it into training data.

**Challenge**: Does our AI understand institutional context, or just surface patterns?

### Press Articles

Local journalists frame issues differently than citizens or officials. They highlight tensions, use dramatic language, connect dots across topics. When Gwaien (local bulletin) publishes about port renovation, it's a different lens than a citizen contribution about the same topic.

**Challenge**: Can our AI maintain consistent judgment across different framings of the same issue?

## The Daily Practice

Understanding that reality challenges our AI is step one. Step two is building a *daily practice* of grounding. Here's ours:

### 1. Morning: Error Cleanup

Before any analysis, we clean the noise:

```python
from app.processors.workflows.workflow_experiment import cleanup_error_traces

# Every morning: remove traces that contain errors
# These pollute our optimization if left in place
result = cleanup_error_traces()
print(f"Cleaned {result['deleted']} error traces")
```

**Why daily?** Errors accumulate. "Gemini retries exhausted" isn't a valid data point—it's infrastructure noise. Leaving it in skews our metrics toward false pessimism.

### 2. Midday: Format Compliance Check

We measure how well our AI outputs match the *ideal* format:

```python
# The ideal output we're optimizing toward
IDEAL_CHARTER_OUTPUT = {
    "is_valid": True,
    "violations": [],
    "encouraged_aspects": [
        "Concrete and argued proposals",
        "Constructive criticism",
        "Questions and requests for clarification",
    ],
    "reasoning": "Clear explanation...",
    "confidence": 0.95,
}
```

The `output_format` metric scores every output against this ideal (0.0 to 1.0):
- Missing fields? Score drops.
- Error in reasoning? Score drops significantly.
- Valid but no positive aspects identified? Score drops.

**Why format matters?** An AI that gives the right answer in the wrong format is hard to integrate, hard to audit, hard to trust. Consistency enables trust.

### 3. Afternoon: New Data Evaluation

The scheduled task processes any new spans from the morning's work:

```
Every 30 minutes:
├─ Search for spans not yet evaluated
├─ Create dataset from new spans
├─ Run Opik evaluate() with metrics
│   ├─ hallucination (is the AI making things up?)
│   └─ output_format (is output structured correctly?)
└─ Report results
```

This catches drift *the same day* it appears. Not next week. Not at quarterly review. Today.

### 4. Evening: Field Data Integration

This is the creative part. We take the day's field inputs and ask: **does any of this break our AI?**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EVENING CHALLENGE PROTOCOL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  For each new field input (recording, article, meeting note):                │
│                                                                              │
│  1. EXTRACT the core claim/concern                                           │
│     "The port access road is dangerous" (from Plaud recording)               │
│                                                                              │
│  2. FORMULATE as a test contribution                                         │
│     Title: "Sécurité de la route d'accès au port"                           │
│     Body: [transcribed concern in citizen language]                          │
│                                                                              │
│  3. RUN through Forseti                                                      │
│     → Is it classified correctly?                                            │
│     → Is confidence appropriate?                                             │
│     → Does reasoning make sense?                                             │
│                                                                              │
│  4. IF surprising result:                                                    │
│     → Log as potential prompt challenge                                      │
│     → Add to next experiment batch                                           │
│     → Consider: is the AI wrong, or are our rules wrong?                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

The last question is crucial: sometimes the AI is wrong and needs fixing. Sometimes our rules are wrong and need updating. Both are valid outcomes.

## The Metrics That Matter

We track specific signals that indicate grounding vs. drift:

### Grounding Indicators (Good)

| Metric | Meaning | Target |
|--------|---------|--------|
| Output format score | AI produces consistent structure | ≥ 0.85 |
| Confidence calibration | When AI says 90%, it's right 90% | Within 5% |
| Field case accuracy | AI handles real recordings correctly | ≥ 80% |
| Category consistency | Same topic → same category | ≥ 90% |

### Drift Indicators (Warning)

| Metric | Meaning | Concern Level |
|--------|---------|---------------|
| Rising error rate | More "validation error" traces | High |
| Dropping format score | Outputs becoming inconsistent | Medium |
| Confidence inflation | AI overconfident on edge cases | High |
| Category confusion | Same topic → different categories | Medium |

### Bubble Indicators (Critical)

| Signal | What It Means |
|--------|---------------|
| Field cases consistently fail | AI model doesn't match reality |
| Officials disagree with classifications | Institutional context missing |
| Press framings confuse the AI | Limited linguistic flexibility |
| Citizens appeal correct classifications | Rules don't match expectations |

When bubble indicators appear, we don't just tune the model. We question the rules.

## Challenging the Prompt: A Worked Example

Here's how a single Plaud recording becomes a prompt challenge:

### The Recording

A fisherman at the port, speaking informally:

> "Le quai là, c'est n'importe quoi. Ça fait trois ans qu'on demande et rien. Les touristes ils passent, ils voient ça, qu'est-ce qu'ils pensent? Faut arrêter de dépenser pour les conneries et s'occuper du port."

### Initial AI Response

```
is_valid: false
violations: ["Potentially inappropriate language: 'conneries'"]
confidence: 0.72
reasoning: "The contribution contains informal language that may
            violate charter guidelines on respectful discourse."
```

### The Challenge

Wait. This is a legitimate concern about port infrastructure, expressed in authentic local language. Is "conneries" really a charter violation, or is our prompt too sanitized?

### The Investigation

We check:
1. **Charter text**: Does it actually prohibit informal language? No—it prohibits personal attacks and insults.
2. **Official input**: Would municipal staff consider this offensive? We ask. They laugh. "That's how people talk here."
3. **Citizen expectation**: Would the speaker feel unfairly filtered? Almost certainly yes.

### The Prompt Update

We add to our charter validation prompt:

```
Note: Informal or colloquial language common in Brittany
(e.g., expressing frustration with strong words about situations,
not people) should not be confused with charter violations.
The charter prohibits attacks on individuals, not passionate
expression about issues.
```

### The Verification

Re-run the same input:

```
is_valid: true
violations: []
encouraged_aspects: ["Concrete concern about infrastructure"]
confidence: 0.88
reasoning: "The contribution expresses legitimate frustration about
            port maintenance using informal but non-offensive language.
            The criticism targets infrastructure neglect, not individuals."
```

**The AI now matches human judgment.**

## The Continuous Loop

This isn't a one-time fix. It's a daily loop:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE GROUNDING LOOP                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│     ┌──────────────┐                                                         │
│     │  Real World  │  Recordings, contributions, meetings, press             │
│     └──────┬───────┘                                                         │
│            │                                                                 │
│            ▼                                                                 │
│     ┌──────────────┐                                                         │
│     │   Observe    │  Does this challenge our AI?                            │
│     └──────┬───────┘                                                         │
│            │                                                                 │
│            ▼                                                                 │
│     ┌──────────────┐                                                         │
│     │    Test      │  Run through Forseti, measure metrics                   │
│     └──────┬───────┘                                                         │
│            │                                                                 │
│            ▼                                                                 │
│     ┌──────────────┐                                                         │
│     │   Analyze    │  AI wrong, or rules wrong?                              │
│     └──────┬───────┘                                                         │
│            │                                                                 │
│     ┌──────┴──────┐                                                          │
│     ▼             ▼                                                          │
│  ┌────────┐  ┌────────────┐                                                  │
│  │Fix AI  │  │Update Rules│                                                  │
│  │(prompt)│  │(charter)   │                                                  │
│  └───┬────┘  └─────┬──────┘                                                  │
│      │             │                                                         │
│      └──────┬──────┘                                                         │
│             │                                                                │
│             ▼                                                                │
│     ┌──────────────┐                                                         │
│     │   Verify     │  Re-test, measure improvement                           │
│     └──────┬───────┘                                                         │
│            │                                                                 │
│            └────────────────────────────▶ Tomorrow: new data arrives         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## What We're Really Doing

This practice isn't about making AI smarter. It's about making AI **humbler**.

An AI that performs perfectly on test data but fails on field recordings is worse than one that admits uncertainty. At least the uncertain AI knows it needs help.

Our goal:

- **Not**: AI that always knows the answer
- **Instead**: AI that knows when it doesn't know, and improves when shown

The trust we're building with citizens and officials depends on this humility. An AI that overconfidently misclassifies their contribution destroys trust faster than one that says "I'm not sure, let me flag this for human review."

## Tomorrow's Challenge

We don't know what tomorrow's Plaud recording will contain. We don't know what issue the next press article will raise. We don't know what nuance an official will explain in the next meeting.

**That uncertainty is the point.**

We're building a system that can say:
1. "This is what I think, with this confidence"
2. "Here's my reasoning"
3. "If I'm wrong, teach me"

The continuous improvement loop ensures that teaching happens—not quarterly, not monthly, but daily.

## Coming Tomorrow: The Field-to-Feature Pipeline

The manual process described above works, but it doesn't scale. Tomorrow we build the automated pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIELD-TO-FEATURE PIPELINE (Tomorrow)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INGEST                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                     │
│  │  Plaud AI    │   │    Press     │   │   Meeting    │                     │
│  │  Recordings  │   │   Articles   │   │    Notes     │                     │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                     │
│         │                  │                  │                              │
│         └──────────────────┼──────────────────┘                              │
│                            ▼                                                 │
│  TRANSFORM          ┌──────────────┐                                         │
│                     │ Speech-to-   │  Whisper / Plaud transcription          │
│                     │ Text + LLM   │  Summarize or keep raw                  │
│                     │ Processing   │                                         │
│                     └──────┬───────┘                                         │
│                            │                                                 │
│                            ▼                                                 │
│  GENERATE           ┌──────────────┐                                         │
│                     │   Mockup     │  Generate contributions:                │
│                     │  Generator   │  • Valid examples                       │
│                     │              │  • Charter violations                   │
│                     │              │  • Edge cases                           │
│                     └──────┬───────┘                                         │
│                            │                                                 │
│                            ▼                                                 │
│  EVALUATE           ┌──────────────┐                                         │
│                     │   Forseti    │  Run all features:                      │
│                     │   Features   │  • charter_validation                   │
│                     │              │  • category_classification              │
│                     │              │  • (future features)                    │
│                     └──────┬───────┘                                         │
│                            │                                                 │
│                            ▼                                                 │
│  MEASURE            ┌──────────────┐                                         │
│                     │   Metrics    │  • output_format                        │
│                     │  + Opik      │  • hallucination                        │
│                     │              │  • confidence calibration               │
│                     └──────┬───────┘                                         │
│                            │                                                 │
│                            ▼                                                 │
│  IMPROVE            ┌──────────────┐                                         │
│                     │   Prompt     │  Automatic suggestions for              │
│                     │  Refinement  │  prompt improvements                    │
│                     └──────────────┘                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Key Innovation: Synthetic Challenges

We won't just transcribe recordings—we'll **generate variations** that stress-test the agent:

| Input | Generated Variations |
|-------|---------------------|
| Valid concern from recording | Same concern with: aggressive tone, personal attack, off-topic tangent |
| Press article about port | Contribution that: agrees, disagrees, misunderstands, exaggerates |
| Official meeting insight | Edge case that: tests the boundary, uses ambiguous language |

**Why generate violations?** An agent that only sees valid inputs gets complacent. We need to keep it sharp by regularly testing its ability to detect problems.

### Deployed Across All Forseti Features

The pipeline won't just test `charter_validation`. It will challenge every feature:

```python
# Tomorrow's goal: feature-agnostic challenge pipeline
FEATURES_TO_CHALLENGE = [
    "charter_validation",      # Does it catch violations?
    "category_classification", # Does it categorize correctly?
    # Future features:
    # "sentiment_analysis",
    # "priority_scoring",
    # "duplicate_detection",
]

for feature in FEATURES_TO_CHALLENGE:
    challenges = generate_challenges_from_field_data(
        recordings=today_plaud_files,
        articles=today_press_articles,
        include_violations=True,
        variation_count=5,
    )
    results = run_forseti_evaluation(feature, challenges)
    log_to_opik(feature, results)
```

### The Schedule

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY CHALLENGE SCHEDULE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  00:00  Ingest new field data (recordings, articles)             │
│                                                                  │
│  01:00  Transcribe and process                                   │
│                                                                  │
│  02:00  Generate mockup contributions (valid + violations)       │
│                                                                  │
│  03:00  Run through all Forseti features                         │
│                                                                  │
│  04:00  Measure and log to Opik                                  │
│                                                                  │
│  06:00  task_contributions_analysis (real contributions)         │
│                                                                  │
│  07:00+ task_opik_evaluate (every 30 min)                        │
│         └─▶ Includes field-generated challenges                  │
│                                                                  │
│  Morning report: "3 new challenges failed - review needed"       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Matters

Today's approach is reactive: we wait for problems, then fix them.

Tomorrow's approach is **proactive**: we manufacture challenges before they happen in production. The agent faces synthetic violations every night, so when a real one arrives, it's ready.

**The agent stays on edge. The agent stays grounded. The agent earns trust.**

---

*The path from [trust-building vision](/blog/self-improving-civic-ai) to trusted reality runs through daily practice. No shortcuts. No silver bullets. Just the messy, humbling work of keeping AI grounded in the world as it actually is.*

*Tools we use: [Continuous Improvement Methodology](/docs/app/opik/CONTINUOUS_IMPROVEMENT) | [Experiment Workflow](/docs/app/opik/EXPERIMENT_WORKFLOW) | [Field Input Workflow](/docs/app/FIELD_INPUT_WORKFLOW)*

---

*Tomorrow: Building the automated Field-to-Feature Pipeline using the [Field Input](/docs/app/FIELD_INPUT_WORKFLOW) feature*
