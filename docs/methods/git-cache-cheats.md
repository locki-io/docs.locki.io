### 1. Quick scenarios: Untrack / remove files from Git (but keep or delete locally)

- **Untrack one file** (stop Git from tracking it, but **keep** it on disk)

  ```bash
  git rm --cached path/to/file.txt
  ```

  → Then usually: add it to `.gitignore` → `git add .gitignore` → `git commit`

- **Untrack a whole folder** (recursive)

  ```bash
  git rm -r --cached path/to/dir/
  ```

- **Apply new .gitignore rules** (most common fix when ignored files still appear in `git status`)

  ```bash
  git rm -r --cached .
  git add .
  git commit -m "Apply updated .gitignore — refresh tracked files"
  ```

- **Unstage a file** (remove from index/staging, but keep changes locally and still track it later)

  ```bash
  git restore --staged path/to/file.txt     # Git 2.23+
  # or older equivalent:
  git reset HEAD path/to/file.txt
  ```

- **Delete file everywhere** (from Git + from your disk)

  ```bash
  git rm path/to/file.txt
  ```

- **Clean up untracked files/folders** (dangerous — preview first!)  
  Preview: `git clean -n -fd`  
  Delete: `git clean -fd` (`-x` also removes ignored files)

### 2. One-liners people use most often

**Fix .gitignore not working** (ignored files still tracked):

```bash
git rm -r --cached .
git add .
git commit -m "Refresh index — apply new .gitignore rules"
```

**Untrack accidentally committed sensitive / generated file** (e.g. `.env`, `node_modules/`, `dist/`):

```bash
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Untrack .env file"
```

**Nuke local junk + reset to remote clean state** (careful — destroys uncommitted work!):

```bash
git fetch
git reset --hard origin/main          # or your branch name
git clean -fdx                        # also removes ignored files
```

### 3. New: Preview or rewind last commit **before pushing** (check for large files, mistakes, etc.)

Very useful right after `git commit` when you realize "wait… did I really add that 400 MB dataset / build folder / video?"

**Option A — Safest & easiest: Soft reset (keeps your files & changes, just undoes the commit)**

```bash
git reset --soft HEAD~1
```

→ What happens:

- The last commit disappears
- All files/changes go back to **staged** (green in `git status`)
- You can now run `git status`, `git diff --staged`, or even `git diff` to inspect
- Check large files: `git diff --staged --stat` or look at individual files
- Fix: `git restore --staged hugefile.bin` (unstage bad files), add to `.gitignore`, then `git commit` again

**Option B — Inspect without changing anything (detached HEAD mode)**

```bash
git checkout HEAD~1
```

→ You are now looking at the state **before** your last commit

- Run `ls`, `du -sh *`, `find . -size +50M` to spot large files
- `git diff HEAD~1..HEAD` or `git show HEAD` to see exactly what the bad commit added
- When done: `git checkout main` (or your branch) to go back

**Option C — Throw away the last commit completely** (only if you're sure — changes lost unless in reflog)

```bash
git reset --hard HEAD~1
```

→ Use only if you're okay losing the changes forever (rare before push)

**Quick check for large files in the last commit** (approximate size of new/changed blobs):

```bash
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print substr($0, index($0,$3))}' | sort -nrk2 | head -n 10
```

(or simpler: just `git diff --stat HEAD~1` to see changed files & approximate impact)

**Pro tip** — Do this **before** `git push`:  
Always `git log -1 --stat` or `git show --stat` after committing.  
If something looks wrong → use the soft reset method above.  
Once pushed → it's much harder (needs history rewrite like `git filter-repo`).

### Bonus reminders

- `--cached` = "only touch Git's index — don't delete my actual files"
- After `git rm --cached`, **always commit** the change
- Run `git status` before big commands
- If already pushed → teammates may need `git fetch && git reset --hard origin/branch` after your fix

Hope this version is much easier to scan and practice — let me know if you want to add screenshots/examples or tweak anything!
