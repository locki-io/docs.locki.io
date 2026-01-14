---
id: theory-of-constraints
title: Theory of Constraints
sidebar_label: Theory of Constraints
sidebar_position: 3
description: Managing budget and resource constraints in civic projects
---

# Theory of Constraints (ToC)

## Overview

The Theory of Constraints is a management philosophy that focuses on identifying and managing the most limiting factor (constraint) that stands in the way of achieving a goal.

## Core Concept

> "A chain is no stronger than its weakest link."

In any system, there is always ONE constraint that limits the system's output. Improving anything other than the constraint is a waste of resources.

## The Five Focusing Steps

1. **IDENTIFY** the constraint
2. **EXPLOIT** the constraint (maximize its efficiency)
3. **SUBORDINATE** everything else to the constraint
4. **ELEVATE** the constraint (add capacity)
5. **REPEAT** - find the new constraint

## Application to OCapistaine

### Constraint: Data Acquisition

In our project, the primary constraint is **data acquisition** from municipal sources:

| Constraint | Impact | Resolution |
|------------|--------|------------|
| Firecrawl API rate limits | Slows document collection | Batch processing, caching |
| OCR processing time | Bottleneck for PDFs | Parallel processing |
| Municipal website structure | Requires custom extraction | Adaptive scraping |

### Budget Constraints

For civic projects with limited budgets:

| Resource | Constraint | Strategy |
|----------|------------|----------|
| API Credits | Limited Firecrawl calls | Prioritize high-value sources |
| Compute | Local processing limits | Cloud bursting for peaks |
| Time | 4-week hackathon deadline | Focus on MVP features |

## Integration with TRIZ

Theory of Constraints identifies **what** to solve. TRIZ provides **how** to solve it.

When facing a constraint that seems unsolvable, apply TRIZ contradiction resolution:
- If constraint is "resource vs. ambition" → See [TRIZ patterns](/docs/methods/triz#key-contradiction-categories)

## Resources

- Goldratt, E. (1984). *The Goal: A Process of Ongoing Improvement*
- [ToC Institute](https://www.tocinstitute.org/)
