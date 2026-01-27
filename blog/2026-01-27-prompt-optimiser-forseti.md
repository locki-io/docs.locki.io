---
slug: forseti-first-prompt-optimization
title: "Forseti461 Prompt v1: Charter-Proofing AI Moderation for Audierne2026"
authors: [jnxmas]
tags: [encode, ai-ml, civictech, observability, opik]
---

**Forseti461** is an AI agent that automatically moderates citizen contributions to participatory democracy platforms — approving only concrete, constructive, locally relevant ideas while rejecting personal attacks, spam, off-topic posts, or misinformation, and always explaining decisions with respectful, actionable feedback.

:::tip
This weekend, Facebook reminded us that democracy is fragile. Toxic comments, personal attacks, and off-topic rants flooded discussions about local issues. The signal gets lost in the noise. Citizens disengage. Constructive voices give up.
:::

**What if we could protect civic discourse at scale?**

<!-- truncate -->

## The Problem We're Solving

As part of the **Commit to Change AI Agents Hackathon** (Encode), we're building **Ò Capistaine** — an AI-powered civic transparency platform for the Audierne-Esquibien 2026 municipal elections. The platform receives citizen contributions through Framaforms, and each one must be validated against our published **Charte de contribution** before reaching the public forum.

The charter is clear:

| ✅ Encouraged                | ❌ Not Accepted                           |
| ---------------------------- | ----------------------------------------- |
| Concrete, argued proposals   | Personal attacks                          |
| Constructive criticism       | Discriminatory remarks                    |
| Questions and clarifications | Spam and advertising                      |
| Shared local expertise       | Off-topic content (unrelated to Audierne) |
| Improvement suggestions      | False information                         |

**The challenge**: How do we enforce this at scale while remaining fair, explainable, and constructive? A missed personal attack could poison the entire discussion. A false positive could silence a legitimate voice.

## Enter Forseti461

Named after the Norse god of justice **Forseti**, and reborn in the spirit of Cap Sizun (the iconic local "461"), Forseti461 serves as the impartial guardian layer. Calm, vigilant, and unwavering.

But an AI moderator is only as good as its prompt. Our first version had a baseline accuracy of ~20% on edge cases. Subtle violations slipped through. Valid contributions were incorrectly flagged.

**We needed to optimize systematically.**

## The OPIK Experiment

Using **Opik** (Comet ML) for observability and prompt optimization, we ran our first structured experiment:

![OPIK Project View](../static/img/project_view.png)

Our evaluation infrastructure:

- **Default Project**: N8N workflows traces (production chatbot interactions)
- **ocapistaine_test**: Application traces and spans
- **Optimization**: Prompt optimization experiments with controlled datasets

### The Dataset

We built a test dataset using our [mockup system](/blog/first-submission-mockup-system) — generating controlled variations of contributions with known expected outcomes:

![Dataset View](../static/img/dataset_view.png)

Each entry includes:

- Valid contributions (ground truth: approved)
- Subtle violations (ground truth: rejected)
- Aggressive violations (ground truth: rejected)
- Borderline cases to stress-test the prompt

### Running the Optimization

We used OPIK's **MetaPromptOptimizer** to iteratively refine the system prompt:

![Optimization Progress](../static/img/optimization_view.png)

![Spans View](../static/img/spans_view.png)

## The Results

![Outstanding: 0.92 accuracy, +368.416% improvement](../static/img/result.png)

| Metric               | Before  | After    | Change    |
| -------------------- | ------- | -------- | --------- |
| **Charter Accuracy** | ~20%    | **92%**  | **+368%** |
| Edge Case Handling   | Poor    | Strong   | —         |
| Explainability       | Generic | Specific | —         |

The optimized prompt correctly identifies subtle violations while accepting valid contributions — and explains why in each case.

## The Optimized Prompt

Here is **Forseti461 v1** — the charter-proofed system prompt:

```
System
You are Forseti 461, the impartial guardian of truth and the contribution charter for Audierne2026.

## Your Identity
Named after the Norse god of justice Forseti, you are reborn in the spirit of Cap Sizun
(the iconic local "461"). You are calm, vigilant, and unwavering in your duties.

## Your Mission
You carefully filter every submission to the Audierne2026 participatory democracy platform:
- Approving only concrete, constructive, and locally relevant contributions that directly
  address community needs and issues.
- Firmly rejecting personal attacks, discrimination, spam, off-topic content, promotional
  material, or false information.
- Actively monitoring submissions to ensure quality and relevance, rejecting any that do
  not meet these standards.
- Ensuring only respectful, charter-compliant ideas reach O Capistaine.

## Your Values
- **Impartiality**: You judge content, not people.
- **Clarity**: You explain your decisions clearly, including the specific criteria used
  for evaluation.
- **Fairness**: You apply the same standards to all.
- **Constructiveness**: You guide contributors toward better participation by providing
  actionable suggestions for improvement.

## Evaluation Criteria
- Contributions must be relevant to local issues and provide specific examples or data
  to support claims.
- Submissions should be constructive, offering solutions or ideas that can be developed
  further.
- Clearly outline what is unacceptable: personal attacks, discriminatory remarks, and
  promotional content will lead to rejection.
- When rejecting a submission, specify the reasons based on these criteria and suggest
  how the contributor can improve their submission, such as by adding more detail,
  examples, or references to local issues.

## Response Style
- Be concise but thorough.
- Provide clear reasoning for decisions, referencing the evaluation criteria.
- Use French cultural context when relevant to Audierne-Esquibien.
- **Emphasize Respect**: Clearly state that personal attacks, discriminatory remarks,
  and promotional content are unacceptable and undermine the quality of discourse.

Contributors must be aware that such language or irrelevant material will lead to
rejection of their submissions. Additionally, reinforce the importance of maintaining
a respectful and constructive dialogue to foster a positive community. Include examples
of respectful language and constructive criticism to guide contributors.
```

## Example: Before vs After

### Input (Subtle Violation)

```
Category: economie
Constat: Le parking du port est souvent plein en été.
Idées: Si nos brillants élus avaient un minimum de bon sens, ils auraient
réglé ce problème depuis longtemps. Mais bon, quand on voit qui nous dirige...
```

### Before Optimization

```json
{
  "is_valid": true,
  "confidence": 0.75,
  "reasoning": "Discusses local parking issue"
}
```

**❌ Missed the condescending tone and implicit attack on elected officials.**

### After Optimization

```json
{
  "is_valid": false,
  "confidence": 0.89,
  "violations": ["tone_condescendant", "attaque_indirecte_elus"],
  "reasoning": "While the contribution addresses a real local issue (port parking),
    the tone is condescending ('si nos brillants élus avaient un minimum de bon sens')
    and includes indirect attacks on elected officials ('quand on voit qui nous dirige').
    This undermines constructive dialogue.",
  "suggestion": "Reformulate without judgment on people: 'Le parking du port est
    souvent plein en été. Je propose d'étudier la création d'un parking relais à
    l'entrée de la ville avec navette gratuite vers le centre.'"
}
```

**✅ Correctly identified the violation AND provided constructive guidance.**

## Daily Experiments: Continuous Improvement

This prompt optimization builds directly on our earlier [OPIK workshops](https://docs.comet.com/opik) and the [mockup testing framework](/blog/first-submission-mockup-system). Traces from **ocapistaine_test** help us observe rejection patterns and iterate.

We've now implemented **daily experiments** to track Forseti's performance over time:

```python
from app.processors.mockup_processor import MockupProcessor

processor = MockupProcessor()

# Run daily evaluation
result = await processor.run_daily_experiment()

# Metrics tracked:
# - Charter accuracy (correct valid/invalid classification)
# - True positives (invalid correctly rejected)
# - False negatives (invalid incorrectly accepted) — the worst case!
# - Precision, Recall, F1 Score
```

Each day's results are logged to OPIK as a named experiment (`forseti_daily_2026-01-27`), allowing us to:

- Track regression across prompt changes
- Compare provider performance (Gemini vs Claude)
- Build confidence in production deployment

## What's Next

**Current status (Jan 27, 2026):** Prompt v1 live in testing via N8N + Gemini integration.

**Upcoming:**

1. Merge N8N workflows into **ocapistaine_dev** project
2. Expand to **misinformation detection** with local data RAG
3. Run larger eval sets covering all 7 categories
4. Collect **user feedback loops** on rejections
5. **Field input mode**: Generate test contributions from real municipal documents (mayor speeches, public hearings)

This positions Forseti461 / Ò Capistaine for strong **Community Impact** in the hackathon — enabling fair, scalable citizen participation in real local democracy.

## The Pitch

We're refining this messaging for our hackathon pitch deck:

- **Problem**: Noise, toxicity, and off-topic posts kill participatory platforms. Audierne2026's charter exists but needs scalable enforcement.
- **Solution**: Forseti461 — AI charter guardian with explainable, constructive moderation.
- **How it works**: Optimized system prompt → evaluation criteria → response style.
- **Impact**: Cleaner discussions → better ideas → stronger municipal program co-construction.
- **Tech**: OPIK observability, Gemini agentic flows, N8N automation, daily experiments.

---

## Try It Yourself

Navigate to the **Mockup** tab in the app to:

- Generate test contributions with violations
- Run batch validation with Forseti461
- Export results to OPIK for your own optimization

**Feedback welcome** — reach out to collaborate on OPIK traces or eval sets before the hackathon deadline!

---

_Building trust in AI moderation, one optimization at a time._

**Branch:** `feature/logging_system`
**Key files:**

- `app/agents/forseti/prompts.py` — System prompt
- `app/processors/mockup_processor.py` — Daily experiments
- `app/mockup/` — Test generation system
