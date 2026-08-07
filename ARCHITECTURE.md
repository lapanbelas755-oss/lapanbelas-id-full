# ARCHITECTURE
## 18Studio Management System

---

# High-Level Structure

Frontend (React + Vite)
↓
Express API Server
↓
Supabase (PostgreSQL) Database
↓
Business Logic & Webhooks

---

# Current Folder Structure

```text
src/
├── main.jsx
├── admin.jsx
├── client-portal.jsx
├── queue.jsx
├── feedback.jsx
├── index.css
└── tests/

sql/
dist/
server.js
vite.config.js
tailwind.config.js
postcss.config.js


Frontend Entry Points
src/main.jsx
Public / main application bootstrap.

src/admin.jsx
Admin dashboard and internal management modules.
Handles:
overview
appointment
editor assignment
division management
voucher
pricing
reporting
access management

src/client-portal.jsx
Client-facing portal.
Handles:
package browsing
booking
order history
payment status
photo selection
feedback
profile management

src/queue.jsx
Queue / waiting flow related to appointments or client service processes.

src/feedback.jsx
Client feedback submission and display logic.

Backend
server.js
Central Express server.
Responsibilities:
API routes
authentication
database access
invoice processing
payment processing
appointment handling
file / asset serving
business logic coordination
This is a critical file.
Do not refactor aggressively.

Database Layer
Supabase (PostgreSQL) is used for production and development.
Rules:
- Never recreate tables without migration
- Never delete existing columns
- Preserve backward compatibility with existing queries
- Use Supabase Auth for session management

Module Dependency Map
Appointment
Depends on:
Customer
Package
Date Available
Voucher
Invoice
Payment
Reminder
Division Assignment

Invoice
Depends on:
Appointment
Customer
Package
Voucher
Payment
Dashboard
Reports

Payment
Depends on:
Invoice
Dashboard
Reports
Reminder
Client Portal

Photo Selection
Depends on:
Appointment
Client Portal
Editor Assignment

Feedback
Depends on:
Appointment
Client Portal

Dashboard
Depends on all business modules.
Any change affecting revenue, booking, payment, or assignment may impact dashboard statistics.

Architecture Protection Rules
Never:
move core folders
rename entry files
replace Vite with another framework
convert to TypeScript without explicit request
introduce a new state management architecture
duplicate existing modules
Always extend the current architecture.

Safe Development Workflow
For every feature or bug fix:
Identify affected module.
Check dependent modules.
Apply the smallest possible change.
Verify no regression in related workflows.
Keep API and database compatibility intact.
This project prioritizes stability and business continuity over aggressive refactoring.

---

# Cara Menggunakannya

Simpan di root project:

```text
lapanbelas-id-full-main/
├── rules.md
├── PROJECT_CONTEXT.md
├── ARCHITECTURE.md
├── package.json
├── server.js
└── src/
