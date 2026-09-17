# Collector ML Flow

## Purpose

The ML classifier helps a door-to-door collector identify scrap material.

It is an assistance mechanism.

It is NOT the final authority for dealer purchases.

---

# Flow

Take Photo
↓
Preprocess Image
↓
Run On-Device Classifier
↓
Prediction + Confidence
↓
High Confidence?
├── Yes → Show Suggested Category
│         ↓
│       Collector Confirms OR Corrects
│
└── No → Do Not Auto-Select
          ↓
        Manual Category Selection

---

# Categories

The classifier uses:

1. PCB
2. CRT
3. LCD
4. Cable
5. Battery
6. Motor/Magnet
7. Mixed Plastic

The model's label order must be documented and must match the application.

---

# High Confidence

If confidence exceeds the agreed threshold:

Example:

Prediction:

PCB

Confidence:

91%

UI:

Suggested: PCB

Buttons:

Confirm
Change

The collector makes the final selection.

---

# Low Confidence

Example:

Prediction:

LCD

Confidence:

41%

The application must NOT automatically select LCD.

Instead:

"Unable to confidently identify material."

Allow:

Select Category Manually

---

# Correction

Example:

ML:

PCB

Collector:

Actually Cable

Collector selects:

Cable

Final collector classification:

Cable

The corrected value is the one passed forward.

---

# Dealer Handoff

If collector-confirmed category is passed to the dealer:

it may be used as:

- Suggestion
- Pre-filled value
- Context

But the Dealer confirms the actual purchase.

---

# ML Does NOT

The ML system does not:

- Determine dealer purchase value.
- Determine final dealer stock.
- Create lots.
- Select recyclers.
- Determine verified recycler weight.
- Confirm transactions.
- Decide whether a transaction is valid.

---

# Model Handoff

ML owner must provide:

- TFLite model
- Exact labels
- Label order
- Input size
- Image preprocessing
- Confidence threshold
- Known limitations
- Integration instructions

---

# Demo Requirement

The demo should show:

1. Real photo.
2. Model prediction.
3. Suggested category.
4. Collector correction/confirmation.
5. Material information.

Avoid hard-coded fake ML output.