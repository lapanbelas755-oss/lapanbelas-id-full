# 18STUDIO SECURITY & DATA PROTECTION

Security and data integrity are mandatory.

---

# 1. AUTHENTICATION

Use the existing Supabase Auth architecture.

Never bypass authentication.

Never weaken authentication to solve a UI problem.

Never expose session tokens.

---

# 2. AUTHORIZATION

Verify permissions on the server.

Never trust client-side role information.

Admin functionality must not become accessible
merely because a frontend control is hidden.

---

# 3. INPUT VALIDATION

Validate request data before database operations.

Never trust:

- req.body
- query parameters
- route parameters
- client-provided IDs
- client-provided prices
- client-provided permissions

---

# 4. DATABASE SECURITY

Use safe parameterized queries / Supabase query APIs.

Never construct unsafe SQL from raw user input.

---

# 5. SECRETS

Never expose:

- API keys
- service-role keys
- passwords
- private tokens
- secrets

Never commit secrets to source control.

---

# 6. PRODUCTION DATA

Never expose customer data unnecessarily.

Never copy production data into temporary files for convenience.

Never delete production records as a debugging shortcut.

---

# 7. PAYMENT

Payment-related logic is HIGH RISK.

Never trust client-provided payment state.

Verify payment state through the authoritative backend/database flow.

Never silently alter historical payment records.

---

# 8. FILE / ASSET ACCESS

Verify authorization before exposing private client assets.

Photo and final-delivery assets may contain private customer content.

Do not weaken access controls to solve loading problems.

---

# 9. ERROR RESPONSES

Errors must not expose:

- database credentials
- stack traces containing secrets
- internal tokens
- private customer information

Return safe user-facing errors.

Log technical details appropriately.

---

# 10. AUDIT

Important operations should be traceable where the existing
application architecture supports audit logging.

Especially:

- payment
- invoice
- appointment
- assignment
- access changes
- destructive operations

---

# 11. SECURITY REGRESSION

When authentication, authorization, payment, or customer-data
handling changes:

Perform security regression before PASS.