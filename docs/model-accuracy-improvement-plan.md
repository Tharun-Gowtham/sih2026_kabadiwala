# Model Accuracy Improvement Plan (No Retraining Required)

## Executive summary

The current float16 TFLite fallback path is now deterministic and repeatable, which is an important fix. However, the practical test results show a critical issue: the model is not yet accurate enough for operational use. The same image is classified consistently, but every practical sample collapses to the same class and low confidence range. That indicates the pipeline is stable but the model or the deployment configuration is still mismatched.

This document captures the findings and a set of improvement actions that do not require retraining the model.

---

## Findings from the investigation

### 1. The random fallback problem was real and was removed

The earlier heuristic fallback used random category selection and random confidence values. This created inconsistent predictions for the same image across repeated attempts.

Fix applied:
- Removed random selection logic from the browser classifier path.
- Replaced it with a deterministic fallback behavior instead of generating pseudo-random categories.
- Ensured the app returns a stable unavailable state when no model is available, instead of making up labels.

### 2. The model input shape mismatch was a real bug

The actual TFLite model expects a 240x240 input, while the app code was resizing to 224x224. This mismatch caused invalid inference and prevented the model from being used correctly.

Evidence from the live TFLite probe:
- Input tensor shape: [1, 240, 240, 3]
- Output tensor shape: [1, 50]

Fix applied:
- Updated the classifier input size from 224 to 240.
- Updated the fallback canvas size from 224 to 240.
- Updated the cascade pipeline resizing logic to use 240x240 letterbox preprocessing.

### 3. After this fix, predictions are stable but inaccurate

The model now produces the same prediction for the same image across repeated runs, which is positive. However, the actual prediction is consistently wrong across all test images.

Observed result from practical samples:
- Same image repeated 5 times: identical output
- Different images: still same label in practice
- Output label: Microphone -> PCB
- Confidence: approximately 0.177 to 0.179

This indicates a model mismatch or deployment mismatch rather than randomness.

### 4. The model asset likely does not match the app’s intended production pipeline

Possible reasons include:
- Wrong model file was selected as the float16 fallback.
- Labels and class mapping do not match the model’s training set.
- The model is trained for a different dataset or class taxonomy than the app expects.
- The app is processing the full image instead of validated cropped object regions.
- Preprocessing or normalization differs from how the model was trained.

### 5. The YOLO + crop pipeline is still useful, but accuracy depends on detection quality

The system design is correct in principle:
- detect object regions with YOLO
- crop objects with padding
- classify only the crops
- aggregate results by category

The problem is not the architecture itself. The problem is that the active model and/or deployment preprocessing are not aligned with the expected inference conditions.

---

## What is already fixed

These are the improvements already validated:

1. Randomized fallback removed
2. Real float16 model path wired into the browser app
3. Input shape corrected from 224 to 240
4. Service worker cache updated for the float16 asset
5. Prediction stability restored for repeated runs on the same image
6. The system no longer creates fake random classes or inconsistent output

This is a strong base, but it is not yet production-ready.

---

## Improvement plan without retraining the model

The following improvements do not require retraining and should be implemented before pushing to GitHub as a production-ready branch.

### A. Validate model identity and asset integrity

#### Action
- Confirm that the float16 asset in the repo is the intended production model.
- Check if it was generated from the exact model used in training and labeling.
- Verify that the label list and category map match the model output order exactly.

#### Why
The evidence strongly suggests the asset may not correspond to the expected class mapping or application domain.

#### Implementation
- Add a startup validation script that loads the TFLite model and prints:
  - input shape
  - output shape
  - labels length
  - class count
- Compare these values against the expected trained model contract.

---

### B. Enforce a strict preprocessing contract

#### Action
- Use the model’s exact expected preprocessing path.
- Ensure the browser pipeline does not silently deviate from the model contract.

#### Recommended contract
- Resize to 240x240
- Normalize to [0, 1]
- Keep RGB channel order consistent
- Apply the same mean/std normalization used during training if the original model was trained that way
- Avoid arbitrary transforms that change brightness, contrast, or crop assumptions

#### Why
Even a correct model can behave badly if the preprocessing differs from training.

---

### C. Use object crops, not full-frame classification, for all inference

#### Action
- In the detection pipeline, classify only the detected object crop rather than the whole image.
- Keep a 10% padding margin around detected objects.
- Avoid passing the whole frame to the classifier unless there is no valid detection.

#### Why
The product architecture states that the model expects object-level inputs, not large background-heavy photos.

---

### D. Add confidence gates and manual override flow

#### Action
- Keep the threshold at 0.70 or higher.
- If the top confidence is below threshold, block auto-selection and require user confirmation.
- Render “uncertain” state clearly in the app.

#### Why
Low-confidence predictions are worse than no prediction in field workflows.

---

### E. Add majority-vote behavior across multiple detections

#### Action
When multiple boxes or multiple crops are found for a single image:
- average or max the classwise scores
- choose the dominant canonical class
- report the score distribution visibly

#### Why
This reduces false positives from a single noisy crop and better reflects the real object in the frame.

---

### F. Add a deterministic offline fallback policy

#### Action
When the model is absent or fails to load:
- return a clear unavailable state
- never invent a category
- require manual selection

#### Why
This protects the app from false positives and is safer than random or heuristic guessing.

---

### G. Add runtime validation logging for every prediction

#### Action
Log the following for each inference:
- image hash or file id
- input size
- model name
- selected strategy (primary or float16 fallback)
- top class
- confidence
- threshold
- object crop count
- detection boxes

#### Why
This makes it easy to identify whether poor accuracy is caused by the model asset, preprocessing, or pipeline stage.

---

### H. Use a real benchmark before merge

#### Action
Create a small labeled validation set with expected categories and test the model on it before pushing.

#### Recommended validation checklist
- 5 to 10 images per category
- mix of real phone photos and controlled test captures
- same image repeated multiple times to test stability
- record ground truth and predicted class
- compute per-class accuracy and confusion matrix

#### Why
This prevents false confidence from a single small sample or a single repeated model run.

---

## Practical recommendations for the current branch

Before any GitHub push, the following should be done:

1. Confirm that the float16 model in the repo is the exact correct production model.
2. Validate label order and category map alignment.
3. Verify preprocessing against the same contract used during model training.
4. Run a benchmark set with at least a few labeled images per category.
5. Increase gating so low-confidence predictions are blocked.
6. Keep the deterministic fallback but make it fail-safe instead of optimistic.
7. Only push when the benchmark shows meaningful, not collapsed, class separation.

---

## Conclusion

The model pipeline is no longer random, and that is a major improvement. The main issue now is not instability; it is model correctness. The system is deterministic but currently not accurate enough for field deployment.

The best next path is not retraining the model. It is to validate the asset identity, align preprocessing with the trained contract, enforce strict confidence gating, and benchmark against a real labeled dataset before merge.

This keeps the project moving without changing the underlying model weights while improving trustworthiness and product safety.
