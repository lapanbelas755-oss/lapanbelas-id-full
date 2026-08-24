# 18STUDIO PRODUCTION SAFETY RULES

These rules are mandatory.

This project is already operational.

Existing working behavior is the baseline.

---

# 1. PRODUCTION FIRST

Priority:

1. Data integrity
2. Business logic
3. Existing functionality
4. Security
5. Stability
6. Realtime reliability
7. Performance
8. Maintainability
9. UI/UX
10. New features

Never sacrifice higher priority for lower priority.

---

# 2. DO NOT BREAK WORKING FEATURES

A requested fix applies only to the requested problem.

Do not modify unrelated features.

Do not refactor unrelated code.

Do not change existing behavior without evidence.

---

# 3. ROOT CAUSE FIRST

Never fix symptoms only.

Investigate:

- source
- state
- API
- database
- realtime
- cache
- event flow
- dependency
- race condition
- duplicate listener
- stale data

Identify the actual root cause.

---

# 4. DEPENDENCY FIRST

Before modifying shared logic:

SEARCH ALL CONSUMERS.

Understand:

who writes the data
who reads the data
who transforms the data
who displays the data
who depends on the result

---

# 5. DATABASE

Supabase PostgreSQL is production.

Existing data must remain intact.

No destructive operation without explicit authorization.

Never delete historical records to hide a bug.

Never recreate a table as a shortcut.

---

# 6. API

Existing API contracts are protected.

Do not silently change:

- endpoint
- request format
- response format
- status codes

Search callers first.

---

# 7. REALTIME

Realtime must not create:

- duplicate events
- duplicate listeners
- duplicate records
- duplicate requests
- stale state
- memory leaks
- excessive server load

Do not add polling if realtime already solves the requirement.

---

# 8. PERFORMANCE

Every new query/request/listener must have a reason.

Avoid:

- N+1 query
- unnecessary polling
- repeated fetching
- huge responses
- duplicate API calls
- excessive rerendering

---

# 9. UI

All UI must support:

Mobile
Tablet
Laptop
Desktop

No page-level horizontal overflow.

No broken modal.

No clipped content.

No broken forms.

No double scrollbar.

---

# 10. SURGICAL EDITING

Prefer:

one bug
→ one root cause
→ one focused change

Do not rewrite entire files.

Do not restructure the application without explicit request.

---

# 11. COMPLETE CODE

No placeholders.

No TODO.

No incomplete implementation.

No fake fallback pretending the feature works.

---

# 12. VERIFICATION

Nothing is complete until validated.

Build passing is necessary but not always sufficient.

Business workflows must also be checked.

---

# 13. REGRESSION

If a change affects:

Appointment
Invoice
Payment
Availability
Assignment
Photo Selection
Authentication
Dashboard
Realtime

check the related workflows.

If one fails:

TASK IS NOT COMPLETE.

---

# 14. PRODUCTION DATA

Never use:

"reset database"

"clear records"

"delete existing data"

as a shortcut for debugging.

Use isolated test data or safe read-only inspection.

---

# 15. NO HALLUCINATION

If the source does not confirm something:

do not invent it.

Inspect first.

If still unclear:

STOP and ask.