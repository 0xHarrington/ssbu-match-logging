# Audit ledger — 2026-07-14 `/improve` audit of `main` @ `40329f3`

The audit produced 10 executable plans (001–009 fixes, 010 auto-logging V0) in a
`plans/` directory, all of which were **executed and merged**:

- Plans 001–009 → squash-merged as **PR #7** (`65ac301`, "Post-redesign
  hardening"): 43 commits, 3/3 independent code-review APPROVEs, gates green
  (pytest 33/33, ruff/black clean, vitest 20/20, tsc/build clean; app.py
  coverage baseline 43%).
- Plan 010 → **PR #9** (auto-logging V0: hands-free phone capture + VLM
  extraction) + **PR #11** (docker fix), deployed.

The plan files were deleted after execution (2026-07-24). This ledger preserves
the two parts with standing value: findings that were **considered and
rejected** (so future audits don't re-litigate them) and the **open
follow-ups** that never blocked the merge.

## Open follow-ups (as of 2026-07-24)

- [ ] `limit` lacks a lower-bound clamp in `GET /api/matches`
      (`backend/app.py`, `api_list_matches`): `offset` got `max(…, 0)` but
      `limit` only has the upper `min(…, 200)` — a negative limit produces an
      odd pandas slice. One-liner + test.
- [ ] Auto-logging V0 live-fire tuning (plan 010 step 6): run a real session
      against prod with the propped phone; tune the keyframe-stability and
      extraction-confidence thresholds. Requires a human session — not
      delegable.
- [ ] Pre-existing pandas `FutureWarning` in `_assign_missing_session_ids`
      (string assigned into an all-NaN float column) — fold into the P2 SQLite
      migration, not worth a standalone fix.
- [ ] **Viewer-blind pages outside the Session screens.** Per-user logins
      (PR #10) wired `ViewerProvider` through the Session/shell components but
      left every other page naming Shayne/Matt literally. `StatsPage` was fixed
      (see below); still unconverted, in rough order of how much they mislead:
      `PlayerTearsheet`, `components/stats/UserStats`, `SessionTearsheet`,
      `SessionDetail`, `SessionHistory`, `CharacterDetail`,
      `CharacterAnalytics`. The tell to grep for is a page with zero
      `useViewer` calls and a `'Shayne'` string literal or a
      `/api/users/Shayne/…` fetch.
- Note: alternating arm64/x86_64 shells in `frontend/` needs a manual
  `npm install` (rollup optional-dependency npm bug); `dev.sh` intentionally no
  longer runs `npm install` unconditionally.

## Found in the unaudited surface (post-`40329f3`)

Bugs found in the PR #8–#10 surface the audit never covered, recorded here so
the pattern is visible to the next `/improve` run rather than just living in
git history.

| Fixed | Finding |
|---|---|
| 2026-08-03 | `StatsPage` never consumed the viewer context PR #10 introduced: three per-user fetches pinned to `/api/users/Shayne/*` plus literal Shayne-first ordering throughout, so `/stats` reported from Shayne's point of view for both users. The heatmap, stage win rates and rolling timeline are genuinely single-player views, so Matt was shown Shayne's numbers outright. Recent Form had also drifted into self-contradiction — Shayne-first labels above a viewer-aware `SplitBar` that ordered home-first. |

**Pattern worth generalizing:** the API is denominated in fixed player names
(`shayne_wins`, `{shayne, matt}`, `longest_win_streaks.Shayne` — three key
conventions for the same two players) while the UI is denominated in
home/away. Every viewer bug lives at that boundary. Converting a page means
routing all of it through lookups at that seam, not sprinkling ternaries;
a half-converted page is worse than an unconverted one because the parts
disagree with each other. The P3 two-player generalization should collapse the
API side of this seam.

## Considered and rejected (do not re-litigate)

| Verdict | Item | Reason |
|---|---|---|
| Not a bug | CSV storage, whole-file rewrite on append, single gunicorn worker | Locked decisions until P2 SQLite migration (`docs/ROADMAP.md` §3) |
| Not a bug | Two-player schema hardcoding, shared-password Basic auth, no rate limiting | Phase-gated: P3 / P3 / P6 respectively (per-user logins since shipped in PR #10; the underlying single-tenant assumption remains P3) |
| Not a bug | SPA fallback path traversal | Verified safe: raw `os.path.join` only feeds an `isfile` check; serving goes through `send_from_directory` (safe_join + 404) |
| Not a bug | Timing-unsafe password compare | Verified `hmac.compare_digest` in the auth gate |
| Not worth doing | react-router v7 migration for the `@remix-run/router` advisory | Advisory class (SSR/loader spoofing) unreachable in a plain client `BrowserRouter`; v7 is a real migration cost. All other npm-audit vulns are dev-toolchain, never bundled |
| Not worth doing | Removing `motion` (only importer: dither tooltip) | Bundle win too small to justify touching vendored code |
| Not worth doing (now) | mypy on the backend | Noisy on pandas-heavy single-file code; revisit at the P2 module split |
| Not worth doing (now) | Timezone-aware client-side date formatting | Single-locale couch app by design until P3 |
| Deferred, recorded | Six duplicate date formatters in older pages (SessionDetail/Tearsheet/History/Comparison/MatchEditorModal) | Belongs to the typed-API/older-page sweep (ROADMAP §4 backlog #2) |
| Deferred, recorded | `no-explicit-any` → error re-promotion | ROADMAP §4 backlog #2 (after typed-API sweep) |
| Deferred, recorded | Bare `/log_game` + `/matchup_stats` route removal | Aliased; remove at P3 auth cutover |
| Deferred, recorded | `requirements.in`/pip-tools split of the flat pinned freeze | Nice-to-have; P2 module split is the natural moment |
| Kept as-is | `backend/spare data/jaspy.csv` and other untracked local CSVs | Data, not code; jaspy.csv is a planned P1 seed |
| Kept as-is (default) | Dither-kit unused chart types | Pruned in the hygiene pass as optional surface reduction with an explicit revert hatch |

## Audit surface note

The audit was stamped against `40329f3`. Everything that landed after —
session UI redesign (PR #8), auto-logging (PR #9), per-user logins (PR #10) —
has **never been audited**. A future `/improve` run should target that surface;
new plans go back into `plans/` (the `.gitignore` allowlist `!plans/` is kept
for exactly this).

The bugs surfacing from it so far (see "Found in the unaudited surface" above)
are all one shape: PR #10 introduced a viewer abstraction and converted only
the screens it touched. Incomplete-migration sweeps are the highest-yield thing
to point that run at.
