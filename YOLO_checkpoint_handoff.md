# YOLO checkpoint handoff

Date: 2026-09-18
Project: ewaste-detection

## Current status

The YOLO pilot is still running and has not yet produced a checkpoint file.

Verified runtime state:
- Process: `PID 141709`
- Model: `YOLOv8n`
- Dataset fraction: `0.15`
- Effective training images: `2130`
- Image size: `320`
- Batch size: `16`
- Workers: `0`
- Device: `CPU`
- Time limit: `7.5 hours`
- Epoch limit: `300`
- Checkpointing: every epoch

Observed log progression:
- `Epoch 1/300`
- `27/134` batches complete
- `13.3s/it`
- `8:12<23:38` remaining in the current log snapshot

The weights directory does not currently contain a saved checkpoint such as `best.pt` or `last.pt`.

## Findings

1. The active run is valid and still progressing.
2. Training pace is substantially slower than the original full-resolution run, but the reduced pilot is feasible for an early checkpoint.
3. Based on the current throughput, a full 300-epoch run is not realistic under the current 7.5-hour limit.
4. A useful early checkpoint can still be produced within a smaller window, especially around 8-12 epochs.

Estimated timing from observed throughput:
- ~13.3 seconds per batch
- ~134 batches per epoch
- ~30-32 minutes per epoch

This implies:
- 8 epochs ≈ 4-5 hours
- 12 epochs ≈ 6-7 hours

## Assessment of checkpoint usefulness

A 12-epoch checkpoint is enough to answer the key questions:
- Is the model learning?
- Are losses trending downward?
- Is the training pipeline stable?
- Is the detector showing initial promise before committing to a longer run?

It is not enough to call the detector production-ready, but it is enough for a meaningful pilot checkpoint and decision point.

## Recommended next steps

1. Let the current training run continue until the first checkpoint is written.
2. At the first valid checkpoint, inspect:
   - `best.pt`
   - `last.pt`
   - validation metrics and confusion matrix
3. If the first results look promising, keep the run alive until the 8-12 epoch window is reached and capture the best model.
4. If the results are weak or unstable, stop early and adjust training settings rather than waiting for a long 300-epoch run.
5. Once a viable checkpoint is verified, copy the best detector weights into a deployment or staging folder for downstream evaluation.
6. Only after checkpoint validation should the project proceed to detector export and mobile evaluation.
7. Continue to avoid shipping generic COCO weights such as `yolov8s.pt` or `yolov8s.onnx` as e-waste detectors.

## Current recommendation

The best immediate action is to keep the current pilot running until its first checkpoint, then decide whether to continue to 8-12 epochs or stop and adjust the configuration. That gives the fastest path to a meaningful detector checkpoint without wasting the current run.
