````markdown
# Ocapistaine Project

A Python-based crawling and AI agent system (built with FastAPI and related tools) for gathering, processing, and responding to civic contributions. This README focuses on integrating **Opik** (from Comet ML) for LLM tracing, evaluation, and observability.

Opik provides powerful tracing for LLM calls, agent workflows, and crawling operations, helping you monitor performance, detect hallucinations, and evaluate outputs. We'll start with the **cloud-hosted version** (free tier on Comet) for quick testing and iteration, then outline how to switch to self-hosted later.

## Why Opik?

- Automatic tracing of LLM calls, agent steps, and custom functions (e.g., your crawling logic).
- Built-in evaluations (hallucination, relevance, moderation checks).
- Dashboard for visualizing traces, datasets, and metrics.
- Privacy-friendly: You control what data is logged.

## Prerequisites

- Python 3.9+ -> 3.13
- A Comet account (free tier sufficient for testing)
- Your project dependencies (e.g., FastAPI, requests, langchain/crewai if used for agents)

## Step 1: Sign Up for Comet Opik Cloud

1. ✅Go to [https://www.comet.com/signup](https://www.comet.com/signup) and create a free account.
2. ✅ After logging in, navigate to **Opik** section (or directly to [https://www.comet.com/opik](https://www.comet.com/opik)).
3. ✅ Create a new workspace (ocapistaine-dev). with a dashboard Audierne2026
4. ✅ Generate an **API Key**:
   ✅ - Go to Settings → API Keys. one APIkey only not workspace related

## Step 2: Install the Opik SDK

✅ Add Opik to your project dependencies:

```bash
poetry add opik
```
````

## Step 3: Configure Opik in Your Code

✅ set environment variables.

### Option A ✅ : Environment Variables (recommended for production/security)

Create a `.env` file in your project root:

```
OPIK_API_KEY=your_comet_api_key_here
OPIK_WORKSPACE=ocapistaine-dev  # Optional, defaults to "default"
```

Load it in your app (e.g., using `python-dotenv`):

```bash
pip install python-dotenv
```

In your main app file (e.g., `main.py`):

```python
from dotenv import load_dotenv
load_dotenv()

import opik

# Automatic configuration from env vars
opik.configure()
```

<!-- ### Option B: Direct Configuration (for quick testing)
```python
import opik

opik.configure(
    api_key="your_comet_api_key_here",
    workspace="your_workspace_name"  # Optional
)
``` -->

## Step 4: Instrument Your Code

Use Opik decorators to trace functions automatically.

### Example: Tracing a Crawling Function

```python
import opik
from opik import track
import requests

@track
def crawl_page(url: str) -> str:
    response = requests.get(url)
    response.raise_for_status()

    # Log custom metadata
    opik.log_metadata({"url": url, "status_code": response.status_code})

    return response.text  # Or processed content
```

### Example: Tracing LLM/Agent Calls

If using LangChain, CrewAI, or direct Mistral/OpenAI calls:

```python
from opik import track
from opik.integrations.langchain import OpikTracer  # If using LangChain

# For LangChain
tracer = OpikTracer()
chain.invoke(input, config={"callbacks": [tracer]})

# Or manual tracing for any LLM call
@track
def generate_response(prompt: str, model: str = "mistral-large") -> str:
    # Your LLM call here (e.g., via mistral client)
    response = client.chat(prompt)

    # Log inputs/outputs explicitly if needed
    opik.log_input({"prompt": prompt})
    opik.log_output({"response": response})

    return response
```

### Example: Tracing FastAPI Endpoints

```python
from fastapi import FastAPI
from opik import track

app = FastAPI()

@app.post("/process-contribution")
@track  # Traces the entire endpoint
async def process_contribution(user_input: str):
    # Your agent pipeline: crawl → generate → moderate
    raw_data = crawl_page("https://example-commune.fr")
    creative_output = generate_response(user_input + raw_data)
    # ... moderation step

    return {"response": creative_output}
```

All traces will automatically appear in your Comet Opik dashboard.

## Step 5: Run and Test

1. Start your app:
   ```bash
   uvicorn main:app --reload
   ```
2. Trigger some endpoints or run crawling scripts.
3. Go to your Comet Opik dashboard ([comet.com → your workspace → Opik](https://www.comet.com)) to view traces in real-time.

You can now:

- Browse trace timelines.
- Add evaluations (e.g., moderation scorer, fact-checker).
- Create datasets from traced inputs/outputs.

## Advanced: Adding Evaluations

Example: Moderation check on agent outputs

```python
from opik.evaluation import evaluate
from opik.evaluation.metrics import ModerationMetric

@track
def moderated_generation(...):
    output = generate_response(...)

    # Run evaluation
    moderation_metric = ModerationMetric()
    evaluate(
        task=lambda: output,
        metrics=[moderation_metric]
    )

    return output
```

## Switching to Self-Hosted Opik (Later/Production)

Once cloud testing is solid and you need full data sovereignty:

1. Add a `docker-compose.yml` to your repo (in `/infra/` folder):
   ```yaml
   version: "3.8"
   services:
     opik-backend:
       image: cometml/opik-backend:latest
       environment:
         - OPIK_POSTGRES_URL=postgresql://opik:password@postgres:5432/opik
       ports:
         - "8000:8000"

     opik-frontend:
       image: cometml/opik-frontend:latest
       ports:
         - "5173:5173"
       depends_on:
         - opik-backend

     postgres:
       image: postgres:15
       environment:
         - POSTGRES_USER=opik
         - POSTGRES_PASSWORD=password
         - POSTGRES_DB=opik
       volumes:
         - postgres_data:/var/lib/postgresql/data

     redis:
       image: redis:7

   volumes:
     postgres_data:
   ```
2. Run `docker compose up -d`.
3. Update config:
   ```python
   opik.configure(use_local=True, host="http://localhost:8000")
   ```
4. Access dashboard at `http://localhost:5173`.

## Troubleshooting

- Check logs if traces aren't appearing.
- Ensure API key has correct permissions.
- For issues: See [Opik docs](https://github.com/comet-ml/opik/tree/main/docs) or Comet support.

Start tracing — your crawling and agent workflows will thank you!

```

```
