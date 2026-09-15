Absolutely. In fact, combining Person A + Person B makes the Dealer-side ownership much cleaner because one person will now own the entire mobile application workflow.
The new role can be:
👤 PERSON A — Complete Mobile App Developer
Dealer App + Collector/Kabadiwala Lite
This person owns essentially everything inside mobile/**, while C owns the backend, D owns the Recycler web dashboard, E owns ML/data, and F reviews PRs/integrates everything.
Here is the complete copy-paste prompt for the agent.
You are working as the MAIN MOBILE APP DEVELOPER for the Kabadiwala Connect project.

YOUR ROLE:
Complete Mobile Application Developer

You are responsible for the entire mobile application, including:

DEALER SIDE:
1. Dealer Login
2. Dealer Home
3. Log Purchase
4. Offline Purchase Storage
5. Purchase Sync
6. My Stock
7. Create Lot
8. Find Recycler
9. Select Recycler
10. QR Handover
11. Dealer Ledger

COLLECTOR / KABADIWALA SIDE:
12. Collector/Kabadiwala Lite
13. Scrap Photo Capture
14. ML Prediction Display
15. Collector Confirmation/Correction
16. Manual Category Fallback

You own the mobile frontend and mobile-side integration.

==================================================
1. VERY IMPORTANT — FILE SCOPE
==================================================

You may ONLY modify:

    mobile/**

You may modify a root-level configuration file ONLY if it is absolutely required for the mobile application to run/build.

DO NOT modify:

    backend/**
    dashboard/**
    ml/**
    datasets/**
    deck/**
    docs/**

This restriction is STRICT.

Do not modify backend code even if an API is missing.

Do not modify the Recycler dashboard.

Do not modify the ML model or dataset.

Do not modify project documentation.

If you discover a problem outside mobile/**:

DO NOT FIX IT YOURSELF.

Instead report:

1. What the problem is
2. Which file/module is affected
3. Which teammate should fix it
4. What change is required

==================================================
2. FIRST — UNDERSTAND THE EXISTING PROJECT
==================================================

Before writing code:

1. Inspect the repository structure.
2. Inspect the existing mobile application.
3. Read the project documentation:

    docs/architecture.md
    docs/data-contract.md
    docs/api-contract.md
    docs/feature-spec.md
    docs/development-guide.md
    docs/demo-flow.md

4. Understand:

    - mobile framework
    - navigation
    - state management
    - API client
    - local storage/database
    - authentication
    - existing components
    - styling
    - project conventions

Do NOT replace the existing architecture unnecessarily.

Reuse existing components and patterns.

Do not create multiple competing implementations of the same functionality.

==================================================
3. OVERALL MOBILE USER FLOWS
==================================================

The mobile application contains TWO related user experiences.

DEALER:

Login
  ↓
Dealer Home
  ↓
Log Purchase
  ↓
My Stock
  ↓
Create Lot
  ↓
Find Recycler
  ↓
Select Recycler
  ↓
Generate QR
  ↓
Physical Handover
  ↓
Recycler confirms
  ↓
Dealer sees completed status
  ↓
Ledger

COLLECTOR:

Collector Lite
  ↓
Take Scrap Photo
  ↓
ML Prediction
  ↓
Confirm OR Correct
  ↓
Material Information
  ↓
Manual fallback if necessary

Keep these workflows logically separated.

==================================================
4. DEALER LOGIN
==================================================

Implement Dealer login.

Include:

- login identifier as defined by API
- password/PIN as defined by API
- Login button
- validation
- loading state
- authentication error
- network error

After successful authentication:

navigate to Dealer Home.

Use the backend authentication API.

DO NOT:

- hardcode credentials
- fake successful login
- create fake authentication
- bypass backend authentication

==================================================
5. DEALER HOME
==================================================

Create a simple operational Dealer Home.

Provide access to:

- Log Purchase
- My Stock
- Create Lot
- Find Recycler
- QR / Handover
- Ledger

The Home screen may show useful summaries if backend data exists:

- available stock
- recent purchases
- pending sync count
- pending lots

Do NOT invent fake statistics.

Use real API/local data.

==================================================
6. LOG PURCHASE
==================================================

The Dealer must be able to record scrap purchased from collectors/suppliers.

Required fields:

- category
- weight
- price
- timestamp
- purchase UUID

Optional photo if supported by the specification.

Use ONLY these categories:

1. PCB
2. CRT
3. LCD
4. Cable
5. Battery
6. Motor/Magnet
7. Mixed Plastic

Do not add new categories.

==================================================
7. CATEGORY SELECTION
==================================================

Make category selection simple and field-friendly.

Use:

- clear labels
- material icons if available
- large touch targets
- minimal typing

Category values must exactly follow:

docs/data-contract.md

Do not create inconsistent names.

==================================================
8. WEIGHT VALIDATION
==================================================

Validate purchase weight.

Must be:

- required
- numeric
- greater than zero
- valid format

Reject:

- zero
- negative values
- non-numeric input

Show a clear validation message.

==================================================
9. PURCHASE PRICE
==================================================

The Dealer must be able to enter/edit the purchase price.

Do NOT hardcode a fixed price.

Follow the API/data contract.

The backend remains authoritative for persisted purchase information.

==================================================
10. PURCHASE UUID
==================================================

Every purchase must have a unique UUID.

The UUID is important for offline synchronization.

CRITICAL:

Once a purchase UUID is created, DO NOT replace it during synchronization.

The same UUID must be used when retrying synchronization.

Do NOT use array indexes as identifiers.

==================================================
11. OFFLINE-FIRST PURCHASES
==================================================

The Dealer must be able to log a purchase without internet.

Flow:

Dealer enters purchase
       ↓
Save locally
       ↓
Show success
       ↓
Mark as pending sync
       ↓
Internet becomes available
       ↓
Sync
       ↓
Backend acknowledges UUID
       ↓
Mark synced

The purchase must NOT be lost when offline.

==================================================
12. LOCAL STORAGE
==================================================

Use the existing local storage/database solution.

Do NOT introduce another database technology unless absolutely necessary.

Store enough information to restore the purchase:

- purchase UUID
- category
- weight
- price
- timestamp
- photo reference if supported
- sync status

Follow the existing data model.

==================================================
13. SYNC NOW
==================================================

Provide a manual:

"Sync Now"

action.

When pressed:

1. Find pending purchases.
2. Send them to backend.
3. Preserve original UUID.
4. Process successful responses.
5. Mark successful records as synced.
6. Keep failed records pending.
7. Never delete failed records.

Show useful feedback.

Example:

"3 purchases synced."

or:

"2 synced, 1 still pending."

==================================================
14. DUPLICATE PREVENTION
==================================================

Offline synchronization must be idempotent.

Example:

Purchase UUID:
ABC-123

First sync:
network fails.

Second sync:
ABC-123 is sent again.

The system must not create two purchases.

Preserve UUIDs.

Do not create a new local purchase during retry.

Backend also enforces idempotency, but the frontend must behave correctly.

==================================================
15. MY STOCK
==================================================

Implement My Stock.

Stock represents CURRENTLY AVAILABLE material.

Group by category.

Example:

PCB
12 kg available

LCD
8 kg available

Cable
25 kg available

Only show currently available stock.

Do not treat purchase history as current stock.

==================================================
16. PURCHASE HISTORY
==================================================

Keep purchase history conceptually separate from current stock.

Purchase history answers:

"What did the Dealer purchase?"

Stock answers:

"What is currently available?"

If backend provides authoritative stock:

use backend stock.

Do not create a competing frontend stock calculation.

==================================================
17. CREATE LOT
==================================================

Implement Create Lot.

The Dealer should:

1. View available stock.
2. Select available material.
3. Choose quantity.
4. Create a lot.

IMPORTANT:

ONE LOT MUST CONTAIN ONLY ONE MATERIAL CATEGORY.

Allowed:

LCD → 10 kg

Not allowed:

LCD + PCB → one lot

==================================================
18. LOT QUANTITY VALIDATION
==================================================

When creating a lot:

Show:

Available:
10 kg

Dealer selects:

Lot quantity:
7 kg

Validate:

quantity > 0

quantity <= available quantity

Do not allow creating a lot larger than available stock.

Backend remains authoritative.

==================================================
19. LOT CREATION
==================================================

Call the backend Create Lot API.

Use the authoritative response.

Lot should have:

- Lot UUID
- category
- declared weight/quantity
- status
- timestamp

Do not fake successful lot creation.

==================================================
20. STOCK AFTER LOT CREATION
==================================================

When material is placed into a lot:

that quantity should no longer be freely available.

Do NOT manually create a second stock system.

Refresh/read the authoritative backend stock state.

==================================================
21. FIND RECYCLER
==================================================

Implement Find Recycler.

Suitable recyclers should be evaluated/displayed using information such as:

- distance
- accepted material
- rate
- pickup availability
- service radius

Use backend-provided matching results.

Do not invent recycler data.

==================================================
22. RECYCLER SELECTION
==================================================

Display recycler cards with useful information:

- recycler/business name
- distance
- accepted material
- rate
- pickup availability
- service area

Allow:

"Select Recycler"

The selection must be sent to the backend.

Do not only store it in frontend state.

==================================================
23. QR HANDOVER
==================================================

After recycler selection, display a QR code for the lot.

CRITICAL RULE:

THE QR CODE MUST CONTAIN ONLY THE LOT UUID.

Example:

LOT_UUID

DO NOT encode:

- dealer name
- recycler name
- category
- weight
- price
- transaction value
- personal information

The Recycler web dashboard will scan the Lot UUID and retrieve authoritative information from the backend.

==================================================
24. QR DISPLAY
==================================================

Display:

QR CODE

Below it, UI information can show:

Category: LCD
Declared Weight: 10 kg
Lot ID: abc...

But only the Lot UUID is encoded inside the QR.

If a manual fallback code is defined by the shared contract:

show it below the QR.

Do not invent an incompatible identifier.

==================================================
25. HANDOVER STATUS
==================================================

Display the authoritative lot status.

Possible statuses must come from:

docs/data-contract.md

Do not invent new status values.

The Dealer should NOT mark the lot completed locally.

Correct flow:

Dealer creates lot
→ selects recycler
→ displays QR
→ physical handover
→ Recycler scans
→ Recycler verifies weight
→ Recycler confirms
→ backend marks completed
→ Dealer sees completed

==================================================
26. DEALER LEDGER
==================================================

Implement Dealer Ledger.

It should distinguish:

PURCHASES

and:

COMPLETED SALES / HANDOVERS

Useful purchase information:

- category
- weight
- purchase price
- date

Useful sales information:

- lot
- category
- verified/transaction weight as defined by backend
- rate
- amount
- completion date
- status

==================================================
27. PENDING LOTS MUST NOT COUNT AS EARNINGS
==================================================

This is an important business rule.

A lot that has NOT been confirmed by the Recycler is not completed income.

Example:

Lot created:
₹5,000 expected

Recycler has not confirmed.

Ledger must NOT show ₹5,000 as earned.

Only confirmed/completed transactions count as completed sales earnings.

==================================================
28. COLLECTOR / KABADIWALA LITE
==================================================

Implement a lightweight Collector workflow.

Flow:

Collector opens app
       ↓
Take/select scrap photo
       ↓
On-device ML inference
       ↓
Prediction shown
       ↓
Collector confirms OR corrects
       ↓
Material information shown

The Collector should not need complicated Dealer functionality.

Keep this workflow simple.

==================================================
29. ML IS ONLY FOR COLLECTOR
==================================================

CRITICAL PROJECT RULE:

ML classification is ONLY for the door-to-door Collector/Kabadiwala.

Do NOT use ML to:

- classify dealer purchases automatically
- determine final dealer purchase category
- determine verified recycler weight
- determine lot status
- determine transaction value
- determine final stock

ML provides a suggestion.

The Collector confirms or corrects it.

==================================================
30. SEVEN ML CATEGORIES
==================================================

The ML model uses exactly:

1. PCB
2. CRT
3. LCD
4. Cable
5. Battery
6. Motor/Magnet
7. Mixed Plastic

The label order supplied by Person E MUST be followed exactly.

Do not change label order.

==================================================
31. ML MODEL OWNERSHIP
==================================================

Person E owns:

- dataset
- model
- training
- model export
- label order
- preprocessing requirements
- confidence threshold

You ONLY integrate the model into mobile.

Do NOT modify:

ml/**
datasets/**

Do NOT retrain the model.

Do NOT change labels.

==================================================
32. ML CONFIDENCE
==================================================

Use the confidence threshold provided by Person E.

Do not invent a threshold.

If prediction is confident:

show the suggested category.

If confidence is below threshold:

show manual category selection.

==================================================
33. COLLECTOR CORRECTION
==================================================

Collector must be able to correct the ML suggestion.

Example:

ML suggestion:
Cable

Collector selects:
Battery

Final confirmed category:

Battery

Do not lock the user into the prediction.

==================================================
34. ML FAILURE FALLBACK
==================================================

If:

- inference fails
- model unavailable
- image invalid
- confidence too low

provide:

Manual category selection.

Never pretend the model successfully classified an image when it did not.

==================================================
35. MATERIAL INFORMATION
==================================================

After Collector confirms/corrects the category, display useful information if available.

Potential information:

- material name
- relevant price information
- basic safety information

Use project-provided data.

Do not invent unsupported information.

==================================================
36. API INTEGRATION
==================================================

Follow:

docs/api-contract.md

exactly.

Mobile may need APIs for:

- authentication
- purchases
- purchase synchronization
- stock
- lot creation
- recycler matching
- recycler assignment
- lot status
- ledger
- transaction history

Use the documented:

- endpoints
- methods
- request fields
- response fields
- UUIDs
- status values

Do not rename fields casually.

==================================================
37. BACKEND IS THE SOURCE OF TRUTH
==================================================

The backend determines:

- authentication
- stock
- purchase persistence
- synchronization result
- lot creation
- recycler matching
- recycler assignment
- lot status
- transaction status
- transaction value

The mobile app displays backend results.

Local storage is only for offline support.

==================================================
38. ERROR HANDLING
==================================================

Handle:

LOGIN:
- invalid credentials
- network error
- server error

PURCHASE:
- invalid category
- invalid weight
- invalid price
- offline
- sync failure

STOCK:
- empty stock
- loading
- server error

LOT:
- insufficient stock
- zero quantity
- invalid quantity
- server rejection
- network failure

RECYCLER:
- no suitable recycler
- loading
- server error

QR:
- invalid lot
- unavailable lot
- completed lot

LEDGER:
- empty state
- loading
- server error

ML:
- low confidence
- inference failure
- manual fallback

Never leave the UI stuck or blank.

==================================================
39. LOADING STATES
==================================================

Implement loading indicators for:

- login
- dashboard
- purchases
- stock
- synchronization
- lot creation
- recycler matching
- recycler assignment
- ledger
- API operations

Disable buttons during critical requests to avoid duplicate submissions.

==================================================
40. FIELD-USER UX
==================================================

The application may be used by field workers.

Prioritize:

- large buttons
- simple navigation
- clear labels
- material icons
- minimal typing
- readable weights/prices
- clear success messages
- clear errors
- simple workflows

Avoid unnecessary animations and complexity.

Reliability is more important than visual decoration.

==================================================
41. OFFLINE TEST
==================================================

You MUST test the following:

1. Turn on airplane mode.
2. Open Dealer app.
3. Log a purchase.
4. Confirm local save.
5. Close app.
6. Reopen app.
7. Confirm purchase is still present.
8. Reconnect internet.
9. Tap Sync Now.
10. Confirm synchronization.
11. Tap Sync Now again.
12. Confirm no duplicate purchase.

This is a critical project requirement.

==================================================
42. CREATE LOT TEST
==================================================

Test:

- valid lot
- zero quantity
- negative quantity
- quantity > available stock
- unavailable stock
- one-category-only rule
- successful lot creation
- backend rejection
- network failure

==================================================
43. RECYCLER MATCHING TEST
==================================================

Test:

- recycler list loads
- accepted material
- distance
- rate
- pickup availability
- service radius
- select recycler
- assignment success
- assignment failure
- no suitable recycler

==================================================
44. QR TEST
==================================================

Verify:

QR payload contains ONLY Lot UUID.

Test:

- valid QR
- correct Lot UUID
- manual fallback if supported
- lot status display
- completed lot

Do NOT put additional transaction data into the QR.

==================================================
45. LEDGER TEST
==================================================

Test:

- purchases appear
- pending lot
- completed transaction
- completed earnings
- empty ledger
- backend failure

Confirm:

pending lots are NOT counted as earned income.

==================================================
46. COLLECTOR ML TEST
==================================================

Test:

- photo capture
- image selection if supported
- successful prediction
- confidence
- collector confirmation
- collector correction
- low confidence
- inference failure
- manual category selection

Test all seven categories where the supplied model supports them.

==================================================
47. NAVIGATION
==================================================

Ensure the Dealer navigation is coherent.

Suggested structure:

LOGIN
  ↓
DEALER HOME

Dealer Home:
  → Log Purchase
  → My Stock
  → Create Lot
  → Find Recycler
  → QR / Handover
  → Ledger

Collector Lite:
  → Photo
  → Prediction
  → Confirm/Correct
  → Material Information

Do not create duplicate screens for the same feature.

==================================================
48. PERSON C — BACKEND COORDINATION
==================================================

Person C is the Backend Lead.

Coordinate with C for:

- authentication
- purchase APIs
- sync APIs
- stock APIs
- lot APIs
- recycler matching
- recycler assignment
- lot status
- ledger
- transaction data

If an API is missing:

DO NOT edit backend/**.

Tell Person C exactly what endpoint/data is required.

==================================================
49. PERSON D — RECYCLER DASHBOARD COORDINATION
==================================================

Person D owns the Recycler web dashboard.

Coordinate with D on:

- Lot UUID
- QR format
- manual fallback code
- category
- declared weight
- lot status
- confirmation flow

CRITICAL SHARED RULE:

QR = LOT UUID ONLY.

Recycler flow:

Scan QR
→ Lot UUID
→ backend lookup
→ declared weight
→ verified weight
→ confirmation

Do not independently change this contract.

==================================================
50. PERSON E — ML COORDINATION
==================================================

Person E provides:

- TFLite model
- label order
- input dimensions
- preprocessing
- confidence threshold
- limitations

Follow those exactly.

Do not modify their model/dataset.

If integration fails:

report the exact problem to E.

==================================================
51. PERSON F — PR REVIEW / QA
==================================================

Person F is responsible for:

- reviewing your PR
- integration testing
- checking contract compliance
- checking regressions
- checking scope
- verifying the demo flow

Before opening your PR:

make your branch clean and testable.

Do not bypass F's review.

==================================================
52. GIT BRANCH
==================================================

Use a dedicated feature branch.

Suggested branch:

feature/mobile-complete

Do NOT work directly on main.

Since you now own the complete mobile application, you may make multiple focused commits.

Suggested commits:

feat: add dealer authentication
feat: add dealer home
feat: add purchase flow
feat: add offline purchase storage
feat: add purchase sync
feat: add stock screen
feat: add create lot
feat: add recycler matching
feat: add qr handover
feat: add dealer ledger
feat: add collector lite
feat: integrate collector ml

==================================================
53. BEFORE OPENING PR
==================================================

Check:

1. Only mobile/** changed.
2. No backend files changed.
3. No dashboard files changed.
4. No ML/dataset files changed.
5. No docs files changed.
6. Application builds.
7. Application runs.
8. No runtime errors.
9. Offline purchase works.
10. Sync works.
11. No duplicate purchases.
12. Lot creation works.
13. Recycler selection works.
14. QR contains only Lot UUID.
15. Collector ML works.
16. Manual fallback works.
17. Ledger works.

==================================================
54. PR DESCRIPTION
==================================================

Include:

### Implemented

Dealer:
- Login
- Home
- Log Purchase
- Offline Storage
- Sync
- My Stock
- Create Lot
- Find Recycler
- Recycler Selection
- QR Handover
- Ledger

Collector:
- Collector Lite
- Photo capture
- ML prediction
- Confirmation/correction
- Manual fallback

### API dependencies

List every backend endpoint required.

### ML dependencies

List:

- model
- label order
- preprocessing
- confidence threshold

### QR Contract

Explicitly state:

"QR payload contains Lot UUID only."

### Testing

List the tests performed.

### Known Issues

List anything blocked by backend, ML, or dashboard integration.

==================================================
55. ABSOLUTE FINAL RESTRICTION
==================================================

YOUR IMPLEMENTATION SCOPE:

    mobile/**

ONLY.

DO NOT MODIFY:

    backend/**
    dashboard/**
    ml/**
    datasets/**
    deck/**
    docs/**

Even if another module has a bug:

DO NOT fix it directly.

Report it to the responsible teammate.

Your goal is to produce a complete, reliable, integrated mobile application that follows the existing project contracts and can connect cleanly with the Backend, Recycler Dashboard, ML model, and the rest of the team.