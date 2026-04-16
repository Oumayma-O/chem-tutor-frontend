# Catalyst — Chemistry Tutor Frontend

AI-powered chemistry tutoring platform with adaptive scaffolding, real-time classroom management, and multi-tenant admin dashboards.

Built with React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Query + Recharts.

## Quick Start

```bash
# Prerequisites: Node 18+
npm install
cp .env.example .env   # edit with your API URL
npm run dev             # → http://localhost:8080
```

## Environment Variables

Create `.env` from `.env.example`:

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | FastAPI backend URL. Local: `http://localhost:8000/api/v1` |


## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 8080) |
| `npm run build` | Production build to `dist/` |
| `npm run test` | Run tests (vitest) |
| `npm run lint` | ESLint check |

## Architecture

```
src/
├── App.tsx                    # Router: student / teacher / admin routes
├── pages/                     # Route-level components
│   ├── AuthPage.tsx           # Login + signup (student-only, optional class code)
│   ├── AccountSettingsPage.tsx # Email + password change
│   ├── UnitSelectionPage.tsx  # Student: browse curriculum
│   ├── UnitLandingPage.tsx    # Student: lesson overview + prefetch
│   ├── TutorPage.tsx          # Student: practice (ChemistryTutor)
│   ├── StudentProfilePage.tsx # Student: profile + class join
│   ├── admin/AdminPage.tsx    # Legacy admin (unreachable, can delete)
│   └── teacher/
│       ├── TeacherPage.tsx        # Teacher dashboard shell
│       ├── StaffDirectoryPage.tsx # Admin/SuperAdmin landing
│       └── ClassDashboardPage.tsx # Admin drill-down into a class
├── components/
│   ├── tutor/                 # Student-facing tutor UI
│   │   ├── ChemistryTutor.tsx # Main practice component (wires all hooks)
│   │   ├── steps/             # Step renderers (interactive, drag-drop, multi-input)
│   │   ├── modes/             # Exit ticket, timed practice overlays
│   │   ├── progress/          # Mastery breakdown, thinking tracker, predictive insights
│   │   ├── layout/            # Problem card, level selector, course sidebar
│   │   └── widgets/           # Calculator, mascot, tools
│   ├── teacher/               # Teacher dashboard components
│   │   ├── TeacherDashboardPage.tsx    # Tab container (Class, Analytics, Students, etc.)
│   │   ├── TeacherClassOverviewTab.tsx # Stat cards, mastery distribution, live session
│   │   ├── TeacherStudentsTab.tsx      # Student list + detail panel + timeline feed
│   │   ├── TeacherExitTicketsTab.tsx   # Wizard + session controls + history
│   │   ├── TeacherSettingsTab.tsx      # Calculator + answer reveal settings
│   │   ├── ExitTicketConfigPanel.tsx   # 5-step wizard for creating exit tickets
│   │   ├── ExitTicketAnalyticsPanel.tsx # History cards with Q/A/misconception tabs
│   │   ├── SessionHistory.tsx          # Timed practice session table
│   │   ├── HistoryFilterBar.tsx        # Shared date + lesson filter bar
│   │   ├── HistoryPagination.tsx       # Shared pagination controls
│   │   ├── TeachersDirectoryTab.tsx    # Admin: teacher/admin directory tables
│   │   └── EngagementAnalyticsPanel.tsx # Admin: Recharts engagement dashboard
│   ├── layout/                # Shell, navbar, user menu
│   │   ├── DashboardShell.tsx # Role-aware header (Teacher/Admin/SuperAdmin)
│   │   └── UserAccountMenu.tsx # Avatar dropdown with role-specific items
│   ├── ui/                    # shadcn/ui primitives
│   │   └── password-input.tsx # Reusable password field with eye toggle
│   ├── landing/               # Unit selection cards
│   └── student/               # ClassroomLiveBanner
├── hooks/
│   ├── useAuth.ts             # Auth context (signIn, signUp, profile, roles)
│   ├── useProblemNavigation.ts # Problem loading, L1/L2/L3 history, pagination, localStorage
│   ├── useGeneratedProblem.ts # API call + module-level prefetch cache
│   ├── useStepHandlers.ts    # Answer validation, hints, step completion
│   ├── useCognitiveTracking.ts # Thinking steps, error classification
│   ├── useAdaptiveProgression.ts # Level advancement logic
│   ├── useTutorProgression.ts # Progression modal + "Practice More" flow
│   ├── useTutorMasterySync.ts # Backend mastery save-step calls
│   ├── useTutorAnswerReveal.ts # 3-strikes reveal + session cap
│   ├── useTutorTimedMode.ts  # Timed practice state machine
│   ├── useStudentLiveSessionTimedSync.ts # SSE + polling for live session
│   ├── useStudentLiveSessionSSE.ts # SSE connection for live session events
│   ├── useTeacherDashboardData.ts # Classes + roster + derived analytics
│   ├── useTeacherRosterSSE.ts # SSE for real-time roster mastery updates
│   ├── useTeacherDashboardSSE.ts # SSE for exit ticket + timed practice analytics
│   ├── useActivityHeartbeat.ts # 60s ping for engagement tracking (stops on 404)
│   └── useEventSourceConnection.ts # Generic SSE hook with reconnect
├── services/api/              # API client functions
│   ├── teacher.ts             # Teacher dashboard endpoints
│   ├── admin.ts               # Admin/SuperAdmin endpoints
│   ├── student.ts             # Student enrollment (join/leave class)
│   └── classroomSession.ts   # Live session polling + SSE
├── lib/
│   ├── api/                   # Core HTTP client (get/post/patch/put/del)
│   │   ├── core.ts            # fetch wrapper with auth token
│   │   ├── auth.ts            # Login, register, profile update
│   │   ├── problems.ts        # Generate, navigate, validate, hint
│   │   └── mastery.ts         # Mastery save-step
│   ├── problemPrefetchCache.ts # Module-level singleton cache for generated problems
│   ├── tutorSessionStorage.ts # localStorage persistence for tutor state
│   ├── exitTicketAssessment.ts # Grading logic for class exit tickets
│   ├── exitTicketAnalyticsUtils.ts # Teacher-side correctness display
│   └── teacherQueryKeys.ts   # React Query key factory
├── config/
│   └── tutorReveal.ts         # Fallback values for reveal/L1 thresholds
├── types/
│   ├── chemistry.ts           # Problem, SolutionStep, StudentAnswer
│   └── cognitive.ts           # ThinkingStep, ClassifiedError, SkillMastery
└── data/
    └── units.ts               # Curriculum unit definitions + course levels
```

## Roles & Routing

| Role | Landing Page | Routes |
|---|---|---|
| Student | `/` (UnitSelectionPage) | `/unit/:id`, `/tutor/:unitId/:lessonIndex`, `/profile`, `/settings` |
| Teacher | `/` (TeacherDashboardPage) | `/dashboard`, `/settings` |
| Admin | `/` (StaffDirectoryPage) | `/class/:classroomId`, `/settings` |
| SuperAdmin | `/` (StaffDirectoryPage) | Same as Admin + school-admin management |

## Deep Dive: Core Systems

### 1. Problem Pagination — Who Owns What

The tutor has three practice levels, each with different pagination ownership:

**Level 1 (Worked Examples)** — hybrid ownership:
- Backend maintains a playlist of pre-generated problems per user/unit/lesson
- Frontend caches them in `level1ProblemsRef` (ordered array) for instant Prev/Next
- `seenLevel1IdsRef` tracks unique IDs viewed (drives the "view N to unlock L2" gate)
- Pagination uses `makeLevel1Pagination(curIdx, total)` from the local array length
- "See Another" generates on-demand via `generateProblem` with `exclude_ids` containing all seen IDs

**Level 2 & 3 (Faded / Challenge)** — frontend-owned:
- `level2ProblemsRef` and `level3ProblemsRef` are session-scoped history arrays
- Every new problem (from `loadNewProblem`, `applyPrefetchedProblem`, or `handleSeeAnother`) is appended with dedup
- Pagination is always derived from `historyRef.current.length` — the backend's `{current_index, total}` response is ignored
- Prev/Next navigation reads directly from the history ref — never calls `apiNavigateProblem` for L2/L3
- The `handleNavigate` function has an early `return` for L2/L3 that prevents fallthrough to the backend

**Why this matters**: The backend's `/problems/generate` is stateless — it returns `{current_index: 0, total: 1}` for every new problem. If the frontend used that, clicking "See Another" would reset the navbar to "Example 1 of 1" every time.

### 2. Caching — Three Layers

**Layer 1: Module-level prefetch cache** (`problemPrefetchCache.ts`)
- Singleton `Map<string, CacheEntry>` keyed by `unitId__lessonIndex__level`
- Survives React unmounts — a prefetch started from `UnitLandingPage` stays alive when the user navigates to `TutorPage`
- `enqueuePrefetch` limits concurrent requests to `MAX_CONCURRENT=2` with a FIFO queue
- Entries expire after 1 hour (`GC_TIME_MS`)
- `getResolvedResult` returns synchronously if available (fast path in `loadNewProblem`)
- `getCachedPromise` returns the in-flight promise to attach to (no duplicate requests)

**Layer 2: React Query cache** (teacher dashboard)
- Roster: `staleTime: 30s`, `refetchInterval: 60s`, `refetchOnWindowFocus: true`
- Student analytics: `staleTime: 2min`, `refetchInterval: 60s`
- Exit ticket results: `staleTime: 15s`, server-side pagination
- Classes list: default staleTime, optimistic updates for settings toggles
- SSE hooks write directly to the same cache keys, so polling and SSE share state

**Layer 3: localStorage persistence** (`tutorSessionStorage.ts`)
- Keyed by `chemtutor_lesson_state_{userId}_{unitId}_{lessonIndex}`
- Stores: `currentLevel`, `levelCache` (per-level problem + answers), `perProblemCache` (per-problem answers), `completedProblemIds`, `masteryScore`, `viewedLevel1Ids`, `level1ExposureSatisfied`
- Saved on: `visibilitychange` (tab hide), `beforeunload`, component unmount, and before every navigation/level change
- Restored on: component mount (init `useEffect` in `useProblemNavigation`)
- `perProblemCacheRef` uses shallow copies (`{ ...answers }`) to prevent reference sharing with React state that gets cleared on reset

### 3. Attempt Persistence — Step-by-Step

When a student works through a problem:

1. **Start attempt**: `apiStartAttempt` fires when a problem loads → backend creates a `ProblemAttempt` row → returns `attempt_id`
2. **Save step**: `useTutorMasterySync` calls `apiSaveStep` after each correct answer → backend updates `step_log` JSONB array on the attempt
3. **Complete attempt**: `completeProblemAttempt` in `useCognitiveTracking` fires when all steps are done
4. **Persist to localStorage**: `saveCurrentStateToCache` writes the full state (answers, hints, structuredStepComplete) to `perProblemCacheRef` and `levelCacheRef`, then serializes to localStorage
5. **Restore on reload**: The init `useEffect` reads localStorage, restores the problem + step state, and calls `startAttemptForProblem` to resume the backend attempt

**Critical detail**: When the student clicks "See Another", `saveCurrentStateToCache` runs first (saves current answers), then `resetProblemState` clears React state. The `syncStoredSnapshotAfterStepReset` function clears the `levelCacheRef` entry but preserves `perProblemCacheRef` — so clicking "Previous" restores the old answers from the per-problem cache.

### 4. Background Loading — Prefetch Pipeline

**On lesson overview** (`UnitLandingPage`):
- `enqueuePrefetch` queues L1 problem generation for the lesson the student is viewing
- Max 2 concurrent requests — additional lessons wait in FIFO queue
- The reference card (`apiGetReferenceCard`) is also prefetched via React Query

**On practice start** (`useProblemNavigation` init):
- `loadNewProblem("medium", [], 1)` checks the module cache first → instant if prefetched
- If not cached, fires a fresh API call

**After first problem loads**:
- `prefetchNextLevelIfNeeded` checks if L2 should be prefetched
- Guard: only fires when `seenLevel1IdsRef.current.length >= minLevel1ExamplesForLevel2` (default 2)
- Uses `triggerPrefetch` which calls `generateProblem` and stores result in `prefetchedProblem.current` + `levelCacheRef`

**On level switch** (`handleLevelChange`):
- Checks `levelCacheRef` first → instant restore if prefetched
- If not cached, calls `loadNewProblem` which checks the module cache, then the in-flight prefetch promise, then fires fresh
- After L2 loads, L3 prefetch fires immediately (`delayMs = 0`)

### 5. Live Connections — SSE Architecture

All SSE connections use `useEventSourceConnection` — a generic hook that:
- Opens an `EventSource` to the given URL (with JWT token as query param)
- Reconnects with exponential backoff on disconnect
- Closes cleanly on unmount or when `enabled` becomes false
- Calls `onMessage(data)` for each event

**Active SSE streams**:

| Stream | Hook | Cache Key | Purpose |
|---|---|---|---|
| `/classrooms/me/live-session/stream` | `useStudentLiveSessionSSE` | `studentQueryKeys.liveSession(classroomId)` | Student: live session phase changes (timed practice → exit ticket → idle) |
| `/teacher/classes/{id}/live/stream` | `useTeacherLiveSSE` | `teacherQueryKeys.live(classId)` | Teacher: student presence heartbeats |
| `/teacher/classes/{id}/roster/stream` | `useTeacherRosterSSE` | `teacherQueryKeys.roster(classId)` | Teacher: real-time mastery score updates |
| `/teacher/exit-tickets/{id}/stream` | `useTeacherExitTicketsSSE` | `teacherQueryKeys.exitTickets.list(...)` | Teacher: exit ticket submission updates |

**Fallback**: Every SSE-backed query also has a `refetchInterval` (30-60s) as a safety net. If the SSE endpoint returns 404 (not deployed yet), the hook silently stops reconnecting and polling takes over.

**Cache sharing**: SSE hooks write to the same React Query cache keys as the polling queries. This means:
- Components don't need to know whether data came from SSE or polling
- `queryClient.setQueryData` from SSE triggers the same re-renders as a polling refetch
- No duplicate state management

### 6. Data Freshness — How Stale Data Gets Fixed

The system has multiple mechanisms to prevent stale data:

| Mechanism | Trigger | What it refreshes |
|---|---|---|
| SSE push | Backend event | Roster mastery, live session, exit ticket submissions |
| Polling | Timer (30-60s) | Roster, student analytics, exit tickets |
| Window focus | `refetchOnWindowFocus` | Roster (teacher returns to browser tab) |
| Analytics→Roster invalidation | Student detail panel loads | If analytics mastery ≠ roster mastery, roster query is invalidated |
| Optimistic update | Settings toggle | `queryClient.setQueryData` for instant UI, revert on error |
| Manual invalidation | After publish/stop session | `queryClient.invalidateQueries` for classes + exit tickets |

### 7. Answer Reveal System

The reveal system has three layers:

1. **Per-step tracking** (`useTutorAnswerReveal`): After 3 wrong checks on a step, the "Reveal Answer" button appears. Clicking it records `was_revealed: true` on the step.
2. **Per-lesson cap**: `max_reveals_per_lesson` (default 3, teacher-configurable) limits total reveals across all problems in a lesson. Stored in classroom settings.
3. **Mastery impact**: Revealed steps are sent to the backend with `was_revealed: true` — the backend skips mastery credit for those steps.

The cap resets when the student opens a different lesson. The teacher can set it to 3, 5, or unlimited (null) from the Settings tab.

## Backend Contract

The frontend expects a FastAPI backend at `VITE_API_URL` with these key endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Email + password → JWT |
| `/auth/register` | POST | Create student account |
| `/auth/me` | GET | Current user profile |
| `/auth/me` | PUT | Update email/password |
| `/auth/heartbeat` | POST | Activity tracking (upsert daily) |
| `/problems/generate` | POST | Generate a chemistry problem |
| `/problems/navigate` | POST | Prev/Next in playlist |
| `/problems/validate-step` | POST | Check student answer |
| `/problems/hint` | POST | Generate hint for a step |
| `/teacher/classes` | GET | List teacher's classes with stats |
| `/teacher/classes/{id}/roster` | GET | Class roster with mastery |
| `/teacher/classes/{id}/roster/stream` | GET | SSE: real-time roster updates |
| `/teacher/classes/{id}/students/{id}/analytics` | GET | Student detail + attempts |
| `/teacher/exit-tickets/generate` | POST | Generate exit ticket questions |
| `/teacher/classrooms/{id}/live-session/publish` | POST | Publish exit ticket to class |
| `/classrooms/join` | POST | Student joins class by code |
| `/classrooms/me/live-session` | GET | Student's active session |
| `/classrooms/me/live-session/stream` | GET | SSE: live session events |

## Things to Watch Out For

1. **Problem pagination**: L2/L3 pagination is frontend-owned. Never let `loadNewProblem` set pagination from the backend response for L2/L3 — the history refs are the source of truth.

2. **Category scores can be null**: Backend returns `null` for categories the student hasn't attempted. Always use `!= null` guards before comparing.

3. **Roster staleness**: The roster query polls every 60s. If a student's mastery changes mid-session, the SSE stream or the analytics→roster invalidation handles the sync.

4. **Exit ticket tab scoping**: The Exit Ticket button in the tutor only shows when `liveSession.unit_id === unitId && liveSession.lesson_index === lessonIndex`.

5. **Answer reveal**: The `useTutorAnswerReveal` hook tracks per-lesson reveal counts. The `max_reveals_per_lesson` comes from the classroom settings (teacher-configurable).

6. **Exit ticket scoring is server-side only**: The backend always scores exit ticket submissions via `score_exit_ticket_submission`. The frontend no longer sends `score_percent` or `results` in the submit body — the server computes them using the same `StepValidationService` pipeline as `/validate-step`.

7. **L1→L2 unlock threshold is backend-owned**: `min_level1_examples_for_level2` is returned by the problems API from classroom settings (or the backend default of `2` for solo practice). The frontend `VITE_TUTOR_MIN_LEVEL1_EXAMPLES_FOR_LEVEL2` env var is a dead fallback.

8. **localStorage keys**: Tutor session state is keyed by `userId_unitId_lessonIndex`. Clearing localStorage resets all practice progress.

9. **Module-level cache**: `problemPrefetchCache.ts` survives React unmounts. Problems prefetched from UnitLandingPage are available when the student enters practice.
