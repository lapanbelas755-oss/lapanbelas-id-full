# 18STUDIO TESTING PROTOCOL

A task is NOT COMPLETE merely because code compiles.

Testing must prove:

1. Requested problem is fixed.
2. Existing behavior remains intact.
3. Dependent workflows remain intact.
4. No new runtime error exists.
5. No production data is lost.
6. Realtime remains stable.
7. Responsive behavior remains stable.

---

# 1. BUILD VALIDATION

Run the actual project validation command.

Prefer:

npm run check

if it exists.

Otherwise inspect package.json and use the
appropriate existing commands.

Validate:

- syntax
- imports
- exports
- Vite build
- missing dependencies

---

# 2. CLIENT PORTAL TESTING

Verify when affected:

- Home
- Package browsing
- Sample
- Booking
- My Order
- Profile
- Voucher
- Appointment
- Payment
- Photo Selection
- Feedback

---

# 3. ADMIN TESTING

Verify when affected:

- Dashboard
- Appointment
- Editor assignment
- Makeup
- Studio
- Decoration
- Pricelist
- Add-on
- Date Available
- Voucher
- Sample
- Settings
- Access Management
- Feedback

---

# 4. APPOINTMENT TESTING

Verify:

- appointment creation
- appointment update
- appointment status
- date availability
- assignment
- invoice relationship
- payment relationship
- dashboard effect
- report effect
- reminder behavior

---

# 5. INVOICE TESTING

Verify:

- invoice creation
- invoice display
- invoice status
- customer relationship
- appointment relationship
- payment relationship
- dashboard effect
- report effect
- client portal display

---

# 6. PAYMENT TESTING

Verify:

- payment creation
- payment status
- invoice update
- client status
- dashboard revenue
- report totals
- duplicate payment protection
- error handling

Never modify historical payment data as a test shortcut.

---

# 7. AVAILABILITY TESTING

Verify:

- available date
- unavailable date
- booking conflict
- appointment conflict
- correct update
- no duplicate availability state

---

# 8. ASSIGNMENT TESTING

Verify:

- editor assignment
- video editor assignment
- studio editor assignment
- makeup assignment
- studio assignment
- decoration assignment

Ensure assignment changes do not break appointment data.

---

# 9. PHOTO SELECTION TESTING

Verify:

- client can access selection
- selection saves correctly
- selection persists
- editor can see required information
- no duplicate selection
- final workflow remains intact

---

# 10. QUEUE TESTING

Verify:

- queue entry
- queue display
- status update
- realtime update
- no duplicate queue entry
- no stale queue state
- no ghost queue entry

---

# 11. REALTIME TESTING

When affected:

Verify updates appear without manual refresh.

Check:

- no duplicate events
- no duplicate records
- no stale UI
- no excessive requests
- no subscription duplication
- cleanup works correctly

---

# 12. RESPONSIVE TESTING

Every UI modification must be checked on:

- Android Chrome
- iPhone Safari
- Tablet Portrait
- Tablet Landscape
- Laptop
- Desktop

Verify:

- no horizontal overflow
- no clipped text
- no clipped buttons
- no broken modal
- no broken form
- no double scrollbar
- no layout shift
- no unexpected zoom
- touch targets usable

---

# 13. DATA INTEGRITY TESTING

After database-related changes verify:

- existing records remain
- no duplicate records
- no missing records
- foreign relationships remain valid
- historical data remains readable
- existing API queries still work

---

# 14. REGRESSION TEST

After every meaningful change:

Test the changed feature.

Then test its dependency chain.

Example:

Appointment change:

Appointment
→ Invoice
→ Payment
→ Availability
→ Assignment
→ Dashboard
→ Reports

If any affected workflow fails:

TASK IS NOT COMPLETE.

---

# 15. PERFORMANCE REGRESSION

When changing realtime/API/database logic check:

- request count
- repeated requests
- polling
- listener duplication
- unnecessary queries
- UI rendering behavior

Do not introduce server load unnecessarily.

---

# 16. COMPLETION GATE

A task is PASS only when:

- root cause identified
- intended change implemented
- build/check passes
- relevant runtime behavior verified
- dependencies checked
- regression passes
- no new error introduced
- data safety confirmed

If one required verification fails:

STATUS = FAILED or BLOCKED.

Never claim PASS.