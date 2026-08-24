# 18STUDIO DEVELOPMENT CONVENTIONS

This document contains project-specific coding conventions.

The primary engineering rules are in:

agent.md
rules.md

---

# STACK

Frontend:

React
JSX
Vite
Tailwind CSS

Backend:

Node.js
Express
server.js

Database:

Supabase PostgreSQL

---

# JAVASCRIPT

Use clear English names for:

- variables
- functions
- components
- services

Prefer async/await.

Handle async errors explicitly.

---

# EXPRESS

Async route handlers must handle errors.

Return consistent API responses where the existing endpoint
architecture already follows a response format.

Do not silently change existing response structures.

---

# REACT

Follow the existing component architecture.

Do not introduce a new state-management architecture
without explicit need.

Avoid unnecessary rerenders.

Clean up subscriptions and event listeners.

---

# SUPABASE

Use the existing Supabase architecture.

Inspect existing query patterns before introducing new ones.

Do not create duplicate database access implementations
when an existing service/helper already handles the responsibility.

---

# FILES

Before creating a new file:

Search whether an existing file already handles
the same responsibility.

Do not create duplicate:

- components
- services
- helpers
- utilities
- API handlers

---

# CODE CLEANLINESS

Do not leave:

- unused imports
- unused variables
- debug logs
- TODO
- incomplete code
- dead code

unless an existing log is intentionally required for production
error monitoring.

---

# SERVER.JS

`server.js` is critical.

Do not rewrite the entire file.

Use surgical modifications.

---

# FRONTEND ENTRY FILES

Important files:

src/main.jsx
src/admin.jsx
src/client-portal.jsx
src/queue.jsx
src/feedback.jsx

Do not rewrite entire entry files for isolated fixes.

---

# DATABASE

Never assume schema.

Inspect actual schema/query usage first.

---

# FINAL RULE

When coding conventions conflict with production safety,
production safety wins.