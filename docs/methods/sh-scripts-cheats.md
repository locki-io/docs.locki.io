### Before Pull: Make .sh scripts executable (chmod quick reference)

| Goal                         | Command                                    | Notes / When to use                               |
| ---------------------------- | ------------------------------------------ | ------------------------------------------------- |
| Make one script runnable     | `chmod +x script.sh`                       | Most common – adds execute for owner/group/others |
| Owner only                   | `chmod u+x script.sh`                      | Safer on shared servers                           |
| Everyone                     | `chmod a+x *.sh`                           | Or `chmod +x *.sh` (same)                         |
| Standard for scripts in repo | `chmod 755 script.sh`                      | rwxr-xr-x – owner full, others read+exec          |
| Fix many at once             | `find . -name "*.sh" -exec chmod +x {} \;` | Recursive in current dir                          |
| Check current perms          | `ls -l script.sh`                          | Look for `x` in permissions                       |

**Tip**: Always have `#!/usr/bin/env bash` (or `#!/bin/bash`) as first line.
