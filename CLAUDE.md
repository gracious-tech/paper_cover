# Paper Cover Generator

A modular book cover generation system. Core logic generates a virtual typst filesystem;
platform wrappers compile it to PDF/SVG/PNG.

## Packages

| Package | Purpose |
|---------|---------|
| `generator/` | Pure TS core — builds typst source files in-memory |
| `generator-node/` | Node/CLI wrapper — spawns `typst` binary, uses `sharp` for image ops |
| `generator-web/` | Browser wrapper — compiles via WASM (typst.ts ^0.7.0-rc2) |
| `widget/` | Vue 3 web UI with 3D book preview (Vite + Nuxt UI + Pug) |
| `3d/` | WebGL renderer for 3D book preview (no external graphics libs) |

## Build

Each package builds independently with `npm run build` (TypeScript → `dist/`).
Local deps are `file:../package-name` — build in dependency order:

```bash
cd generator && npm i && npm run build
cd generator-node && npm i && npm run build   # or generator-web
cd 3d && npm i && npm run build
cd widget && npm i && npm run dev
```

Run integration tests (generates test_cover.* in project root):

```bash
.bin/test
```

## Gotchas

- **typst binary**: `generator-node` requires `typst` on PATH — run `.bin/setup_typst` to install
- **WASM init**: `generator-web` must call `init()` once before `generate()`; compiler/renderer are module singletons
- **SVG format differs by backend**: node CLI outputs `width="X pt"`, web renderer outputs `width="X"` with offset `viewBox`; web renderer also uses CSS custom properties (`var(--glyph_fill)`) requiring injection when loaded as `<img>`
- **Widget uses Pug**: comments are `//-` not `//` in `<template lang="pug">` blocks
- **No test suite**: `.bin/test` is a shell script that generates visual output for manual inspection
