# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 5. Project: ChemTutor Frontend

**Stack:** Vite · React · TypeScript · ShadCN UI · Tailwind CSS · React Query (`@tanstack/react-query`)
**Backend:** FastAPI on `http://localhost:8000`, base path `/api/v1/`

### API calls

- **Always** use the helpers in `src/lib/api/core.ts` (`get`, `post`, `patch`, `del`, `request`). Never call `fetch` directly.
- Paths are relative to `VITE_API_URL`, e.g. `post<T>("/problems/generate", body)` — don't repeat the base URL.
- `request()` throws on non-2xx with the backend's `detail` string. Don't wrap it in a redundant try/catch unless the component needs distinct error UI.
- Known routes (verify before inventing new ones):
  - `POST /problems/generate` · `POST /problems/validate-step` · `POST /problems/hint`
  - `POST /auth/login` · `POST /auth/register` · `GET /auth/me` · `PATCH /auth/me`
  - `POST /tutor/classify-errors` · `POST /tutor/generate-exit-ticket` · `POST /tutor/generate-class-insights`
  - `/tutor/generate-guide` **does not exist** — SimulationGuide.tsx falls back to static steps intentionally.

### Auth

- JWT only. Token stored in `localStorage` under key `chemtutor_token`.
- Use `getStoredToken` / `setStoredToken` / `clearStoredToken` from `src/lib/api/core.ts`.
- `useAuth()` from `src/hooks/useAuth.ts` is the single source of truth for the current user, role, and profile.
- **Never** add Supabase. It has been fully removed — no SDK in the bundle, no integration files.

### UI components

- Use ShadCN components (`src/components/ui/`) for all new UI. Don't use raw HTML or pull in a new library when an equivalent already exists.
- Tailwind only — no inline `style={{}}` except for truly dynamic values (e.g. a width percentage computed at runtime).
- Match the dark-themed, card-based visual style of existing teacher/student dashboard components.

### Server state

- Use React Query for anything that fetches from the backend. Don't store API responses in `useState` unless they're immediately discarded.
- Teacher dashboard query keys live in `src/lib/teacherQueryKeys.ts` — add new keys there, don't hard-code strings in components.

### TypeScript

- No `any`. If you find yourself writing `as unknown as X`, stop and rethink the type.

### Don't touch without asking

- `vite.config.ts` `manualChunks` — the bundle split is intentional; don't flatten it.
- `public/favicon.svg` — custom mascot, not a placeholder.
