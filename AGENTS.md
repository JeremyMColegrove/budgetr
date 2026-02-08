<INSTRUCTIONS>
## Project Context
- Stack: React + TypeScript + Vite + shadcn/ui (per README).
- Repo layout: frontend in `src/` and `public/`, server-side code in `server/` (if present).

## Engineering Principles (Must Follow)
- Separation of concerns: keep UI, state, data access, and utilities in distinct modules; avoid cross-layer imports.
- DRY: prefer shared helpers, components, and hooks over copy-paste; refactor when duplication appears.
- Good engineering practices: clear naming, small focused functions, predictable side effects, and meaningful tests for new logic.

## Agent Skills To Use
When editing this repo, use these skill guidelines:
- `architecture-review`: validate separation of concerns for new or modified modules.
- `dry-auditor`: scan for duplication and consolidate patterns/utilities.
- `quality-bar`: enforce consistent types, error handling, and tests where applicable.

## Local Conventions
- TypeScript: prefer explicit types on public interfaces, props, and function returns.
- React: use functional components and hooks; avoid prop drilling by introducing context only when justified.
- Styling/UI: follow shadcn/ui patterns and component composition; keep UI components presentational.
- Data access: centralize API calls in a single client module; avoid inline fetches in components.
</INSTRUCTIONS>
