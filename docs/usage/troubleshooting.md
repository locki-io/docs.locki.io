# Troubleshooting

Common issues and solutions for OCapistaine.

---

## LLM Provider Issues

### Rate Limit Causing Opik Feedback Score of 0

**Symptom**: Opik traces show feedback score of 0 for spans like `category_classification`, with reasoning field containing error messages like "Gemini retries exhausted".

**Example log**:
```
2026-02-03 14:23:00 | ERROR | provider=gemini | type=RATE_LIMIT | model=gemini-2.5-flash | retry_after=59.692838347s | Retrying after 59.692838347s (attempt 1/3)
```

**Root Cause**:
When the LLM provider (e.g., Gemini) hits rate limits and exhausts all retries, the Forseti agent returns a fallback response with:
- Correct category (based on heuristics)
- Error message in the `reasoning` field: "Classification error: Gemini retries exhausted"
- Low or zero confidence

Opik's evaluation system scores this output as 0 because:
1. The output lacks proper contextual reasoning
2. The error message in the reasoning field doesn't address the input
3. Even though the category may be correct, the lack of explanation fails quality criteria

**Impact**:
- Opik traces show low scores despite correct classifications
- Training data quality is degraded
- Prompt optimization becomes unreliable

**Solutions**:

#### 1. Enable Provider Failover (Recommended)

The scheduler dashboard now supports automatic failover to other providers when rate limits are hit.

**Via Dashboard**:
1. Go to Admin tab
2. In Manual Triggers for `task_contributions_analysis`:
   - Select primary provider (e.g., "gemini")
   - Enable "Auto Failover" checkbox
3. Failover order: gemini → claude → mistral → ollama

**Via Code**:
```python
from app.services.scheduler import run_task_now

result = run_task_now(
    'task_contributions_analysis',
    provider='gemini',
    enable_failover=True,  # Try other providers if rate limited
    limit=10,
)
```

#### 2. Switch to a Different Primary Provider

If Gemini consistently hits rate limits, use a different provider:

**Environment variable**:
```bash
# .env
DEFAULT_PROVIDER=claude  # or mistral, ollama
```

**Per-task override** (via dashboard):
- Select "claude" or "mistral" in the Provider dropdown

#### 3. Reduce Request Volume

Limit contributions processed per run:
```python
result = run_task_now(
    'task_contributions_analysis',
    limit=10,  # Process fewer contributions per run
)
```

#### 4. Add Rate Limiting Buffer

Increase the rate limit delay in `.env`:
```bash
GEMINI_RATE_LIMIT=2.0  # 2 seconds between requests (default: 1.0)
```

#### 5. Use Local Models (Ollama)

For development/testing, use local Ollama to avoid rate limits entirely:
```bash
# .env
DEFAULT_PROVIDER=ollama
OLLAMA_MODEL=deepseek-r1:7b  # Default, good balance
```

**Available Ollama models** (sorted by resource usage):

| Model | RAM | Use Case |
|-------|-----|----------|
| `qwen3:4b` | ~3GB | Ultra-light, simple classification |
| `qwen3-vl:4b` | ~3GB | Multimodal, document analysis |
| `deepseek-r1:7b` | ~5GB | **Default** - Efficient reasoning, low CPU |
| `mistral:7b` | ~6GB | Balanced quality/speed |
| `llama3:8b` | ~8GB | Higher quality, more resources |
| `deepseek-r1:14b` | ~10GB | Best reasoning, high resources |

**Pull models before use**:
```bash
ollama pull deepseek-r1:7b
ollama pull qwen3:4b
```

**Via Dashboard**: When selecting "ollama" as provider, a model dropdown appears with all available options.

**How to identify affected traces in Opik**:

1. Go to Opik dashboard
2. Filter traces by project "ocapistaine-test"
3. Look for spans with:
   - Score = 0
   - Reasoning containing "retries exhausted" or "error"
4. Check the parent trace's `providers_tried` field to see failover attempts

**Prevention**:

1. **Monitor rate limits**: Check provider dashboards for quota usage
2. **Stagger scheduled tasks**: Don't run multiple LLM-heavy tasks simultaneously
3. **Use batch processing**: Reduce total API calls with batch validation
4. **Cache results**: Store validation results in Redis to avoid re-processing

---

### Provider Authentication Errors

**Symptom**: Task fails with "Authentication failed" or "401/403" errors.

**Solution**: Verify API keys in `.env`:
```bash
# Google Gemini
GOOGLE_API_KEY=your-key-here
# or
GEMINI_API_KEY=your-key-here

# Anthropic Claude
ANTHROPIC_API_KEY=your-key-here

# Mistral
MISTRAL_API_KEY=your-key-here
```

---

### Ollama Connection Failed

**Symptom**: Tasks using Ollama fail with connection errors.

**Check**:
```bash
# Is Ollama running?
curl http://localhost:11434/api/tags

# Is the model pulled?
ollama list
```

**Solution**:
```bash
# Start Ollama
ollama serve

# Pull required model
ollama pull mistral:latest
```

---

### Ollama 404 Errors During Validation

**Symptom**: Validation fails with "404 Not Found" or model errors when using Ollama.

**Common Causes**:
1. Model not pulled locally
2. Another task holding the global Ollama lock
3. Ollama service crashed mid-request

**Check the global lock**:
```bash
# Check if lock exists
redis-cli -n 6 GET "lock:ollama:global"

# If stuck, check TTL
redis-cli -n 6 TTL "lock:ollama:global"
```

**Solution**:
```bash
# 1. Clear stale lock
redis-cli -n 6 DEL "lock:ollama:global"

# 2. Verify Ollama is running
curl http://localhost:11434/api/tags

# 3. Pull the model if missing
ollama pull deepseek-r1:7b
```

**Note**: The global lock (`lock:ollama:global`) prevents concurrent Ollama usage. Tasks acquire this lock before using Ollama and release it after. If a task crashes, the lock may remain (TTL: 600s).

---

### Re-validating Records with Errors

**Symptom**: Multiple contributions in Redis have validation errors (404s, rate limits, timeouts) stored in their `reasoning` field.

**How to identify**:
```bash
# Check for error patterns in recent validations
redis-cli -n 5 HGETALL "contribution_mockup:forseti461:charter:latest" | grep -i error
```

**Solution - Re-validate with OpenAI**:
```bash
# Run the revalidation script (uses OpenAI by default)
poetry run python scripts/revalidate_errors.py
```

This script:
1. Finds all records with error patterns in reasoning
2. Re-validates using OpenAI (gpt-4o-mini) - most reliable for batch operations
3. Updates Redis with correct validation results

**Failover Chain**: The revalidation uses `ollama → openai → claude → mistral → gemini` ordering. Gemini is last due to aggressive rate limits.

---

### Ollama Concurrent Request Failures

**Symptom**: When multiple scheduler tasks run simultaneously or when manual runs overlap with scheduled tasks, Ollama returns 404 errors or timeouts.

**Root Cause**: Ollama handles **concurrent** requests from different processes poorly. However, **sequential** requests within the same process work fine (tested with 0.1s delays between calls).

**Key Insight** (tested 2026-02-06):
- ✅ Sequential validations in same process: Work reliably
- ❌ Concurrent requests from different processes: May fail

**The Global Lock Solution**:

The `lock:ollama:global` mechanism prevents concurrent Ollama usage across processes:

```python
# In scheduler tasks (task_audierne_docs.py)
def _acquire_ollama_lock(task_id: str) -> bool:
    redis = get_scheduler_redis()
    return bool(redis.set("lock:ollama:global", task_id, ex=600, nx=True))

# Check before starting task
if not _acquire_ollama_lock(task_id):
    # Another task is using Ollama - failover to cloud provider
    provider = get_provider("openai")
```

**When to Use Failover**:

1. **Scheduled tasks**: Always acquire lock, failover if locked
2. **Manual runs**: Check lock first, use cloud provider if locked
3. **Batch operations**: Use OpenAI/Claude (faster, no concurrency issues)

**Check if Ollama is safe to use**:
```bash
# If this returns empty, Ollama is available
redis-cli -n 6 GET "lock:ollama:global"

# If locked, see which task holds it
redis-cli -n 6 GET "lock:ollama:global"
# Returns: "task_audierne_docs:20260206" or similar
```

**Recommendation**:
- For batch operations: Use OpenAI as primary (reliable, ~1s per request vs 15-20s for Ollama)
- For single requests: Ollama is fine if no lock held
- For scheduler tasks: Use `ProviderWithFailover` with lock checking

---

## Scheduler Issues

### Task Shows "already_completed" After Clearing Key

**Symptom**: After using "Clear & Run", task still reports "already_completed".

**Cause**: All contributions have `confidence > 0` (already validated). The task completes successfully with nothing to process, then sets the success key again.

**Solution**: Use "Force Revalidate" button which:
1. Resets `confidence = 0` on all records (last 7 days)
2. Clears the success key
3. Runs the task

---

### Task Stuck with Lock

**Symptom**: Task shows "skipped: lock_held" but nothing is running.

**Cause**: Previous task crashed without releasing lock.

**Solution**:
```bash
# Check for stale locks
redis-cli -n 6 KEYS "lock:*"

# Delete stale lock
redis-cli -n 6 DEL "lock:task_contributions_analysis:20260203"
```

---

## Redis Issues

### No Contributions Found

**Symptom**: Task reports "no contributions to process" but you have mockup data.

**Cause**: The `latest` hash in Redis expires after 24h.

**Check**:
```bash
# Check latest hash
redis-cli -n 5 HLEN "contribution_mockup:forseti461:charter:latest"

# Check date indexes
redis-cli -n 5 KEYS "contribution_mockup:forseti461:charter:index:*"
```

**Solution**: The task now falls back to checking date indexes for the last 7 days. If you still see issues, create new mockup contributions via the Mockup tab.

---

## Opik Tracing Issues

### Traces Not Appearing

**Check**:
1. Verify Opik configuration:
```bash
cat ~/.opik.config
```

2. Check environment:
```bash
echo $OPIK_API_KEY
echo $OPIK_PROJECT_NAME
```

3. Test connection:
```python
from opik import Opik
client = Opik()
print(client.config)
```

### Wrong Project in Opik

**Symptom**: Traces appear in "Default Project" instead of expected project.

**Solution**: Set project name in code:
```python
from app.agents.tracing import get_tracer
tracer = get_tracer()  # Uses OPIK_PROJECT_NAME from env
```

Or in `.env`:
```bash
OPIK_PROJECT_NAME=ocapistaine-test
```

---

## Dataset and Prompt Field Mismatches

### Category Field Naming: `input.category` vs `input.current_category`

**Symptom**: Category classification experiments fail or return unexpected results because the dataset items use a different field name than the prompt expects.

**Background**:
The category classification feature was updated to use consistent field naming:
- **Old**: `input.current_category` (in spans and datasets)
- **New**: `input.category` (standardized across all inputs)

**Components affected**:
| Component | Old Field | New Field |
|-----------|-----------|-----------|
| Span input | `current_category` | `category` |
| Dataset item input | `input.current_category` | `input.category` |
| Prompt variable | `{current_category_line}` | `{category_line}` |
| Feature parameter | `current_category` | `category` |

**How to check if you're affected**:

```python
from app.processors.workflows import list_datasets
from app.agents.tracing import get_tracer

# List datasets and check their items
tracer = get_tracer()
client = tracer.get_client()

dataset = client.get_dataset(name="your-dataset-name")
items = list(dataset.get_items())

for item in items[:3]:
    input_data = item.get("input", {})
    print(f"Has current_category: {'current_category' in input_data}")
    print(f"Has category: {'category' in input_data}")
```

**Solution: Migrate existing datasets**

```python
# Migrate a single dataset
from app.processors.workflows import migrate_dataset_category_field

result = migrate_dataset_category_field("your-dataset-name")
print(f"Migrated: {result['items_migrated']}, Skipped: {result['items_skipped']}")

# Or migrate all datasets at once
from app.processors.workflows import migrate_all_datasets_category_field

result = migrate_all_datasets_category_field()
print(f"Datasets migrated: {len(result['datasets_migrated'])}")
```

**Solution: Sync updated prompts to Opik**

```python
from app.prompts.opik_sync import sync_all_prompts

# Sync forseti prompts (including updated category_classification)
result = sync_all_prompts(filter_prefix="forseti.")
print(f"Synced: {len(result['synced'])} prompts")
```

Or via CLI:
```bash
python -m app.prompts.opik_sync --prefix forseti.
```

**Prevention**:
New datasets created after this update will automatically use `input.category`. Only datasets created before the update need migration.

---

## Getting Help

1. Check this guide first
2. Review logs: `docker compose logs` or check terminal output
3. Check Opik dashboard for trace details
4. Open an issue on GitHub with:
   - Error message (full)
   - Steps to reproduce
   - Environment details (provider, model, OS)
