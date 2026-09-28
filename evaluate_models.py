"""
Evaluate the ASL hand-recognition models against image test sets.

Pipeline (matches capture_data.py / image-landmarks.py):
  image -> MediaPipe Hands -> 21 landmarks -> 63 wrist-normalized (x,y,z) features
        -> model.predict -> compare to folder label.

Reports per-model accuracy + per-class precision/recall/f1, and the MediaPipe
detection rate (images where no hand was found are excluded from accuracy, so
the detection rate tells you what fraction was actually testable).

Results are written to results.json.
"""

import os
import sys
import json
from datetime import datetime, timezone

import cv2
import numpy as np
import joblib
import mediapipe as mp
from sklearn.metrics import accuracy_score, classification_report

MODEL_DIR = "other_models"          # holds all three models + label_encoder
DATASETS = ["test-set", "Test_Alphabet"]
IMG_EXTS = (".jpg", ".jpeg", ".png")
OUTPUT_JSON = "results.json"

MODELS = {
    "MLP": "asl_model.pkl",
    "RF": "asl_rf_model.pkl",
    "SVM": "asl_svm_model.pkl",
}


def extract_features(image_bgr, hands):
    """Return 63 wrist-normalized features, or None if no hand detected."""
    if image_bgr is None:
        return None
    result = hands.process(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
    if not result.multi_hand_landmarks:
        return None
    hand = result.multi_hand_landmarks[0]
    wrist = hand.landmark[0]
    feats = []
    for lm in hand.landmark:
        feats.extend([lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z])
    return feats if len(feats) == 63 else None


def collect_dataset(data_dir, valid_labels, hands):
    """Walk data_dir/<LABEL>/*.img, returning features, labels, and detection stats."""
    X, y = [], []
    per_class = {}
    for label in sorted(os.listdir(data_dir)):
        label_path = os.path.join(data_dir, label)
        if not os.path.isdir(label_path):
            continue
        label = label.upper()
        if label not in valid_labels:
            print(f"  [skip] '{label}' not in label encoder", file=sys.stderr)
            continue
        imgs = [f for f in os.listdir(label_path) if f.lower().endswith(IMG_EXTS)]
        detected = 0
        for i, img_name in enumerate(imgs, 1):
            feats = extract_features(cv2.imread(os.path.join(label_path, img_name)), hands)
            if feats is not None:
                X.append(feats)
                y.append(label)
                detected += 1
            if i % 25 == 0 or i == len(imgs):
                print(f"  {label}: {i}/{len(imgs)} processed, {detected} detected",
                      file=sys.stderr)
        per_class[label] = {"total": len(imgs), "detected": detected}
    return np.array(X, dtype=np.float32), np.array(y), per_class


def evaluate_dataset(data_dir, le, models, hands):
    print(f"\n=== {data_dir} ===", file=sys.stderr)
    valid_labels = set(le.classes_)
    X, y_letters, per_class = collect_dataset(data_dir, valid_labels, hands)

    total = sum(c["total"] for c in per_class.values())
    detected = sum(c["detected"] for c in per_class.values())
    result = {
        "path": data_dir,
        "total_images": total,
        "detected_images": detected,
        "undetected_images": total - detected,
        "detection_rate": round(detected / total, 4) if total else 0.0,
        "num_classes": len(per_class),
        "per_class_detection": per_class,
        "models": {},
    }

    if detected == 0:
        print("  no hands detected; skipping model scoring", file=sys.stderr)
        return result

    y_true = le.transform(y_letters)
    class_labels = np.arange(len(le.classes_))
    for name, model in models.items():
        y_pred = model.predict(X)
        report = classification_report(
            y_true, y_pred, labels=class_labels, target_names=list(le.classes_),
            output_dict=True, zero_division=0,
        )
        per_class_metrics = {
            cls: {
                "precision": round(report[cls]["precision"], 4),
                "recall": round(report[cls]["recall"], 4),
                "f1": round(report[cls]["f1-score"], 4),
                "support": int(report[cls]["support"]),
            }
            for cls in le.classes_ if cls in report
        }
        result["models"][name] = {
            "accuracy_on_detected": round(float(accuracy_score(y_true, y_pred)), 4),
            "macro_f1": round(report["macro avg"]["f1-score"], 4),
            "weighted_f1": round(report["weighted avg"]["f1-score"], 4),
            "per_class": per_class_metrics,
        }
        print(f"  {name}: accuracy(on detected) = "
              f"{result['models'][name]['accuracy_on_detected']}", file=sys.stderr)
    return result


def main():
    le = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
    models = {name: joblib.load(os.path.join(MODEL_DIR, fname))
              for name, fname in MODELS.items()}
    print(f"Loaded models {list(models)}; classes: {list(le.classes_)}", file=sys.stderr)

    hands = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=1)
    output = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "model_source": MODEL_DIR,
        "preprocessing": "MediaPipe Hands, 63 wrist-normalized (x,y,z) features, no handedness flip",
        "note": "accuracy_on_detected is over images where a hand was detected; "
                "see detection_rate for coverage.",
        "datasets": {},
    }
    for data_dir in DATASETS:
        if not os.path.isdir(data_dir):
            print(f"[warn] missing dataset dir: {data_dir}", file=sys.stderr)
            continue
        output["datasets"][data_dir] = evaluate_dataset(data_dir, le, models, hands)
    hands.close()

    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nWrote {OUTPUT_JSON}", file=sys.stderr)


if __name__ == "__main__":
    main()
