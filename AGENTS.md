# Gridlock

## Workflow

- Work on a branch in a separate checkout (`git worktree add ../wt-gridlock-<topic> -b <topic>`),
  never directly on `main`, and land changes through GitHub pull requests.
- Do not create tests: no test files, test directories, or test frameworks/dependencies (the project
  has none). Verify changes with `npm run check` and by running the game instead.
- Do not add `Co-Authored-By` trailers (or any other AI attribution) to commit messages or PRs.

## Code maintainability

- Write code a future agent or human can change safely. Prefer simple, readable code over clever
  code, and keep changes focused on what the task needs.
- Follow the existing structure: put code in the module that owns that concern (`sim`, `world`,
  `render`, `scenes`, `ui`, `story`) and match the surrounding naming and style before inventing
  new patterns.
- Keep simulation logic separate from rendering and input so it can be reasoned about on its own.
  Do not reach into Phaser objects from `sim` code.
- Keep files and functions small and single-purpose. Split a function or file when it starts doing
  more than one job.
- Name things for what they mean. Replace magic numbers and repeated literals with named constants,
  and keep tunable game values in one obvious place instead of scattering them.
- Do not duplicate logic. Reuse or extend an existing helper; extract a shared one when the same
  code appears a third time.
- Use precise TypeScript types. Avoid `any` and unchecked casts, and let `npm run check` pass
  cleanly.
- Comment the *why* (constraints, trade-offs, non-obvious decisions), not the *what*. Delete dead
  code and commented-out code rather than leaving it behind.
- Leave the code better than you found it, but do not make unrelated refactors inside a feature or
  fix; do them in a separate change.

## Art

- All art must be SVG: sprites, tiles, icons, textures. Do not add raster images (PNG, JPG, GIF,
  WebP, etc.), and do not generate raster files from tools.
- Sprite SVGs live in `public/art/` and are listed in `src/render/art.ts`, which loads them with
  `load.svg` at 4x their world size so they stay sharp when the camera zooms in. The tileset is
  generated as `public/tiles/city.svg` by `tools/gen-tileset.mjs`.
- Shapes that are computed every frame (building lean, bullet tracers, particles) are drawn with
  Phaser Graphics in code. They are not art assets.
