# Frequently Asked Questions

## What Can I Do as a Judge?

### Can I validate contributions?

**Yes.** You can validate any contribution. The system will:
- Check charter compliance (valid/invalid)
- Suggest a category label (if not already assigned)
- Store results for later analysis

Validation only re-attributes the category label if it wasn't set already.

### Can I create mockup contributions?

**Yes, freely.** You can generate as many mockup contributions as you want:
- Use **Single Contribution Test** to create variations from real or custom contributions
- Use **Generate Variations** to batch-create test data
- All validated mockups are sent to Opik as batches for analysis

### Can I use the Auto-Contribute feature?

**Yes, it's fun!** The Field Input mode lets you:
- Paste any text about Audierne (news articles, reports, speeches)
- The AI extracts themes and generates realistic contributions
- These contributions are **not** directed to the audierne2026 repository
- It's a safe playground for testing

### Can I access the Admin section?

**Yes, if you feel confident.** In the Admin section you can:
- View contribution analysis from past days
- See which contributions haven't been validated yet
- Create datasets for evaluation
- Run experiments on charter and category features

## Datasets & Evaluation

### What can I evaluate?

You can evaluate Forseti on two main features:

| Feature | What it checks |
|---------|----------------|
| **Charter Validation** | Is the contribution valid according to the charter? |
| **Category Classification** | Is the contribution correctly categorized? |

### What metrics are available?

You can evaluate using these metrics:

| Metric | Description |
|--------|-------------|
| `hallucination` | Does the AI make things up? |
| `output_format` | Is the response properly structured? |
| `charter_compliance` | Does validation match expected results? |

### Can I create custom datasets?

**Yes.** You can assemble datasets based on various criteria:
- Filter by date, category, source, or validity
- Create train/validation/test splits
- Export to Opik for prompt optimization

This depends on available data in Redis storage.

## Opik Dashboard

### Can I access the Opik dashboard?

**Access is requestable.** If you'd like to see:
- Full tracing of LLM calls
- Cost tracking per provider
- Experiment results and comparisons

Contact us to request dashboard access. The current view isn't perfect, but it's a good starting point for evaluating future features.

### Where do my validations go?

All validations are:
1. Stored in Redis (28-day retention)
2. Synced to Opik as spans
3. Available for dataset creation and experiments

## Technical Questions

### Which LLM provider should I use?

**OpenAI is recommended** for reliability and speed. You can also try:
- Claude - Good for nuanced analysis
- Gemini - Google's model (may have rate limits)
- Ollama - Local, private (requires local setup)

### Why are some contributions in French?

Audierne is in France, so citizen contributions are in French. The interface supports English translations:
- Set language to **English** in the sidebar
- Click **Random** to load contributions with translations
- French and English appear side by side

### How long is data kept?

| Data Type | Retention |
|-----------|-----------|
| Validation records | 28 days |
| Latest cache | 24 hours (auto-rebuilds) |
| Opik traces | Based on Opik plan |
