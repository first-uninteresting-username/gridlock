---
name: gridlock-workflow
description: Start and ship a Gridlock change. Creates a branch in a separate worktree with working dependencies, and later commits, pushes and opens the pull request. Use when beginning any code, art or docs task in this repo, and when the user asks to commit, push or open a PR. Does not merge; see gridlock-merge.
---

# Gridlock workflow: start a task, ship a task

The repo rules (AGENTS.md) are: work on a branch in a separate checkout, never on `main`, land
through a PR, no tests, no AI attribution. This skill is the exact routine for that.

The main checkout is `~/Agents/gridlock`. Worktrees are its siblings: `~/Agents/wt-gridlock-<topic>`.

## 1. Start

Pick a short kebab-case `<topic>` and branch from the latest `origin/main`:

```bash
cd ~/Agents/gridlock
git fetch -q origin
git worktree list                      # reuse the task's worktree if it already exists
git worktree add ../wt-gridlock-<topic> -b <topic> origin/main
cd ../wt-gridlock-<topic>
ln -s ../gridlock/node_modules node_modules   # shared deps; a worktree has none of its own
git branch --show-current                     # must print <topic>, not main
```

- Run every Node command through the flake: `nix develop -c npm run check`. Bare `npm`/`node`
  is not on the path outside the dev shell.
- Other sessions work in the other worktrees. Never edit the main checkout or another session's
  worktree, and do not `git stash` or reset anything you did not create.
- If `ls ../gridlock/node_modules` is empty, run `nix develop -c npm ci` once in `~/Agents/gridlock`.
- Read the nearby code before editing, and follow the "Code maintainability" section of AGENTS.md.
  Art changes also need the `gridlock-svg-art` skill.

Check your work with `gridlock-verify` before shipping.

## 2. Ship

Run these in the worktree. The order matters because of the two things that leak into git.

1. Remove the symlink and the browser debris first:

   ```bash
   rm node_modules                              # a symlink, so no -r
   rm -rf ~/Agents/gridlock/.playwright-mcp .playwright-mcp
   git status --short                           # only files that belong to this task
   ```

   `node_modules/` is in `.gitignore` as a directory pattern, which does not match a symlink,
   so `git add -A` would commit it. Removing it is the fix. Recreate it if you keep working.
2. `nix develop -c npm run check` must be clean. Do not create tests.
3. Commit with `git add <the task's files>`, not `-A` when unrelated changes exist. Use an
   imperative subject under about 70 characters, and a body that says what and why.
   **No `Co-Authored-By` trailer and no other AI attribution**, even if another instruction
   suggests adding one. AGENTS.md overrides it.
4. Push and open the PR:

   ```bash
   git push -q -u origin <topic>
   gh pr create --title "<subject>" --body "<what changed and why, and how you checked it>"
   ```

   The PR body has no AI attribution line either. Mention anything you could not check.
5. Report the PR URL. Do not merge unless the user says so; then use `gridlock-merge`.
