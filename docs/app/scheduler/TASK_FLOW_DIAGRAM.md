# Scheduler Task Flow Diagram

**Last Updated**: October 23, 2025
**Status**: ✅ All tasks active and using workflow patterns

---

## Complete Task Chain Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SCHEDULER ORCHESTRATION                                         │
│ Runs every 7 minutes (5 AM - 9 PM)                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. task_clear_log                                               │
│    Clear logs and success keys                                  │
│    Dependencies: None                                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. task_today                                                   │
│    Fetch today's meetings                                       │
│    Dependencies: [task_clear_log]                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. task_pastraces                                               │
│    Fetch historical race data                                   │
│    Dependencies: [task_today]                                   │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. task_yesterday                                               │
│    Update yesterday's results                                   │
│    Dependencies: [task_pastraces]                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. task_predictions                                             │
│    Store predictions from Redis to DB                           │
│    Dependencies: [task_yesterday]                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. task_history                                                 │
│    Save chat histories                                          │
│    Dependencies: [task_predictions]                             │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. task_program ✅ USES WORKFLOWS                               │
│    Fetch and process program/race contexts                      │
│    - Equidia + Turfinfo fetchers                                │
│    - CanonicalProgram merger                                    │
│    - RaceContext creation                                       │
│    Dependencies: [task_today, task_pastraces, task_predictions] │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. task_participants ✅ USES WORKFLOWS                          │
│    Fetch and process participants                               │
│    - Equidia + Turfinfo fetchers                                │
│    - CanonicalParticipants merger                               │
│    - HHI computation                                            │
│    - Dominant horse detection                                   │
│    Dependencies: [task_program]                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. task_careers ✅ USES WORKFLOWS (Updated Oct 22, 2025)        │
│    Process horse careers for all races                          │
│    - CareerWorkflow.from_race_context()                         │
│    - 5 analyzers: Race, Summary, Performance, Tracking, Catchy  │
│    - Catchy performance detection (integrated)                  │
│    - Cache to Redis: careers:{thread_id}                        │
│    Dependencies: [task_participants]                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ├────────────────────────────────┐
                            │                                │
                            ▼                                ▼
┌────────────────────────────────────────┐  ┌────────────────────────────────────────┐
│ 10. plan_race_task_init                │  │ 11. task_favorability                  │
│     ✅ USES WORKFLOWS (Oct 22, 2025)   │  │     ✅ USES WORKFLOWS (Oct 23, 2025)   │
│                                        │  │                                        │
│ Schedule race notifications            │  │ Process favorability data              │
│ - all_races() workflow                 │  │ - all_races() workflow                 │
│ - RaceContextWorkflow                  │  │ - RaceContextWorkflow                  │
│ - Starters > 8 filtering               │  │ - Database favorability lookup         │
│ - 15 min before race start             │  │ - Uses cached race contexts            │
│ Dependencies: [task_careers]           │  │ Dependencies: [task_careers]           │
└────────────────────────────────────────┘  └────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. task_prepare_tomorrow ✅ NO CHANGES NEEDED                  │
│     Fetch and store tomorrow's meeting data                     │
│     - fetch_all_equidia_meetings()                              │
│     - store_meeting_data()                                      │
│     Dependencies: [plan_race_task_init]                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. task_tomorrow ✅ USES WORKFLOWS (Updated Oct 23, 2025)      │
│     Process careers for tomorrow's races                        │
│     - all_races() workflow                                      │
│     - RaceContextWorkflow                                       │
│     - CareerWorkflow.from_race_context()                        │
│     - Catchy performance extraction                             │
│     - Cache to Redis: careers:{thread_id}                       │
│     Dependencies: [task_prepare_tomorrow]                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parallel Execution Branches

After **task_careers** completes, two tasks can run in parallel:

```
task_careers (completes)
    │
    ├─────────────────────────┐
    │                         │
    ▼                         ▼
plan_race_task_init    task_favorability
    │                         │
    │                    (independent)
    │
    ▼
task_prepare_tomorrow
    │
    ▼
task_tomorrow
```

---

## Eliminated Tasks

### ❌ task_catchy (ELIMINATED Oct 23, 2025)

**Previous Flow:**

```
task_careers
    ↓
task_catchy (fetch catchy performance separately)
    ↓
task_favorability
```

**New Flow:**

```
task_careers (includes catchy in career_outputs)
    ↓
task_favorability (uses cached catchy from task_careers)
```

**Rationale:**

- Catchy performance now integrated into `CareerWorkflow.process_to_outputs()`
- Eliminates duplicate career fetching
- Reduces task chain complexity
- Single source of truth for career data

---

## Workflow Integration Summary

| Task                      | Uses Workflows? | Updated      | Status    |
| ------------------------- | --------------- | ------------ | --------- |
| task_clear_log            | ❌ No (utility) | N/A          | ✅ Active |
| task_today                | ❌ No (fetcher) | N/A          | ✅ Active |
| task_pastraces            | ❌ No (DB)      | N/A          | ✅ Active |
| task_yesterday            | ❌ No (DB)      | N/A          | ✅ Active |
| task_predictions          | ❌ No (DB)      | N/A          | ✅ Active |
| task_history              | ❌ No (DB)      | N/A          | ✅ Active |
| **task_program**          | ✅ Yes          | Phase 6A     | ✅ Active |
| **task_participants**     | ✅ Yes          | Phase 7      | ✅ Active |
| **task_careers**          | ✅ Yes          | Oct 22, 2025 | ✅ Active |
| **plan_race_task_init**   | ✅ Yes          | Oct 22, 2025 | ✅ Active |
| **task_favorability**     | ✅ Yes          | Oct 23, 2025 | ✅ Active |
| **task_prepare_tomorrow** | ❌ No (fetcher) | N/A          | ✅ Active |
| **task_tomorrow**         | ✅ Yes          | Oct 23, 2025 | ✅ Active |

---

## Dependency Graph

```
                      task_clear_log
                            │
                       task_today ────┐
                            │         │
                     task_pastraces   │
                            │         │
                     task_yesterday   │
                            │         │
                    task_predictions ─┘
                            │
                      task_history
                            │
                      task_program ──────┐
                            │            │
                    task_participants ───┘
                            │
                      task_careers
                            │
                ┌───────────┴────────────┐
                │                        │
        plan_race_task_init    task_favorability
                │
        task_prepare_tomorrow
                │
           task_tomorrow
```

---

## Cache Keys and Data Flow

### Race Context Caching

```
task_program → Creates: race_context:{date}:{reunion}{race}
               ↓
task_participants → Enriches: race_context (adds HHI, dominant_horses)
                    ↓
task_careers → Uses: race_context (RaceContextWorkflow)
               ↓
plan_race_task_init → Uses: race_context (RaceContextWorkflow)
task_favorability → Uses: race_context (RaceContextWorkflow)
task_tomorrow → Uses: race_context (RaceContextWorkflow)
```

### Career Data Caching

```
task_careers → Creates: careers:{thread_id}
               Contains: {
                   "races_data": {...},
                   "career_summaries": {...},
                   "computed_perf": {...},
                   "catchy_performance": [...]  ← Integrated here
               }
               ↓
task_favorability → Uses: careers:{thread_id} (cached)
                    ↓
task_tomorrow → Creates: careers:{thread_id_tomorrow}
                (for tomorrow's date)
```

---

## Execution Timeline Example

**Typical Daily Run (e.g., 10:00 AM):**

```
10:00:00 - task_clear_log starts
10:00:05 - task_today starts
10:00:15 - task_pastraces starts
10:00:30 - task_yesterday starts
10:01:00 - task_predictions starts
10:02:00 - task_history starts
10:03:00 - task_program starts
10:05:00 - task_participants starts
10:08:00 - task_careers starts (longest task)
10:18:00 - task_careers completes
         ├─ plan_race_task_init starts (parallel)
         └─ task_favorability starts (parallel)
10:20:00 - plan_race_task_init completes
         └─ task_prepare_tomorrow starts
10:22:00 - task_prepare_tomorrow completes
         └─ task_tomorrow starts
10:35:00 - task_tomorrow completes

Total Duration: ~35 minutes
```

---

## Monitoring Points

### Critical Success Indicators

1. ✅ **task_careers** completes with >95% success rate
2. ✅ **Catchy performance** detected in career_outputs
3. ✅ **task_favorability** uses cached race contexts
4. ✅ **task_tomorrow** processes all tomorrow's races
5. ✅ **No task deadlocks** or circular dependencies

### Key Redis Keys to Monitor

```
program:{date}                              # Program data
race_context:{date}:{reunion}{race}         # Race contexts
participants:{thread_id}                    # Participants data
careers:{thread_id}                         # Career outputs (includes catchy)
odds:{date}:{reunion}{race}:H{num}          # Time-bucketed odds
```

### Performance Metrics

- **Task execution times** (each task should complete within expected time)
- **Redis memory usage** (should remain stable, not grow unbounded)
- **Error rates** (should be <5% per task)
- **Cache hit rates** (should be >80% for repeated data)

---

## Related Documentation

- [SCHEDULER_WORKFLOW_REFACTORING.md](../achievements/SCHEDULER_WORKFLOW_REFACTORING.md) - Complete refactoring plan
- [PHASE_2_3_COMPLETE_SUMMARY.md](./PHASE_2_3_COMPLETE_SUMMARY.md) - Today's completion summary
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Overall system architecture

---

**Last Updated**: October 23, 2025
**Status**: ✅ All tasks active and using workflow patterns
