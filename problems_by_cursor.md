# PitchPulse Comprehensive Codebase Audit — Round 2

## CRITICAL (broken, will cause crashes or data loss)
**[Backend JSON Parsing Error Masking]** | File: `backend/app.py:316` | Problem: `result.get("parse_error")` looks for `parse_error` at the root of the `run_brief` return dict, but `agents.py` returns it nested inside `result["brief"]`. If the LLM returns invalid JSON, the backend saves the error object as a valid brief and returns 200 OK, causing the frontend to render weird error JSON strings instead of showing a user-friendly error. | Fix: Change line 316 to `if not result or result.get("brief", {}).get("parse_error"):`

**[Dead Code / API Route Mismatch in Store]** | File: `frontend/src/store/briefStore.js:23` | Problem: The `saveBrief` action calls `api.patch('/api/brief/${briefId}/save')` (singular `brief`), but the backend route is defined as `/api/briefs/<int:brief_id>/save` (plural `briefs`). Calling this store action will result in a 404 error. (Currently uncalled because UI hits API directly, but dangerous). | Fix: Change URL to `/api/briefs/${briefId}/save`.

## HIGH (wrong behavior, affects core UX significantly)
**[Theme State Synchronization Conflict]** | File: `frontend/src/components/CustomizePanel.jsx:24` | Problem: `CustomizePanel` updates the theme via `usePrefsStore` and manually toggles the `.dark` class. However, `index.css` relies on `[data-theme="dark"]`, and `DashboardPage` reads from `useThemeStore`. This means picking a theme in the panel desyncs the UI icons and doesn't properly apply CSS variables. | Fix: Remove `theme` from `usePrefsStore`. Make `CustomizePanel` import and use `useThemeStore` to ensure global consistency, and ensure `themeStore` syncs with the API instead.

**[Missing Feedback State Hydration]** | File: `frontend/src/pages/BriefDisplayPage.jsx:65` | Problem: `fetchBrief` retrieves `briefMeta` but ignores `data.feedback_summary`. The `feedback` state is initialized as an empty object `{}` on every load. If a user refreshes the page, their previous section upvotes/downvotes disappear visually (though they remain in the DB). | Fix: Update `fetchBrief` to set the feedback state: `if (data.feedback_summary) setFeedback(data.feedback_summary); setPoorQualityCount(Object.values(data.feedback_summary || {}).filter(v => v === 'down').length);`

## MEDIUM (suboptimal, edge cases, minor wrong behavior)
**[Stale Store Data on Logout]** | File: `frontend/src/store/authStore.js:13` | Problem: The `logout` action clears localStorage and auth state but leaves `briefStore` (and potentially `prefsStore` if memory-backed) intact. If another user logs in on the same device, they could momentarily see the previous user's `currentBrief` state. | Fix: Manually clear `useBriefStore.getState().setCurrentBrief(null)` inside the `logout` function, or emit a clear event.

**[Dead-End Error Screen]** | File: `frontend/src/pages/BriefDisplayPage.jsx:121` | Problem: When `fetchBrief` fails (e.g., 404 Brief Not Found), it returns a bare `<div>` containing the error text. There is no navigation bar or back button, trapping the user unless they use the browser's back button. | Fix: Render the standard `nav` bar above the error message, providing a link back to `/dashboard`.

## LOW (polish, code quality, minor gaps)
**[Unused Local Storage Write]** | File: `frontend/src/pages/DashboardPage.jsx:30` | Problem: `useEffect` writes `sidebarOpen` to `localStorage.setItem('sidebar_open', sidebarOpen)`, but the app completely relies on `usePrefsStore` for this state and never reads `sidebar_open` from localStorage. | Fix: Remove the `useEffect` block spanning lines 28-32 entirely.

**[Broken Drawer Close Animation]** | File: `frontend/src/pages/DashboardPage.jsx:266` | Problem: The mobile sidebar drawer has a CSS transition (`transition: 'transform 0.25s ease'`) but conditionally unmounts when `mobileDrawerOpen` is false. The closing animation never plays because the DOM node is immediately destroyed. | Fix: Either remove the useless transition property, or keep the component mounted and toggle `transform: 'translateX(-100%)'` vs `translateX(0)`.

## NEEDS VERIFICATION (looks possibly wrong, needs manual testing to confirm)
**[LLM Output Truncation]** | File: `backend/agents.py:195` | What to test: Generate a 'long' brief for a massive company with lots of news (e.g., Apple). | Expected vs actual behavior: Groq/Llama has a max output token limit. The 17b model might hit the limit midway through the JSON generation, causing `_extract_json` to fail and flag `parse_error`. Verify if the `max_tokens` parameter needs to be explicitly increased in the `LLM` definition.

## ALREADY CORRECT (audited and confirmed working)
- **Cascade Deletes**: Checked `models.py`. The `cascade="all, delete-orphan"` combined with `ondelete="CASCADE"` on the foreign keys ensures briefs and watchlist items are fully purged when an account is deleted.
- **Double Submission Prevention**: Checked `BriefGeneratorPage.jsx`. The submit button is properly disabled (`disabled={generating}`) and state is managed cleanly to prevent multiple rapid API calls.
- **Rate Limit Window Logic**: Checked `app.py`. The calculation correctly resets `briefs_used_this_hour = 0` if `now > window + 1hr`, and correctly handles subsequent database commits.
- **Route Protection**: Checked `App.jsx` and `ProtectedRoute.jsx`. All sensitive routes are properly wrapped. Share view (`/brief/share/:token`) correctly functions without auth, as intended.
- **Memory Leaks**: Checked `BriefGeneratorPage.jsx`. The status polling interval (`statusInterval.current`) is safely cleared in the cleanup function of a `useEffect`.
- **API Response Destructuring**: Checked `AuthPage.jsx`, `DashboardPage.jsx`, and `HistoryPage.jsx`. Axios responses (`res.data.token`, `res.data.briefs`) are properly read safely using optional chaining where necessary.
- **Cross-Site Scripting (XSS)**: Checked `BriefDisplayPage.jsx`. Standard React node injection is used for rendering brief sections rather than `dangerouslySetInnerHTML`, safely escaping any untrusted user/LLM input.
