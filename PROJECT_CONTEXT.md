# PROJECT CONTEXT
## 18Studio Management System

---

# Application Overview

18Studio is a web-based business management system for creative and wedding services.

The application manages:

- Photography Studio
- Wedding Photography & Videography
- Makeup Artist (Lady Makeup)
- Decoration / Pelaminan
- Client Portal
- Online Booking
- Appointment Scheduling
- Invoice & Payment Tracking
- Editor Assignment
- Photo Selection
- Customer Feedback

---

# Current Technology

Frontend
- React
- JSX
- Vite
- TailwindCSS

Backend
- Node.js
- Express

Database
- Supabase (PostgreSQL)
- Built-in Supabase Auth & Storage

Package Manager
- npm

Build Tool
- Vite

Entry Files
- src/main.jsx
- server.js

---

# Main Admin Modules

- Overview Dashboard
- Appointment
- Penugasan Editor Foto
- Penugasan Editor Video
- Penugasan Editor Foto Studio
- Divisi Lady Makeup
- Divisi Studio Lapanbelas
- Divisi Dekorasi
- Pricelist
- Add-on Layanan
- Date Available
- Voucher
- Sample Embed
- Setting
- Manajemen Akses
- Client Feedback

---

# Main Client Portal Modules

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

# Core Business Flow

Customer
↓
Browse Package
↓
Booking / Appointment
↓
Invoice Created
↓
DP Payment
↓
Date Availability Check
↓
Division Assignment
↓
Photo / Wedding Session
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
Client Feedback
↓
Dashboard & Reports

---

# Important Business Rules

## Appointment affects

- Invoice
- Payment
- Date Available
- Reminder
- Division Assignment
- Dashboard
- Reports

Never modify Appointment without checking those modules.

---

## Invoice affects

- Payment
- Dashboard
- Reports
- Reminder
- Client Portal

---

## Payment affects

- Invoice status
- Dashboard revenue
- Reports
- Reminder
- Client Portal order status

---

## Photo Selection affects

- Client Portal
- Editor Assignment
- Final Delivery workflow

---

## Authentication affects

- Admin access
- Client Portal access
- Session handling
- Permission management

Never change authentication logic without checking all related modules.

---

# Development Goal

The goal is to continue and stabilize the existing application, not to rewrite it.

Every code change must preserve:

- existing bookings
- invoice history
- payment records
- client access
- appointment schedules
- assignment workflows
- dashboard statistics
- feedback data

Data consistency is the highest priority.
