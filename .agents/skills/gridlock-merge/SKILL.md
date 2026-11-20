---
name: gridlock-merge
description: Merge a Gridlock pull request into main and tidy up the worktree and branch. Use only when the user explicitly asks to merge a PR, for example "merge", "merge #4" or "land it".
disable-model-invocation: true
---

# Gridlock merge

Invoking this skill authorizes merging the PR the user named, or the current branch's PR when
they just said "merge". It does not authorize editing code beyond resolving a main-merge, or
bypassing anything GitHub refuses.

The repo has no CI and allows merge commits. Always merge with a merge commit
(`--merge`), never `--squash`, `--rebase`, `--admin` or `--auto`.

## 1. Pick the PR

```bash
gh pr list --state open
```

With a number, use it. With "merge" alone, use the PR for the current branch
(`gh pr view --json number`). If several are plausible, ask which.

## 2. Make sure it is current

```bash
git fetch -q origin
git log --oneline HEAD..origin/main          # run in the PR's worktree
```

- Empty: go to step 3.
- Main has moved: `git merge origin/main`. Resolve conflicts, keeping both sides' intent. The
  usual hotspots are `README.md`, `AGENTS.md`, `public/maps/city.tmj` and `src/scenes/GameScene.ts`.
  If a conflict means a generated file (`public/tiles/city.svg`), regenerate it with
  `nix develop -c npm run gen:tileset` instead of hand-editing.
- After resolving, run `nix develop -c npm run check`, and look at the game with `gridlock-verify` if
  the merge touched code. Remove the `node_modules` symlink, commit the merge, push.
- If the conflict needs a design decision, stop and ask.

## 3. Wait for GitHub

```bash
gh pr view <n> --json mergeable,mergeStateStatus
```

`UNKNOWN` just means GitHub has not computed it yet: wait 5 to 10 seconds and look again.
Merge when it is `CLEAN`. If it is `DIRTY` or `BEHIND`, go back to step 2. If it is `BLOCKED`
or `UNSTABLE`, report why and stop.

## 4. Merge and tidy

```bash
gh pr merge <n> --merge
gh pr view <n> --json state,mergedAt        # confirm MERGED
cd ~/Agents/gridlock && git pull -q --ff-only
git worktree remove ../wt-gridlock-<topic>  # not --force; if it refuses, look why
git branch -d <topic>
git push -q origin --delete <topic>         # the remote branch is not deleted automatically
git log --oneline -3
```

`git worktree remove` refuses on uncommitted files. A leftover `node_modules` symlink is the
usual cause, so delete that and retry. Never use `--force` on something with real changes.

Finish by reporting the merge commit and that the main checkout is up to date. Other open PRs
may now be stale; mention them but do not touch them unless asked.
