# 18STUDIO ARCHITECTURE

# HIGH LEVEL

React + Vite
↓
Express API
↓
Supabase
↓
PostgreSQL / Auth / Storage / Realtime

---

# FRONTEND

src/main.jsx

Main application bootstrap.

src/admin.jsx

Admin dashboard and internal management.

src/client-portal.jsx

Client-facing portal.

src/queue.jsx

Queue workflow.

src/feedback.jsx

Feedback workflow.

src/index.css

Global styling.

src/tests/

Testing resources.

---

# BACKEND

server.js

Central Express server.

Responsibilities include:

- API routes
- authentication integration
- database access
- invoice processing
- payment processing
- appointment processing
- business logic
- asset/file serving
- coordination between modules

server.js is CRITICAL.

Avoid aggressive refactoring.

---

# DATABASE

Supabase PostgreSQL.

Never assume schema.

Inspect actual schema before database changes.

Never recreate tables.

Never delete columns as a shortcut.

---

# MODULE DEPENDENCY MAP

Customer
↓
Package
↓
Booking
↓
Appointment
↓
Invoice
↓
Payment
↓
Availability
↓
Assignment
↓
Service Session
↓
Photo Selection
↓
Editing
↓
Revision
↓
Final Delivery
↓
Feedback
↓
Dashboard / Reports

---

# APPOINTMENT DEPENDENCIES

Appointment
├── Invoice
├── Payment
├── Date Available
├── Reminder
├── Division Assignment
├── Dashboard
└── Reports

---

# INVOICE DEPENDENCIES

Invoice
├── Payment
├── Dashboard
├── Reports
├── Reminder
└── Client Portal

---

# PAYMENT DEPENDENCIES

Payment
├── Invoice
├── Dashboard
├── Reports
├── Reminder
└── Client Portal

---

# PHOTO SELECTION DEPENDENCIES

Photo Selection
├── Client Portal
├── Editor Assignment
└── Final Delivery

---

# AUTH DEPENDENCIES

Authentication
├── Admin
├── Client Portal
├── Session
└── Permissions

---

# CHANGE IMPACT RULE

Before changing a shared function:

1. Search all callers.
2. Search all consumers.
3. Understand input.
4. Understand output.
5. Understand database interaction.
6. Understand realtime interaction.
7. Determine regression risk.

Only then modify it.

---

# API CONTRACT

Existing frontend/backend contracts are protected.

Before changing an API:

search:

- endpoint
- frontend callers
- backend callers
- request body
- response
- status codes
- error handling

---

# REALTIME ARCHITECTURE

Realtime must use controlled subscriptions.

Avoid:

- duplicate subscription
- duplicate listener
- polling loop
- repeated fetch
- infinite rerender
- memory leak

Subscription lifecycle:

Subscribe
↓
Receive Event
↓
Validate Event
↓
Update State
↓
Cleanup

---

# PERFORMANCE

Avoid unnecessary:

- API requests
- DB queries
- realtime listeners
- polling
- rendering
- data transfer

Do not make realtime architecture heavier than necessary.

---

# RESPONSIVE ARCHITECTURE

All screens must adapt to:

- phone
- tablet
- laptop
- desktop

No page-level horizontal scrolling.

Tables may scroll inside their own container when necessary.

Modals must remain usable on small screens.

---

# ARCHITECTURE PROTECTION

Never automatically:

- replace React
- replace Vite
- replace Express
- replace Supabase
- convert to TypeScript
- introduce a new state architecture
- move core folders
- rename entry points
- duplicate modules

Extend the existing architecture.