# AI SYSTEM RULES
## Production Development Rules (Mandatory)

These rules are mandatory for every AI coding session.

---

# 1. BEFORE CODING

AI MUST:

1. Read package.json first.
2. Identify framework and dependencies.
3. Read only files related to the task.
4. Understand existing architecture.
5. Perform Root Cause Analysis before modifying code.

Never assume technology, folder structure, or database schema.

---

# 2. PROJECT STATUS

- Existing production-style application
- Approximately 80% completed
- Continue development only
- Focus on bug fixes, stability, optimization, and feature completion

DO NOT rewrite architecture.

---

# 3. ROOT CAUSE ANALYSIS

Before editing code, identify:

- What happened?
- Why did it happen?
- Where is the real source of the problem?
- What is the smallest safe fix?

Never fix symptoms only.

---

# 4. MINIMUM CHANGES POLICY

Always apply the smallest possible fix.

- One bug → one focused fix
- Prefer modifying 1-3 related files only
- Do not refactor unrelated code

---

# 5. NO HALLUCINATION

Never invent:

- API endpoints
- database tables
- environment variables
- functions
- components
- folder structures

If information is missing, ask the user for the relevant file.

---

# 6. TOKEN EFFICIENCY

DO:

- show only changed snippets
- keep explanations short
- avoid repeating unchanged code

DO NOT:

- rewrite entire files unnecessarily
- explain basic programming concepts
- generate excessive examples

---

# 7. FILE READING RESTRICTIONS

Never automatically read:

- dist/
- node_modules/
- *.db
- *.log
- build/
- coverage/

unless explicitly requested.

---

# 8. EXISTING FILE PRIORITY

Before creating a new file, search whether an existing file already handles the same responsibility.

Never create duplicate:

- pages
- components
- helpers
- services
- utilities

Extend existing files whenever safely possible.

---

# 9. RESPONSIVE UI

Every UI modification must work correctly on:

- Android
- iPhone
- Tablet
- Desktop

Use a mobile-first approach whenever possible.

---

# 10. CLEAN CODE STANDARD

Code must be:

- readable
- maintainable
- production-ready

Use:

- clear English variable names
- consistent formatting
- reusable logic

Remove:

- console.log
- TODO comments
- dead code
- unused imports
- unused variables

---

# 11. SECURITY RULES

Never expose:

- API keys
- tokens
- passwords
- secrets

Always validate user input and never trust client-side data.

---

# 12. BUILD VERIFICATION

Before responding, mentally verify:

- syntax
- imports
- exports
- JSX structure
- brackets and commas
- build compatibility
- runtime compatibility

Do not send code with obvious syntax errors.

---

# 13. RESPONSE FORMAT

Always use this structure:

Problem
- Short explanation

Root Cause
- Real cause of the issue

Files
- Modified file names

Code
- Only changed snippets

Verification
- How to test the fix

Keep responses concise and actionable.

---

# 14. WHEN USER SAYS "CONTINUE"

If the user says:

- continue
- lanjutkan
- fix
- perbaiki
- benerin

AI MUST:

1. Read the recent conversation.
2. Identify the active task.
3. Continue only that task.

If the target file is unclear, ask which file should be opened.

Never guess.

---

# 15. PRODUCTION FIRST

Priority order:

1. Data integrity
2. Business logic
3. Stability
4. Reliability
5. Maintainability
6. Performance
7. UI polish
8. New features

Never sacrifice business logic for UI improvements.