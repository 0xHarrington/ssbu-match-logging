# Advisor plans — audit of `main` @ `40329f3` (2026-07-14)

Product of a read-only codebase audit (correctness, security, performance, de-slop taxonomy, docs, DX). Each plan is self-contained: a fresh Claude Code session can execute it without any audit context.

> ⚠ **Tracking:** `.gitignore`'s blanket `*.md` rule currently ignores this directory. Plan 008 step 1 adds the allowlist — run that first (or add `!plans/` + `!plans/*.md` manually) if you want these files in git.

## How to execute a plan

1. Read the plan fully before touching anything.
2. **Drift check:** every plan stamps commit `40329f3` and quotes verified excerpts with line numbers. If an excerpt no longer matches the file, stop and re-verify before proceeding — line numbers drift as earlier plans land.
3. Execute steps in order; run each step's verification command; honor **Scope** ("out of scope" lists are load-bearing).
4. Respect the escape hatches — stopping and reporting beats improvising.
5. Update the Status column below when you start/finish.
6. Local backend runs need the Rosetta venv: `arch -x86_64 ./venv/bin/python …` (recorded project memory; CI is unaffected).

## Execution order & dependencies

Backend plans all edit `app.py` — execute them **serially, in order**. Frontend plans: 005 before 006. Plan 009 goes **last** (mechanical reformat would collide with pending backend diffs).

| # | Plan | Area | Effort | Executor | Depends on | Status |
|---|---|---|---|---|---|---|
| 001 | [Stop GET /api/sessions rewriting the CSV](001-fix-destructive-get-sessions.md) | backend | M | opus | — | DONE (`4523c3d`) |
| 002 | [Fix /api/users/&lt;u&gt;/stats prod 500](002-fix-user-stats-prod-500.md) | backend | S | sonnet | 001 (serial app.py) | DONE (`b3dec07`) |
| 003 | [Session IDs in Eastern time](003-session-id-timezone.md) | backend | S | sonnet | 002 (serial app.py) | DONE (`1c03a80`) |
| 004 | [Backend hardening bundle (7 levers)](004-backend-hardening-bundle.md) | backend | M | sonnet | 003 (serial app.py) | DONE (`54fb9cd`…`2abf1a0`, 7 commits) |
| 005 | [Frontend correctness bundle (4 levers)](005-frontend-correctness-bundle.md) | frontend | S | sonnet | — | DONE (`f323f00`…`c080fd4`, 4 commits) |
| 006 | [Frontend de-slop sweep (+vitest seed)](006-frontend-deslop-sweep.md) | frontend | M | sonnet | 005 | DONE (`3423ca2`…`59877d1`, 11 commits) |
| 007 | [Backend de-slop](007-backend-deslop.md) | backend + 1 line frontend | S | sonnet | 004 (serial app.py) | DONE (`cd9b918`…`3211339`, 5 commits) |
| 008 | [Repo hygiene + docs sync](008-repo-hygiene-and-docs.md) | repo/docs | S | sonnet | best after 007 (route counts settle) | DONE (`86cafc3`…`46128f1`, 5 commits) |
| 009 | [DX ratchets (ruff/black/coverage/dev.sh)](009-dx-ratchets.md) | tooling | M | sonnet | **all backend plans** (reformat last) | DONE (`628769f`…`19b8fed`, 7 commits) |

## Feature plans (post-audit)

Numbered continuations of this directory, but features rather than audit
findings — stamped against their own commits, same self-contained format.

| # | Plan | Area | Effort | Executor | Depends on | Status |
|---|---|---|---|---|---|---|
| 010 | [Auto-logging V0: hands-free phone capture + VLM extraction](010-auto-logging-v0-vlm-capture.md) | full-stack (stamped `65ac301`) | L | opus | `ANTHROPIC_API_KEY` Fly secret | EXECUTED 2026-07-17 (branch `feat/auto-logging-v0-vlm-capture`; live-fire tuning — plan step 6 — pending deploy) |

## Execution record — 2026-07-14

All 9 plans executed on branch **`improve/execute-2026-07-14`** (worktree `../ssbu-match-logging-execute`): **43 commits** atop `40329f3`, working tree clean, **not pushed/merged** — Matt merges. Includes one review-driven revision (`85657ad`, stages.ts typing). Three independent code-review passes, all **APPROVE**: backend chain (`40329f3..3211339`), frontend chain (`3211339..59877d1`, one MEDIUM finding → fixed in `85657ad`), hygiene/DX tail (`59877d1..HEAD`). Final gates at HEAD: backend pytest 33/33 + ruff clean + black clean; frontend vitest 20/20 + eslint 0 errors + tsc clean + build green. Coverage baseline: app.py 43%.

Follow-ups surfaced during execution (none blocking):
- `limit` lacks a lower-bound clamp in `/api/matches` (negative values produce an odd pandas slice; `offset` was fixed) — one-liner.
- Pre-existing pandas `FutureWarning` in `_assign_missing_session_ids` (string into all-NaN float column) — fold into P2 SQLite migration.
- `dev.sh` no longer runs `npm install` unconditionally; alternating arm64/x86_64 shells in `frontend/` needs a manual `npm install` (rollup optional-dep npm bug).
- CI-green done-criteria for 009 steps 3–4 were validated locally; confirm on first real push.

## Verification commands (apply to every plan)

```bash
# backend (local — Rosetta venv)
cd backend && arch -x86_64 ./venv/bin/python -m pytest tests/ -q

# frontend
cd frontend && npm run lint && npx tsc -b && npm run build

# import smoke (mirrors CI)
cd backend && DATA_DIR=/tmp/ssbu-smoke arch -x86_64 ./venv/bin/python -c "import app; print('ok')"
```

Baseline at `40329f3`: pytest 17/17 · tsc clean · eslint 0 errors (15 react-refresh warnings, mostly vendored dither-kit) · CI green.

## Considered and rejected (do not re-litigate)

| Verdict | Item | Reason |
|---|---|---|
| Not a bug | CSV storage, whole-file rewrite on append, single gunicorn worker | Locked decisions until P2 SQLite migration (`docs/ROADMAP.md` §3) |
| Not a bug | Two-player schema hardcoding, shared-password Basic auth, no rate limiting | Phase-gated: P3 / P3 / P6 respectively |
| Not a bug | SPA fallback path traversal | Verified safe: raw `os.path.join` only feeds an `isfile` check; serving goes through `send_from_directory` (safe_join + 404) |
| Not a bug | Timing-unsafe password compare | Verified `hmac.compare_digest` at `app.py:1076` |
| Not worth doing | react-router v7 migration for the `@remix-run/router` advisory | Advisory class (SSR/loader spoofing) unreachable in a plain client `BrowserRouter`; v7 is a real migration cost. All other npm-audit vulns are dev-toolchain, never bundled |
| Not worth doing | Removing `motion` (only importer: dither tooltip) | Bundle win too small to justify touching vendored code |
| Not worth doing (now) | mypy on the backend | Noisy on pandas-heavy single-file code; revisit at the P2 module split |
| Not worth doing (now) | Timezone-aware client-side date formatting | Single-locale couch app by design until P3 |
| Deferred, recorded | Six duplicate date formatters in older pages (SessionDetail/Tearsheet/History/Comparison/MatchEditorModal) | Belongs to the typed-API/older-page sweep (ROADMAP §4 backlog #2), not plan 006 |
| Deferred, recorded | `no-explicit-any` → error re-promotion | ROADMAP §4 backlog #2 (after typed-API sweep) |
| Deferred, recorded | Bare `/log_game` + `/matchup_stats` route removal | Aliased in plan 007; remove at P3 auth cutover |
| Deferred, recorded | `requirements.in`/pip-tools split of the flat pinned freeze | Nice-to-have; P2 module split is the natural moment |
| Kept as-is | `backend/spare data/jaspy.csv` and other untracked local CSVs | Data, not code; jaspy.csv is a planned P1 seed |
| Kept as-is (default) | Dither-kit unused chart types | Pruned in plan 008 step 4 as optional surface reduction with an explicit revert hatch |

## Top findings NOT selected into any plan

None — all vetted findings were bundled into plans 001–009 per Matt's selection (2026-07-14).
