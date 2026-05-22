# PitchPulse Clerk Migration — Full Audit

## 🔴 CRITICAL (security holes, data leaks, broken auth)

**[Parallel legacy auth still fully open]** | File: backend/app.py:156-235 | `POST /api/auth/register` and `POST /api/auth/login` have no `@require_clerk_auth`, issue HS256 JWTs via `auth.generate_token`, and create/login users with `password_hash` independent of Clerk. | Remove or disable these routes in production; Clerk should be the only identity path.

**[CORS defaults to wildcard]** | File: backend/app.py:35 | `CORS(app, origins=os.getenv("FRONTEND_URL", "*"))` allows any origin when `FRONTEND_URL` is unset. | Set `FRONTEND_URL` in prod and remove the `"*"` fallback; use an explicit allowlist.

**[Clerk JWT audience not verified]** | File: backend/clerk_auth.py:14-18 | `jwt.decode(..., options={"verify_aud": False})` accepts tokens not meant for this API. | Enable `verify_aud` with your Clerk JWT audience / authorized party from env.

**[Clerk JWT issuer not verified]** | File: backend/clerk_auth.py:14-18 | No `issuer` check on decode; any RS256 JWT signed by a compromised/leaked JWKS could pass if JWKS URL is wrong. | Pass `issuer=` from env (e.g. `https://<your-clerk-domain>`) to `jwt.decode`.

**[Hardcoded dev Clerk JWKS URL]** | File: backend/clerk_auth.py:7-9 | `CLERK_JWKS_URL` is pinned to `neat-katydid-70.clerk.accounts.dev`; production keys on another instance will fail or verify against the wrong keys. | Load JWKS URL from `CLERK_JWKS_URL` / `CLERK_ISSUER` env vars.

**[Dev secrets committed as code defaults]** | File: backend/config.py:9-14 | `SECRET_KEY` and `JWT_SECRET_KEY` default to `dev-secret-change-in-prod` / `dev-jwt-secret-change-in-prod`. | Require env vars in production; fail startup if defaults are still in use.

**[Legacy JWT still minted for new accounts]** | File: backend/auth.py:70-80, backend/app.py:196-234 | `generate_token` uses `JWT_SECRET_KEY` for HS256 sessions on register/login. | Stop issuing app JWTs once Clerk is canonical; remove `generate_token` usage from live routes.

**[Auto-create user on any valid Clerk token]** | File: backend/clerk_auth.py:46-60 | First API hit with a valid Clerk JWT inserts a DB row with no webhook proof, often `email=""` (`payload.get("email")` is usually absent in default Clerk JWTs). | Rely on `user.created` webhook; if fallback is needed, require email from Clerk API and handle races with `IntegrityError`.

**[Auto-create email uniqueness abuse]** | File: backend/clerk_auth.py:53-58, backend/models.py:10 | Multiple Clerk users could get `email=""` rows; `email` is `unique=True, nullable=False` — can cause 500s or block legitimate signups. | Use `clerk_user_id` as primary link; make email nullable or fetch real email from Clerk before insert.

**[Change-password crashes / mis-auth for Clerk users]** | File: backend/app.py:264-265, backend/auth.py:64-65 | `check_password(current_pw, g.current_user.password_hash)` when `password_hash` is `None` (Clerk users) raises `AttributeError` or always fails. | Remove change-password route for Clerk users or return 400 directing users to Clerk User Profile.

**[Webhook endpoint not rate-limited]** | File: backend/app.py:100-152 | `/api/webhooks/clerk` has no `@limiter.limit`; empty `CLERK_WEBHOOK_SECRET` makes every forged body fail verify, but a leaked secret allows unbounded user provisioning/deletion. | Add rate limits; fail fast at startup if secret missing in prod.

**[Agent errors leak internals to clients]** | File: backend/app.py:464,551 | `500` responses include `"detail": str(e)` from agent failures. | Log server-side only; return generic message to clients.

**[Schedule brief = open email relay]** | File: backend/app.py:757,799-806 | Authenticated user can POST any `meeting_email`; Resend sends full brief HTML to arbitrary addresses. | Restrict to `g.current_user.email` or verified addresses; rate-limit sends.

**[Account delete leaves Clerk identity alive]** | File: backend/app.py:360-370 | `DELETE /api/auth/account` removes DB user only; Clerk account remains and can re-auto-create DB rows on next login. | Call Clerk Backend API to delete/ban user, then delete DB row.

**[Public share tokens enumerable]** | File: backend/app.py:727-745 | `GET /api/share/<share_token>` is unauthenticated with no rate limit; 32-byte urlsafe tokens are strong but endpoint allows scraping/bruteforce attempts. | Add rate limiting and optional expiring share links.

**[Expensive AI routes lack Flask-Limiter]** | File: backend/app.py:399-401,506-508,879-904 | `POST /api/brief`, `POST /api/brief/compare`, `GET /api/watchlist/alerts` have no `@limiter.limit` (only custom hourly counter on brief generation). | Add per-IP/user limits on costly endpoints.

**[Clerk token verification logs failures]** | File: backend/clerk_auth.py:22 | `print(f"Clerk token verification failed: {e}")` may log token fragments or PII in server logs. | Use structured logging with redaction; never print raw JWT errors in prod.

---

## 🟠 HIGH (broken functionality, non-functional UI, bad UX)

**[authStore user never populated from Clerk]** | File: frontend/src/store/authStore.js:7-18, frontend/src/pages/DashboardPage.jsx:19,192-197 | `syncClerkUser` exists but is **never called** anywhere in `frontend/src`. Avatar shows `user?.email?.[0] || 'U'` → always **"U"**; menu email is blank. | Call `syncClerkUser` from `useUser()` in `DashboardPage` / `SettingsPage` or use Clerk `<UserButton />`.

**[Onboarding never runs for Clerk sign-ups]** | File: frontend/src/main.jsx:13, frontend/src/App.jsx:132,245, frontend/src/pages/OnboardingPage.jsx:37-38 | Clerk `forceRedirectUrl="/dashboard"`; `localStorage.onboarded` is **set** on finish but **never read** anywhere. New Google/email Clerk users skip `/onboarding`. | After sign-in, redirect to `/onboarding` if `!localStorage.getItem('onboarded')` before dashboard.

**[Settings change-password UI is broken for Clerk]** | File: frontend/src/pages/SettingsPage.jsx:127-142, backend/app.py:250-273 | UI still posts to `/api/auth/change-password`; Clerk users have no app password. Always fails or 500s. | Remove section; link to Clerk account portal for password.

**[Preferences hydration uses wrong keys]** | File: frontend/src/pages/DashboardPage.jsx:75-76, frontend/src/store/prefsStore.js:22 | Backend returns snake_case (`default_length`, `show_watchlist`); `loadPrefs` does `set({ ...prefs })` without mapping. `defaultLength`, `showWatchlist` stay undefined. | Map snake_case ↔ camelCase in `loadPrefs`.

**[AuthPage references removed `login()` action]** | File: frontend/src/pages/AuthPage.jsx:9,41,45, frontend/src/store/authStore.js:4-28 | `useAuthStore((s) => s.login)` — **`login` does not exist** in store (removed in Clerk migration). Page would throw if routed. | Delete `AuthPage.jsx` or rewrite for Clerk only.

**[Forgot/reset password pages orphaned]** | File: frontend/src/pages/ForgotPasswordPage.jsx:78, frontend/src/pages/ResetPasswordPage.jsx:47,61, frontend/src/App.jsx:19-256 | No routes for `/forgot-password`, `/reset-password`, or `/login` (only redirects to `/sign-in`). Pages are unreachable dead code. | Delete pages or route them; use Clerk password reset instead.

**[Legacy password reset still callable]** | File: backend/app.py:277-356, frontend/src/pages/ForgotPasswordPage.jsx:20 | Backend forgot/reset still mutates `password_hash` for DB users; irrelevant for Clerk-only users; confuses security model. | Remove routes or gate behind feature flag for legacy users only.

**[Share page still mounts Clerk token hook]** | File: frontend/src/pages/BriefDisplayPage.jsx:38,76-82 | `useClerkToken()` runs on `/brief/share/:token`; logged-out viewers rely on public `/api/share/`. Works today but unnecessary; any future global 401 handler regression could break public shares. | Skip `useClerkToken` when `isShareView`.

**[Brief feedback can send invalid rating]** | File: frontend/src/pages/BriefDisplayPage.jsx:460-461,161, backend/app.py:687-688 | UI toggles feedback off by sending `rating: null`; API only accepts `"up"` / `"down"`. | Send DELETE or `"clear"` semantics; omit null POSTs.

**[Schedule UI promises future send; backend sends now]** | File: frontend/src/pages/BriefDisplayPage.jsx:304-313, backend/app.py:769-811 | User picks `meeting_time` in the future, but endpoint emails immediately (only validates time is future). Misleading UX. | Implement delayed job or rename UI to “Email me this brief now”.

**[Poor-quality banner is non-interactive]** | File: frontend/src/pages/BriefDisplayPage.jsx:335-341 | “Brief quality was poor? Let us know →” has no `onClick` / link — dead UI. | Wire to feedback, mailto, or support URL.

**[Landing “See Demo →” goes to sign-in]** | File: frontend/src/pages/LandingPage.jsx:59-64 | Button label implies demo; `navigate('/sign-in')` only. Misleading. | Link to public sample brief or marketing demo.

**[Clerk Development badge in production risk]** | File: frontend/.env:1, frontend/src/main.jsx:12 | `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` (test key for `neat-katydid-70`). Clerk shows **Development mode** badge until production `pk_live_` keys are used. | Swap to production Clerk instance keys before deploy.

**[Protected route blank while Clerk loads]** | File: frontend/src/components/ProtectedRoute.jsx:7-8 | `if (!isLoaded) return null` — white screen, no spinner. | Show loading skeleton until `isLoaded`.

**[Delete account may not sign user out cleanly]** | File: frontend/src/pages/SettingsPage.jsx:58-64 | On API success, `signOut` runs but `authStore.logout()` not called; brief state may linger in memory until reload. | Call `logout()` from `authStore` before redirect.

**[Watchlist note path param unsanitized]** | File: backend/app.py:906-941 | `company_name` in URL for notes GET/POST is not passed through `sanitize_company_name`; long or weird characters accepted. | Reuse `sanitize_company_name` on path param.

**[Diff endpoint company name unsanitized]** | File: backend/app.py:815-820 | `GET /api/briefs/company/<company_name>/diff` uses raw path segment in queries. | Sanitize length/charset like other company inputs.

**[Brief display schedule email uses stale authStore email]** | File: frontend/src/pages/BriefDisplayPage.jsx:63,68-70 | `meetingEmail` initialized from `user?.email` which is never synced from Clerk — often empty. | Use `useUser().primaryEmailAddress` from Clerk.

**[/api/auth/me never used by frontend]** | File: backend/app.py:239-246 | Endpoint returns tier/rate limits; frontend never calls it — rate-limit UX may be stale vs server. | Fetch on dashboard mount and display `briefs_remaining_this_hour`.

---

## 🟡 MEDIUM (dead code, orphaned files, mismatches)

**[auth.py still imported; require_auth unused in app]** | File: backend/app.py:18-25, backend/auth.py:96-118 | App imports validators + `hash_password` + `generate_token` from `auth.py`; `@require_auth` is **not** used in `app.py` (only in orphan `patch_routes.py`). | Split validators to `validators.py`; delete dead JWT decorator or legacy auth module.

**[patch_routes.py is a dangerous orphan script]** | File: backend/patch_routes.py:1-72 | Standalone script that would inject `@require_auth` stubs into `app.py`; references `require_auth`, `request.user_id` (never set). Not imported but misleading. | Delete file from repo.

**[AuthPage.jsx orphaned]** | File: frontend/src/pages/AuthPage.jsx, frontend/src/App.jsx | Not imported in `App.jsx`; routes `/login` and `/register` redirect to Clerk. | Delete file.

**[ForgotPasswordPage.jsx orphaned]** | File: frontend/src/pages/ForgotPasswordPage.jsx | Not routed; links to `/login` (redirects to Clerk). | Delete file.

**[ResetPasswordPage.jsx orphaned]** | File: frontend/src/pages/ResetPasswordPage.jsx | Not routed; reset emails from legacy backend point here. | Delete file.

**[WatchlistSidebar.jsx stub never used]** | File: frontend/src/components/WatchlistSidebar.jsx:1 | Placeholder component; watchlist lives inline in `DashboardPage.jsx`. | Delete or wire up.

**[Unused import in App.jsx]** | File: frontend/src/App.jsx:4 | `useAuth` imported from `@clerk/clerk-react` but never used. | Remove import.

**[authStore.setUser never called]** | File: frontend/src/store/authStore.js:26-28 | Dead action after Clerk migration. | Remove or use in Clerk sync effect.

**[authStore.logout rarely used]** | File: frontend/src/store/authStore.js:20-24, frontend/src/pages/DashboardPage.jsx:19,109-111 | `logout` imported on dashboard but `handleLogout` only calls Clerk `signOut`; Zustand user/brief not cleared. | Call `logout()` in sign-out handler.

**[briefStore.saveBrief never called]** | File: frontend/src/store/briefStore.js:22-25, frontend/src/pages/BriefDisplayPage.jsx:116-123 | Save uses inline `api.patch` in page, not store helper. | Remove dead action or centralize.

**[briefStore.history / setHistory dead]** | File: frontend/src/store/briefStore.js:6,29 | Never read or written in app. | Remove from store.

**[resetTour exported, never imported]** | File: frontend/src/hooks/useTour.js:94-96 | Dead export. | Delete or add Settings “Replay tour” button.

**[Backend register/login orphaned from UI]** | File: backend/app.py:156-235 | No frontend caller after Clerk; only reachable via direct API/curl. | Remove routes or document admin-only migration path.

**[Backend forgot/reset password orphaned from UI]** | File: backend/app.py:277-356 | Frontend pages not routed. | Remove with legacy auth.

**[GET share route registered; frontend uses POST]** | File: backend/app.py:700, frontend/src/pages/BriefDisplayPage.jsx:147 | Handler allows GET and POST; frontend only POSTs — harmless mismatch. | Align docs or use GET idempotently.

**[History page ignores server `?saved=true`]** | File: frontend/src/pages/HistoryPage.jsx:28, backend/app.py:608-610 | Client filters `saved` locally; could use query param for large histories. | Pass `?saved=true` when filter active.

**[prefsStore.theme vs themeStore duplication]** | File: frontend/src/store/prefsStore.js:9, frontend/src/store/themeStore.js:9-21, frontend/src/components/CustomizePanel.jsx:24-28 | Theme stored in `localStorage` key `theme` and optionally in API `preferences.theme` — not kept in sync. | Single source of truth; sync on change.

**[CustomizePanel syncs theme locally only]** | File: frontend/src/components/CustomizePanel.jsx:24-28 | `handleTheme` toggles `themeStore` but does not `syncPrefs({ theme })` to backend. | PATCH `theme` with other prefs.

**[OnboardingPage reads unused authStore user]** | File: frontend/src/pages/OnboardingPage.jsx:9 | `user` selected but never used. | Remove or display Clerk email.

**[Double rate-limit charge on compare]** | File: backend/app.py:515-521 | Compare calls `_check_and_increment_rate_limit` twice (intended = 2 briefs). Documented behavior but surprising. | Surface “costs 2 briefs” in compare UI.

**[Watchlist alerts weak search query]** | File: backend/app.py:889 | `company_web_search(entry.company_name)` passes bare name, not a news query; alerts quality poor. | Pass structured query like `"{name} latest news 2026"`.

**[Feedback API excludes custom_focus / comparison sections]** | File: backend/app.py:684-686, frontend/src/pages/BriefDisplayPage.jsx:14-28 | Comparison brief sections and `custom_focus` cannot receive feedback thumbs. | Extend `valid_sections` list.

---

## 🟢 LOW (code quality, minor UX, polish)

**[DashboardPage.jsx over 400 lines]** | File: frontend/src/pages/DashboardPage.jsx:1-575 | Single component ~575 lines (sidebar + drawer + cards). | Extract `WatchlistPanel`, `BriefGrid`, `MobileNav`.

**[BriefDisplayPage.jsx over 400 lines]** | File: frontend/src/pages/BriefDisplayPage.jsx:1-514 | Monolithic page with schedule, diff, PDF, sections. | Split `BriefHeader`, `SectionCard`, `SchedulePanel`.

**[Dashboard fetchData empty catch swallows errors]** | File: frontend/src/pages/DashboardPage.jsx:78 | `catch (e) { }` hides auth/API failures; user sees empty dashboard silently. | Set error state or toast.

**[useEffect missing deps on Dashboard]** | File: frontend/src/pages/DashboardPage.jsx:39-44 | `fetchData` in `useEffect([])` only — acceptable on mount but `fetchData` not stable if extended. | Wrap `fetchData` in `useCallback` or eslint-disable with comment.

**[BriefDisplay fetchBrief missing deps]** | File: frontend/src/pages/BriefDisplayPage.jsx:72-74 | `[id, token]` only — OK for route change; `fetchBrief` recreated each render. | Minor: memoize fetch.

**[Note save setTimeout not cleared on unmount]** | File: frontend/src/pages/DashboardPage.jsx:302-304,414-416 | `setTimeout` for “Saved ✓” may fire after unmount. | Store timeout id and clear in cleanup.

**[console.error in production paths]** | File: frontend/src/pages/DashboardPage.jsx:105, BriefDisplayPage.jsx:99,107,192, CustomizePanel.jsx:20 | Logs may expose brief IDs/errors in browser console. | Gate behind dev flag or user-facing toast only.

**[Unused CSS variables in index.css]** | File: frontend/src/index.css:5-7,17,33 | `--accent-blue`, `--danger`, `--success`, `--text-secondary` defined, never referenced in `frontend/src`. | Remove or use consistently.

**[ProtectedRoute does not use Clerk UserButton]** | File: frontend/src/pages/DashboardPage.jsx:189-218 | Custom avatar instead of Clerk profile/manage account. | Optional: embed `<UserButton />` for account management.

**[Tour steps skip on mobile]** | File: frontend/src/hooks/useTour.js:17-26, frontend/src/pages/DashboardPage.jsx:227 | `#watchlist-sidebar` missing when `isMobile` — tour auto-skips via `moveNext`. | Mobile-specific tour steps.

**[PWA banner may overlap mobile bottom nav]** | File: frontend/src/components/PWAInstallBanner.jsx:70-72, frontend/src/pages/DashboardPage.jsx:557-571 | Both fixed to bottom on mobile. | Offset banner above nav (`bottom: 56px`).

**[agents.py verbose=True in production]** | File: backend/agents.py:177,350 | Crew runs with `verbose=True` — noisy logs, possible data leakage in logs. | Set `verbose=False` in prod.

**[Financial fallback uses deterministic fake data]** | File: backend/tools.py:118-137 | Failed Alpha Vantage returns hash-based fake financials without loud UI warning in API response alone. | Flag `estimated: true` in API metadata (partially via `limited_data`).

**[Resend “from” is onboarding@resend.dev]** | File: backend/app.py:304,802 | Hardcoded sender; deliverability/spam risk in prod. | Use verified domain from env.

**[Talisman force_https=False]** | File: backend/app.py:34 | HTTPS not forced at app layer (may be OK behind Render proxy). | Enable `force_https=True` in production config.

**[Health endpoint unauthenticated]** | File: backend/app.py:94-96 | Fine for probes; exposes app existence. | Optional: minimal response, no version leak.

**[Brief share banner links to /register]** | File: frontend/src/pages/BriefDisplayPage.jsx:236 | Redirects to `/sign-up` via App.jsx — works but inconsistent path naming. | Use `/sign-up` directly.

**[LandingPage “See Demo” copy]** | File: frontend/src/pages/LandingPage.jsx:63 | Same as HIGH — minor polish item for marketing accuracy.

**[sqlalchemy user_id on Brief nullable]** | File: backend/models.py:45 | `user_id` nullable on `Brief` while share links exist — orphaned brief rows possible if user deleted inconsistently. | Enforce NOT NULL for owned briefs.

---

## ✅ CONFIRMED WORKING

- **Clerk-protected routes** — Brief, watchlist, preferences, feedback, save/delete, and compare endpoints use `@require_clerk_auth` with **ownership checks** (`user_id=g.current_user.id`) on brief and watchlist mutations (`app.py` 617-677, 975-990).
- **`password_hash` not in API responses** — `User.to_dict()` explicitly omits it (`models.py` 25-38).
- **Share link 401 bypass** — `api.js` skips redirect to `/sign-in` when path starts with `/brief/share/` (`api.js` 28-32).
- **Clerk webhook Svix verification** — Uses `svix.webhooks.Webhook.verify()` with headers and raw body (`app.py` 106-122); rejects missing/invalid signatures.
- **Company name sanitization on write paths** — `sanitize_company_name` used on brief generation, watchlist add, compare (`app.py` 424-426, 526-531, 956-958).
- **SQLAlchemy parameterized search** — `Brief.company_name.ilike(f"%{search}%")` uses bound params, not string concatenation SQL (`app.py` 604-606).
- **Public share read path** — `GET /api/share/<token>` returns brief without auth (`app.py` 727-745); frontend loads via `/api/share/${token}` (`BriefDisplayPage.jsx` 79-80).
- **Clerk sign-in/sign-up routing** — `/login` and `/register` redirect to `/sign-in` and `/sign-up`; Clerk components mounted (`App.jsx` 21-247).
- **Axios Clerk token injection** — `useClerkToken` registers `getToken` with `setAuthToken` (`useClerkToken.js` 5-10, `api.js` 14-21).
- **Preferences PATCH/GET** — Backend allows `default_length`, `default_view`, `show_watchlist`, `show_sources`, `theme` (`app.py` 372-395); frontend PATCHes correct snake_case keys from Settings/Onboarding.
- **Watchlist CRUD end-to-end** — GET/POST/DELETE watchlist and notes endpoints match frontend calls (`DashboardPage.jsx` 49-50, 86-94).
- **Watchlist alerts endpoint wired** — `GET /api/watchlist/alerts` called from dashboard (`DashboardPage.jsx` 57-62).
- **Brief generation + compare** — `POST /api/brief` and `POST /api/brief/compare` match `briefStore` / `BriefGeneratorPage.jsx` (`briefStore.js` 13, `BriefGeneratorPage.jsx` 80).
- **Rate limit modal** — 429 from brief/compare opens `RateLimitModal` (`BriefGeneratorPage.jsx` 92-94, 108-110).
- **PWA install banner logic** — `beforeinstallprompt` + iOS fallback, dismiss persistence (`PWAInstallBanner.jsx` 8-65).
- **Guided tour** — `startTour()` on dashboard when `!tour_completed` (`DashboardPage.jsx` 41-42, `useTour.js` 3-91).
- **Share URL copy flow** — POST `/api/briefs/:id/share` then clipboard copy of `/brief/share/:token` (`BriefDisplayPage.jsx` 145-151).
- **CORS + Talisman present** — Baseline hardening middleware is initialized (`app.py` 34-35).
