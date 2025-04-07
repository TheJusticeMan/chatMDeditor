# Editor Project

This project bundles `editor.mjs` using Rollup.

## Setup

1. Clone the repo
2. Run `npm install`
3. Run `npm run build`

The output will be placed in `editor_files/`.

## Dev Notes

- The build uses Rollup plugins:
  - `@rollup/plugin-node-resolve`
  - `@rollup/plugin-dynamic-import-vars`
  - Optionally `@rollup/plugin-terser` (uncomment in `rollup.config.mjs`)
