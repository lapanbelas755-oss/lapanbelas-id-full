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

# 16. MOBILE NATIVE STANDARDS (MANDATORY)

Every UI must provide a true native mobile experience.

This application is expected to behave like a native Android/iOS application, not a desktop website.

---

## RESPONSIVE DESIGN

Every page MUST work correctly on:

- Android phones
- iPhone
- Tablets
- Foldable devices
- Desktop browsers

Never design for desktop first.

Always use a Mobile-First approach.

---

## VIEWPORT

Every page must fully fit inside the viewport.

Never require users to:

- zoom
- pinch
- manually resize

The application should automatically adapt to every screen size.

---

## HORIZONTAL OVERFLOW

Horizontal scrolling is NOT allowed.

Never allow:

- horizontal overflow
- layout wider than viewport
- content outside screen
- accidental sideways scrolling

Exception:

Large data tables may scroll horizontally only inside their own container.

Never let the entire page scroll horizontally.

---

## RESPONSIVE TABLES

Desktop tables must have a mobile strategy.

Prefer:

- card layout
- stacked information
- expandable rows

instead of forcing large tables onto small screens.

---

## FLEXIBLE LAYOUT

Avoid fixed sizes.

Prefer:

- width: 100%
- max-width
- flex
- grid
- responsive spacing

Never use fixed pixel widths unless absolutely necessary.

---

## SAFE AREA SUPPORT

Support modern devices with:

- iPhone notch
- Dynamic Island
- Android gesture navigation
- Safe Area Insets

Content must never be hidden behind device UI.

---

## TOUCH TARGETS

Buttons, icons and interactive elements must be easy to touch.

Recommended minimum touch size:

44px × 44px

Spacing between controls must prevent accidental taps.

---

## MOBILE SCROLLING

Scrolling must feel natural.

Avoid:

- double scrollbar
- nested scrolling
- unnecessary horizontal scrolling
- broken momentum scrolling

Scrolling should be smooth and predictable.

---

## OVERSCROLL

Prevent unnecessary overscroll effects that expose blank areas or create an unpolished experience.

The application should feel stable during scrolling.

---

## ZOOM BEHAVIOR

The application should display correctly without requiring browser zoom.

Forms should not trigger unexpected zoom on mobile devices.

---

## IMAGES

Every image must be responsive.

Never overflow its container.

Maintain aspect ratio.

Use lazy loading whenever appropriate.

---

## MODALS

Every modal must:

- fit mobile screens
- remain scrollable when needed
- never overflow viewport
- keep actions visible

---

## DRAWERS & SIDEBARS

Mobile navigation should use:

- drawer
- bottom sheet
- bottom navigation

Avoid desktop sidebars on small screens.

---

## FORMS

Forms must:

- remain readable
- avoid horizontal scrolling
- keep labels visible
- display validation clearly

Inputs must resize correctly on every device.

---

## TYPOGRAPHY

Text must remain readable on:

- small phones
- tablets
- large monitors

Avoid text clipping.

Avoid overlapping text.

---

## LOADING STATES

Every async action should provide feedback.

Use:

- loading spinner
- skeleton
- progress indicator

Never leave users wondering whether the app is frozen.

---

## EMPTY STATES

Every list should gracefully handle:

- empty data
- first-time users
- filtered results

Provide meaningful messages.

---

## ERROR STATES

Every feature should gracefully handle:

- network errors
- validation errors
- server errors

Never leave users with a blank screen.

---

## RESPONSIVE QA CHECKLIST

Before completing any UI task, verify:

✓ No horizontal overflow

✓ No horizontal page scrolling

✓ No overlapping elements

✓ No clipped text

✓ No clipped buttons

✓ No fixed desktop widths

✓ No broken responsive layout

✓ No unexpected zoom

✓ No layout shifting

✓ No double scrollbar

✓ Responsive images

✓ Responsive tables

✓ Responsive modals

✓ Responsive forms

✓ Touch friendly

✓ Safe Area compatible

✓ Mobile-first layout

Only after every item passes may the UI be considered complete.

# MOBILE TESTING REQUIREMENT

Every UI modification MUST be mentally tested for:

- Android Chrome
- iPhone Safari
- Tablet Portrait
- Tablet Landscape
- Desktop Chrome

The task is NOT complete until all layouts are verified across these device categories.

Never assume a desktop layout will work correctly on mobile.

# RESPONSIVE REGRESSION RULE

Every responsive modification must preserve all supported layouts.

A fix for one breakpoint must NEVER break another breakpoint.

Every UI change must be verified on:

- Mobile
- Tablet Portrait
- Tablet Landscape
- Laptop
- Desktop

A task is NOT complete until all breakpoints work correctly.

Do not optimize Mobile at the expense of Desktop.

Do not optimize Desktop at the expense of Mobile.

The correct solution is an adaptive responsive layout that works across all supported screen sizes.

# VIEWPORT LOCK RULE

The application viewport must always be locked to the device width.

Never allow the entire page to scroll horizontally.

Only components that explicitly require horizontal scrolling (such as large data tables or image galleries) may scroll horizontally inside their own container.

Blank space outside the viewport is considered a bug.

If the page can be dragged left or right on mobile or desktop, the task is NOT complete.