Here's a practical **Git "cheat sheet"** focused on **removing files from the Git cache** (index/staging area), untracking them, clearing ignored files that are still tracked, etc. These are the most common real-world scenarios in 2025–2026.

### Quick reference: Remove / untrack files from Git cache

| Goal / Scenario                                                      | Command(s)                                                                                                      | What it does                                                           | Important notes / warnings                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Stop tracking **one file** but **keep it locally**                   | `git rm --cached path/to/file.txt`                                                                              | Removes from index only (untracks it). File stays on disk.             | Then add to `.gitignore` if needed, then `git commit`                      |
| Stop tracking **a directory** (recursive)                            | `git rm -r --cached path/to/dir/`                                                                               | Untracks entire folder and subfiles, keeps them locally                | Use `-r` for recursive                                                     |
| Untrack **everything** (full cache refresh)                          | `git rm -r --cached .` + `git add .` + `git commit -m "Refresh tracked files"`                                  | Removes **all** files from index, then re-adds only non-ignored ones   | Classic way to apply new `.gitignore` rules                                |
| Unstage a file (remove from index, but keep changes)                 | `git reset HEAD path/to/file.txt` or `git restore --staged path/to/file.txt`                                    | Only unstages (Git ≥2.23). File stays modified locally                 | Safer than `rm --cached` if you still want to track it later               |
| Delete file **both locally and from Git**                            | `git rm path/to/file.txt`                                                                                       | Removes from index **and** deletes from disk                           | Use when you really want it gone                                           |
| Remove untracked files / folders (cleanup)                           | `git clean -fd` or preview first: `git clean -n -fd`                                                            | Deletes untracked files/directories (not in Git)                       | `-f` = force, `-d` = directories, `-x` = also ignored files                |
| **Force apply new .gitignore** (very common)                         | `echo "newpattern/" >> .gitignore` + `git rm -r --cached .` + `git add .` + `git commit -m "Apply new ignores"` | Makes Git respect updated `.gitignore` by re-adding only allowed files | Do this when ignored files still show up in `git status`                   |
| **Permanently remove file from history** (sensitive data, big files) | `git filter-repo --path path/to/badfile --invert-paths --force` (or old way: `git filter-branch -- ...`)        | Rewrites history to erase the file completely                          | **Dangerous** — changes commit hashes. Use `git filter-repo` (modern tool) |
| Undo a `git rm --cached` (before commit)                             | `git reset HEAD path/to/file.txt` + or `git add path/to/file.txt`                                               | Puts it back into the index                                            | Only works if not yet committed                                            |

### Most frequent one-liners people copy-paste

1. **Fix .gitignore not working** (ignored files still tracked):

   ```bash
   git rm -r --cached .
   git add .
   git commit -m "Apply updated .gitignore"
   ```

2. **Untrack a single accidentally committed file** (e.g. `.env`, logs, build/):

   ```bash
   git rm --cached .env
   echo ".env" >> .gitignore
   git add .gitignore
   git commit -m "Stop tracking .env"
   ```

3. **Nuke untracked junk + reset cache** (extra clean server/repo):
   ```bash
   git fetch
   git reset --hard origin/main          # or your branch
   git clean -fdx                        # removes untracked + ignored files
   ```

### Pro tips

- Always run `git status` first to see what's about to be affected.
- `--cached` = magic flag: "only touch Git's index, leave my files alone".
- After any `rm --cached`, commit the change — otherwise the untracking isn't saved.
- If the file was already pushed to GitHub/remote → after commit, others will need to pull/reset too (or they'll keep the old file).
