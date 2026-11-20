# Gridlock

## Workflow

- Work on a branch in a separate checkout (`git worktree add ../wt-gridlock-<topic> -b <topic>`),
  never directly on `main`, and land changes through GitHub pull requests.
- Do not create tests: no test files, test directories, or test frameworks/dependencies (the project
  has none). Verify changes with `npm run check` and by running the game instead.
- Do not add `Co-Authored-By` trailers (or any other AI attribution) to commit messages or PRs.

## Art

- All art must be SVG: sprites, tiles, icons, textures. Do not add raster images (PNG, JPG, GIF,
  WebP, etc.), and do not generate raster files from tools.
- Sprite SVGs live in `public/art/` and are listed in `src/render/art.ts`, which loads them with
  `load.svg` at 4x their world size so they stay sharp when the camera zooms in. The tileset is
  generated as `public/tiles/city.svg` by `tools/gen-city.mjs`.
- Shapes that are computed every frame (building lean, bullet tracers, particles) are drawn with
  Phaser Graphics in code. They are not art assets.
