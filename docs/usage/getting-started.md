# Getting Started

Welcome to OCapistaine - an AI-powered civic transparency platform for Audierne, France.

## What is OCapistaine?

OCapistaine helps manage citizen participation for the **Audierne 2026** municipal project by:

- **Validating contributions** against a charter of good conduct
- **Classifying themes** across 7 civic categories
- **Anonymizing sensitive data** in documents
- **Generating test data** for system improvement

## Quick Links

| Role | Guide |
|------|-------|
| **Judges/Evaluators** | [Judge Trial Guide](./judge-trial-guide.md) - Test and evaluate Forseti |
| **Technical Issues** | [Troubleshooting](./troubleshooting.md) - Common problems and solutions |
| **Questions** | [FAQ](./faq.md) - Frequently asked questions |

## The Forseti Agent

**Forseti** (named after the Norse god of justice) is our AI validation agent. It:

1. Reads citizen contributions in French
2. Checks compliance with the participation charter
3. Identifies violations or positive aspects
4. Suggests appropriate categories

### Try It Now

1. Open the Streamlit application
2. Select an LLM provider in the sidebar (OpenAI recommended)
3. Navigate to **Batch Validation (Mockup)**
4. Click **Random** to load a real contribution
5. Click **Validate** to see Forseti in action

## The 7 Categories

Contributions are organized into these themes:

| Icon | Category | Topics |
|------|----------|--------|
| `economie` | Economy | Jobs, businesses, tourism |
| `logement` | Housing | Urban planning, affordability |
| `culture` | Culture | Arts, heritage, events |
| `ecologie` | Environment | Sustainability, nature |
| `associations` | Community | Organizations, volunteering |
| `jeunesse` | Youth | Education, activities |
| `alimentation-bien-etre-soins` | Wellness | Food, health, care |

## Contribution Format

Citizens submit contributions with two parts:

```
Constat factuel: (Factual observation)
Description of the current situation or problem.

Vos idées d'améliorations: (Improvement ideas)
Proposed solutions or suggestions.
```

## Next Steps

- **For judges**: Read the [Judge Trial Guide](./judge-trial-guide.md)
- **For developers**: See the [Application docs](/docs/app)
- **For methodology**: Explore [TRIZ](/docs/methods/triz) and other approaches

## Support

- GitHub Issues: Report bugs or suggest improvements
- Documentation: Browse the sidebar for detailed guides
