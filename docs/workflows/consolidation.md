---
id: consolidation
title: Consolidation Workflow
sidebar_label: Consolidation
sidebar_position: 1
description: Weekly consolidation of citizen contributions
---

# Consolidation Workflow

## Overview

The consolidation workflow generates weekly reports from citizen contributions, analyzing GitHub issues and discussions for the Audierne2026 participatory campaign.

## Features

### Data Collection
- Fetches all issues from the repository
- Fetches discussions (requires GitHub token with GraphQL permissions)
- Filters contributions vs. automated reports

### Analysis
- **Categorization**: Groups contributions by theme (economie, logement, culture, etc.)
- **TRIZ Framework**: Identifies contradictions and patterns
- **Common themes**: Extracts most frequent keywords

### Reporting
- Markdown-formatted consolidation report
- Statistics by category
- TRIZ contradiction analysis
- Recommendations for next steps

## Usage

### Basic Usage

```bash
python scripts/consolidate_contributions.py
```

### Custom Output File

```bash
python scripts/consolidate_contributions.py --output weekly_report_2026-01-07.md
```

### Skip Discussions (faster)

```bash
python scripts/consolidate_contributions.py --skip-discussions
```

## Weekly Schedule

Run every Monday morning:

```bash
# Generate report
python scripts/consolidate_contributions.py --output reports/weekly_$(date +%Y-%m-%d).md

# Take actions:
# 1. Migrate ready issues to discussions
# 2. Comment on issues needing context
# 3. Plan TRIZ workshops for contradictions
```

## TRIZ Integration

The script detects five key contradiction types:

| Contradiction | Keywords | Resolution |
|---------------|----------|------------|
| Resource vs. Ambition | budget, coût, financement | Phased implementation |
| Participation vs. Efficiency | consultation, rapidité | Digital tools |
| Preservation vs. Development | patrimoine, modernisation | Adaptive reuse |
| Individual vs. Collective | individuel, communauté | Opt-in mechanisms |
| Local vs. External | local, tourisme, habitants | Balanced policies |

### Interpreting Results

- **Strength 2-3**: Minor tension, monitor
- **Strength 4-6**: Moderate contradiction, needs attention
- **Strength 7+**: Major contradiction, requires workshop

## Automation

GitHub Actions workflow example:

```yaml
name: Weekly Consolidation Report
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC

jobs:
  consolidate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      - run: pip install requests python-dotenv
      - run: python scripts/consolidate_contributions.py --output weekly_report.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
