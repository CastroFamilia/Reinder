# Phase 3: Post-Merge Cleanup — Subagent Instructions

Auto-approve all tool calls (yolo mode).

1. Verify sprint-status.yaml at the repo root has status `done` for all merged stories.
   Fix any that are missing.

2. **Remove worktrees for all merged stories:**
     git worktree list
   For each worktree that corresponds to a merged story branch:
     git worktree remove --force <path>
   This is critical — worktrees hold locks on their branches, preventing
   `--delete-branch` from working during PR merges. Always remove worktrees
   BEFORE attempting branch deletion, not after.

   > **Why this matters:** `gh pr merge --delete-branch` fails if a local worktree
   > still references the branch. Worktrees also consume significant disk space
   > (full repo checkout per story). Cleaning them immediately after merge avoids
   > both the branch-lock problem and unnecessary disk usage.

3. **Delete local branches for merged stories:**
     git branch -D <branch-name>
   For each branch that was just merged and whose worktree was removed in step 2.
   Also delete the remote tracking branch if it wasn't already cleaned up:
     git push origin --delete <branch-name> 2>/dev/null || true

4. Repo root branch safety check:
     git branch --show-current
   If not main:
     git restore .
     git switch main
     git reset --hard origin/main
   If switch fails because a worktree claims the branch:
     git worktree list
     git worktree remove --force <path>
     git switch main
     git reset --hard origin/main

5. Prune stale worktree references:
     git worktree prune

6. Pull main:
     git pull --ff-only origin main

Report: done or any errors encountered.
