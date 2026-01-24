Here's a focused **Git cheat sheet** specifically for the phase **before doing a `git pull`** from remote (GitHub, etc.).  
It covers the most common real-world needs on servers / CI / deployment machines:

- Making scripts executable
- Reversing / discarding local changes (safely or destructively)
- Cleaning the working directory
- Resetting to match remote exactly (force overwrite local state)

All commands assume you're already on the correct branch (check with `git branch` or `git status`).

### 1. Before Pull: Reverse / Discard local changes (choose level of destruction)

| What you want to discard                         | Command(s)                                                                 | Destructive? | Recoverable?          | Use when...                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------ | --------------------- | ------------------------------------------------------- |
| **Temporarily save** changes (safest first step) | `git stash` or `git stash push -m "WIP before pull"`                       | No           | Yes (`git stash pop`) | Not sure yet – want changes back later                  |
| **Uncommitted changes only** (unstaged + staged) | `git restore .` or `git checkout -- .` (older Git)                         | Yes          | No                    | Keep history, just wipe working dir                     |
| **All local changes** (including staged)         | `git reset --hard`                                                         | Yes          | No                    | Discard modifications but keep branch at current commit |
| **Exact remote match** (most wanted before pull) | `git fetch origin`<br>`git reset --hard origin/dev`                        | Yes          | No                    | Force local = remote (your original goal)               |
| **One-liner force overwrite**                    | `git fetch origin && git reset --hard origin/$(git branch --show-current)` | Yes          | No                    | Quick & safe on servers                                 |
| **Untracked files too** (new files, .env, etc.)  | After reset: `git clean -fd` or `git clean -fdx` (also ignores)            | Yes          | No                    | Full clean slate (node_modules, logs, etc.)             |

**Safest sequence** when unsure:

```bash
git stash -u                     # -u includes untracked
git fetch origin
git reset --hard origin/dev
# Later: git stash pop (if you want changes back)
```

### 2. Full "Nuke & Sync" combo (very common on servers before deploy/pull)

```bash
# Option A – Most recommended (clean & exact remote state)
git fetch origin
git reset --hard origin/dev      # or main, master, etc.
git clean -fd                    # remove untracked files & dirs

# Option B – Even more aggressive (removes ignored files like .env too)
git fetch origin
git reset --hard origin/dev
git clean -fdx

# Option C – With backup stash first
git stash push -u -m "Auto-stash before force pull $(date +%Y-%m-%d)"
git fetch origin
git reset --hard origin/dev
git clean -fd
# → git stash list   to see it
# → git stash pop    to restore if needed
```

### 3. Quick decision tree (what to run right now?)

- I have local mods but might need them later? → `git stash -u`
- I just want to throw away changes and pull cleanly? → `git fetch && git reset --hard origin/<branch>`
- Pull still complains about files? → Add `git clean -fd` after reset
- Scripts not running? → `chmod +x *.sh` or `chmod +x path/to/script.sh`
- Want to see what I'll lose first? → `git status` + `git diff`
