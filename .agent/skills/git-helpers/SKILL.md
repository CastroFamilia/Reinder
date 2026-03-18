---
name: git-helpers
description: Git workflow helpers. Use when the user asks to push code to remote. Supports intelligent commit grouping and push to remote.
---

# Git Helpers

## Push to Remote

### Goal

To intelligently manage the version control process by grouping uncommitted changes into logical commits and pushing them to the remote repository.

### Instructions

1.  **Check for Submodule Changes First**:
    - Run `git submodule status` to identify all submodules.
    - For each submodule, check if it has uncommitted changes:
      - Navigate into the submodule directory.
      - Run `git status` to check for changes.
      - If changes exist, note the submodule for processing.

2.  **Process Submodules Before Root**:
    - **CRITICAL**: Submodules MUST be committed and pushed BEFORE the root repository.
    - For each submodule with changes:
      1.  Navigate into the submodule directory (e.g., `cd apps/frontend`).
      2.  Run `git status` and `git diff` to understand the changes.
      3.  Stage changes: `git add -A` or `git add <specific-files>`.
      4.  Create a descriptive commit message using the format `<type>: <description>`.
      5.  Commit: `git commit -m "<type>: <description>"`.
      6.  Push to the submodule's remote: `git push origin <branch>`.
      7.  If the user requested merging to main, also merge and push main branch in the submodule.
      8.  Return to the root repository directory.

3.  **Analyze Root Repository Status**:
    - Run `git status` and `git diff` to identify all uncommitted changes in the root repository.
    - This will include submodule pointer updates from the previous step.

4.  **Group Root Repository Changes**:
    - Analyze the changed files in the context of recent work.
    - Determine if changes belong to a single logical unit or multiple distinct logical units.
    - **Multiple Units**: If there are changes addressing different issues, split them into separate commits.
    - **Submodule References**: Group submodule pointer updates separately from other changes.

5.  **Commit Root Repository**:
    - For each identified group of changes:
      1.  **Stage**: Run `git add <path/to/files>` for the files in this group.
      2.  **Message**: Generate a specific, descriptive commit message using the format `<type>: <description>`.
          - **Type**: Select strictly from the **Allowed Types** table below.
          - **Description**: A concise summary of the change (start with uppercase, no period).
      3.  **Commit**: Run `git commit -m "<type>: <description>"`.

6.  **Push Root Repository**:
    - Once all groups are committed, run `git push origin <branch>`.

7.  **Report**:
    - Inform the user of:
      - All submodules that were committed and pushed (with commit messages).
      - All root repository commits created (with messages).
      - Which repositories and branches were pushed.

---

## Allowed Commit Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only changes                              |
| `style`    | Formatting, whitespace (no code change)                 |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or correcting tests                              |
| `chore`    | Build process, tooling, dependencies                    |

## Constraints

- **CRITICAL**: Submodules MUST be committed and pushed BEFORE the root repository to prevent broken references.
- **Do not** push the root repository before all submodules with changes are pushed.
- **Do not** squash distinct features into a single commit.
- **Do not** use generic messages like "fixes" or "updates".
- **Do not** invent new commit types; use strictly the ones listed above.
- **Do not** push if `git commit` fails.
- **Always** check `git submodule status` before pushing to identify submodule changes.
