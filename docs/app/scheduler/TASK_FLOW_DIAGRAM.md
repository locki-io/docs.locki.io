# OCapistaine Scheduler Task Flow Diagram

**Last Updated**: February 2026
**Status**: Initial implementation - Core tasks active

---

## Complete Task Chain Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SCHEDULER ORCHESTRATION                                         │
│ Runs every 7 minutes (6 AM - 11 PM)                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. task_contributions_analysis                                  │
│    Validate citizen contributions from GitHub/Vaettir           │
│    - Fetch from audierne2026/participons                        │
│    - Run Forseti validation                                     │
│    - Log results to Opik                                        │
│    Dependencies: None                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ (Future) task_rag_indexing   │  │ (Future) task_mockup_gen     │
│ Index validated contributions│  │ Generate test scenarios      │
│ into vector store            │  │ from validated contributions │
│ Dependencies: [contributions]│  │ Dependencies: [contributions]│
└──────────────────────────────┘  └──────────────────────────────┘
```

---

## Standalone Scheduled Tasks

```
┌─────────────────────────────────────────────────────────────────┐
│ task_firecrawl                                                  │
│ Runs: Daily at 3 AM                                             │
│ Crawl municipal documents from configured sources               │
│ - mairie_arretes (~4010 documents)                              │
│ - mairie_deliberations                                          │
│ - commission_controle                                           │
│ Dependencies: None (standalone cron job)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ task_opik_experiment                                            │
│ Runs: Daily at 5 AM                                             │
│ Run LLM evaluation experiments                                  │
│ - Forseti validation accuracy                                   │
│ - Category classification precision/recall                      │
│ - Wording correction quality                                    │
│ Dependencies: None (standalone cron job)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## OCapistaine Workflow Decision Tree

The scheduler implements a priority-based workflow for continuous improvement:

```
                    ┌─────────────────────────┐
                    │ Start Daily Workflow    │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │ Check GitHub Issues     │
                    │ (audierne2026/participons)
                    └───────────┬─────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            Has new issues?           No new issues
                    │                       │
                    ▼                       ▼
        ┌───────────────────┐   ┌───────────────────┐
        │ task_contributions │   │ Check Mockup Queue│
        │ _analysis          │   │ (Redis)           │
        │                    │   └─────────┬─────────┘
        │ • Forseti validate │             │
        │ • Categorize       │   ┌─────────┴─────────┐
        │ • Log to Opik      │   │                   │
        └────────┬───────────┘   Has mockups?   No mockups
                 │                   │               │
                 ▼                   ▼               ▼
        ┌───────────────────┐ ┌───────────────┐ ┌───────────────┐
        │ Update experiment │ │ task_mockup   │ │ task_firecrawl│
        │ dataset           │ │ _experiment   │ │ (if scheduled)│
        └───────────────────┘ │               │ └───────────────┘
                              │ • Run Opik    │
                              │   evaluation  │
                              │ • Try new     │
                              │   prompts     │
                              └───────────────┘
```

---

## Data Sources and Triggers

### Priority 1: Live Contributions (GitHub)

```
audierne2026/participons repository
        │
        │ New issue created
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ N8N Webhook → Redis Queue → task_contributions_analysis         │
│                                                                 │
│ OR: Periodic polling via orchestrate_task_chain (every 7 min)   │
└─────────────────────────────────────────────────────────────────┘
```

### Priority 2: Mockup Testing (Streamlit UI)

```
app/front.py → Mockup Tab
        │
        │ User creates test contribution
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Streamlit → ForsetiAgent.validate() → Log to Opik               │
│                                                                 │
│ If interesting case: Save to Redis → task_opik_experiment       │
└─────────────────────────────────────────────────────────────────┘
```

### Priority 3: Document Crawling (Scheduled)

```
┌─────────────────────────────────────────────────────────────────┐
│ task_firecrawl (3 AM daily)                                     │
│                                                                 │
│ Sources:                                                        │
│ ├── mairie_arretes (audierne.bzh/publications-arretes/)         │
│ ├── mairie_deliberations (audierne.bzh/deliberations-...)       │
│ └── commission_controle (audierne.bzh/documentheque/...)        │
│                                                                 │
│ Output: ext_data/{source}/*.md                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Task Implementation Status

| Task                         | Uses Workflows? | Status       | Purpose                        |
| ---------------------------- | --------------- | ------------ | ------------------------------ |
| **task_contributions_analysis** | ✅ Yes       | ✅ Active    | Validate GitHub contributions  |
| **task_opik_experiment**     | ✅ Yes          | ✅ Active    | Run LLM evaluations            |
| **task_firecrawl**           | ❌ No (crawler) | ✅ Active    | Crawl municipal documents      |
| task_rag_indexing            | ✅ Yes          | 🔴 Planned   | Index to vector store          |
| task_mockup_experiment       | ✅ Yes          | 🔴 Planned   | Process mockup test cases      |
| task_prompt_optimization     | ✅ Yes          | 🔴 Planned   | Run Opik optimization          |

---

## Cache Keys and Data Flow

### Contribution Processing

```
GitHub Issue
    │
    ▼
task_contributions_analysis
    │
    ├── Redis: contribution:{issue_id}
    │   └── { title, body, category, validation_result, timestamp }
    │
    ├── Redis: contributions:validated:{date}
    │   └── List of validated issue IDs
    │
    └── Opik: forseti_validation trace
        └── { input, output, latency, model, tokens }
```

### Experiment Data

```
task_opik_experiment
    │
    ├── Redis: experiment:latest
    │   └── { experiment_id, date, metrics, status }
    │
    └── Opik: experiment traces
        └── { dataset, evaluations, scores }
```

### Crawl Status

```
task_firecrawl
    │
    ├── Redis: crawl:{source}
    │   └── { last_crawl, documents, status }
    │
    └── Filesystem: ext_data/{source}/
        └── *.md, *.html, *_metadata.json
```

---

## Execution Timeline Example

**Typical Daily Run:**

```
03:00:00 - task_firecrawl starts (cron)
           └── Crawl municipal documents
03:30:00 - task_firecrawl completes (estimated)

05:00:00 - task_opik_experiment starts (cron)
           └── Run daily LLM evaluations
05:15:00 - task_opik_experiment completes (estimated)

06:00:00 - orchestrate_task_chain starts (every 7 min)
06:00:01 - task_contributions_analysis starts
           └── Check GitHub for new issues
           └── Validate with Forseti
           └── Log to Opik
06:02:00 - task_contributions_analysis completes
06:07:00 - orchestrate_task_chain runs (skips - already completed)
...
23:00:00 - orchestrate_task_chain stops (outside active hours)
```

---

## Continuous Improvement Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTINUOUS IMPROVEMENT                        │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │ 1. COLLECT   │ ← Live contributions from citizens
     │    Data      │ ← Mockup tests from admin
     └──────┬───────┘ ← Crawled documents
            │
            ▼
     ┌──────────────┐
     │ 2. VALIDATE  │ ← Forseti agent validation
     │    & Log     │ ← Opik tracing
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │ 3. ANALYZE   │ ← task_opik_experiment
     │    Results   │ ← Accuracy metrics
     └──────┬───────┘ ← Error patterns
            │
            ▼
     ┌──────────────┐
     │ 4. OPTIMIZE  │ ← (Future) Opik Optimizer
     │    Prompts   │ ← A/B testing
     └──────┬───────┘
            │
            ▼
     ┌──────────────┐
     │ 5. DEPLOY    │ ← Update prompt registry
     │    & Monitor │ ← Monitor production
     └──────┬───────┘
            │
            └────────────────────────────────────────┐
                                                     │
                                              (Loop back)
```

---

## Monitoring Points

### Critical Success Indicators

1. ✅ **task_contributions_analysis** validates new contributions daily
2. ✅ **task_opik_experiment** runs evaluations without errors
3. ✅ **task_firecrawl** crawls documents as scheduled
4. ✅ **No task deadlocks** or circular dependencies

### Key Redis Keys to Monitor

```bash
# Scheduler locks (db=6)
redis-cli -n 6 KEYS "lock:*"
redis-cli -n 6 KEYS "success:*"

# Application data (db=5)
redis-cli -n 5 KEYS "contribution:*"
redis-cli -n 5 KEYS "crawl:*"
```

### Performance Metrics

- **Task execution times** (each task should complete within expected time)
- **Redis memory usage** (should remain stable)
- **Error rates** (should be <5% per task)
- **Validation accuracy** (tracked in Opik)

---

## Related Documentation

- [README.md](./README.md) - Scheduler architecture overview
- [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) - How-to guide
- [TASK_BOILERPLATE.md](./TASK_BOILERPLATE.md) - Task implementation guide

---

**Last Updated**: February 2026
**Status**: Initial implementation - Core tasks active
