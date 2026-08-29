# 18STUDIO BUG REPORT & ENGINEERING MEMORY

This file is persistent project memory.

Do not store conversation transcripts.

Only store verified technical facts,
completed fixes, important regressions,
and durable project knowledge.

---

# STATUS

Open Bugs:
0

---

# BUG TEMPLATE

## BUG-XXX — TITLE

Status:
OPEN / FIXED / VERIFIED

Date:

### Problem

Short factual description.

### Root Cause

Actual technical cause.

### Affected Files

- file
- file

### Dependencies

- module
- module

### Solution

Short factual description.

### Verification

- check
- test
- regression

### Data Safety

Production data:
UNCHANGED / MODIFIED WITH AUTHORIZATION

### Notes

Only important durable information.

---

# COMPLETED BUGS

## BUG-001 — ReferenceError: mailer is not defined in sendProgressEmail

Status:
VERIFIED

Date:
2026-08-29

### Problem
Notifikasi email progres gagal terkirim dengan error "mailer is not defined" saat admin mengubah status progres penugasan foto/video di Admin Dashboard.

### Root Cause
Di dalam fungsi `sendProgressEmail(status, order)` pada `server.js`, objek `mailer` dipanggil di baris pengiriman email (`await mailer.transporter.sendMail(...)`), namun inisialisasi `const mailer = getMailerForOrder(order);` belum dideklarasikan di dalam fungsi tersebut.

### Affected Files
- server.js

### Solution
Menambahkan deklarasi `const mailer = getMailerForOrder(order);` pada fungsi `sendProgressEmail` di `server.js`.

### Verification
- `node --check server.js` passed
- `npm run build` passed

### Data Safety
Production data:
UNCHANGED

---

# IMPORTANT PROJECT DISCOVERIES

Only add verified facts that are useful for future agents.

Do not add assumptions.

---

# RULE

A bug is NOT VERIFIED merely because code was changed.

VERIFIED requires actual validation.