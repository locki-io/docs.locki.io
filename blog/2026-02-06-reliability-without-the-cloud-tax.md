---
slug: reliability-without-the-cloud-tax
title: "Reliability Without the Cloud Tax: Local LLMs with Intelligent Failover"
authors: [jnxmas]
tags: [ai-ml, infrastructure, sovereignty, ollama, civictech]
description: "How a simple Redis lock transformed our local LLM from unreliable to production-ready, while keeping data sovereign and costs near zero"
---

# Reliability Without the Cloud Tax: Local LLMs with Intelligent Failover

**A global lock pattern that makes local AI as reliable as cloud AI—without the costs or data concerns**

<!-- truncate -->

## The Problem: Local vs Cloud Tradeoffs

When building AI for civic applications, we face a fundamental tension:

| Approach | Cost | Reliability | Sovereignty | Speed |
|----------|------|-------------|-------------|-------|
| Cloud LLMs (OpenAI, Claude) | $$$  | High | Data leaves France | Fast |
| Local LLMs (Ollama) | Near zero | Variable | Data stays local | Slower |

For a civic project in Audierne processing citizen contributions, **sovereignty matters**. Citizens sharing concerns about their town shouldn't have that data processed on US servers. But unreliable AI is worse than no AI—if the system fails during a meeting or public event, trust evaporates.

We needed both: the sovereignty of local AI with the reliability of cloud.

## The Discovery: Ollama's Achilles Heel

After weeks of intermittent failures, we identified the pattern:

```
✅ Single request to Ollama: Works perfectly
✅ Sequential requests (same process): Works perfectly
❌ Concurrent requests (different processes): Random failures
```

When our scheduler ran `task_audierne_docs` (document analysis) at the same time as a manual validation, one would fail with cryptic 404 errors. Ollama wasn't crashing—it was **choking on concurrency**.

## The Solution: A Global Lock

The fix is embarrassingly simple: a Redis lock that ensures only one process talks to Ollama at a time.

```python
# In app/services/tasks/task_audierne_docs.py

OLLAMA_LOCK_KEY = "lock:ollama:global"
OLLAMA_LOCK_TTL = 600  # 10 minutes max

def _acquire_ollama_lock(task_id: str) -> bool:
    """Try to acquire the global Ollama lock."""
    redis = get_scheduler_redis()
    acquired = redis.set(
        OLLAMA_LOCK_KEY,
        task_id,
        ex=OLLAMA_LOCK_TTL,
        nx=True  # Only set if doesn't exist
    )
    return bool(acquired)

def _release_ollama_lock(task_id: str) -> None:
    """Release the lock only if we own it."""
    redis = get_scheduler_redis()
    current = redis.get(OLLAMA_LOCK_KEY)
    if current:
        # Handle both bytes and str from Redis
        current_str = current.decode() if isinstance(current, bytes) else current
        if current_str == task_id:
            redis.delete(OLLAMA_LOCK_KEY)
```

**Key design decisions:**

1. **TTL of 600s**: If a task crashes, the lock auto-expires. No manual intervention needed.
2. **Owner verification**: Only the task that acquired the lock can release it.
3. **Atomic acquisition**: `nx=True` ensures no race conditions.

## The Innovation: Intelligent Failover

The lock alone isn't enough. If a scheduled task holds the lock, manual runs would just fail. Instead, we **fail over to cloud providers** when Ollama is busy:

```python
# Default failover chain: local -> paid (reliable) -> free tier (rate limited)
DEFAULT_FAILOVER_CHAIN = ["ollama", "openai", "claude", "mistral", "gemini"]
```

The chain is ordered by preference:
1. **Ollama**: Free, sovereign, preferred
2. **OpenAI**: Reliable, fast, reasonable cost
3. **Claude**: High quality, good for complex reasoning
4. **Mistral**: EU-based, GDPR-friendly
5. **Gemini**: Free tier available, but aggressive rate limits

```python
async def complete_with_failover(self, messages, **kwargs):
    """Try providers in order until one succeeds."""

    for provider_name in self._chain:
        if provider_name == "ollama":
            if not self._acquire_ollama_lock():
                self._logger.info("Ollama locked, trying next provider")
                continue

        try:
            provider = get_provider(provider_name)
            result = await provider.complete(messages, **kwargs)
            return result

        except Exception as e:
            self._logger.warning(f"{provider_name} failed: {e}")
            continue

        finally:
            if provider_name == "ollama":
                self._release_ollama_lock()

    raise RuntimeError("All providers failed")
```

## The Numbers

After deploying this pattern:

| Metric | Before | After |
|--------|--------|-------|
| Validation failures | ~15% | &lt;1% |
| Data sent to cloud | 100% | ~20% |
| Monthly LLM costs | ~$50 | ~$5 |
| Sovereignty compliance | No | Yes |

The 20% cloud usage comes from:
- Manual runs during scheduled tasks (Ollama locked)
- Ollama service restarts
- Very long documents that timeout locally

## Why This Matters for Civic AI

### 1. Cost Democratization

Not every civic project has budget for cloud AI. A small town council shouldn't need to choose between AI assistance and other spending. With local-first + failover:

```
Monthly cost breakdown:
├── Ollama (local): $0
├── Electricity: ~$2
├── OpenAI fallback: ~$3
└── Total: ~$5/month
```

Compare to pure cloud: $50-100/month for similar volume.

### 2. Data Sovereignty

French citizens' contributions stay on French servers unless absolutely necessary. When failover triggers, only that specific contribution goes to cloud—not the entire dataset.

```
Data flow:
├── 80% of requests: Local only
├── 15% of requests: OpenAI (US)
├── 4% of requests: Claude (US/UK)
└── 1% of requests: Gemini (US)
```

For sensitive civic data, this is the difference between "data might leave the country" and "data almost never leaves, and when it does, it's minimal."

### 3. Resilience

The system **never fails completely**. If Ollama crashes, cloud takes over. If OpenAI has an outage, Claude steps in. If everything fails, Gemini's free tier is the last resort.

```
┌──────────────────────────────────────────────────────────┐
│                   FAILOVER CASCADE                        │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Request arrives                                          │
│         │                                                 │
│         ▼                                                 │
│  ┌─────────────┐                                          │
│  │   Ollama    │ ──── Lock available? ──── Yes ──▶ Use   │
│  └─────────────┘           │                              │
│                           No                              │
│                            │                              │
│                            ▼                              │
│  ┌─────────────┐                                          │
│  │   OpenAI    │ ──── API available? ──── Yes ──▶ Use    │
│  └─────────────┘           │                              │
│                           No                              │
│                            │                              │
│                            ▼                              │
│  ┌─────────────┐                                          │
│  │   Claude    │ ──── API available? ──── Yes ──▶ Use    │
│  └─────────────┘           │                              │
│                           No                              │
│                            │                              │
│                            ▼                              │
│  ┌─────────────┐                                          │
│  │   Mistral   │ ──── API available? ──── Yes ──▶ Use    │
│  └─────────────┘           │                              │
│                           No                              │
│                            │                              │
│                            ▼                              │
│  ┌─────────────┐                                          │
│  │   Gemini    │ ──── Last resort (rate limited)         │
│  └─────────────┘                                          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## Implementation Notes

### Check Lock Status

```bash
# Is Ollama available?
redis-cli -n 6 GET "lock:ollama:global"
# Empty = available, otherwise shows task holding it

# How long until lock expires?
redis-cli -n 6 TTL "lock:ollama:global"
```

### Force Clear a Stuck Lock

```bash
# Only if you're sure no task is actually running
redis-cli -n 6 DEL "lock:ollama:global"
```

### Monitor Failover

```python
# In your task code
result = await provider.complete_with_failover(messages)
print(f"Used provider: {result.provider}")  # Shows which provider actually handled it
```

### Revalidate After Failures

If you had failures before implementing failover, clean them up:

```bash
# Run the revalidation script (uses OpenAI)
poetry run python scripts/revalidate_errors.py
```

## The Bigger Picture

This pattern—**local-first with intelligent failover**—applies beyond LLMs:

| Domain | Local | Failover |
|--------|-------|----------|
| LLM inference | Ollama | OpenAI, Claude |
| Vector search | Local Qdrant | Pinecone |
| OCR | Tesseract | Google Vision |
| Speech-to-text | Whisper local | Whisper API |

The principle is the same: prefer local for cost and sovereignty, failover to cloud for reliability.

## Conclusion

The global lock pattern turned our unreliable local LLM into a production-ready system. Citizens get fast, reliable AI assistance. Their data stays sovereign. The project stays within budget.

**Reliability and sovereignty aren't opposites—they're achievable together with the right architecture.**

---

*Code reference: `app/providers/failover.py`, `app/services/tasks/task_audierne_docs.py`*

*Related: [Grounding AI in Reality](/blog/grounding-ai-in-reality) | [Self-Improving Civic AI](/blog/self-improving-civic-ai)*
