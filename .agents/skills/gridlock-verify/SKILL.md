---
name: gridlock-verify
description: Type-check Gridlock and run the game to see a change working. Starts the Vite dev server on a free port, drives the game in Playwright through window.gridlock, takes screenshots, then cleans everything up. Use before opening a PR, when asked to run, launch or screenshot the game, or to debug input or rendering.
---

# Gridlock verify

The project has no tests (do not add any). A change is verified by `npm run check` and by
looking at the running game.

Run from the task's worktree (see `gridlock-workflow`). Scratch files, including the server
log, go in the session scratchpad directory, not in the repo.

## 1. Type-check

```bash
nix develop -c npm run check
```

It must exit cleanly. This is `tsc` only, so it does not prove the game runs.

## 2. Start the dev server

Use a fixed port that other sessions are unlikely to hold, and `--strictPort` so it fails
instead of silently moving to another port:

```bash
S=<scratchpad dir>
(nohup nix develop -c npx vite --port 5199 --strictPort > $S/vite.log 2>&1 &)
sleep 8; tail -5 $S/vite.log          # wait for "Local: http://localhost:5199/"
```

If 5199 is taken, another session probably owns it. Check with `ss -ltnp | grep :5199`, do not
kill it, and use another port such as 5198 or 5197.

To open it for the user instead, run `npm run dev` the same way. Vite hot-reloads edits, so the
game updates as files change.

## 3. Drive it

Use the Playwright MCP tools (`browser_navigate`, `browser_run_code_unsafe`,
`browser_take_screenshot`, `browser_console_messages`; load them with ToolSearch first).

- Navigate to `http://localhost:5199/` and wait about a second for the Boot scene.
- In dev builds `window.gridlock = { sim, scene }` exists, so state can be read and set directly:
  `await page.evaluate(() => gridlock.sim.player.a)`. Use it to assert behavior, for example
  the aim angle after moving the mouse, instead of judging from pixels only.
- Set the viewport explicitly (`page.setViewportSize({ width: 1000, height: 700 })`) before
  mouse work, since mouse aim is relative to the screen centre.
- Input is real keyboard and mouse events (`page.keyboard.down('KeyW')`, `page.mouse.move`).
  Release keys afterwards. When changing input code, also check that keys do not stay stuck
  after focus is lost.
- Read `browser_console_messages` at the end. Any error counts as a failure.
- Take a screenshot of the thing you changed, look at it, and describe what you saw. A
  screenshot you did not look at is not verification.

## 4. Clean up

Always, including when something failed:

```bash
pkill -f "vite --port 5199"            # or kill only the pid you started, via ss -ltnp
rm -rf ~/Agents/gridlock/.playwright-mcp .playwright-mcp
git status --short                     # nothing new from the browser or the server
```

Close the browser with `browser_close` if you are done with it.

## Reporting

Say what you actually ran and saw: the check result, what you did in the game, what the
screenshot showed, any console errors. If you could not run the game, say so rather than
implying it was checked.
