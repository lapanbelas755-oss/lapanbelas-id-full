# 18STUDIO PROJECT CONTEXT

# APPLICATION

18Studio is a production business management system
for photography and creative services.

Services include:

- Photography
- Wedding Photography
- Videography
- Makeup Artist
- Studio Photography
- Decoration / Pelaminan

The application manages client-facing and internal operations.

---

# PRODUCTION STATUS

The application is already running operationally.

Existing features are currently functioning.

The system is intended for long-term use.

Production client data is critical.

Data loss is unacceptable.

---

# TECHNOLOGY

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

Authentication:

Supabase Auth

Storage:

Supabase Storage

Package:

npm

---

# APPLICATION AREAS

## CLIENT PORTAL

- Home
- Package
- Sample
- My Order
- Profile
- Voucher
- Appointment
- Payment
- Photo Selection
- Feedback

---

## ADMIN

- Overview Dashboard
- Appointment
- Editor Foto Assignment
- Editor Video Assignment
- Editor Foto Studio Assignment
- Lady Makeup
- Studio Lapanbelas
- Decoration
- Pricelist
- Add-on Services
- Date Available
- Voucher
- Sample Embed
- Settings
- Access Management
- Client Feedback

---

## QUEUE

Handles appointment/service queue workflows.

---

# CORE BUSINESS FLOW

Customer
↓
Browse Package
↓
Booking
↓
Appointment
↓
Invoice
↓
DP Payment
↓
Date Availability
↓
Division Assignment
↓
Photography / Studio / Makeup / Decoration Session
↓
Photo Selection
↓
Photo Editing
↓
Video Editing
↓
Revision
↓
Final Delivery
↓
Feedback
↓
Dashboard / Reports

---

# BUSINESS DEPENDENCIES

## APPOINTMENT

Appointment affects:

- Invoice
- Payment
- Date Available
- Reminder
- Division Assignment
- Dashboard
- Reports

Never modify appointment logic without checking these dependencies.

---

## INVOICE

Invoice affects:

- Payment
- Dashboard
- Reports
- Reminder
- Client Portal

---

## PAYMENT

Payment affects:

- Invoice status
- Dashboard revenue
- Reports
- Reminder
- Client Portal order status

---

## PHOTO SELECTION

Photo Selection affects:

- Client Portal
- Editor Assignment
- Final Delivery

---

## AUTHENTICATION

Authentication affects:

- Admin
- Client Portal
- Session
- Permission
- Access Management

Never change authentication casually.

---

# DATA THAT MUST BE PROTECTED

- customer records
- bookings
- appointments
- invoices
- payments
- assignments
- photo selections
- feedback
- historical records
- business settings

Never delete these to solve a coding problem.

---

# UX GOAL

The application must feel:

- fast
- smooth
- responsive
- stable
- touch friendly
- consistent

Supported:

- Android
- iPhone
- Tablet
- Laptop
- Desktop

---

# REALTIME GOAL

Realtime updates should occur without unnecessary browser refresh.

Realtime must remain efficient.

Avoid excessive server/database load.

---

# LONG-TERM PRINCIPLE

This is not a temporary prototype.

Changes must be safe for long-term production operation.