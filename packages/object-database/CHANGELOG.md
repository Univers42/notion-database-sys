# Changelog

## Unreleased

- Add an additive AI-filled `select`: optional `AutofillConfig` on the schema, optional `HostAdapters.autofill.read`, a read-only cell/pill, and config/add-property entries. Labels are never written into `state` (osionos M6, C155).

## 0.1.0 - 2026-05-06

- Add initial ESM library package for `ObjectDatabase`.
- Externalize React, Zustand, Radix, Lucide, charting, Tailwind, and rendering peer dependencies.
- Generate bundled JavaScript and TypeScript declarations with `tsup`.
- Ship `theme.css` as an explicit consumer import.
- Make formula engine initialization optional for the first production artifact.
